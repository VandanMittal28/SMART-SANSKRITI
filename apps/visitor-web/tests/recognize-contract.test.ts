// Contract test for /api/recognize with NVIDIA mocked: global fetch is
// replaced, so no request leaves this machine and nothing is billed. It checks
// that the route sends the request the original apk/ui/lib/nvidia.ts sends and
// parses the reply. It does NOT prove the live model recognises monuments.
import test from "node:test";
import assert from "node:assert/strict";
import { resetRateLimits } from "../lib/server/http.ts";
import { aiState, resetAiState } from "../lib/server/nvidia.ts";
import { GET as status } from "../app/api/status/route.ts";
import { POST as recognize } from "../app/api/recognize/route.ts";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(400, 9)]).toString("base64");
const post = (body: unknown) => new Request("http://localhost/api/recognize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

type Captured = { url: string; init: RequestInit };

async function withMockedNvidia(reply: (call: number, url: string) => Response, run: (calls: Captured[]) => Promise<void>) {
  const realFetch = globalThis.fetch;
  const realKey = process.env.NVIDIA_API_KEY;
  const realModel = process.env.NVIDIA_VISION_MODEL;
  const calls: Captured[] = [];
  process.env.NVIDIA_API_KEY = "test-key-not-real";
  delete process.env.NVIDIA_VISION_MODEL;
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return reply(calls.length, url);
  }) as typeof fetch;
  try {
    resetRateLimits();
    await run(calls);
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = realKey;
    if (realModel !== undefined) process.env.NVIDIA_VISION_MODEL = realModel;
  }
}

const modelReply = (content: string) => Response.json({ choices: [{ message: { content } }] });

test("sends the original vision request and returns the parsed result", async () => {
  await withMockedNvidia(
    () => modelReply('<think>hidden</think>```json\n{"monument_name":"Taj Mahal","monument_id":"taj-mahal","location":"Agra, Uttar Pradesh","category":"Mausoleum","era_or_dynasty":"Mughal","architecture_style":"Mughal","religion":"Islam","confidence_score":94,"key_identifiers":["central dome","four minarets"],"brief_description":"A marble mausoleum.","reasoning":"Dome and minarets visible.","is_unknown":false}\n```'),
    async (calls) => {
      const response = await recognize(post({ image_b64: JPEG }));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.monument_name, "Taj Mahal");
      assert.equal(result.confidence_score, 94);
      assert.deepEqual(result.key_identifiers, ["central dome", "four minarets"]);

      assert.equal(calls.length, 1);
      const { url, init } = calls[0];
      assert.equal(url, "https://integrate.api.nvidia.com/v1/chat/completions");
      assert.equal(init.method, "POST");
      assert.equal((init.headers as Record<string, string>).Authorization, "Bearer test-key-not-real");
      const body = JSON.parse(String(init.body));
      assert.equal(body.model, "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", "default vision model from the original");
      assert.equal(body.stream, false);
      assert.equal(body.max_tokens, 1200);
      assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
      const [textPart, imagePart] = body.messages[0].content;
      assert.equal(textPart.type, "text");
      assert.match(textPart.text, /Identify the main Indian monument in this image/);
      assert.equal(imagePart.type, "image_url");
      assert.equal(imagePart.image_url.url, `data:image/jpeg;base64,${JPEG}`, "image forwarded unchanged as a JPEG data URL");
    },
  );
});

test("honours NVIDIA_VISION_MODEL and follows 202 polling", async () => {
  await withMockedNvidia(
    (call) => (call === 1 ? Response.json({ requestId: "req-1" }, { status: 202 }) : modelReply('{"monument_name":"Unknown","is_unknown":true}')),
    async (calls) => {
      process.env.NVIDIA_VISION_MODEL = "custom/vision-model";
      const response = await recognize(post({ image_b64: JPEG }));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).is_unknown, true);
      assert.equal(JSON.parse(String(calls[0].init.body)).model, "custom/vision-model");
      assert.equal(calls[1].url, "https://integrate.api.nvidia.com/v1/status/req-1");
      delete process.env.NVIDIA_VISION_MODEL;
    },
  );
});

test("maps upstream failures to honest errors without leaking NVIDIA's text", async () => {
  await withMockedNvidia(
    () => Response.json({ detail: "internal upstream detail" }, { status: 401 }),
    async () => {
      const response = await recognize(post({ image_b64: JPEG }));
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.code, "ai_rejected", "a rejected key is reported as rejected, not as missing");
      assert.doesNotMatch(body.error, /internal upstream detail/);
    },
  );
  await withMockedNvidia(
    () => modelReply("I think this is a temple but I'm not sure."),
    async () => {
      const response = await recognize(post({ image_b64: JPEG }));
      assert.equal(response.status, 502);
      assert.equal((await response.json()).code, "upstream");
    },
  );
});

test("status reports a rejected key until a later call succeeds", async () => {
  resetAiState();
  await withMockedNvidia(
    () => Response.json({ detail: "unauthorised" }, { status: 403 }),
    async () => {
      await recognize(post({ image_b64: JPEG }));
      assert.equal(aiState(), "rejected");
      const body = await (await status()).json();
      assert.equal(body.ai, "rejected");
      assert.equal(body.live, false, "live AI is off while the key is rejected");
    },
  );
  await withMockedNvidia(
    () => modelReply('{"monument_name":"Unknown","is_unknown":true}'),
    async () => {
      assert.equal((await recognize(post({ image_b64: JPEG }))).status, 200);
      assert.equal(aiState(), "ready", "a successful call clears the rejected state");
    },
  );
  resetAiState();
  const realKey = process.env.NVIDIA_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  assert.equal(aiState(), "missing");
  if (realKey !== undefined) process.env.NVIDIA_API_KEY = realKey;
});
