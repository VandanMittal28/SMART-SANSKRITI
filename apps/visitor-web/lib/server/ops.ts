// Server-side bridge to the LOCAL operations demo (apps/operations).
//
// The operations report API is a local sandbox: it accepts requests only on
// localhost, only from its own origin or the Android app, and refuses to run
// in production unless OPS_LOCAL_DEMO=true. This bridge keeps those limits:
// it only talks to a loopback address, forwards only validated fields, and
// sends no Origin header or cookies, which is how a same-machine server
// request appears to operations. It does not modify or bypass operations.

import { HttpError } from "./http.ts";

export type ReportingMode = "local-demo" | "unavailable";

/**
 * Reporting goes only to the operations demo on the same computer, so it is
 * enabled only where that makes sense:
 *   - never on Vercel (VERCEL=1): a hosted site can't reach anyone's computer;
 *   - in development (`next dev`), where it is the local demo;
 *   - in a production build only with an explicit REPORTS_MODE=local-demo
 *     (e.g. testing `next start` on the same machine as operations).
 * Everything else is "unavailable": there is no public reporting
 * destination yet, so production must never send reports to localhost.
 */
export function reportingMode(env: Record<string, string | undefined> = process.env): ReportingMode {
  if (env.VERCEL === "1") return "unavailable";
  if (env.NODE_ENV === "production" && env.REPORTS_MODE !== "local-demo") return "unavailable";
  return "local-demo";
}

export function assertReportingAvailable(env: Record<string, string | undefined> = process.env): void {
  if (reportingMode(env) === "unavailable") {
    throw new HttpError(503, "reporting_unavailable", "Reporting isn't available on the public website yet.");
  }
}

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function opsBaseUrl(env: Record<string, string | undefined> = process.env): URL {
  const raw = env.OPS_BASE_URL?.trim() || "http://127.0.0.1:3100";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(503, "local_only", "Reporting isn't configured correctly.");
  }
  if (!LOOPBACK.has(url.hostname) || !/^https?:$/.test(url.protocol)) {
    throw new HttpError(503, "local_only", "Reporting is only available as a local demo on this computer.");
  }
  return url;
}

type OpsResult = { status: number; body: Record<string, unknown> };

async function call(path: string, init: RequestInit, timeoutMs: number): Promise<OpsResult> {
  // Defence in depth: every request to operations re-checks the mode, so no
  // code path can contact localhost while reporting is unavailable.
  assertReportingAvailable();
  const url = new URL(path, opsBaseUrl());
  let response: Response;
  try {
    response = await fetch(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new HttpError(503, "ops_unavailable", "The local operations demo isn't running, so the report couldn't be sent.");
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body: body && typeof body === "object" ? body : {} };
}

function opsError(result: OpsResult): HttpError {
  const message = typeof result.body.error === "string" ? result.body.error.slice(0, 200) : "";
  if (result.status === 403) return new HttpError(503, "local_only", "The operations demo refused the request. It only accepts local requests while running in demo mode.");
  if (result.status === 400) return new HttpError(400, "invalid", message || "The operations demo rejected the report.");
  return new HttpError(502, "upstream", "The operations demo couldn't process the report.");
}

export async function forwardReport(report: Record<string, unknown>): Promise<{ id: string; status: string; duplicate: boolean }> {
  // Operations runs its own NVIDIA assessment before saving, so allow time.
  const result = await call("/api/demo/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) }, 40_000);
  if (result.status !== 200 && result.status !== 201) throw opsError(result);
  const { id, status, duplicate } = result.body;
  if (typeof id !== "string" || typeof status !== "string") {
    throw new HttpError(502, "upstream", "The operations demo didn't confirm the report.");
  }
  return { id, status, duplicate: duplicate === true };
}

export async function fetchReportStatus(id: string, token: string): Promise<Record<string, unknown>> {
  const query = `?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  const result = await call(`/api/demo/reports${query}`, { method: "GET" }, 8_000);
  if (result.status !== 200) throw opsError(result);
  const { id: rid, category, status, createdAt, updatedAt } = result.body;
  if (typeof rid !== "string" || typeof status !== "string") throw new HttpError(502, "upstream", "The operations demo returned an unexpected status.");
  return { id: rid, category, status, createdAt, updatedAt };
}

let cached: { at: number; reachable: boolean } | null = null;

/** True if the operations demo answers on its guest endpoint. Cached for 10 s. */
export async function opsReachable(now = Date.now()): Promise<boolean> {
  if (cached && now - cached.at < 10_000) return cached.reachable;
  let reachable = false;
  try {
    // A deliberately unknown receipt: a running demo answers 400 "Receipt not found".
    const result = await call(`/api/demo/reports?id=00000000-0000-4000-8000-000000000000&token=${"0".repeat(64)}`, { method: "GET" }, 1_500);
    reachable = result.status === 400 || result.status === 200;
  } catch {
    reachable = false;
  }
  cached = { at: now, reachable };
  return reachable;
}

export function resetOpsCache(): void {
  cached = null;
}
