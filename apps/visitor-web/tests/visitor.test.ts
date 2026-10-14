import test from "node:test";
import assert from "node:assert/strict";
import {
  NAME_MAX_LENGTH,
  VISITOR_STORAGE_KEY,
  clearVisitor,
  parseVisitor,
  readVisitorRaw,
  saveVisitor,
  validateName,
} from "../lib/visitor.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test("accepts ordinary names and normalises whitespace", () => {
  assert.deepEqual(validateName("  Asha   Rao "), { ok: true, name: "Asha Rao" });
  assert.deepEqual(validateName("O’Brien-Kaur"), { ok: true, name: "O’Brien-Kaur" });
});

test("accepts Devanagari names", () => {
  const result = validateName("अनन्या");
  assert.equal(result.ok, true);
});

test("rejects empty, overlong and markup-like names", () => {
  assert.equal(validateName("   ").ok, false);
  assert.equal(validateName("a".repeat(NAME_MAX_LENGTH + 1)).ok, false);
  assert.equal(validateName("<script>").ok, false);
  assert.equal(validateName("-leading").ok, false);
});

test("saves, reads and clears the visitor record", () => {
  const storage = memoryStorage();
  const saved = saveVisitor(" Meera ", storage, new Date("2026-10-11T00:00:00Z"));
  assert.deepEqual(saved, { ok: true, name: "Meera" });
  assert.deepEqual(parseVisitor(readVisitorRaw(storage)), {
    displayName: "Meera",
    createdAt: "2026-10-11T00:00:00.000Z",
  });
  clearVisitor(storage);
  assert.equal(readVisitorRaw(storage), null);
});

test("reports blocked storage instead of pretending to save", () => {
  assert.equal(saveVisitor("Meera", null).ok, false);
  const throwing = {
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => undefined,
  };
  assert.equal(saveVisitor("Meera", throwing).ok, false);
});

test("ignores corrupted or tampered records", () => {
  assert.equal(parseVisitor("not json"), null);
  assert.equal(parseVisitor(JSON.stringify({ displayName: 42 })), null);
  assert.equal(parseVisitor(JSON.stringify({ displayName: "<b>", createdAt: "x" })), null);
  const storage = memoryStorage();
  storage.setItem(VISITOR_STORAGE_KEY, "{");
  assert.equal(parseVisitor(readVisitorRaw(storage)), null);
});
