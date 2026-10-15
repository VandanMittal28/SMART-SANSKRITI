/**
 * Tier 3 of Heritage Watch: turns a stream of per-frame model verdicts into
 * at most one reviewable incident.
 *
 * A single frame is never enough. Vision models misread a raised arm, a
 * selfie stick, a shadow on stone. Requiring the same category to recur
 * across separate observations — each taken seconds apart, after independent
 * motion gating — removes nearly all of that, because an artefact rarely
 * survives a changed viewpoint. A refractory window then stops one continuous
 * act from generating a stream of duplicate reports.
 *
 * Pure state machine: no timers, no I/O. The caller supplies `now`.
 */

import {
  HERITAGE_WATCH_BY_ID,
  type HeritageWatchCategory,
  type HeritageWatchVerdict,
} from './taxonomy.ts'

export interface Observation {
  verdict: HeritageWatchVerdict
  confidence: number
  at: number
  /** Short, neutral model rationale, retained for the reviewer. */
  rationale: string
  /**
   * Extra confidence required because the tracked motion does not match how
   * this act looks. Supplied by `confidencePenalty`; 0 when consistent.
   */
  penalty?: number
}

export interface CorroborationConfig {
  /** Matching observations required before an incident is raised. */
  required: number
  /** Observations older than this are dropped from the window, in ms. */
  windowMs: number
  /** After raising, suppress the same category for this long, in ms. */
  refractoryMs: number
}

export const DEFAULT_CORROBORATION: CorroborationConfig = {
  required: 2,
  windowMs: 45_000,
  refractoryMs: 180_000,
}

export interface RaisedIncident {
  category: HeritageWatchCategory
  /** Mean confidence of the corroborating observations. */
  confidence: number
  observations: Observation[]
  raisedAt: number
}

export class CorroborationBuffer {
  private observations: Observation[] = []
  private lastRaisedAt = new Map<HeritageWatchCategory, number>()

  private readonly config: CorroborationConfig

  constructor(config: CorroborationConfig = DEFAULT_CORROBORATION) {
    this.config = config
  }

  /**
   * Records one observation. Returns an incident only on the transition where
   * the evidence threshold is first met.
   */
  push(observation: Observation): RaisedIncident | null {
    this.observations = this.observations.filter(
      entry => observation.at - entry.at <= this.config.windowMs,
    )

    if (observation.verdict === 'none') return null

    const definition = HERITAGE_WATCH_BY_ID[observation.verdict]
    if (!definition) return null
    // Motion that contradicts the category raises the bar rather than vetoing
    // it, so an unusual but genuine act can still be reported.
    const required = Math.min(0.99, definition.minimumConfidence + (observation.penalty ?? 0))
    if (observation.confidence < required) return null

    this.observations.push(observation)

    const matching = this.observations.filter(entry => entry.verdict === observation.verdict)
    if (matching.length < this.config.required) return null

    const category = observation.verdict
    const previouslyRaised = this.lastRaisedAt.get(category)
    if (
      previouslyRaised !== undefined &&
      observation.at - previouslyRaised < this.config.refractoryMs
    ) {
      return null
    }

    this.lastRaisedAt.set(category, observation.at)
    // Consume the evidence so the next incident needs fresh observations.
    this.observations = this.observations.filter(entry => entry.verdict !== category)

    return {
      category,
      confidence:
        matching.reduce((sum, entry) => sum + entry.confidence, 0) / matching.length,
      observations: matching,
      raisedAt: observation.at,
    }
  }

  /** Observations currently counting toward each category, for the HUD. */
  pendingCounts(now: number): Partial<Record<HeritageWatchCategory, number>> {
    const counts: Partial<Record<HeritageWatchCategory, number>> = {}
    for (const entry of this.observations) {
      if (entry.verdict === 'none') continue
      if (now - entry.at > this.config.windowMs) continue
      counts[entry.verdict] = (counts[entry.verdict] ?? 0) + 1
    }
    return counts
  }

  reset() {
    this.observations = []
    this.lastRaisedAt.clear()
  }
}
