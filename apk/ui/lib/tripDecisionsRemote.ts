// Supabase-backed layer for shared trip decisions — the upgrade path from
// lib/tripDecisions.ts (localStorage) once an owner wants a travel
// companion to see the same drift indicator and react to it. Requires the
// migration in supabase/migrations/20260822160000_shared_trip_decisions.sql
// to have been run against the project.

import { supabase } from '@/lib/supabase/client'
import type { DriftAttribution, TripPlanState } from '@/lib/driftCalculator'
import type { TripDecision, TripDecisionException } from '@/lib/tripDecisions'

type ReactionValue = 'agree' | 'needs_discussion'

export interface TripDecisionReaction {
  userId: string
  reaction: ReactionValue
  note: string | null
  updatedAt: string
}

interface TripDecisionRow {
  id: string
  owner_id: string
  share_token: string
  title: string
  baseline: TripPlanState | null
  baseline_locked_at: string | null
  current: TripPlanState
  attribution: DriftAttribution
  exception_category: TripDecisionException['category'] | null
  exception_place: string | null
  exception_note: string | null
  created_at: string
  updated_at: string
}

function fromRow(row: TripDecisionRow): TripDecision {
  return {
    id: row.id,
    title: row.title,
    current: row.current,
    baseline: row.baseline,
    baselineLockedAt: row.baseline_locked_at,
    attribution: row.attribution,
    exception: row.exception_category && row.exception_place && row.exception_note
      ? { category: row.exception_category, place: row.exception_place, note: row.exception_note }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareToken: row.share_token,
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// Persists an existing local decision to Supabase, reusing its id so the
// page URL (/decisions/[id]) stays the same for the owner. Only possible
// once a baseline is locked — sharing an unlocked draft isn't meaningful.
export async function shareTripDecision(decision: TripDecision): Promise<TripDecision> {
  const userId = await currentUserId()
  if (!userId) throw new Error('Sign in to share this trip decision.')
  if (!decision.baseline) throw new Error('Lock a baseline before sharing.')

  const { data, error } = await supabase
    .from('trip_decisions')
    .insert({
      id: decision.id,
      owner_id: userId,
      title: decision.title,
      baseline: decision.baseline,
      baseline_locked_at: decision.baselineLockedAt,
      current: decision.current,
      attribution: decision.attribution,
      exception_category: decision.exception?.category ?? null,
      exception_place: decision.exception?.place ?? null,
      exception_note: decision.exception?.note ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return fromRow(data as TripDecisionRow)
}

export async function getSharedTripDecision(id: string): Promise<TripDecision | null> {
  const { data, error } = await supabase.from('trip_decisions').select().eq('id', id).maybeSingle()
  if (error) throw error
  return data ? fromRow(data as TripDecisionRow) : null
}

export async function getSharedTripDecisionByToken(token: string): Promise<TripDecision | null> {
  const { data, error } = await supabase.rpc('get_trip_decision_by_token', { p_token: token })
  if (error) throw error
  return data ? fromRow(data as TripDecisionRow) : null
}

export async function lockSharedTripDecisionBaseline(id: string): Promise<TripDecision> {
  const current = await getSharedTripDecision(id)
  if (!current) throw new Error('This shared decision could not be found.')
  const { data, error } = await supabase
    .from('trip_decisions')
    .update({
      baseline: current.current,
      baseline_locked_at: new Date().toISOString(),
      attribution: 'plan_change',
      exception_category: null,
      exception_place: null,
      exception_note: null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return fromRow(data as TripDecisionRow)
}

export async function updateSharedTripDecisionCurrent(
  id: string,
  plan: TripPlanState,
  attribution: DriftAttribution,
  exception: TripDecisionException | null,
): Promise<TripDecision> {
  const { data, error } = await supabase
    .from('trip_decisions')
    .update({
      current: plan,
      attribution,
      exception_category: attribution === 'external_constraint' ? exception?.category ?? null : null,
      exception_place: attribution === 'external_constraint' ? exception?.place ?? null : null,
      exception_note: attribution === 'external_constraint' ? exception?.note ?? null : null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return fromRow(data as TripDecisionRow)
}

export async function reactToSharedTripDecision(
  decisionId: string,
  reaction: ReactionValue,
  note: string,
): Promise<void> {
  const userId = await currentUserId()
  if (!userId) throw new Error('Sign in to react to this trip decision.')
  const { error } = await supabase
    .from('trip_decision_reactions')
    .upsert({ decision_id: decisionId, user_id: userId, reaction, note: note || null, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Owners see every reaction on their decision; companions only see their
// own row back (enforced by RLS, not by this function).
export async function listTripDecisionReactions(decisionId: string): Promise<TripDecisionReaction[]> {
  const { data, error } = await supabase
    .from('trip_decision_reactions')
    .select('user_id, reaction, note, updated_at')
    .eq('decision_id', decisionId)
  if (error) throw error
  return (data ?? []).map((row) => ({
    userId: row.user_id as string,
    reaction: row.reaction as ReactionValue,
    note: row.note as string | null,
    updatedAt: row.updated_at as string,
  }))
}
