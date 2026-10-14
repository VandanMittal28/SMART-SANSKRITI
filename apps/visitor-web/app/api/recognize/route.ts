import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { recognizeMonument } from "../../../lib/server/nvidia.ts";
import { validateRecognize } from "../../../lib/server/validate.ts";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request): Promise<Response> {
  try {
    const { imageBase64 } = validateRecognize(await readJsonBody(request, 2_100_000));
    rateLimit("recognize", clientKey(request), 6);
    return json(await recognizeMonument(imageBase64));
  } catch (error) {
    return errorResponse(error);
  }
}
