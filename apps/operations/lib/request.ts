import { DomainError } from "./domain.ts";
export function assertLocal(request: Request) {
  // Next may normalize request.url to localhost while the browser uses 127.0.0.1.
  // Compare the browser Origin with the actual, allowlisted Host header.
  const incoming = new URL(request.url);
  const url = new URL(
    `${incoming.protocol}//${request.headers.get("host") ?? incoming.host}`,
  );
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    throw new DomainError("This sandbox is available on localhost only.", 403);
  if (
    process.env.NODE_ENV === "production" &&
    process.env.OPS_LOCAL_DEMO !== "true"
  )
    throw new DomainError(
      "Production access is disabled. Staff authentication and a production data store are required.",
      503,
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    throw new DomainError("Cross-origin requests are not allowed.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new DomainError("Cross-site requests are not allowed.", 403);
}
export async function jsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new DomainError("Send JSON.", 415);
  const text = await request.text();
  if (text.length > 10_000) throw new DomainError("Request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError("Invalid JSON.");
  }
}
export function failure(error: unknown) {
  if (error instanceof DomainError)
    return Response.json({ error: error.message }, { status: error.code });
  console.error(
    "Operations request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    {
      error:
        "Could not save or load the local workspace. Your previous records have not been reset.",
    },
    { status: 500 },
  );
}
