"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MonumentId } from "@/lib/content/monuments";

// Whether Yatrik's panel is open, and where focus returns when it closes.
// The conversation itself lives in the panel (the original app's chat screen),
// which, like the original /chat page, starts from the greeting each time.

/** opener: the control that opened the panel. Passed explicitly because Safari
 * doesn't focus buttons on click, so document.activeElement isn't reliable.
 * monumentId and draft are accepted from existing callers but unused: the
 * original Yatrik conversation always starts without a selected monument. */
type OpenOptions = { monumentId?: MonumentId | null; draft?: string; opener?: HTMLElement | null };

type YatrikValue = {
  isOpen: boolean;
  open: (options?: OpenOptions) => void;
  close: () => void;
  /** The element focus returns to when the panel closes. */
  openerRef: React.MutableRefObject<HTMLElement | null>;
};

const YatrikContext = createContext<YatrikValue | null>(null);

export function YatrikProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((options?: OpenOptions) => {
    openerRef.current = options?.opener ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // Return focus to the opener once the panel has unmounted (runs after commit).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      // The floating icon is unmounted while the panel is open, so the
      // original opener may be gone; fall back to the re-mounted icon, which
      // can re-render a frame later (it hides while a text field has focus).
      requestAnimationFrame(() => {
        const opener = openerRef.current?.isConnected ? openerRef.current : document.querySelector<HTMLElement>(".yatrik-float");
        opener?.focus({ preventScroll: true });
      });
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  const value = useMemo<YatrikValue>(() => ({ isOpen, open, close, openerRef }), [isOpen, open, close]);
  return <YatrikContext.Provider value={value}>{children}</YatrikContext.Provider>;
}

export function useYatrik(): YatrikValue {
  const value = useContext(YatrikContext);
  if (!value) throw new Error("useYatrik must be used inside YatrikProvider");
  return value;
}
