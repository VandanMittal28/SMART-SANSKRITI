import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { askHeritageChat } from "../../../lib/server/nvidia.ts";
import { validateChat } from "../../../lib/server/validate.ts";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = validateChat(await readJsonBody(request, 32_000));
    rateLimit("chat", clientKey(request), 20);
    const answer = await askHeritageChat(input.question, input.monumentId, input.language);
    // { answer, response } matches apk/ui/app/api/chat/route.ts.
    return json({ answer, response: answer });
  } catch (error) {
    return errorResponse(error);
  }
}
