// Typed browser calls to this website's own server routes. No third-party
// service is called from the browser, and no key ever reaches it.

import type { ReportStatus, ReportSubmission } from "./report";

export type ApiErrorCode =
  | "not_configured"
  | "rate_limited"
  | "too_large"
  | "invalid"
  | "upstream"
  | "ops_unavailable"
  | "local_only"
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

export type Capabilities = {
  live: boolean;
  reports: { mode: "local-demo"; reachable: boolean };
};

export const getCapabilities = () => call<Capabilities>("/api/status", { timeoutMs: 8_000 });

// Request/response shapes follow the original apk/ui routes.
export const askYatrik = (body: { question: string; monumentId?: string; language: "en" | "hi" }, signal?: AbortSignal) =>
  call<{ answer: string }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ question: body.question, monument_id: body.monumentId ?? "", lang: body.language }),
    signal,
  });

export type Recognition = {
  monument_name: string;
  monument_id: string;
  location: string;
  category: string;
  religion: string;
  era_or_dynasty: string;
  architecture_style: string;
  confidence_score: number;
  key_identifiers: string[];
  brief_description: string;
  reasoning: string;
  is_unknown: boolean;
};

export const recogniseImage = (imageBase64: string, signal?: AbortSignal) =>
  call<Recognition>("/api/recognize", { method: "POST", body: JSON.stringify({ image_b64: imageBase64 }), signal, timeoutMs: 90_000 });

export const transcribe = (audioBase64: string, language: "en" | "hi") =>
  call<{ text: string }>("/api/transcribe", { method: "POST", body: JSON.stringify({ audio_b64: audioBase64, language }), timeoutMs: 60_000 });

export type ReportReceiptResponse = { id: string; status: ReportStatus; duplicate?: boolean };

export const submitReport = (report: ReportSubmission) =>
  call<ReportReceiptResponse>("/api/reports", { method: "POST", body: JSON.stringify(report), timeoutMs: 45_000 });

export type ReportStatusResponse = { id: string; category: string; status: ReportStatus; createdAt: string; updatedAt: string };

export const getReportStatus = (id: string, token: string) =>
  call<ReportStatusResponse>(`/api/reports?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`, { timeoutMs: 10_000 });
