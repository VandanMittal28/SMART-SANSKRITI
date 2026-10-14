import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MONUMENTS } from "../lib/content/monuments.ts";
import {
  BACKDROP_SLOTS,
  MONUMENT_PHOTOS,
  backdropPhotos,
  licenceLabel,
  photoFor,
  photoProblem,
  requiresAttribution,
  sourceSiteName,
  type MonumentPhoto,
} from "../lib/monument-photos.ts";

const publicDir = fileURLToPath(new URL("../public", import.meta.url));

function photo(overrides: Partial<MonumentPhoto> = {}): MonumentPhoto {
  return {
    id: "taj-1",
    monumentId: "taj-mahal",
    monument: "Taj Mahal",
    src: "/images/monuments/taj-mahal.jpg",
    width: 1600,
    height: 1067,
    credit: {
      author: "A. Photographer",
      source: "https://commons.wikimedia.org/wiki/File:Example.jpg",
      licence: "CC-BY-SA-4.0",
      licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    review: { authenticPhotograph: true, reviewedBy: "Reviewer", reviewedOn: "2026-10-11" },
    ...overrides,
  };
}

test("every guide monument has a verified, credited photo", () => {
  for (const monument of MONUMENTS) {
    const p = photoFor(monument.id);
    assert.ok(p, `${monument.id} has no usable photo`);
    assert.ok(p.credit.licenceUrl, `${monument.id} needs a licence link`);
    if (requiresAttribution(p.credit.licence)) assert.ok(p.credit.changes, `${monument.id} should note changes`);
  }
  for (const p of MONUMENT_PHOTOS) assert.equal(photoProblem(p), null, p.id);
});

test("every photo file exists in both sizes", () => {
  for (const p of MONUMENT_PHOTOS) {
    for (const src of [p.src, p.srcSmall]) {
      assert.ok(src, `${p.id} is missing a size`);
      assert.ok(existsSync(publicDir + src), `${src} is missing`);
    }
  }
});

test("the welcome backdrop uses six distinct photos", () => {
  const backdrop = backdropPhotos();
  assert.equal(backdrop.length, BACKDROP_SLOTS);
  assert.equal(new Set(backdrop.map((p) => p.src)).size, BACKDROP_SLOTS);
});

test("rejects entries without provenance or review", () => {
  assert.equal(photoProblem(photo()), null);
  assert.notEqual(photoProblem(photo({ credit: { ...photo().credit, author: " " } })), null);
  assert.notEqual(photoProblem(photo({ credit: { ...photo().credit, source: "http://example.com" } })), null);
  assert.notEqual(photoProblem(photo({ credit: { ...photo().credit, licence: "Unknown" as MonumentPhoto["credit"]["licence"] } })), null);
  const unreviewed = { ...photo(), review: { ...photo().review, authenticPhotograph: false } } as unknown as MonumentPhoto;
  assert.notEqual(photoProblem(unreviewed), null);
  assert.notEqual(photoProblem(photo({ review: { ...photo().review, reviewedOn: "11/10/2026" } })), null);
  assert.notEqual(photoProblem(photo({ src: "/time_travel/taj_mahal/modern.jpg" })), null);
  assert.notEqual(photoProblem(photo({ src: "https://example.com/images/monuments/taj.jpg" })), null);
});

test("backdrop selection skips bad and duplicate entries", () => {
  const many = Array.from({ length: BACKDROP_SLOTS + 3 }, (_, i) => photo({ id: `p${i}`, src: `/images/monuments/p${i}.jpg` }));
  assert.equal(backdropPhotos(many).length, BACKDROP_SLOTS);
  assert.equal(backdropPhotos([photo(), photo({ id: "copy" })]).length, 1);
  assert.deepEqual(backdropPhotos([photo({ id: "bad", src: "/nope.jpg" }), photo({ id: "good" })]).map((p) => p.id), ["good"]);
});

test("licence labels and attribution rules", () => {
  assert.equal(licenceLabel("FAL-1.3"), "Free Art Licence 1.3");
  assert.equal(licenceLabel("CC-BY-SA-3.0"), "CC BY-SA 3.0");
  for (const l of ["CC-BY-4.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0", "FAL-1.3"] as const) assert.equal(requiresAttribution(l), true);
  assert.equal(requiresAttribution("CC0-1.0"), false);
  assert.equal(sourceSiteName("https://commons.wikimedia.org/wiki/File:X.jpg"), "Wikimedia Commons");
  assert.equal(sourceSiteName("https://example.com/x"), null);
});
