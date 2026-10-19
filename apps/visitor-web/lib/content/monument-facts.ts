// "At a glance" facts for the monument pages, matching the Overview tab of
// the original app (apk/ui/components/recognition/monument-detail-tabs.tsx,
// MONUMENT_DATA, itself from SANSKRITI-AI-main/data/monuments.json). Copied
// verbatim; the original is not modified.
//
// Deliberately NOT copied: entry fees (prices change and the original's own
// prompt forbids inventing them), "key facts" and "fun facts" (several are
// popular myths stated as fact, e.g. that the Red Fort was painted red by the
// British), and figures inside the architecture notes, of which only the
// first, style-describing sentence is used. Meenakshi's year is omitted
// because the source ("6th century CE onwards") contradicts the guide text
// ("6th century BC"); flagged for content review. Agra Fort has no entry.

import type { MonumentId } from "./monuments.ts";

export type MonumentFacts = {
  builtBy: string;
  built?: string;
  type: string;
  unesco: boolean;
  architecture: string;
  bestTimeToVisit: string;
};

export const MONUMENT_FACTS: Partial<Record<MonumentId, MonumentFacts>> = {
  "taj-mahal": {
    builtBy: "Mughal Emperor Shah Jahan",
    built: "1632–1653",
    type: "Mausoleum",
    unesco: true,
    architecture: "Mughal architecture blending Persian, Islamic and Indian styles.",
    bestTimeToVisit: "October to March",
  },
  "red-fort": {
    builtBy: "Mughal Emperor Shah Jahan",
    built: "1638–1648",
    type: "Fort-Palace",
    unesco: true,
    architecture: "Mughal architecture in red sandstone and white marble.",
    bestTimeToVisit: "October to March",
  },
  "qutub-minar": {
    builtBy: "Qutb ud-Din Aibak (started), Iltutmish (completed)",
    built: "1193–1220",
    type: "Victory Tower",
    unesco: true,
    architecture: "Indo-Islamic with intricate Arabic and Nagari inscriptions.",
    bestTimeToVisit: "October to March",
  },
  "gateway-india": {
    builtBy: "British Government (George Wittet)",
    built: "1924",
    type: "Triumphal Arch",
    unesco: false,
    architecture: "Indo-Saracenic style with blend of Hindu and Muslim motifs.",
    bestTimeToVisit: "October to March",
  },
  hampi: {
    builtBy: "Vijayanagara Empire (Hakka and Bukka founders)",
    built: "1336–1565",
    type: "Ruined City",
    unesco: true,
    architecture: "Dravidian-Vijayanagara architecture amid a surreal boulder-strewn landscape.",
    bestTimeToVisit: "October to March",
  },
  "golden-temple": {
    builtBy: "Guru Arjan Dev (5th Sikh Guru)",
    built: "1604",
    type: "Gurdwara",
    unesco: false,
    architecture: "Blend of Hindu and Islamic styles.",
    bestTimeToVisit: "October to March",
  },
  kedarnath: {
    builtBy: "Adi Shankaracharya (current structure)",
    built: "8th century CE",
    type: "Temple",
    unesco: false,
    architecture: "Large platform of stone slabs with a conical shikhara.",
    bestTimeToVisit: "May to October",
  },
  meenakshi: {
    builtBy: "Nayak dynasty (rebuilt by Thirumalai Nayak)",
    type: "Temple",
    unesco: false,
    architecture: "Dravidian architecture with 14 gate towers (gopurams).",
    bestTimeToVisit: "October to March",
  },
  "mysore-palace": {
    builtBy: "British architect Henry Irwin for Wadiyar dynasty",
    built: "1912",
    type: "Palace",
    unesco: false,
    architecture: "Indo-Saracenic style blending Hindu, Muslim, Rajput and Gothic elements.",
    bestTimeToVisit: "October (Dasara)",
  },
  "hawa-mahal": {
    builtBy: "Maharaja Sawai Pratap Singh",
    built: "1799",
    type: "Palace",
    unesco: false,
    architecture: "Rajput architecture.",
    bestTimeToVisit: "October to March",
  },
  charminar: {
    builtBy: "Muhammad Quli Qutb Shah",
    built: "1591",
    type: "Monument",
    unesco: false,
    architecture: "Indo-Islamic architecture with 4 minarets (56m each), pointed arches and stucco ornamentation.",
    bestTimeToVisit: "October to March",
  },
  "victoria-memorial": {
    builtBy: "British Government (William Emerson)",
    built: "1906–1921",
    type: "Memorial & Museum",
    unesco: false,
    architecture: "Indo-Saracenic with Mughal elements.",
    bestTimeToVisit: "October to March",
  },
  ajanta: {
    builtBy: "Buddhist monks (various dynasties)",
    built: "2nd century BCE – 6th century CE",
    type: "Rock-cut Cave Complex",
    unesco: true,
    architecture: "Rock-cut Buddhist caves including chaitya halls and viharas.",
    bestTimeToVisit: "October to March",
  },
  konark: {
    builtBy: "King Narasimhadeva I of Eastern Ganga dynasty",
    built: "1250 CE",
    type: "Temple",
    unesco: true,
    architecture: "Kalinga architecture in khondalite stone.",
    bestTimeToVisit: "October to March",
  },
  "india-gate": {
    builtBy: "Sir Edwin Lutyens",
    built: "1931",
    type: "War Memorial",
    unesco: false,
    architecture: "Triumphal arch modelled on the Arc de Triomphe.",
    bestTimeToVisit: "October to March",
  },
};

export function factsFor(id: MonumentId): MonumentFacts | undefined {
  return MONUMENT_FACTS[id];
}
