import assert from 'node:assert/strict';
import test from 'node:test';
import { recognizeMonument, assessHeritageScene, askHeritageChat, resetAiState } from '../lib/server/nvidia.ts';

test('Gemini vision sends multiple images, preserves parsing, and never falls back on quota errors', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['GEMINI_API_KEY', 'GEMINI_VISION_MODEL', 'GROQ_API_KEY'];
  const saved = names.map(name => process.env[name]);
  process.env.GEMINI_API_KEY = 'test-google-key';
  process.env.GROQ_API_KEY = 'test-groq';
  delete process.env.GEMINI_VISION_MODEL;
  let calls = 0;
  try {
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
      assert.equal((init?.headers as Record<string, string>)['x-goog-api-key'], 'test-google-key');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      assert.deepEqual(body.contents[0].parts[1], { inlineData: { mimeType: 'image/jpeg', data: 'aW1hZ2U=' } });
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'hidden' }, { text: '{"monument_name":"Taj Mahal","confidence_score":0.95,"is_unknown":false}' }] } }] });
    };
    const recognition = await recognizeMonument('aW1hZ2U=');
    assert.equal(recognition.monument_name, 'Taj Mahal');
    assert.equal(recognition.confidence_score, 95);
    globalThis.fetch = async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.contents[0].parts.filter((part: { inlineData?: unknown }) => part.inlineData).length, 2);
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"verdict":"none","confidence":0.9,"rationale":"Ordinary visiting."}' }] } }] });
    };
    assert.equal((await assessHeritageScene({ imageBase64: 'aW1hZ2U=', regionBase64: 'Y3JvcA==', motionContext: null })).understood, true);
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ error: { message: 'private upstream detail' } }, { status: 429 });
    };
    await assert.rejects(recognizeMonument('aW1hZ2U='), (error: Error) => {
      assert.doesNotMatch(error.message, /private upstream detail/);
      assert.match(error.message, /busy/);
      return true;
    });
    assert.equal(calls, 3, 'quota exhaustion must not retry a paid provider');
    globalThis.fetch = async (url) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      return Response.json({ choices: [{ message: { content: 'SCOPE: ALLOWED\nShah Jahan.' } }] });
    };
    assert.equal(await askHeritageChat('Who built it?'), 'Shah Jahan.');
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
    resetAiState();
  }
});
