import { getReportCatalog } from "../../../../lib/server/visitor-reports.ts";
import { reportingMode } from "../../../../lib/server/ops.ts";
import { json, errorResponse } from "../../../../lib/server/http.ts";
import { REPORT_ZONES } from "../../../../lib/report.ts";
export const dynamic = "force-dynamic";
export async function GET() {
 try {
  const mode = reportingMode();
  if (mode === 'supabase') return json({mode, ...await getReportCatalog()});
  return json({mode, sites: [{id:'local-demo', name:'Heritage Park · local demo'}], zones: REPORT_ZONES.map(z => ({zone_key:z.id, name:z.name,site_id:'local-demo'}))});
 } catch(error) { return errorResponse(error); }
}
