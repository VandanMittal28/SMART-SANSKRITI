// Route handlers called directly with web-standard Requests. The NVIDIA key is
// removed for these tests, so they verify the honest "not configured" path
// and never contact NVIDIA. The reports bridge is tested against a fake
// operations server on a random local port.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resetRateLimits } from "../lib/server/http.ts";
import { resetOpsCache } from "../lib/server/ops.ts";
import { POST as chat } from "../app/api/chat/route.ts";
import { POST as recognize } from "../app/api/recognize/route.ts";
import { POST as transcribe } from "../app/api/transcribe/route.ts";
import { GET as reportStatus, POST as report } from "../app/api/reports/route.ts";
import { GET as status } from "../app/api/status/route.ts";

delete process.env.NVIDIA_API_KEY;

const post = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 7)]).toString("base64");
const WAV = (() => {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.write("WAVE", 8, "ascii");
  return Buffer.concat([header, Buffer.alloc(32_000)]).toString("base64");
})();

test("AI routes say 'not configured' (503) without a key, after validating input", async () => {
  resetRateLimits();
  for (const [handler, body] of [
    [chat, { question: "Who built the Taj Mahal?", lang: "en" }],
    [recognize, { image_b64: JPEG }],
    [transcribe, { audio_b64: WAV, language: "en" }],
  ] as const) {
    const response = await handler(post(body));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "not_configured");
  }
  assert.equal((await chat(post({ question: "" }))).status, 400);
  assert.equal((await recognize(post({ image_b64: "nope" }))).status, 400);
});

test("AI routes rate-limit repeated calls per client", async () => {
  resetRateLimits();
  let last = 0;
  for (let i = 0; i < 7; i += 1) last = (await recognize(post({ image_b64: JPEG }))).status;
  assert.equal(last, 429);
});

type Seen = { method?: string; url?: string; origin?: string; cookie?: string; body?: Record<string, unknown> };

async function fakeOps(handler: (req: IncomingMessage, body: string) => [number, unknown]): Promise<{ server: Server; seen: Seen[]; url: string }> {
  const seen: Seen[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, origin: req.headers.origin, cookie: req.headers.cookie, body: body ? JSON.parse(body) : undefined });
      const [code, payload] = handler(req, body);
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, seen, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

const goodReport = {
  id: "3f1c2b6e-8d4a-4c1e-9b7a-2e5f6a7b8c9d",
  token: "b".repeat(64),
  category: "Safety hazard",
  note: "Loose stone on the steps",
  zoneId: "courtyard",
  point: null,
  photo: null,
  extra: "should not be forwarded",
};

test("reports are forwarded with validated fields only, and success needs confirmation", async () => {
  resetRateLimits();
  const ops = await fakeOps((req) => (req.method === "POST" ? [201, { id: goodReport.id, status: "review", token: "x", duplicate: false }] : [200, {}]));
  process.env.OPS_BASE_URL = ops.url;
  try {
    const response = await report(post(goodReport));
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { id: goodReport.id, status: "review", duplicate: false });
    const sent = ops.seen[0];
    assert.equal(sent.url, "/api/demo/reports");
    assert.equal(sent.origin, undefined, "no Origin header is sent to operations");
    assert.equal(sent.cookie, undefined);
    assert.equal(sent.body?.extra, undefined, "unknown fields are dropped");
    assert.equal(sent.body?.category, "Safety hazard");
  } finally {
    ops.server.close();
  }
});

test("an unconfirmed or refused report is never reported as a success", async () => {
  resetRateLimits();
  const ops = await fakeOps(() => [201, { ok: true }]);
  process.env.OPS_BASE_URL = ops.url;
  try {
    assert.equal((await report(post(goodReport))).status, 502);
  } finally {
    ops.server.close();
  }
  const refusing = await fakeOps(() => [403, { error: "Local demo only" }]);
  process.env.OPS_BASE_URL = refusing.url;
  try {
    const response = await report(post(goodReport));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "local_only");
  } finally {
    refusing.server.close();
  }
});

test("reports fail clearly when operations is not running or not local", async () => {
  resetRateLimits();
  process.env.OPS_BASE_URL = "http://127.0.0.1:9"; // nothing listens on the discard port
  const down = await report(post(goodReport));
  assert.equal(down.status, 503);
  assert.equal((await down.json()).code, "ops_unavailable");
  process.env.OPS_BASE_URL = "https://ops.example.com";
  assert.equal((await (await report(post(goodReport))).json()).code, "local_only");
});

test("receipt status is proxied and validated", async () => {
  resetRateLimits();
  const ops = await fakeOps(() => [200, { id: goodReport.id, category: "Safety hazard", status: "assigned", createdAt: "a", updatedAt: "b", secret: "no" }]);
  process.env.OPS_BASE_URL = ops.url;
  try {
    const ok = await reportStatus(new Request(`http://localhost/api/reports?id=${goodReport.id}&token=${goodReport.token}`));
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.status, "assigned");
    assert.equal(body.secret, undefined);
    assert.equal((await reportStatus(new Request("http://localhost/api/reports?id=x&token=y"))).status, 400);
  } finally {
    ops.server.close();
  }
});

test("status exposes only booleans", async () => {
  resetOpsCache();
  process.env.OPS_BASE_URL = "http://127.0.0.1:9";
  const body = await (await status()).json();
  assert.deepEqual(body, { live: false, ai: "missing", reports: { mode: "local-demo", reachable: false } });
});

test("on Vercel, reporting is off: status says so and nothing reaches operations", async () => {
  resetRateLimits();
  resetOpsCache();
  const ops = await fakeOps(() => [201, { id: goodReport.id, status: "review" }]);
  process.env.OPS_BASE_URL = ops.url;
  process.env.VERCEL = "1";
  try {
    assert.deepEqual(await (await status()).json(), { live: false, ai: "missing", reports: { mode: "unavailable", reachable: false } });
    const posted = await report(post(goodReport));
    assert.equal(posted.status, 503);
    const body = await posted.json();
    assert.equal(body.code, "reporting_unavailable");
    assert.equal(body.error, "Reporting isn't available on the public website yet.");
    const statusCheck = await reportStatus(new Request(`http://localhost/api/reports?id=${goodReport.id}&token=${goodReport.token}`));
    assert.equal((await statusCheck.json()).code, "reporting_unavailable");
    assert.equal(ops.seen.length, 0, "operations is never contacted on the public deployment");
  } finally {
    delete process.env.VERCEL;
    ops.server.close();
  }
});

test("off Vercel, local reporting still works", async () => {
  resetRateLimits();
  resetOpsCache();
  const ops = await fakeOps((req) => (req.method === "POST" ? [201, { id: goodReport.id, status: "review", duplicate: false }] : [400, { error: "Receipt not found" }]));
  process.env.OPS_BASE_URL = ops.url;
  delete process.env.VERCEL;
  try {
    assert.deepEqual((await (await status()).json()).reports, { mode: "local-demo", reachable: true });
    assert.equal((await report(post(goodReport))).status, 201);
  } finally {
    ops.server.close();
  }
});

test("production builds never contact localhost unless explicitly opted in, and never claim success", async () => {
  resetRateLimits();
  resetOpsCache();
  const ops = await fakeOps(() => [201, { id: goodReport.id, status: "review", duplicate: false }]);
  process.env.OPS_BASE_URL = ops.url;
  const realNodeEnv = process.env.NODE_ENV;
  const env = process.env as Record<string, string | undefined>;
  try {
    // A production server that isn't on Vercel and hasn't opted in.
    env.NODE_ENV = "production";
    delete process.env.REPORTS_MODE;
    delete process.env.VERCEL;
    assert.deepEqual((await (await status()).json()).reports, { mode: "unavailable", reachable: false });
    for (const response of [await report(post(goodReport)), await reportStatus(new Request(`http://localhost/api/reports?id=${goodReport.id}&token=${goodReport.token}`))]) {
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.code, "reporting_unavailable");
      assert.equal(body.id, undefined, "no receipt id, so nothing can look like a success");
    }
    // Opting in on Vercel still doesn't enable it.
    process.env.REPORTS_MODE = "local-demo";
    process.env.VERCEL = "1";
    assert.equal((await report(post(goodReport))).status, 503);
    assert.equal(ops.seen.length, 0, "operations (localhost) was never contacted");

    // Explicit opt-in on a non-Vercel production server keeps the local demo working.
    delete process.env.VERCEL;
    resetOpsCache();
    assert.equal((await report(post(goodReport))).status, 201);
    assert.equal(ops.seen.length, 1);
  } finally {
    if (realNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = realNodeEnv;
    delete process.env.REPORTS_MODE;
    delete process.env.VERCEL;
    ops.server.close();
  }
});
