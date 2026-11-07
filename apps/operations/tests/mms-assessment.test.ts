import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMmsIncident, type AssessmentRepository, type MmsAssessment } from '../lib/mms-assessment.ts';
import { POST } from '../app/api/assessments/route.ts';
import { assessmentModel, assessWithNvidia } from '../lib/nvidia-assessment.ts';

const saved: MmsAssessment = { incident_id: 'case', value: 'relevant', reason: 'A broken railing should be inspected.', model: 'test-model', assessed_at: '2026-11-07T00:00:00Z' };

test('retired model configuration migrates and returns a bounded non-thinking assessment', async () => {
  const current = 'nvidia/nemotron-3.5-super-vl-120b-a12b';
  assert.equal(assessmentModel('meta/llama-3.2-11b-vision-instruct'), current);
  assert.equal(assessmentModel('custom-model'), 'custom-model');
  const result = await assessWithNvidia({ category: 'Maintenance', note: 'Loose railing', photo: null, mime: 'jpeg' }, {
    apiKey: 'test-key', model: 'meta/llama-3.2-11b-vision-instruct',
    fetcher: async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      assert.equal(request.model, current);
      assert.equal(request.chat_template_kwargs.enable_thinking, false);
      return Response.json({ choices: [{ message: { content: JSON.stringify({ value: 'relevant', reason: 'Inspect the railing.' }) } }] });
    },
  });
  assert.equal(result.value, 'relevant');
});
function fixture(overrides: Partial<AssessmentRepository> = {}): AssessmentRepository {
  return {
    incident: async () => ({ category: 'Damage', description: 'A broken railing near the entrance.', photoPath: null }),
    existing: async () => null,
    photo: async () => Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    save: async (value) => value,
    ...overrides,
  };
}

test('spam classifications are accepted and saved with a neutral reason', async () => {
  const result = await assessMmsIncident('case', fixture(), (input) => assessWithNvidia(input, {
    apiKey: 'test-key', fetcher: async (_url, init) => {
      const prompt = JSON.parse(String(init?.body)).messages[0].content[0].text;
      assert.match(prompt, /Choose "spam" only/);
      assert.match(prompt, /lacks a photo/);
      assert.match(prompt, /no submission history/);
      return Response.json({ choices: [{ message: { content: JSON.stringify({ value: 'spam', reason: 'The text advertises a product without reporting a site concern.' }) } }] });
    },
  }));
  assert.equal(result.value, 'spam');
  assert.equal(result.reason, 'The text advertises a product without reporting a site concern.');
  assert.equal(result.incident_id, 'case');
});

test('saved assessments are reused without another provider request', async () => {
  const result = await assessMmsIncident('case', fixture({ existing: async () => saved }), async () => { throw new Error('Must not call provider'); });
  assert.deepEqual(result, saved);
});

test('authorization happens before returning a cached assessment', async () => {
  await assert.rejects(assessMmsIncident('case', fixture({ incident: async () => { throw new Error('No site access'); }, existing: async () => saved })), /No site access/);
});

test('saved report text and private photo are assessed and the result is persisted', async () => {
  let persisted: MmsAssessment | undefined;
  const result = await assessMmsIncident('case', fixture({
    incident: async () => ({ category: 'Damage', description: 'Broken railing', photoPath: 'private/photo.jpg' }),
    save: async (value) => { persisted = value; return value; },
  }), async (input) => {
    assert.equal(input.note, 'Broken railing');
    assert.equal(input.mime, 'jpeg');
    assert.deepEqual(input.photo, Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    return { value: 'relevant', reason: saved.reason };
  });
  assert.equal(result, persisted);
  assert.equal(result.value, 'relevant');
  assert.equal(result.incident_id, 'case');
});

test('missing or malformed evidence does not fall back to a text-only assessment', async () => {
  for (const photo of [async () => { throw new Error('Storage failed'); }, async () => Buffer.from('not jpeg')]) {
    const result = await assessMmsIncident('case', fixture({
      incident: async () => ({ category: 'Damage', description: 'Broken railing', photoPath: 'private/photo.jpg' }), photo,
      save: async () => { throw new Error('Do not save a completed assessment'); },
    }), async () => { throw new Error('Do not assess incomplete evidence'); });
    assert.equal(result.value, 'unavailable');
  }
});

test('provider outages are retryable and storage failures do not claim success', async () => {
  const result = await assessMmsIncident('case', fixture({ save: async () => { throw new Error('Must not save outage'); } }), async () => ({ value: 'unavailable', reason: 'Provider unavailable' }));
  assert.equal(result.value, 'unavailable');
  await assert.rejects(assessMmsIncident('case', fixture({ save: async () => { throw new Error('Storage failed'); } }), async () => ({ value: 'uncertain', reason: 'Review manually' })), /Storage failed/);
});

test('assessment endpoint rejects unauthenticated and cross-origin requests', async () => {
  assert.equal((await POST(new Request('https://mms.test/api/assessments', { method: 'POST' }))).status, 401);
  assert.equal((await POST(new Request('https://mms.test/api/assessments', { method: 'POST', headers: { Origin: 'https://other.test' } }))).status, 403);
});

test('ordinary staff cannot trigger model calls or save AI results', async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input); requests.push(url);
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'staff-id', aud: 'authenticated', role: 'authenticated' });
    if (url.includes('/rest/v1/mms_incidents')) return Response.json({ site_id: 'taj-mahal', category: 'Damage', description: 'Broken railing' });
    if (url.includes('/rest/v1/mms_memberships')) return Response.json({ role: 'staff' });
    throw new Error('Unexpected request: ' + url);
  };
  try {
    const response = await POST(new Request('https://mms.test/api/assessments', { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: JSON.stringify({ incidentId: '00000000-0000-4000-8000-000000000001' }) }));
    assert.equal(response.status, 403);
    assert.equal(requests.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  }
});
