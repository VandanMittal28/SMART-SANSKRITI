import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { transcribeAudio } from "../../../lib/server/nvidia.ts";
import { validateTranscribe } from "../../../lib/server/validate.ts";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { audioBase64, language } = validateTranscribe(await readJsonBody(request, 700_000));
    rateLimit("transcribe", clientKey(request), 12);
    return json({ text: await transcribeAudio(audioBase64, language) });
  } catch (error) {
    return errorResponse(error);
  }
}
