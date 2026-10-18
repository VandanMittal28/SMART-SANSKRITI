"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { DESKTOP_QUERY, useMedia } from "@/components/use-media";
import { useYatrikSuppressed } from "./visibility";
import { YatrikAvatar } from "./yatrik-avatar";
import { useYatrik } from "./yatrik-provider";

// Floating Yatrik, adapted from the original app's YatrikCompanion
// (apk/ui/components/yatrik/yatrik-companion.tsx): the character floats in a
// corner, can be dragged out of the way (position remembered), and a tap opens
// Yatrik. Here it opens the chat panel instead of navigating to a chat page.
// Hidden on /report (as in the original), while the panel is open, while a
// screen asks (useHideYatrik), and on phones while a text field is focused.

const POSITION_KEY = "sanskriti-yatrik-float-v1";
const HIDDEN_PATHS = ["/report"];
const DRAG_THRESHOLD = 7;

type Position = { x: number; y: number };

function bounds(size: number, desktop: boolean) {
  const styles = getComputedStyle(document.documentElement);
  const header = parseFloat(styles.getPropertyValue("--header-h")) || 56;
  const nav = desktop ? 0 : (parseFloat(styles.getPropertyValue("--nav-h")) || 64) + safeBottom();
  return {
    minX: 8,
    maxX: Math.max(8, window.innerWidth - size - 8),
    minY: header + 8,
    maxY: Math.max(header + 8, window.innerHeight - size - nav - (desktop ? 20 : 12)),
  };
}

function safeBottom(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value;
}

function clamp(position: Position, size: number, desktop: boolean): Position {
  const b = bounds(size, desktop);
  return { x: Math.min(Math.max(b.minX, position.x), b.maxX), y: Math.min(Math.max(b.minY, position.y), b.maxY) };
}

function defaultPosition(size: number, desktop: boolean): Position {
  const b = bounds(size, desktop);
  return { x: b.maxX - (desktop ? 16 : 4), y: b.maxY };
}

export function YatrikFloating() {
  const yatrik = useYatrik();
  const pathname = usePathname();
  const desktop = useMedia(DESKTOP_QUERY);
  const suppressed = useYatrikSuppressed();
  const size = desktop ? 84 : 56;
  const [position, setPosition] = useState<Position | null>(null);
  const [typing, setTyping] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const positionRef = useRef<Position | null>(null);
  const drag = useRef<{ id: number; start: Position; origin: Position; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const place = useCallback(
    (next: Position) => {
      const clamped = clamp(next, size, desktop);
      positionRef.current = clamped;
      setPosition(clamped);
    },
    [size, desktop],
  );

  useEffect(() => {
    let saved: Position | null = null;
    try {
      const raw = localStorage.getItem(`${POSITION_KEY}:${desktop ? "d" : "m"}`);
      if (raw) saved = JSON.parse(raw) as Position;
    } catch {
      saved = null;
    }
    place(saved ?? defaultPosition(size, desktop));
  }, [desktop, size, place]);

  useEffect(() => {
    const onResize = () => positionRef.current && place(positionRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [place]);

  // Phones: fade out while the page scrolls, so the character isn't left over
  // content being scrolled past; it returns shortly after scrolling stops.
  useEffect(() => {
    if (desktop) {
      setScrolling(false);
      return;
    }
    let timer: number | undefined;
    const onScroll = () => {
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), 450);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [desktop]);

  // Phones: step aside while the visitor types, so it never sits over a
  // field or the keyboard's submit button.
  useEffect(() => {
    if (desktop) {
      setTyping(false);
      return;
    }
    const isField = (el: EventTarget | null) => el instanceof HTMLElement && el.matches("input:not([type=radio]):not([type=checkbox]):not([type=file]), textarea, select");
    const onIn = (event: FocusEvent) => setTyping(isField(event.target));
    const onOut = () => setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, [desktop]);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!positionRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: positionRef.current, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.start.x;
    const dy = event.clientY - d.start.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    place({ x: d.origin.x + dx, y: d.origin.y + dy });
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (d.moved) {
      suppressClick.current = true;
      try {
        localStorage.setItem(`${POSITION_KEY}:${desktop ? "d" : "m"}`, JSON.stringify(positionRef.current));
      } catch {
        // Position still applies for this visit.
      }
    }
  }

  const hidden = yatrik.isOpen || suppressed || typing || HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!position || hidden) return null;

  return (
    <button
      type="button"
      className={`yatrik-float${scrolling ? " is-scrolling" : ""}`}
      style={{ left: position.x, top: position.y, width: size, height: size }}
      aria-label="Open Yatrik, your heritage guide"
      aria-haspopup="dialog"
      aria-expanded={false}
      title="Ask Yatrik"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onClick={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        yatrik.open({ opener: event.currentTarget });
      }}
    >
      <span className="yatrik-float__glow" aria-hidden="true" />
      <YatrikAvatar size={size} />
      <span className="yatrik-float__label" aria-hidden="true">
        Ask Yatrik
      </span>
    </button>
  );
}
