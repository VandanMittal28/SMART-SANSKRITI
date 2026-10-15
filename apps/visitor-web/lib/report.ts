// Shared public report contract used by the web and mobile clients.

export const REPORT_CATEGORIES = [
  "Property damage",
  "Littering",
  "Restricted access",
  "Harassment",
  "Safety hazard",
  "Other site-rule concern",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const CATEGORY_HINTS: Record<ReportCategory, string> = {
  "Property damage": "Graffiti, broken stonework, damaged fittings",
  Littering: "Rubbish, spills or waste left behind",
  "Restricted access": "Someone entering a closed or protected area",
  Harassment: "Visitors or staff being harassed",
  "Safety hazard": "Loose stones, slippery floors, exposed wiring",
  "Other site-rule concern": "Anything else staff should know about",
};

export type ReportSite = { id: string; name: string; city: string; state: string };
export type ReportZone = { id: string; zone_key: string; name: string; site_id: string };
export type ReportZoneId = string;

export const NOTE_MAX_LENGTH = 1200;
/** Operations rejects decoded photos over 2,000,000 bytes. */
export const PHOTO_MAX_BYTES = 1_900_000;

export type ReportPoint = { latitude: number; longitude: number; accuracy?: number };

export type ReportSubmission = {
  id: string;
  token: string;
  siteId: string;
  category: ReportCategory;
  note: string;
  zoneId: ReportZoneId;
  point: ReportPoint | null;
  /** JPEG data URL, or null. */
  photo: string | null;
};

export type ReportStatus =
  | "reported"
  | "review"
  | "under_review"
  | "confirmed"
  | "unassigned"
  | "assigned"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed"
  | "dismissed";

export const STATUS_TEXT: Record<ReportStatus, { label: string; detail: string; done?: boolean }> = {
  reported: { label: "Report received", detail: "Site staff will review your report." },
  review: { label: "Waiting for review", detail: "Site staff will check the report before assigning it." },
  under_review: { label: "Under review", detail: "Site staff are reviewing the report." },
  confirmed: { label: "Confirmed", detail: "The site team confirmed the issue." },
  unassigned: { label: "Waiting for a staff member", detail: "It will be assigned to the next available person." },
  assigned: { label: "Assigned", detail: "A staff member has been asked to look into it." },
  acknowledged: { label: "Accepted", detail: "A staff member has accepted the report." },
  in_progress: { label: "Being handled", detail: "Someone is dealing with it now." },
  resolved: { label: "Resolved", detail: "Staff have marked the issue as resolved.", done: true },
  closed: { label: "Closed", detail: "The report has been closed.", done: true },
  dismissed: { label: "Closed without action", detail: "Staff reviewed it and took no further action.", done: true },
};

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && value in STATUS_TEXT;
}

export type Receipt = { id: string; token: string; category: string; createdAt: string };

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

/** RFC 4122 v4 id; falls back to getRandomValues where randomUUID is missing (plain-HTTP LAN testing). */
export function newReportId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const hex = randomHex(16).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** 64-hex private receipt token. Only its hash is stored by operations. */
export function newReceiptToken(): string {
  return randomHex(32);
}

export const DRAFT_KEY = "sanskriti-report-draft-v2";
export const RECEIPT_KEY = "sanskriti-report-receipt-v2";

export type ReportDraft = {
  category: ReportCategory | null;
  siteId: string | null;
  zoneId: ReportZoneId | null;
  note: string;
  point: ReportPoint | null;
  photo: string | null;
};

export const EMPTY_DRAFT: ReportDraft = { category: null, siteId: null, zoneId: null, note: "", point: null, photo: null };

export function readJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isDraft(value: unknown): value is ReportDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.category === null || REPORT_CATEGORIES.includes(v.category as ReportCategory)) &&
    (v.siteId === null || typeof v.siteId === "string") &&
    (v.zoneId === null || typeof v.zoneId === "string") &&
    typeof v.note === "string" &&
    (v.photo === null || typeof v.photo === "string")
  );
}

export function isReceipt(value: unknown): value is Receipt {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.token === "string" && /^[0-9a-f]{64}$/.test(v.token) && typeof v.category === "string";
}
