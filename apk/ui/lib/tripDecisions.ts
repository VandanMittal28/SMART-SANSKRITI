// On-device storage for shared trip-plan decisions, in the same spirit as
// lib/customMonuments.ts: no backend required, so the drift indicator is
// fully demoable on its own. A decision can optionally be upgraded to real
// Supabase persistence + a companion share link — see lib/tripDecisionsRemote.ts
// — at which point `shareToken` gets set and reads/writes move there instead.

import type { DriftAttribution, TripPace, TripPlanState } from '@/lib/driftCalculator'

export type ExceptionCategory = 'closure' | 'weather' | 'availability'

export interface TripDecisionException {
  category: ExceptionCategory
  place: string
  note: string
}

export interface TripDecision {
  id: string
  title: string
  current: TripPlanState
  baseline: TripPlanState | null
  baselineLockedAt: string | null
  attribution: DriftAttribution
  exception: TripDecisionException | null
  createdAt: string
  updatedAt: string
  /** Set once this decision has been shared to Supabase; from then on the
   *  [id] page reads/writes through lib/tripDecisionsRemote.ts instead. */
  shareToken?: string
}

const STORAGE_KEY = 'sanskriti-trip-decisions-v1'

function readAll(): Record<string, TripDecision> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Record<string, TripDecision> : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, TripDecision>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Demo still works in-memory for the current session even if storage is unavailable.
  }
}

export function listTripDecisions(): TripDecision[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getTripDecision(id: string): TripDecision | null {
  return readAll()[id] ?? null
}

export function createTripDecision(title: string, plan: TripPlanState): TripDecision {
  const now = new Date().toISOString()
  const decision: TripDecision = {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `decision-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    current: plan,
    baseline: null,
    baselineLockedAt: null,
    attribution: 'plan_change',
    exception: null,
    createdAt: now,
    updatedAt: now,
  }
  const all = readAll()
  all[decision.id] = decision
  writeAll(all)
  return decision
}

export function lockTripDecisionBaseline(id: string): TripDecision | null {
  const all = readAll()
  const decision = all[id]
  if (!decision) return null
  decision.baseline = decision.current
  decision.baselineLockedAt = new Date().toISOString()
  decision.attribution = 'plan_change'
  decision.exception = null
  decision.updatedAt = decision.baselineLockedAt
  all[id] = decision
  writeAll(all)
  return decision
}

export function updateTripDecisionCurrent(
  id: string,
  plan: TripPlanState,
  attribution: DriftAttribution,
  exception: TripDecisionException | null,
): TripDecision | null {
  const all = readAll()
  const decision = all[id]
  if (!decision) return null
  decision.current = plan
  decision.attribution = attribution
  decision.exception = attribution === 'external_constraint' ? exception : null
  decision.updatedAt = new Date().toISOString()
  all[id] = decision
  writeAll(all)
  return decision
}

export function markTripDecisionShared(id: string, shareToken: string): TripDecision | null {
  const all = readAll()
  const decision = all[id]
  if (!decision) return null
  decision.shareToken = shareToken
  all[id] = decision
  writeAll(all)
  return decision
}

export function deleteTripDecision(id: string) {
  const all = readAll()
  delete all[id]
  writeAll(all)
}

export const PACE_OPTIONS: { value: TripPace; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'packed', label: 'Packed' },
]

export const EXCEPTION_CATEGORY_OPTIONS: { value: ExceptionCategory; label: string }[] = [
  { value: 'closure', label: 'Site closure' },
  { value: 'weather', label: 'Bad weather' },
  { value: 'availability', label: 'Availability (tickets/hotel/transport)' },
]
