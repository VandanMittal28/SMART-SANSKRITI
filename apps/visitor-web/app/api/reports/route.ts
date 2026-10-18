import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { assertReportingAvailable, fetchReportStatus, forwardReport } from "../../../lib/server/ops.ts";
import { validateReceiptQuery, validateReport } from "../../../lib/server/validate.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Visitor reports for the LOCAL operations demo. Success is returned only when
// operations itself confirms the report with an id and status. On the public
// Vercel deployment both handlers refuse before contacting anything.
export async function POST(request: Request): Promise<Response> {
  try {
    assertReportingAvailable();
    const report = validateReport(await readJsonBody(request, 3_000_000));
    rateLimit("reports", clientKey(request), 10);
    const result = await forwardReport(report);
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
    return json(await fetchReportStatus(id, token));
  } catch (error) {
    return errorResponse(error);
  }
}
