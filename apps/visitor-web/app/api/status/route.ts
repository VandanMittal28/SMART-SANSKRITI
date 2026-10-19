import { json } from "../../../lib/server/http.ts";
import { aiState } from "../../../lib/server/nvidia.ts";
import { opsReachable, reportingMode } from "../../../lib/server/ops.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tells the interface which capabilities are switched on, so it can show
// honest "unavailable" states. Exposes flags only: never keys or URLs.
export async function GET(): Promise<Response> {
  const mode = reportingMode();
  let reachable = false;
  if (mode === "local-demo") {
    try {
      reachable = await opsReachable();
    } catch {
      reachable = false;
    }
  }
  const ai = aiState();
  // live: whether to try AI features at all. ai: why not, when they're off.
  return json({ live: ai === "ready", ai, reports: { mode, reachable } });
}
