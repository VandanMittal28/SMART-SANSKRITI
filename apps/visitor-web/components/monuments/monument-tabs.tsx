"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// Tab bar modelled on the original app's monument detail tabs
// (apk/ui/components/recognition/monument-detail-tabs.tsx): a horizontally
// scrollable row with the active tab filled in gold. Implements the WAI-ARIA
// tabs pattern (arrow keys, Home/End) so it works without a mouse.
export function MonumentTabs({ tabs, label }: { tabs: { id: string; label: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className="mtabs">
      <div className="mtabs__list" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${id}-tab-${tab.id}`}
            type="button"
            role="tab"
            className="mtabs__tab"
            aria-selected={active === tab.id}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${id}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.id}`}
          className="mtabs__panel"
          hidden={active !== tab.id}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// Era switcher modelled on the original's "Time Travel" section: chips that
// switch between the three passages of the monument's story.
export function EraSwitcher({ eras }: { eras: { id: string; label: string; text: string }[] }) {
  const [active, setActive] = useState(eras[0]?.id);
  const current = eras.find((era) => era.id === active) ?? eras[0];
  return (
    <div className="eras">
      <div className="eras__chips" role="group" aria-label="Choose a period">
        {eras.map((era) => (
          <button key={era.id} type="button" className="eras__chip" aria-pressed={active === era.id} onClick={() => setActive(era.id)}>
            {era.label}
          </button>
        ))}
      </div>
      <p className="eras__text" aria-live="polite">
        {current?.text}
      </p>
    </div>
  );
}
