import { MONUMENTS, getMonument, type Monument, type MonumentId } from "./monuments.ts";

/** Lower-case, strip accents and punctuation, collapse spaces. Keeps Devanagari. */
export function normaliseText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

const ALIAS_INDEX: { alias: string; id: MonumentId }[] = MONUMENTS.flatMap((monument) =>
  [monument.name, monument.nameHi, ...monument.aliases].map((alias) => ({ alias: normaliseText(alias), id: monument.id })),
)
  // Longest first, so "red fort of agra" wins over "red fort".
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * Finds the guide monument a name or free-text question refers to, matching
 * whole words only. Returns undefined when nothing matches.
 */
export function findMonumentInText(text: string | null | undefined): Monument | undefined {
  if (!text) return undefined;
  const haystack = ` ${normaliseText(text)} `;
  for (const { alias, id } of ALIAS_INDEX) {
    if (alias && haystack.includes(` ${alias} `)) return getMonument(id);
  }
  return undefined;
}

/** Matches a recognition result: tries the model's id first, then its name. */
export function matchRecognisedMonument(name: string | undefined, modelId?: string): Monument | undefined {
  const direct = getMonument(modelId ?? "");
  if (direct) return direct;
  if (modelId) {
    const fromId = findMonumentInText(modelId.replace(/-/g, " "));
    if (fromId) return fromId;
  }
  return findMonumentInText(name);
}

function words(value: string): Set<string> {
  return new Set(normaliseText(value).split(" ").filter((word) => word.length > 2));
}

/**
 * Up to `limit` guide monuments to offer when recognition is unsure: ranked by
 * word overlap with the model's guess and location, then a stable fallback.
 */
export function suggestMonuments(guess: string | undefined, location: string | undefined, limit = 3): Monument[] {
  const target = new Set([...words(guess ?? ""), ...words(location ?? "")]);
  const scored = MONUMENTS.map((monument, index) => {
    const pool = words([monument.name, monument.place, ...monument.aliases].join(" "));
    let score = 0;
    for (const word of target) if (pool.has(word)) score += 1;
    return { monument, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((entry) => entry.monument);
}
