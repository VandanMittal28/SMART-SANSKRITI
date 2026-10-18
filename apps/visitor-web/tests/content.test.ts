import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findMonumentInText, matchRecognisedMonument, suggestMonuments } from "../lib/content/match.ts";
import { MONUMENTS, getMonument } from "../lib/content/monuments.ts";
import { STATUS_TEXT, isReceipt, newReceiptToken, newReportId } from "../lib/report.ts";

const publicDir = fileURLToPath(new URL("../public", import.meta.url));

test("the guide has 16 complete monuments with unique ids", () => {
  assert.equal(MONUMENTS.length, 16);
  assert.equal(new Set(MONUMENTS.map((m) => m.id)).size, 16);
  for (const m of MONUMENTS) {
    for (const field of [m.name, m.nameHi, m.place, m.summary, m.origins, m.laterHistory, m.today]) assert.ok(field.trim(), m.id);
  }
});

test("exactly the seven verified narrations exist, in English and Hindi", () => {
  const withAudio = MONUMENTS.filter((m) => m.audio).map((m) => m.id).sort();
  assert.deepEqual(withAudio, ["ajanta", "hampi", "hawa-mahal", "konark", "qutub-minar", "red-fort", "taj-mahal"]);
  for (const m of MONUMENTS) {
    if (!m.audio) continue;
    assert.ok(existsSync(publicDir + m.audio.en), m.audio.en);
    assert.ok(existsSync(publicDir + m.audio.hi), m.audio.hi);
  }
});

test("names, aliases and Hindi names find the right monument", () => {
  assert.equal(findMonumentInText("Who built the Qutb Minar?")?.id, "qutub-minar");
  assert.equal(findMonumentInText("Tell me about the Red Fort of Agra")?.id, "agra-fort");
  assert.equal(findMonumentInText("Is the Red Fort open?")?.id, "red-fort");
  assert.equal(findMonumentInText("लाल किला किसने बनवाया?")?.id, "red-fort");
  assert.equal(findMonumentInText("Harmandir Sahib history")?.id, "golden-temple");
  // Names from apk/ui/lib/monumentStore.ts monumentNameToId
  for (const [name, id] of [["Stone Chariot Hampi", "hampi"], ["Gateway of India Mumbai", "gateway-india"], ["Meenakshi Amman Temple Madurai", "meenakshi"], ["Charminar Hyderabad", "charminar"], ["India Gate Delhi", "india-gate"], ["Golden Temple Amritsar", "golden-temple"]]) {
    assert.equal(findMonumentInText(name)?.id, id, name);
  }
  assert.equal(findMonumentInText("Modhera sun temple"), undefined);
  assert.equal(findMonumentInText("pottery"), undefined);
});

test("recognition results map onto guide monuments", () => {
  assert.equal(matchRecognisedMonument("Konark Sun Temple", "konark-sun-temple")?.id, "konark");
  assert.equal(matchRecognisedMonument("Taj Mahal", "taj-mahal")?.id, "taj-mahal");
  assert.equal(matchRecognisedMonument("Palace of Winds", "unknown")?.id, "hawa-mahal");
  assert.equal(matchRecognisedMonument("Lotus Temple", "lotus-temple"), undefined);
});

test("low-confidence suggestions favour related monuments", () => {
  const delhi = suggestMonuments("Fort", "Delhi").map((m) => m.id);
  assert.ok(delhi.includes("red-fort"));
  assert.equal(suggestMonuments(undefined, undefined).length, 3);
});

test("report ids and tokens match the operations format", () => {
  assert.match(newReportId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(newReceiptToken(), /^[0-9a-f]{64}$/);
  assert.equal(isReceipt({ id: "x", token: "z" }), false);
  for (const status of ["review", "unassigned", "assigned", "acknowledged", "in_progress", "resolved", "closed", "dismissed"]) {
    assert.ok(STATUS_TEXT[status as keyof typeof STATUS_TEXT].label);
  }
});
