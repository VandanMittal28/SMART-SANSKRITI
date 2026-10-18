// Small helpers shared by the route handlers. Server-only: never import from a
// "use client" module. Uses relative .ts imports so Node's test runner can
// load the routes directly.

export type ErrorCode =
  | "invalid"
  | "too_large"
  | "rate_limited"
  | "not_configured"
  | "upstream"
  | "ops_unavailable"
  | "local_only"
  | "reporting_unavailable"
  | "ai_rejected";

export class HttpError extends Error {
  status: number;
  code: ErrorCode;
  // Explicit fields (not parameter properties) so Node's type stripping can run the tests.
  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(value: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message, code: error.code }, error.status, error.status === 429 ? { "Retry-After": "60" } : {});
  }
  console.error("visitor-web route failed:", error instanceof Error ? error.message : error);
  return json({ error: "Something went wrong on our side. Please try again.", code: "upstream" }, 502);
}

/** Reads a JSON object body, refusing anything over `maxBytes` before parsing. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "invalid", "Send the request as JSON.");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "too_large", "That request is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large", "That request is too large.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid", "The request wasn't valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "invalid", "The request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

/** Best-effort client key for rate limiting. Behind a proxy, configure it to set x-forwarded-for. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * In-memory fixed-window limiter. It protects the NVIDIA key from accidental
 * loops and casual abuse on a single server process; it is not a substitute
 * for gateway-level rate limiting in a public deployment.
 */
export function rateLimit(scope: string, key: string, limit: number, windowMs = 60_000, now = Date.now()): void {
  const id = `${scope}:${key}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new HttpError(429, "rate_limited", "Too many requests. Please wait a minute and try again.");
}

export function resetRateLimits(): void {
  buckets.clear();
}
