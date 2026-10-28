import { clientKey, errorResponse, json, rateLimit, readJsonBody } from "../../../lib/server/http.ts";
import { assertReportingAvailable, fetchReportStatus, forwardReport, reportingMode } from "../../../lib/server/ops.ts";
import { createVisitorReport, getReportCatalog, readVisitorReportStatus } from "../../../lib/server/visitor-reports.ts";
import { demoCatalog, validateReceiptQuery, validateReport } from "../../../lib/server/validate.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Android and iOS shells post JSON from their own bundle origins
// (appassets.androidplatform.net, and a loopback origin on iOS). Answer the
// CORS preflight explicitly so the packaged apps can submit.
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

const cors = { "Access-Control-Allow-Origin": "*" };

/**
 * Two destinations, one contract.
 *
 * With Supabase configured the report becomes a real MMS incident that the
 * site team works in `apps/operations`. Without it, development forwards to
 * the local operations sandbox. The validator is told which one is active
 * because they disagree about zones: the hosted workspace has real,
 * per-site zone keys, the sandbox has four fixed ones.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertReportingAvailable();
    const mode = reportingMode();
    const report = validateReport(await readJsonBody(request, 3_000_000), mode);
    rateLimit("reports", clientKey(request), 10);

    if (mode === "hosted-mms") {
      const result = await createVisitorReport(report);
      return json(result, result.duplicate ? 200 : 201, cors);
    }

    // The sandbox has no notion of a site or an MMS source; don't send it
    // fields it never asked for.
    const { siteId: _siteId, source: _source, ...demoReport } = report;
    const result = await forwardReport(demoReport);
    return json(result, result.duplicate ? 200 : 201, cors);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Without `id`/`token` this is the catalogue the report screen needs before a
 * visitor can choose where the issue is; with them it is a receipt lookup.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    assertReportingAvailable();
    const mode = reportingMode();
    const url = new URL(request.url);

    if (!url.searchParams.has("id") && !url.searchParams.has("token")) {
      rateLimit("report-catalog", clientKey(request), 30);
      return json(mode === "hosted-mms" ? await getReportCatalog() : demoCatalog(), 200, cors);
    }

    const { id, token } = validateReceiptQuery(url);
    rateLimit("report-status", clientKey(request), 60);
    return json(
      mode === "hosted-mms" ? await readVisitorReportStatus(id, token) : await fetchReportStatus(id, token),
      200,
      cors,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
