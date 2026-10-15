import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { translateMobileTexts } from "../../../lib/server/nvidia.ts";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request, 100_000);
    if (!Array.isArray(body.texts) || typeof body.language !== "string") {
      return json({ error: "A language and list of text are required." }, 400);
    }
    rateLimit("translate", clientKey(request), 12);
    return json({ translations: await translateMobileTexts(body.texts as string[], body.language) });
  } catch (error) {
    return errorResponse(error);
  }
}
