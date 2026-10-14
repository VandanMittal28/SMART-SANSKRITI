"use client";

import { useMemo, useSyncExternalStore } from "react";
import { VISITOR_CHANGE_EVENT, clearVisitor, parseVisitor, readVisitorRaw, saveVisitor, type Visitor } from "@/lib/visitor";

export type VisitorStatus = "loading" | "absent" | "present";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VISITOR_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VISITOR_CHANGE_EVENT, onChange);
  };
}

// The raw string is a stable snapshot, so React re-renders only on change.
const getSnapshot = (): string | null => readVisitorRaw();
// The server can't see localStorage: undefined means "not known yet".
const getServerSnapshot = (): undefined => undefined;

/** The visitor's display name from this browser. Not authentication. */
export function useVisitor(): { status: VisitorStatus; visitor: Visitor | null; save: typeof saveVisitor; forget: typeof clearVisitor } {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, getSnapshot, getServerSnapshot);
  const visitor = useMemo(() => (raw === undefined ? null : parseVisitor(raw)), [raw]);
  const status: VisitorStatus = raw === undefined ? "loading" : visitor ? "present" : "absent";
  return { status, visitor, save: saveVisitor, forget: clearVisitor };
}
