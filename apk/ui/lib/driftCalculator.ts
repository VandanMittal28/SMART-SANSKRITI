// Negotiation Support: Drift Indicator.
//
// Pure, deterministic comparison of a locked trip-plan baseline against its
// current state. No I/O, no randomness — same inputs always produce the
// same score, so this is trivial to unit test and to explain to a user.

export type TripPace = 'relaxed' | 'balanced' | 'packed'

export interface TripPlanState {
  destination: string
  days: number
  budgetInr: number
  pace: TripPace
  mustHaves: string[]
}

export type DriftStatus = 'stable' | 'review' | 'drifted'
export type DriftAttribution = 'plan_change' | 'external_constraint'

export interface DriftReason {
  dimension: 'destination' | 'days' | 'budget' | 'pace' | 'mustHaves'
  points: number
  detail: string
}

export interface DriftAssessment {
  score: number
  status: DriftStatus
  reasons: DriftReason[]
  attribution: DriftAttribution
}

const PACE_ORDER: Record<TripPace, number> = { relaxed: 0, balanced: 1, packed: 2 }
const MAX_PACE_DISTANCE = 2

function normalizePlace(value: string): string {
  return value.trim().toLowerCase()
}

function statusForScore(score: number): DriftStatus {
  if (score >= 40) return 'drifted'
  if (score >= 15) return 'review'
  return 'stable'
}

export function calculateDrift(
  baseline: TripPlanState,
  current: TripPlanState,
  attribution: DriftAttribution = 'plan_change',
): DriftAssessment {
  const reasons: DriftReason[] = []

  // Destination: binary, 35 points — the single highest-weight dimension,
  // since changing the city invalidates almost everything else in the plan.
  if (normalizePlace(baseline.destination) !== normalizePlace(current.destination)) {
    reasons.push({
      dimension: 'destination',
      points: 35,
      detail: `Destination changed from ${baseline.destination} to ${current.destination}.`,
    })
  }

  // Days: proportional difference relative to the baseline length, capped at 15.
  if (baseline.days > 0 && current.days !== baseline.days) {
    const ratio = Math.abs(current.days - baseline.days) / baseline.days
    const points = Math.min(15, 15 * ratio)
    if (points > 0) {
      reasons.push({
        dimension: 'days',
        points,
        detail: `Trip length changed from ${baseline.days} to ${current.days} day${current.days === 1 ? '' : 's'}.`,
      })
    }
  }

  // Budget: only over-budget movement counts as drift. Reaches the full 20
  // points once the current budget is 50% or more above the agreed maximum.
  if (baseline.budgetInr > 0 && current.budgetInr > baseline.budgetInr) {
    const overRatio = (current.budgetInr - baseline.budgetInr) / baseline.budgetInr
    const points = Math.min(20, 20 * (overRatio / 0.5))
    if (points > 0) {
      reasons.push({
        dimension: 'budget',
        points,
        detail: `Budget rose from ₹${baseline.budgetInr.toLocaleString('en-IN')} to ₹${current.budgetInr.toLocaleString('en-IN')} per person.`,
      })
    }
  }

  // Pace: ordinal distance between relaxed/balanced/packed, capped at 15.
  if (baseline.pace !== current.pace) {
    const distance = Math.abs(PACE_ORDER[current.pace] - PACE_ORDER[baseline.pace])
    const points = 15 * (distance / MAX_PACE_DISTANCE)
    if (points > 0) {
      reasons.push({
        dimension: 'pace',
        points,
        detail: `Pace shifted from ${baseline.pace} to ${current.pace}.`,
      })
    }
  }

  // Must-haves: proportion of the originally-agreed places that are no
  // longer present, capped at 15.
  if (baseline.mustHaves.length > 0) {
    const currentSet = new Set(current.mustHaves.map(normalizePlace))
    const missing = baseline.mustHaves.filter((place) => !currentSet.has(normalizePlace(place)))
    const points = 15 * (missing.length / baseline.mustHaves.length)
    if (points > 0) {
      reasons.push({
        dimension: 'mustHaves',
        points,
        detail: missing.length === 1
          ? `"${missing[0]}" is no longer on the must-have list.`
          : `${missing.length} must-have places were dropped: ${missing.join(', ')}.`,
      })
    }
  }

  const rawScore = reasons.reduce((sum, reason) => sum + reason.points, 0)
  const score = Math.round(Math.min(100, rawScore))

  return {
    score,
    status: statusForScore(score),
    reasons: reasons.map((reason) => ({ ...reason, points: Math.round(reason.points * 10) / 10 })),
    attribution,
  }
}
