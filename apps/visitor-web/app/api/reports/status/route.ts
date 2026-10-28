import {clientKey, errorResponse, json, rateLimit, readJsonBody} from "../../../../lib/server/http.ts";
import {assertReportingAvailable, reportingMode, fetchReportStatus} from "../../../../lib/server/ops.ts";
import {readVisitorReportStatus} from "../../../../lib/server/visitor-reports.ts";
import {validateReceiptQuery} from "../../../../lib/server/validate.ts";
export const dynamic = 'force-dynamic';
// Receipt secrets travel in a request body rather than browser/server URL logs.
export async function POST(request: Request) {
 try {
  assertReportingAvailable();
  rateLimit('report-status',clientKey(request),60);
  const body = await readJsonBody(request, 1024);
  const url = new URL('https://receipt.invalid');
  url.searchParams.set('id',String(body.id ?? ''));
  url.searchParams.set('token',String(body.token ?? ''));
  const {id,token} = validateReceiptQuery(url);
  return json(await (reportingMode()==='hosted-mms'?readVisitorReportStatus(id,token):fetchReportStatus(id,token)));
 } catch(error) {return errorResponse(error);}
}
