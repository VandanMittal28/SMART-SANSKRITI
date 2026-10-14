// Licensed monument photographs: one per guide monument.
//
// RULES FOR ADDING OR REPLACING A PHOTO (checked by photoProblem and npm test):
// 1. An authentic photograph of the real monument: no renders, AI-generated
//    images, illustrations, composites or 360° panoramas.
// 2. A licence that allows use here, with its exact name, a link to the
//    source page and the author. Attribution licences (CC BY, CC BY-SA, Free
//    Art Licence) are credited wherever the photo appears.
// 3. A record of who checked it and when. Say so if the check was automated.
// 4. Two files in public/images/monuments/: "-large" (1000px long edge) and
//    "-small" (640px). Phones only download the small one.
//
// The repository's own images were rejected on 2026-10-11: every image under
// apk/ui/public/time_travel is a generated 360° render (one carries
// "Ideogram AI" EXIF), and apk/ui/public/hero-monuments.png is a composite.
// All photos below are from Wikimedia Commons, marked as the photographer's
// own work, with camera metadata on their source pages and no additional
// restrictions listed.

import type { MonumentId } from "./content/monuments.ts";

export type PhotoLicence =
  | "CC0-1.0"
  | "Public domain"
  | "CC-BY-4.0"
  | "CC-BY-SA-3.0"
  | "CC-BY-SA-4.0"
  | "FAL-1.3" // Free Art Licence 1.3: attribution + share-alike
  | "Licensed"; // stock or commissioned, with written terms on file

export type MonumentPhoto = {
  id: string;
  monumentId: MonumentId;
  monument: string;
  /** Large file (≈1000px long edge) under /images/monuments/. */
  src: string;
  /** Small file (≈640px long edge) under /images/monuments/, used on phones. */
  srcSmall?: string;
  width: number;
  height: number;
  /** Optional CSS object-position, e.g. "50% 40%". */
  focus?: string;
  credit: {
    author: string;
    /** HTTPS link to the original source page. */
    source: string;
    licence: PhotoLicence;
    licenceUrl?: string;
    /** Changes made to the original, as attribution licences ask. */
    changes?: string;
  };
  review: {
    authenticPhotograph: true;
    reviewedBy: string;
    /** ISO date, YYYY-MM-DD. */
    reviewedOn: string;
    notes?: string;
  };
};

const LICENCE_URLS: Partial<Record<PhotoLicence, string>> = {
  "CC-BY-SA-3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "FAL-1.3": "https://artlibre.org/licence/lal/en/",
};
const CHANGES = "Resized and recompressed.";

function commons(
  monumentId: MonumentId,
  monument: string,
  file: string,
  size: [number, number],
  author: string,
  commonsFile: string,
  licence: PhotoLicence,
  camera: string,
  reviewedOn: string,
  focus?: string,
): MonumentPhoto {
  return {
    id: monumentId,
    monumentId,
    monument,
    src: `/images/monuments/${file}-large.jpg`,
    srcSmall: `/images/monuments/${file}-small.jpg`,
    width: size[0],
    height: size[1],
    focus,
    credit: {
      author,
      source: `https://commons.wikimedia.org/wiki/File:${commonsFile}`,
      licence,
      licenceUrl: LICENCE_URLS[licence],
      changes: CHANGES,
    },
    review: {
      authenticPhotograph: true,
      reviewedBy: "Claude Code (automated check), awaiting owner confirmation",
      reviewedOn,
      notes: `Commons own work; ${camera}.`,
    },
  };
}

export const MONUMENT_PHOTOS: readonly MonumentPhoto[] = [
  commons("taj-mahal", "Taj Mahal", "taj-mahal", [1000, 657], "Yann", "Taj_Mahal,_Agra,_India.jpg", "CC-BY-SA-4.0", "Sony DSC-R1, 2010-08-14", "2026-10-11", "50% 55%"),
  commons("hawa-mahal", "Hawa Mahal", "hawa-mahal", [1000, 750], "Chainwit.", "Hawa_Mahal_east_facade_(14-07-2022).jpg", "CC-BY-SA-4.0", "Apple iPhone XR, 2022-07-14", "2026-10-11", "50% 45%"),
  commons("konark", "Konark Sun Temple", "konark-sun-temple", [1000, 666], "Joydeep", "Konark_Sun_Temple_Puri_district,_Odisha,_India_1.jpg", "CC-BY-SA-4.0", "Sony ILCE-7M3, 2025-11-18", "2026-10-11", "60% 50%"),
  commons("qutub-minar", "Qutub Minar", "qutub-minar", [750, 1000], "A.Savin", "Qutub_Minar_in_Delhi_03-2016.jpg", "FAL-1.3", "Canon EOS 7D Mark II, 2016-03-20", "2026-10-11", "60% 35%"),
  commons("red-fort", "Red Fort", "red-fort", [1000, 666], "A.Savin", "Red_Fort_in_Delhi_03-2016_img1.jpg", "FAL-1.3", "Canon EOS 7D Mark II, 2016-03-20", "2026-10-11"),
  commons("india-gate", "India Gate", "india-gate", [1000, 776], "Nikhilb239", "India_Gate,_New_Delhi_from_West.jpg", "CC-BY-SA-4.0", "Nikon D3300, 2014-11-01", "2026-10-11", "65% 40%"),
  commons("agra-fort", "Agra Fort", "agra-fort", [1000, 665], "Jakub Hałun", "20191204_Moat_and_walls_of_Agra_Fort_0925_6582.jpg", "CC-BY-SA-4.0", "Pentax KP, 2019-12-04", "2026-10-14", "65% 50%"),
  commons("gateway-india", "Gateway of India", "gateway-india", [1000, 800], "A.Savin", "Mumbai_03-2016_31_Gateway_of_India.jpg", "FAL-1.3", "Canon EOS 7D Mark II, 2016-03-13", "2026-10-14"),
  commons("hampi", "Hampi", "hampi", [1000, 666], "Ingo Mehling", "Hampi_-_Hemakuta_Hill,_Virupaksha_Temple.jpg", "CC-BY-SA-4.0", "Sony ILCE-7M4, 2023-01-28", "2026-10-14"),
  commons("golden-temple", "Golden Temple", "golden-temple", [1000, 666], "Bernard Gagnon", "Golden_Temple,_Amritsar_01.jpg", "CC-BY-SA-4.0", "Sony ILCE-5000, 2018-05-04", "2026-10-14", "40% 50%"),
  commons("kedarnath", "Kedarnath Temple", "kedarnath", [1000, 666], "Rohit Sharma", "Kedarnath_temple,_Uttrakhand_02.jpg", "CC-BY-SA-4.0", "Nikon D5600, 2021-10-17", "2026-10-14", "45% 40%"),
  commons("meenakshi", "Meenakshi Amman Temple", "meenakshi", [666, 1000], "Mamichaelraj", "MEENAKSHI_TEMPLE-_WEST_TOWER.jpg", "CC-BY-SA-4.0", "Nikon D5100, 2016-08-12", "2026-10-14", "50% 35%"),
  commons("mysore-palace", "Mysore Palace", "mysore-palace", [1000, 750], "Raiabhinav24", "Mysore_Palace_full_front_view.jpg", "CC-BY-SA-4.0", "Apple iPhone 16 Pro, 2026-04-29", "2026-10-14", "50% 45%"),
  commons("charminar", "Charminar", "charminar", [1000, 761], "Joydeep", "Charminar_12_03_2012.jpg", "CC-BY-SA-3.0", "Sony DSC-W210, 2012-03-12", "2026-10-14", "50% 30%"),
  commons("victoria-memorial", "Victoria Memorial", "victoria-memorial", [1000, 728], "Bernard Gagnon", "Victoria_Memorial,_Kolkata_-_West_facade_01.jpg", "CC-BY-SA-3.0", "Canon EOS Rebel T4i, 2013-12-10", "2026-10-14"),
  commons("ajanta", "Ajanta Caves", "ajanta", [1000, 731], "Rohit Sharma", "Exterior_of_Cave_26,_Ajanta_Caves,_Maharashtra,_India.jpg", "CC-BY-SA-4.0", "Nikon D5600, 2024-06-15", "2026-10-14"),
];

/** The welcome backdrop's photos, in tile order. Tiles 1–3 show on phones. */
export const BACKDROP_ORDER: readonly MonumentId[] = ["taj-mahal", "hawa-mahal", "konark", "qutub-minar", "red-fort", "india-gate"];

/** Number of backdrop positions defined in styles (.backdrop__tile--1…6). */
export const BACKDROP_SLOTS = 6;

const LICENCES: readonly PhotoLicence[] = ["CC0-1.0", "Public domain", "CC-BY-4.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0", "FAL-1.3", "Licensed"];

const LICENCE_LABELS: Record<PhotoLicence, string> = {
  "CC0-1.0": "CC0 1.0",
  "Public domain": "Public domain",
  "CC-BY-4.0": "CC BY 4.0",
  "CC-BY-SA-3.0": "CC BY-SA 3.0",
  "CC-BY-SA-4.0": "CC BY-SA 4.0",
  "FAL-1.3": "Free Art Licence 1.3",
  Licensed: "Licensed",
};

export function licenceLabel(licence: PhotoLicence): string {
  return LICENCE_LABELS[licence];
}

export function requiresAttribution(licence: PhotoLicence): boolean {
  return licence === "CC-BY-4.0" || licence === "CC-BY-SA-3.0" || licence === "CC-BY-SA-4.0" || licence === "FAL-1.3";
}

export function sourceSiteName(source: string): string | null {
  try {
    return new URL(source).hostname === "commons.wikimedia.org" ? "Wikimedia Commons" : null;
  } catch {
    return null;
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): boolean {
  if (!nonEmpty(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const LOCAL_IMAGE = /^\/images\/monuments\/[\w.-]+\.(jpe?g|webp)$/i;

/**
 * Explains why an entry may not be shown, or returns null when it is usable.
 * Type assertions can bypass the compiler, so display code relies on this.
 */
export function photoProblem(photo: MonumentPhoto): string | null {
  if (!nonEmpty(photo.id) || !nonEmpty(photo.monument)) return "missing id or monument";
  if (!LOCAL_IMAGE.test(photo.src)) return "src must be a JPEG or WebP under /images/monuments/";
  if (photo.srcSmall !== undefined && !LOCAL_IMAGE.test(photo.srcSmall)) {
    return "srcSmall must be a JPEG or WebP under /images/monuments/";
  }
  if (!(photo.width > 0 && photo.height > 0)) return "missing dimensions";
  if (!LICENCES.includes(photo.credit?.licence)) return "unknown licence";
  if (!nonEmpty(photo.credit.author)) return "missing author";
  if (!isHttpsUrl(photo.credit.source)) return "source must be an https link";
  if (photo.credit.licenceUrl !== undefined && !isHttpsUrl(photo.credit.licenceUrl)) {
    return "licenceUrl must be an https link";
  }
  if (photo.review?.authenticPhotograph !== true) return "not reviewed as an authentic photograph";
  if (!nonEmpty(photo.review.reviewedBy)) return "missing reviewer";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(photo.review.reviewedOn)) return "reviewedOn must be YYYY-MM-DD";
  return null;
}

const USABLE = new Map<string, MonumentPhoto>(
  MONUMENT_PHOTOS.filter((photo) => photoProblem(photo) === null).map((photo) => [photo.monumentId, photo]),
);

/** The verified photo for a guide monument, if one passes the checks. */
export function photoFor(monumentId: string | null | undefined): MonumentPhoto | undefined {
  return monumentId ? USABLE.get(monumentId) : undefined;
}

/** Usable photos in the given order, at most one per backdrop slot, never repeated. */
export function backdropPhotos(
  photos: readonly MonumentPhoto[] = BACKDROP_ORDER.map((id) => photoFor(id)).filter((p): p is MonumentPhoto => !!p),
): MonumentPhoto[] {
  const seen = new Set<string>();
  const usable: MonumentPhoto[] = [];
  for (const photo of photos) {
    if (usable.length === BACKDROP_SLOTS) break;
    if (seen.has(photo.src) || photoProblem(photo) !== null) continue;
    seen.add(photo.src);
    usable.push(photo);
  }
  return usable;
}
