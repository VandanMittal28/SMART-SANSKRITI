import { clientKey, errorResponse, json, rateLimit, readJsonBody, HttpError } from "../../../lib/server/http.ts";
import { translateMobileTexts } from "../../../lib/server/nvidia.ts";
import { isSupportedLanguage } from "../../../lib/original/languages.ts";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request) {
 try {
  const body = await readJsonBody(request, 24000);
  const keys = ['directionHint', 'arrivalFact', 'miniFact'] as const;
  if (!isSupportedLanguage(body.language) || keys.some(k => typeof body[k] !== 'string' || String(body[k]).length > 2000)) throw new HttpError(400, 'invalid', 'Complete guide text and a supported language are required.');
  rateLimit('explore-translate', clientKey(request), 12);
  const values = await translateMobileTexts(keys.map(k => String(body[k])), body.language);
  return json(Object.fromEntries(keys.map((k,i) => [k, values[i]])));
 } catch(error) { return errorResponse(error); }
}
