import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./http.ts";
import type { ReportSite, ReportZone } from "../report.ts";

const SITE_IDS = ["taj-mahal", "qutub-minar", "red-fort", "konark"];

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new HttpError(503, "not_configured", "Online issue reporting is not configured yet.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getReportCatalog(): Promise<{ sites: ReportSite[]; zones: ReportZone[] }> {
  const supabase = client();
  const [sites, zones] = await Promise.all([
    supabase.from("heritage_sites").select("id,name,city,state").eq("active", true).in("id", SITE_IDS).order("name"),
    supabase.from("mms_zones").select("id,site_id,zone_key,name").eq("active", true).in("site_id", SITE_IDS).order("name"),
  ]);
  if (sites.error || zones.error) throw new HttpError(503, "upstream", "Site reporting locations are temporarily unavailable.");
  return { sites: (sites.data ?? []) as ReportSite[], zones: (zones.data ?? []) as ReportZone[] };
}

export type ReportSource = "Visitor report" | "Camera alert";

export async function createVisitorReport(report: {
  id: string; token: string; siteId: string; zoneId: string; category: string; note: string;
  point: { latitude: number; longitude: number; accuracy?: number } | null; photo: string | null;
  /** 'Camera alert' marks an unconfirmed Heritage Watch detection. */
  source?: ReportSource;
}) {
  const supabase = client();
  const { data: auth, error: authError } = await supabase.auth.signInAnonymously();
  if (authError || !auth.user) throw new HttpError(503, "upstream", "A secure visitor session could not be started. Please try again.");

  let photoPath: string | null = null;
  if (report.photo) {
    const payload = report.photo.slice(report.photo.indexOf(",") + 1);
    const bytes = Buffer.from(payload, "base64");
    if (bytes.length < 100 || bytes.length > 2_000_000 || !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
      throw new HttpError(400, "invalid", "The attached photo could not be verified as a JPEG.");
    }
    photoPath = `${auth.user.id}/${report.siteId}/${report.id}.jpg`;
    const { error: uploadError } = await supabase.storage.from("visitor-reports").upload(photoPath, bytes, {
      contentType: "image/jpeg", upsert: false, cacheControl: "3600",
    });
    if (uploadError) throw new HttpError(503, "upstream", "The photo could not be uploaded. Your report was not sent.");
  }

  const { data, error } = await supabase.rpc("mms_submit_visitor_report", {
    p_id: report.id,
    p_token: report.token,
    p_site_id: report.siteId,
    p_zone_key: report.zoneId,
    p_category: report.category,
    p_note: report.note,
    p_latitude: report.point?.latitude ?? null,
    p_longitude: report.point?.longitude ?? null,
    p_accuracy_m: report.point?.accuracy === undefined ? null : Math.round(report.point.accuracy),
    p_photo_path: photoPath,
    // Only sent when it differs from the function's own default, so this keeps
    // working against a database where 20261019120000_mms_camera_alert_source
    // has not been applied yet: PostgREST resolves the overload by argument
    // names, and an unknown p_source is a hard "function not found".
    ...(report.source === "Camera alert" ? { p_source: "Camera alert" } : {}),
  });
  if (error) {
    // The function raises for bad input as well as for real failures, and the
    // two need different answers: 503 invites a retry, which for a wrong zone
    // or category would repeat forever. Heritage Watch retries on its own.
    const rejected = /Choose an active area|Choose a supported heritage site|Choose a valid report category|Unsupported report source|Invalid receipt token|Report details are too long|Location was invalid|Photo path was invalid/i;
    if (rejected.test(error.message)) {
      throw new HttpError(400, "invalid", error.message.includes("Choose an active area")
        ? "Choose an available area at this site."
        : "That report was rejected by the site workspace.");
    }
    if (error.code === "PGRST202" && report.source === "Camera alert") {
      throw new HttpError(503, "not_configured",
        "Automated camera alerts need a database update that has not been applied yet.");
    }
    throw new HttpError(503, "upstream", "The report could not be saved. Please try again.");
  }
  const receipt = Array.isArray(data) ? data[0] : data;
  if (!receipt?.id || !receipt?.status) throw new HttpError(502, "upstream", "The site team did not confirm the report.");
  return { id: receipt.id as string, status: receipt.status as string };
}

export async function readVisitorReportStatus(id: string, token: string) {
  const supabase = client();
  const { data, error } = await supabase.rpc("mms_visitor_report_status", { p_id: id, p_token: token });
  if (error) throw new HttpError(503, "upstream", "Report status is temporarily unavailable.");
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new HttpError(404, "invalid", "No report matches that private receipt.");
  return {
    id: result.id as string,
    category: result.category as string,
    status: result.status as string,
    createdAt: result.created_at as string,
    updatedAt: result.updated_at as string,
  };
}
