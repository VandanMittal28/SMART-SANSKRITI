"use client";

import { useEffect, useSyncExternalStore } from "react";

// Lets screens temporarily hide the floating Yatrik so it never covers their
// controls (e.g. the recognition camera and preview buttons).
const reasons = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function useHideYatrik(reason: string, hidden: boolean): void {
  useEffect(() => {
    if (!hidden) return;
    reasons.add(reason);
    notify();
    return () => {
      reasons.delete(reason);
      notify();
    };
  }, [reason, hidden]);
}

export function useYatrikSuppressed(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => reasons.size > 0,
    () => false,
  );
}
