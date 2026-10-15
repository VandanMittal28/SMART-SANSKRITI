import { clientKey, errorResponse, HttpError, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { synthesizeNarration } from "../../../lib/server/nvidia.ts";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request, 24_000);
    if (typeof body.text !== "string" || typeof body.language !== "string" || typeof body.voice !== "string") {
      throw new HttpError(400, "invalid", "Narration text, language, and voice are required.");
    }
    rateLimit("narrate", clientKey(request), 8);
    return json({ audioBase64: await synthesizeNarration(body.text, body.language, body.voice) });
  } catch (error) {
    return errorResponse(error);
  }
}
