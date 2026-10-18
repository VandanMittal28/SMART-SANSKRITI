// Typed browser call to this website's /api/status route. The ported screens
// call their routes through lib/original/apiClient.ts. No third-party service
// is called from the browser, and no key ever reaches it.

export type ApiErrorCode =
  | "not_configured"
  | "rate_limited"
  | "too_large"
  | "invalid"
  | "upstream"
  | "ops_unavailable"
  | "local_only"
  | "reporting_unavailable"
  | "ai_rejected"
  | "network"
  | "aborted"
  | "unknown";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const outer = init.signal;
  const onAbort = () => controller.abort();
  outer?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 60_000);
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
      cache: "no-store",
    });
  } catch {
    if (outer?.aborted) throw new ApiError("aborted", "Cancelled.");
    if (controller.signal.aborted) throw new ApiError("network", "The request took too long. Check your connection and try again.");
    throw new ApiError("network", "Couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onAbort);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON error page.
  }
  if (!response.ok) {
    const body = (data ?? {}) as { error?: unknown; code?: unknown };
    const code = (typeof body.code === "string" ? body.code : response.status === 429 ? "rate_limited" : response.status === 413 ? "too_large" : "unknown") as ApiErrorCode;
    throw new ApiError(code, typeof body.error === "string" ? body.error : "Something went wrong.", response.status);
  }
  return data as T;
}

export type AiState = "ready" | "missing" | "rejected";

export type Capabilities = {
  live: boolean;
  ai: AiState;
  reports: { mode: "local-demo" | "unavailable"; reachable: boolean };
};

export const getCapabilities = () => call<Capabilities>("/api/status", { timeoutMs: 8_000 });
