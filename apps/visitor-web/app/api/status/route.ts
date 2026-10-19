import { json } from "../../../lib/server/http.ts";
import { aiState } from "../../../lib/server/nvidia.ts";
import { opsReachable, reportingMode } from "../../../lib/server/ops.ts";
import { getReportCatalog } from "../../../lib/server/visitor-reports.ts";

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
  } else if (mode === "hosted-mms") {
    // Reachable means a report submitted right now would land somewhere: the
    // catalogue read proves the credentials work and the four sites are there.
    try {
      const catalog = await getReportCatalog();
      reachable = catalog.sites.length > 0 && catalog.zones.length > 0;
    } catch {
      reachable = false;
    }
  }
  const ai = aiState();
  // live: whether to try AI features at all. ai: why not, when they're off.
  return json({ live: ai === "ready", ai, reports: { mode, reachable } });
}
