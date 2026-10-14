"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { IconChevronRight, IconSearch, IconSpeaker } from "@/components/icons";
import { normaliseText } from "@/lib/content/match";
import { MONUMENTS } from "@/lib/content/monuments";
import { MonumentPhoto } from "./monument-photo";

export function MonumentBrowser() {
  const [query, setQuery] = useState("");
  const id = useId();
  const results = useMemo(() => {
    const q = normaliseText(query);
    if (!q) return MONUMENTS;
    return MONUMENTS.filter((m) => normaliseText([m.name, m.nameHi, m.place, ...m.aliases].join(" ")).includes(q));
  }, [query]);

  return (
    <div className="browser">
      <div className="search">
        <label className="visually-hidden" htmlFor={`${id}-q`}>
          Search monuments
        </label>
        <IconSearch size={20} className="search__icon" />
        <input
          id={`${id}-q`}
          className="input search__input"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Search by name or city"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-describedby={`${id}-count`}
        />
      </div>
      <p id={`${id}-count`} className="browser__count" aria-live="polite">
        {results.length === MONUMENTS.length ? `${MONUMENTS.length} monuments` : `${results.length} of ${MONUMENTS.length} monuments`}
      </p>
      {results.length === 0 ? (
        <div className="browser__empty">
          <p>No monuments match “{query}”.</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setQuery("")}>
            Clear search
          </button>
        </div>
      ) : (
        <ul className="monument-list">
          {results.map((monument) => (
            <li key={monument.id}>
              <Link href={`/monuments/${monument.id}`} className="monument-row">
                <MonumentPhoto monumentId={monument.id} alt="" className="monument-row__img" sizes="96px" />
                <span className="monument-row__text">
                  <span className="monument-row__name">{monument.name}</span>
                  <span className="monument-row__place">{monument.place}</span>
                  {monument.audio && (
                    <span className="monument-row__audio">
                      <IconSpeaker size={14} /> Audio story
                    </span>
                  )}
                </span>
                <IconChevronRight size={20} className="monument-row__chevron" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
