import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { assessHeritageScene } from "../../../lib/server/nvidia.ts";
import { validateHeritageWatch } from "../../../lib/server/validate.ts";

export const runtime = "nodejs";
export const maxDuration = 90;

// Heritage Watch samples frames continuously while Explore is open, so its
// ceiling is higher than recognition's — but still a ceiling, because a stuck
// client loop would otherwise spend the NVIDIA budget on a single phone.
const REQUESTS_PER_MINUTE = 20;

export async function POST(request: Request): Promise<Response> {
  try {
    // Two JPEG frames plus the motion line; recognition's limit, doubled.
    const scene = validateHeritageWatch(await readJsonBody(request, 4_200_000));
    rateLimit("heritage-watch", clientKey(request), REQUESTS_PER_MINUTE);
    return json(await assessHeritageScene(scene));
  } catch (error) {
    return errorResponse(error);
  }
}
