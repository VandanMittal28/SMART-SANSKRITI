// Input validation for the route handlers. Pure functions, unit-tested.

import { isMonumentId, type MonumentId } from "../content/monuments.ts";
import { NOTE_MAX_LENGTH, REPORT_CATEGORIES, type ReportCategory, type ReportPoint, type ReportZoneId } from "../report.ts";
import { HttpError } from "./http.ts";

export type Language = "en" | "hi";

const bad = (message: string) => new HttpError(400, "invalid", message);

// Same contract and 2,000-character limit as apk/ui/app/api/chat/route.ts:
// { question, monument_id, lang }. Unlike the original, monument_id must be a
// guide monument (it selects the prompt's context) and only en/hi are offered.
export const QUESTION_MAX_LENGTH = 2_000;

export function validateChat(body: Record<string, unknown>): { question: string; monumentId: MonumentId | undefined; language: Language } {
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) throw bad("Type a question first.");
  if (question.length > QUESTION_MAX_LENGTH) throw bad(`Keep questions under ${QUESTION_MAX_LENGTH} characters.`);
  const monumentId = body.monument_id;
  if (monumentId !== undefined && monumentId !== null && monumentId !== "" && !isMonumentId(monumentId)) throw bad("Unknown monument.");
  return { question, monumentId: isMonumentId(monumentId) ? monumentId : undefined, language: body.lang === "hi" ? "hi" : "en" };
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
export const HERITAGE_WATCH_MAX_IMAGE_BYTES = 1_500_000;

/**
 * Mirrors apk/ui/app/api/heritage-watch/route.ts: { image, region,
 * motionContext }. Both images must be JPEG — the Explore camera encodes its
 * keyframes as JPEG, so anything else is a malformed client, not a visitor
 * with an unusual photo.
 */
export function validateHeritageWatch(body: Record<string, unknown>): {
  imageBase64: string;
  regionBase64: string | null;
  motionContext: string | null;
} {
  const image = decodeBase64(body.image, "frame", HERITAGE_WATCH_MAX_IMAGE_BYTES);
  if (image.length < 100 || !image.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    throw bad("Send the frame as a JPEG image.");
  }

  let regionBase64: string | null = null;
  if (body.region !== null && body.region !== undefined && body.region !== "") {
    const region = decodeBase64(body.region, "region crop", HERITAGE_WATCH_MAX_IMAGE_BYTES);
    if (region.length < 100 || !region.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
      throw bad("Send the region crop as a JPEG image.");
    }
    regionBase64 = region.toString("base64");
  }

  const motionContext =
    typeof body.motionContext === "string" && body.motionContext.trim()
      ? body.motionContext.trim().slice(0, 400)
      : null;

  return { imageBase64: image.toString("base64"), regionBase64, motionContext };
}

export function validateReport(body: Record<string, unknown>): {
  id: string;
  token: string;
  siteId: string;
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
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!["taj-mahal", "qutub-minar", "red-fort", "konark"].includes(siteId)) throw bad("Choose a supported heritage site.");
  if (!REPORT_CATEGORIES.includes(body.category as ReportCategory)) throw bad("Choose what kind of issue it is.");
  if (typeof body.zoneId !== "string" || !/^[a-z0-9-]{2,48}$/.test(body.zoneId)) throw bad("Choose where the issue is.");
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

  let photo: string | null = null;
  if (body.photo !== null && body.photo !== undefined) {
    if (typeof body.photo !== "string" || !/^data:image\/jpeg;base64,/.test(body.photo)) throw bad("Attach the photo as a JPEG.");
    const bytes = decodeBase64(body.photo, "photo", 2_000_000);
    if (!bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw bad("The photo wasn't a valid JPEG.");
    photo = body.photo;
  }

  return { id: id.toLowerCase(), token: token.toLowerCase(), siteId, category: body.category as ReportCategory, note, zoneId: body.zoneId as ReportZoneId, point, photo };
}

export function validateReceiptQuery(url: URL): { id: string; token: string } {
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{64}$/i.test(token)) throw bad("Invalid receipt.");
  return { id, token };
}
