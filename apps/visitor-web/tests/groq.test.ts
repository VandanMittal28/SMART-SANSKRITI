import assert from 'node:assert/strict';
import test from 'node:test';
import { askHeritageChat, recognizeMonument, transcribeAudio, resetAiState } from '../lib/server/nvidia.ts';

// Exercise provider boundaries: text and audio use Groq, images retain NVIDIA.
test('Groq routes text and transcription without changing the vision provider', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['GROQ_API_KEY', 'GROQ_MODEL', 'GROQ_SPEECH_MODEL', 'NVIDIA_API_KEY'];
  const saved = names.map(name => process.env[name]);
  process.env.GROQ_API_KEY = 'test-groq';
  process.env.NVIDIA_API_KEY = 'test-nvidia';
  delete process.env.GROQ_MODEL;
  delete process.env.GROQ_SPEECH_MODEL;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'openai/gpt-oss-20b');
      assert.equal(body.reasoning_effort, 'low');
      assert.equal(body.reasoning_budget, undefined);
      assert.equal(body.chat_template_kwargs, undefined);
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-groq');
      return Response.json({ choices: [{ message: { content: 'SCOPE: ALLOWED\nShah Jahan.' } }] });
    };
    assert.equal(await askHeritageChat('Who built it?', 'taj-mahal'), 'Shah Jahan.');

    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions');
      const form = init?.body as FormData;
      assert.equal(form.get('model'), 'whisper-large-v3-turbo');
      assert.equal(form.get('language'), 'hi');
      assert.equal(await (form.get('file') as Blob).text(), 'audio');
      return Response.json({ text: 'ताज महल' });
    };
    assert.equal(await transcribeAudio(Buffer.from('audio').toString('base64'), 'hi'), 'ताज महल');

    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://integrate.api.nvidia.com/v1/chat/completions');
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-nvidia');
      return Response.json({ choices: [{ message: { content: '{"monument_name":"Unknown","is_unknown":true}' } }] });
    };
    assert.equal((await recognizeMonument('image')).is_unknown, true);

    globalThis.fetch = async () => Response.json({ error: { message: 'secret upstream detail' } }, { status: 401 });
    await assert.rejects(askHeritageChat('Who built it?'), (error: Error) => {
      assert.doesNotMatch(error.message, /secret upstream detail/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
    resetAiState();
  }
});
