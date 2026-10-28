import { createVisitorReport, readVisitorReportStatus } from "../../../lib/server/visitor-reports.ts";
import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { assertReportingAvailable, fetchReportStatus, forwardReport, reportingMode } from "../../../lib/server/ops.ts";
import { validateReceiptQuery, validateReport } from "../../../lib/server/validate.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Routes validated reports to the configured hosted MMS or isolated local demo.
// Success requires a durable receipt from the selected backend.
export async function POST(request: Request): Promise<Response> {
  try {
    assertReportingAvailable();
    const report = validateReport(await readJsonBody(request, 3_000_000), reportingMode() === "supabase");
    rateLimit("reports", clientKey(request), 10);
    const result = reportingMode() === "supabase"
      ? await createVisitorReport({...report, siteId: report.siteId!})
      : await forwardReport(report);
    return json(result, result.duplicate ? 200 : 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    assertReportingAvailable();
    const { id, token } = validateReceiptQuery(new URL(request.url));
    rateLimit("report-status", clientKey(request), 60);
    return json(await (reportingMode() === "supabase" ? readVisitorReportStatus(id, token) : fetchReportStatus(id, token)));
  } catch (error) {
    return errorResponse(error);
  }
}
