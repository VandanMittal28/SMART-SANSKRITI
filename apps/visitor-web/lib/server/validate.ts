// Input validation for the route handlers. Pure functions, unit-tested.

import { NOTE_MAX_LENGTH, REPORT_CATEGORIES, REPORT_ZONES, type ReportCategory, type ReportPoint, type ReportZoneId } from "../report.ts";
import { HttpError } from "./http.ts";

export type Language = "en" | "hi";

const bad = (message: string) => new HttpError(400, "invalid", message);

// Same contract and 2,000-character limit as apk/ui/app/api/chat/route.ts:
// { question, monument_id, lang }. As in the original, monument_id may be any
// monument id the app derives (for example from a recognised name); unknown
// ids are used as the monument's name in the prompt. It is limited here to a
// short lowercase slug, the only form the app sends. Only en/hi are offered.
export const QUESTION_MAX_LENGTH = 2_000;

export function validateChat(body: Record<string, unknown>): { question: string; monumentId: string | undefined; language: Language } {
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) throw bad("Type a question first.");
  if (question.length > QUESTION_MAX_LENGTH) throw bad(`Keep questions under ${QUESTION_MAX_LENGTH} characters.`);
  const monumentId = body.monument_id;
  if (monumentId !== undefined && monumentId !== null && monumentId !== "" && (typeof monumentId !== "string" || !/^[a-z0-9-]{1,80}$/.test(monumentId))) throw bad("Unknown monument.");
  return { question, monumentId: typeof monumentId === "string" && monumentId ? monumentId : undefined, language: body.lang === "hi" ? "hi" : "en" };
}

function decodeBase64(value: unknown, field: string, maxBytes: number): Buffer {
  if (typeof value !== "string" || !value) throw bad(`Missing ${field}.`);
  const payload = value.replace(/^data:[\w/+.-]+;base64,/, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) throw bad(`The ${field} wasn't valid base64.`);
  if (Math.floor((payload.length * 3) / 4) > maxBytes) throw new HttpError(413, "too_large", `That ${field} is too large.`);
  return Buffer.from(payload, "base64");
}

export const RECOGNIZE_MAX_IMAGE_BYTES = 1_500_000;

/** Field name image_b64 as sent by apk/ui/lib/apiClient.ts. */
export function validateRecognize(body: Record<string, unknown>): { imageBase64: string } {
  const bytes = decodeBase64(body.image_b64, "image", RECOGNIZE_MAX_IMAGE_BYTES);
  if (bytes.length < 100 || !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    throw bad("Send the photo as a JPEG image.");
  }
  return { imageBase64: bytes.toString("base64") };
}

/** ~15 s of 16 kHz mono 16-bit audio. */
export const TRANSCRIBE_MAX_AUDIO_BYTES = 16_000 * 2 * 15 + 44;

/** Same fields as apk/ui/app/api/transcribe/route.ts ({ audio_b64, language }), with a much tighter size limit. */
export function validateTranscribe(body: Record<string, unknown>): { audioBase64: string; language: Language } {
  const bytes = decodeBase64(body.audio_b64, "recording", TRANSCRIBE_MAX_AUDIO_BYTES);
  if (bytes.length < 44 + 1600 || bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WAVE") {
    throw bad("The recording was empty or not a WAV file.");
  }
  return { audioBase64: bytes.toString("base64"), language: body.language === "hi" ? "hi" : "en" };
}

/** Mirrors apps/operations/app/api/demo/reports POST validation, so bad input is rejected here first. */
export function validateReport(body: Record<string, unknown>): {
  id: string;
  token: string;
  category: ReportCategory;
  note: string;
  zoneId: ReportZoneId;
  point: ReportPoint | null;
  photo: string | null;
} {
  const id = body.id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw bad("Invalid report id.");
  const token = body.token;
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/i.test(token)) throw bad("Invalid receipt token.");
  if (!REPORT_CATEGORIES.includes(body.category as ReportCategory)) throw bad("Choose what kind of issue it is.");
  if (!REPORT_ZONES.some((zone) => zone.id === body.zoneId)) throw bad("Choose where the issue is.");
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > NOTE_MAX_LENGTH) throw bad(`Keep the description under ${NOTE_MAX_LENGTH} characters.`);

  let point: ReportPoint | null = null;
  if (body.point !== null && body.point !== undefined) {
    const p = body.point as Record<string, unknown>;
    const lat = Number(p?.latitude);
    const lng = Number(p?.longitude);
    const acc = p?.accuracy === undefined ? undefined : Number(p.accuracy);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180 || (acc !== undefined && (!Number.isFinite(acc) || acc < 0))) {
      throw bad("The location wasn't valid.");
    }
    point = { latitude: lat, longitude: lng, ...(acc !== undefined ? { accuracy: Math.round(acc) } : {}) };
  }

  // JPEG, PNG or WebP data URLs, as the original report screen sends and
  // operations accepts; the content must match the declared type.
  let photo: string | null = null;
  if (body.photo !== null && body.photo !== undefined) {
    const type = typeof body.photo === "string" ? /^data:image\/(jpeg|png|webp);base64,/.exec(body.photo)?.[1] : undefined;
    if (!type) throw bad("Use JPEG, PNG or WebP");
    const bytes = decodeBase64(body.photo, "photo", 2_000_000);
    const valid =
      type === "jpeg"
        ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
        : type === "png"
          ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
          : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (!valid) throw bad("The photo wasn't a valid image");
    photo = body.photo as string;
  }

  return { id: id.toLowerCase(), token: token.toLowerCase(), category: body.category as ReportCategory, note, zoneId: body.zoneId as ReportZoneId, point, photo };
}

export function validateReceiptQuery(url: URL): { id: string; token: string } {
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{64}$/i.test(token)) throw bad("Invalid receipt.");
  return { id, token };
}
