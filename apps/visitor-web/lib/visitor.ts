// Lightweight visitor identification for the visitor website.
//
// This is NOT authentication. The name is a personalisation hint kept only in
// this browser's localStorage: there is no password, no account, and nothing is
// sent to a server. Anyone using the same browser can read or change it, and it
// must never be used to authorise access to data or actions.

export const VISITOR_STORAGE_KEY = "sanskriti-visitor-v1";
export const VISITOR_CHANGE_EVENT = "sanskriti-visitor-change";
export const NAME_MAX_LENGTH = 32;

// Letters and marks from any script (so Hindi and other Indian-language names
// work), digits, spaces, and the punctuation common in names. Must start with
// a letter or digit.
const NAME_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .'’-]*$/u;

export type Visitor = { displayName: string; createdAt: string };
export type NameResult = { ok: true; name: string } | { ok: false; error: string };

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

export function normaliseName(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function validateName(raw: string): NameResult {
  const name = normaliseName(raw);
  if (!name) return { ok: false, error: "Enter a name to continue." };
  if (Array.from(name).length > NAME_MAX_LENGTH) {
    return { ok: false, error: `Use ${NAME_MAX_LENGTH} characters or fewer.` };
  }
  if (!NAME_PATTERN.test(name)) {
    return {
      ok: false,
      error: "Use letters, numbers, spaces, apostrophes, hyphens or full stops.",
    };
  }
  return { ok: true, name };
}

export function parseVisitor(raw: string | null): Visitor | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const { displayName, createdAt } = value as Record<string, unknown>;
    if (typeof displayName !== "string" || typeof createdAt !== "string") return null;
    const check = validateName(displayName);
    return check.ok ? { displayName: check.name, createdAt } : null;
  } catch {
    return null;
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Accessing localStorage throws when site data is blocked.
    return null;
  }
}

function notifyChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(VISITOR_CHANGE_EVENT));
}

export function readVisitorRaw(storage: ReadableStorage | null = browserStorage()): string | null {
  try {
    return storage?.getItem(VISITOR_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveVisitor(
  rawName: string,
  storage: WritableStorage | null = browserStorage(),
  now: Date = new Date(),
): NameResult {
  const check = validateName(rawName);
  if (!check.ok) return check;
  const blocked: NameResult = {
    ok: false,
    error:
      "This browser is blocking site storage, so your name can't be remembered. Allow site data for this page and try again.",
  };
  if (!storage) return blocked;
  try {
    const visitor: Visitor = { displayName: check.name, createdAt: now.toISOString() };
    storage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(visitor));
  } catch {
    return blocked;
  }
  notifyChange();
  return check;
}

export function clearVisitor(storage: WritableStorage | null = browserStorage()): void {
  try {
    storage?.removeItem(VISITOR_STORAGE_KEY);
  } catch {
    // Nothing else to do: the name was never readable either.
  }
  notifyChange();
}
