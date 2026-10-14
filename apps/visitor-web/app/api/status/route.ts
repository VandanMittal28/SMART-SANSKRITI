import { json } from "../../../lib/server/http.ts";
import { isNvidiaConfigured } from "../../../lib/server/nvidia.ts";
import { opsReachable } from "../../../lib/server/ops.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tells the interface which capabilities are switched on, so it can show
// honest "unavailable" states. Exposes booleans only: never keys or URLs.
export async function GET(): Promise<Response> {
  let reachable = false;
  try {
    reachable = await opsReachable();
  } catch {
    reachable = false;
  }
  return json({ live: isNvidiaConfigured(), reports: { mode: "local-demo", reachable } });
}
