/**
 * Heritage Watch — what the Explore camera is allowed to look for.
 *
 * Scope rule: every entry here describes an act against the monument or a
 * clear safety risk. Detection is deliberately limited to what someone is
 * *doing to the site*, never to who they are, who they are with, or how they
 * look. That matches the convention already set by the manual report triage
 * in `apps/operations/lib/nvidia-assessment.ts` ("do not identify people or
 * infer intent from appearance").
 *
 * `reportCategory` must stay inside the operations console's validated
 * category list (`apps/operations/lib/demo.ts`), or submissions are rejected.
 */

export type HeritageWatchCategory =
  | 'surface_marking'
  | 'climbing_on_structure'
  | 'restricted_area_entry'
  | 'physical_altercation'
  | 'fire_or_smoking'
  | 'littering'

export interface HeritageWatchDefinition {
  id: HeritageWatchCategory
  /** Shown to the visitor when a detection is pending review. */
  label: string
  /** Must be one of the operations console's accepted report categories. */
  reportCategory:
    | 'Property damage'
    | 'Littering'
    | 'Restricted access'
    | 'Harassment'
    | 'Safety hazard'
    | 'Other site-rule concern'
  /** Positive description handed to the vision model. */
  prompt: string
  /**
   * Minimum model confidence before this category is even considered for
   * corroboration. Irreversible-damage categories sit lower (we would rather
   * send a human to look); ambiguous ones sit higher.
   */
  minimumConfidence: number
}

export const HERITAGE_WATCH_DEFINITIONS: HeritageWatchDefinition[] = [
  {
    id: 'surface_marking',
    label: 'Marking or carving a surface',
    reportCategory: 'Property damage',
    prompt:
      'A person is writing, spraying, scratching or carving onto a wall, pillar, railing or stone surface — hand or implement in sustained contact with the surface while making marks.',
    minimumConfidence: 0.55,
  },
  {
    id: 'climbing_on_structure',
    label: 'Climbing or standing on protected stonework',
    reportCategory: 'Property damage',
    prompt:
      'A person is climbing on, straddling, standing on or hanging from a monument structure, carving, statue, railing or protective barrier.',
    minimumConfidence: 0.6,
  },
  {
    id: 'restricted_area_entry',
    label: 'Crossing into a closed area',
    reportCategory: 'Restricted access',
    prompt:
      'A person has crossed a rope, barrier, fence or signed boundary into an area that is visibly closed off to visitors.',
    minimumConfidence: 0.65,
  },
  {
    id: 'physical_altercation',
    label: 'Physical altercation',
    reportCategory: 'Safety hazard',
    prompt:
      'Two or more people are in a physical fight — striking, shoving, grappling or restraining each other — not an embrace, a greeting, a handshake, helping someone up, play between children, or a crowded queue.',
    minimumConfidence: 0.7,
  },
  {
    id: 'fire_or_smoking',
    label: 'Open flame or smoking',
    reportCategory: 'Safety hazard',
    prompt:
      'There is an open flame, burning material, or a person smoking, inside the monument precinct.',
    minimumConfidence: 0.6,
  },
  {
    id: 'littering',
    label: 'Littering',
    reportCategory: 'Littering',
    prompt:
      'A person is discarding rubbish onto the ground, into water, or into planting, rather than into a bin.',
    minimumConfidence: 0.65,
  },
]

export const HERITAGE_WATCH_BY_ID: Record<HeritageWatchCategory, HeritageWatchDefinition> =
  Object.fromEntries(HERITAGE_WATCH_DEFINITIONS.map(d => [d.id, d])) as Record<
    HeritageWatchCategory,
    HeritageWatchDefinition
  >

/** `none` is the expected answer for the overwhelming majority of frames. */
export const NO_FINDING = 'none' as const
export type HeritageWatchVerdict = HeritageWatchCategory | typeof NO_FINDING

export function isHeritageWatchCategory(value: unknown): value is HeritageWatchCategory {
  return typeof value === 'string' && value in HERITAGE_WATCH_BY_ID
}
