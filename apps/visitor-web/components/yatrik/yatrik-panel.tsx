"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { ChatScreen } from "@/components/original/chat/chat-screen";
import { DESKTOP_QUERY, useMedia } from "@/components/use-media";
import { useYatrik } from "./yatrik-provider";

// The container Yatrik opens in when the floating character is tapped: full
// screen on phones, a side panel on desktop. Its content is the original
// app's Yatrik conversation (components/original/chat/chat-screen.tsx).
// Closing it (button or Escape) leaves the visitor on the screen they were on.

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function YatrikPanel() {
  const yatrik = useYatrik();
  const isDesktop = useMedia(DESKTOP_QUERY);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  // Phones: lock page scroll while the full-screen panel is open.
  useEffect(() => {
    if (isDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDesktop]);

  // Phones: size the panel to the visual viewport so the input stays above
  // the on-screen keyboard (iOS doesn't resize the layout viewport).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const viewport = window.visualViewport;
    if (isDesktop || !panel || !viewport) return;
    const update = () => {
      panel.style.height = `${viewport.height}px`;
      panel.style.top = `${viewport.offsetTop}px`;
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      panel.style.height = "";
      panel.style.top = "";
    };
  }, [isDesktop]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      yatrik.close();
      return;
    }
    if (event.key !== "Tab" || isDesktop || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <section
      ref={panelRef}
      className="yatrik-panel"
      role="dialog"
      aria-modal={isDesktop ? undefined : true}
      aria-label="Yatrik"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="sanskriti-original sanskriti-original--panel">
        <ChatScreen onClose={yatrik.close} />
      </div>
    </section>
  );
}
