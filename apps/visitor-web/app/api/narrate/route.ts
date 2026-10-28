import {getNvidiaNarrationVoice} from "../../../lib/narrationProfiles.ts";
import {isSupportedLanguage} from "../../../lib/original/languages.ts";
import { clientKey, errorResponse, HttpError, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { synthesizeNarration } from "../../../lib/server/nvidia.ts";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request, 24_000);
    if (typeof body.text !== "string" || !isSupportedLanguage(body.language)) {
      throw new HttpError(400, "invalid", "Narration text, language, and voice are required.");
    }
    rateLimit("narrate", clientKey(request), 8);
    const voice = getNvidiaNarrationVoice(typeof body.monumentId === 'string' ? body.monumentId : 'yatrik-guide', body.language);
    if (!voice) throw new HttpError(400, 'invalid', 'Use device narration for this language.');
    const audio = await synthesizeNarration(body.text, voice.language, voice.voice);
    return new Response(Buffer.from(audio, 'base64'), {headers: {'Content-Type':'audio/wav','Cache-Control':'no-store'}});
  } catch (error) {
    return errorResponse(error);
  }
}
