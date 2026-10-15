import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { validateReceiptQuery, validateReport } from "../../../lib/server/validate.ts";
import { createVisitorReport, getReportCatalog, readVisitorReportStatus } from "../../../lib/server/visitor-reports.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Android native wrapper posts JSON from appassets.androidplatform.net.
// Answer its CORS preflight explicitly so the browser bridge can submit.
export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request): Promise<Response> {
  try {
    rateLimit("visitor-reports", clientKey(request), 8);
    const report = validateReport(await readJsonBody(request, 3_000_000));
    const result = await createVisitorReport(report);
    return json(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (!url.searchParams.has("id") && !url.searchParams.has("token")) {
      return json(await getReportCatalog());
    }
    const { id, token } = validateReceiptQuery(url);
    rateLimit("visitor-report-status", clientKey(request), 60);
    return json(await readVisitorReportStatus(id, token));
  } catch (error) {
    return errorResponse(error);
  }
}
