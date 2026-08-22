"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { DriftIndicatorCard } from "@/components/decisions/drift-indicator-card"
import { calculateDrift, type TripPace, type TripPlanState } from "@/lib/driftCalculator"
import {
  EXCEPTION_CATEGORY_OPTIONS,
  PACE_OPTIONS,
  getTripDecision,
  lockTripDecisionBaseline,
  markTripDecisionShared,
  updateTripDecisionCurrent,
  type ExceptionCategory,
  type TripDecision,
} from "@/lib/tripDecisions"
import {
  getSharedTripDecision,
  getSharedTripDecisionByToken,
  listTripDecisionReactions,
  lockSharedTripDecisionBaseline,
  reactToSharedTripDecision,
  shareTripDecision,
  updateSharedTripDecisionCurrent,
  type TripDecisionReaction,
} from "@/lib/tripDecisionsRemote"
import { supabase } from "@/lib/supabase/client"

type PageMode = "loading" | "not-found" | "owner" | "companion"

export default function TripDecisionPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [mode, setMode] = useState<PageMode>("loading")
  const [decision, setDecision] = useState<TripDecision | null>(null)
  const [companionToken, setCompanionToken] = useState<string | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [reactions, setReactions] = useState<TripDecisionReaction[]>([])
  const [reactionsError, setReactionsError] = useState(false)

  const [shareBusy, setShareBusy] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [reactionNote, setReactionNote] = useState("")
  const [reactionBusy, setReactionBusy] = useState(false)

  const [form, setForm] = useState<TripPlanState>({
    destination: "", days: 1, budgetInr: 0, pace: "balanced", mustHaves: [],
  })
  const [mustHavesText, setMustHavesText] = useState("")
  const [isExternal, setIsExternal] = useState(false)
  const [exceptionCategory, setExceptionCategory] = useState<ExceptionCategory>("closure")
  const [exceptionPlace, setExceptionPlace] = useState("")
  const [exceptionNote, setExceptionNote] = useState("")
  const [savedNotice, setSavedNotice] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const applyDecision = useCallback((loaded: TripDecision) => {
    setDecision(loaded)
    setForm(loaded.current)
    setMustHavesText(loaded.current.mustHaves.join(", "))
    setIsExternal(loaded.attribution === "external_constraint")
    if (loaded.exception) {
      setExceptionCategory(loaded.exception.category)
      setExceptionPlace(loaded.exception.place)
      setExceptionNote(loaded.exception.note)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      supabase.auth.getUser().then(({ data }) => { if (!cancelled) setMyUserId(data.user?.id ?? null) })

      const local = getTripDecision(params.id)
      if (local) {
        applyDecision(local)
        setMode("owner")
        if (local.shareToken) {
          try {
            const remote = await getSharedTripDecision(local.id)
            if (!cancelled && remote) applyDecision(remote)
            const remoteReactions = await listTripDecisionReactions(local.id)
            if (!cancelled) setReactions(remoteReactions)
          } catch {
            // Offline or migration not applied yet — keep working from the local cache.
            if (!cancelled) setReactionsError(true)
          }
        }
        return
      }

      const token = searchParams.get("t")
      if (token) {
        try {
          const remote = await getSharedTripDecisionByToken(token)
          if (!cancelled && remote) {
            applyDecision(remote)
            setMode("companion")
            setCompanionToken(token)
            return
          }
        } catch {
          // Falls through to not-found below.
        }
      }
      if (!cancelled) setMode("not-found")
    }
    void load()
    return () => { cancelled = true }
  }, [params.id, searchParams, applyDecision])

  const liveForm = useMemo<TripPlanState>(() => ({
    ...form,
    mustHaves: mustHavesText.split(",").map((place) => place.trim()).filter(Boolean),
  }), [form, mustHavesText])

  const assessment = useMemo(() => {
    if (!decision?.baseline) return null
    return calculateDrift(
      decision.baseline,
      mode === "companion" ? decision.current : liveForm,
      isExternal ? "external_constraint" : "plan_change",
    )
  }, [decision, liveForm, isExternal, mode])

  const exceptionComplete = exceptionCategory && exceptionPlace.trim() && exceptionNote.trim()
  const canSave = !isExternal || Boolean(exceptionComplete)
  const myReaction = reactions.find((r) => r.userId === myUserId) ?? null

  const handleLockBaseline = async () => {
    if (!decision) return
    setSaveError(null)
    if (decision.shareToken) {
      try {
        const updated = await lockSharedTripDecisionBaseline(decision.id)
        applyDecision(updated)
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Could not lock the baseline.")
      }
      return
    }
    const updated = lockTripDecisionBaseline(decision.id)
    if (updated) applyDecision(updated)
  }

  const handleSave = async () => {
    if (!decision || !canSave) return
    setSaveError(null)
    const attribution = isExternal ? "external_constraint" as const : "plan_change" as const
    const exception = isExternal ? { category: exceptionCategory, place: exceptionPlace.trim(), note: exceptionNote.trim() } : null

    if (decision.shareToken) {
      try {
        const updated = await updateSharedTripDecisionCurrent(decision.id, liveForm, attribution, exception)
        applyDecision(updated)
        setSavedNotice(true)
        window.setTimeout(() => setSavedNotice(false), 2500)
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Could not publish this update.")
      }
      return
    }
    const updated = updateTripDecisionCurrent(decision.id, liveForm, attribution, exception)
    if (updated) applyDecision(updated)
    setSavedNotice(true)
    window.setTimeout(() => setSavedNotice(false), 2500)
  }

  const handleShare = async () => {
    if (!decision) return
    setShareBusy(true)
    setShareError(null)
    try {
      const shared = await shareTripDecision(decision)
      markTripDecisionShared(decision.id, shared.shareToken!)
      applyDecision(shared)
    } catch (error) {
      setShareError(
        error instanceof Error
          ? error.message
          : "Could not share this decision — has the Supabase migration been run yet?",
      )
    } finally {
      setShareBusy(false)
    }
  }

  const handleReact = async (reaction: "agree" | "needs_discussion") => {
    if (!decision) return
    setReactionBusy(true)
    try {
      await reactToSharedTripDecision(decision.id, reaction, reactionNote.trim())
      const updated = await listTripDecisionReactions(decision.id)
      setReactions(updated)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your response.")
    } finally {
      setReactionBusy(false)
    }
  }

  if (mode === "loading") {
    return (
      <AppShell>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
          <p style={{ color: "#C4A882", fontSize: 13 }}>Loading…</p>
        </div>
      </AppShell>
    )
  }

  if (mode === "not-found" || !decision) {
    return (
      <AppShell>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
          <p style={{ color: "#C4A882", fontSize: 13, marginBottom: 12 }}>
            This trip decision couldn&apos;t be found — the link may be wrong, or it hasn&apos;t been shared with you.
          </p>
          <button
            onClick={() => router.push("/decisions")}
            style={{
              background: "transparent", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10,
              padding: "8px 16px", color: "#C4A882", fontSize: 13, cursor: "pointer",
            }}
          >
            ← Back to Plan Together
          </button>
        </div>
      </AppShell>
    )
  }

  const shareLink = decision.shareToken && typeof window !== "undefined"
    ? `${window.location.origin}/decisions/${decision.id}?t=${decision.shareToken}`
    : null

  return (
    <AppShell>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        <button
          onClick={() => router.push("/decisions")}
          style={{ background: "transparent", border: "none", color: "#C4A882", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10 }}
        >
          ← Plan Together
        </button>
        <h1 style={{ color: "#C9A84C", fontFamily: "Georgia,serif", fontSize: 22, marginBottom: 4 }}>
          {decision.title}
        </h1>
        {mode === "companion" && (
          <p style={{ color: "#4B9B8E", fontSize: 12, marginBottom: 16 }}>
            👀 You&apos;re viewing this as a shared traveler — you can see the plan and respond, but only the organizer can change it.
          </p>
        )}

        {!decision.baseline ? (
          mode === "companion" ? (
            <p style={{ color: "#C4A882", fontSize: 13, marginBottom: 20 }}>
              The organizer hasn&apos;t locked a baseline yet.
            </p>
          ) : (
            <div style={{
              background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 16, padding: 20, marginBottom: 20,
            }}>
              <h2 style={{ color: "#C9A84C", fontSize: 16, marginBottom: 10 }}>Not locked yet</h2>
              <p style={{ color: "#C4A882", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                {decision.current.destination} · {decision.current.days} days · ₹{decision.current.budgetInr.toLocaleString("en-IN")} per person · {decision.current.pace} pace
                {decision.current.mustHaves.length > 0 && ` · Must-haves: ${decision.current.mustHaves.join(", ")}`}
              </p>
              <button
                onClick={handleLockBaseline}
                style={{
                  background: "linear-gradient(135deg,#C9A84C,#D4893F)", borderRadius: 10,
                  padding: "10px 20px", color: "#0F0B1E", fontWeight: 700, fontSize: 14,
                  border: "none", cursor: "pointer",
                }}
              >
                🔒 Lock this as our baseline
              </button>
            </div>
          )
        ) : (
          <>
            <div style={{
              background: "rgba(15,11,30,0.6)", border: "1px solid rgba(201,168,76,0.15)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 16,
            }}>
              <div style={{ color: "#8f816b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Locked baseline
              </div>
              <div style={{ color: "#C4A882", fontSize: 13 }}>
                {decision.baseline.destination} · {decision.baseline.days} days · ₹{decision.baseline.budgetInr.toLocaleString("en-IN")} · {decision.baseline.pace} pace
                {decision.baseline.mustHaves.length > 0 && ` · ${decision.baseline.mustHaves.join(", ")}`}
              </div>
            </div>

            {mode === "companion" && (
              <div style={{
                background: "rgba(15,11,30,0.6)", border: "1px solid rgba(201,168,76,0.15)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 16,
              }}>
                <div style={{ color: "#8f816b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  Current plan
                </div>
                <div style={{ color: "#C4A882", fontSize: 13 }}>
                  {decision.current.destination} · {decision.current.days} days · ₹{decision.current.budgetInr.toLocaleString("en-IN")} · {decision.current.pace} pace
                  {decision.current.mustHaves.length > 0 && ` · ${decision.current.mustHaves.join(", ")}`}
                </div>
              </div>
            )}

            {assessment && (
              <div style={{ marginBottom: 20 }}>
                <DriftIndicatorCard assessment={assessment} exception={decision.exception} />
              </div>
            )}
          </>
        )}

        {mode === "companion" ? (
          decision.baseline && (
            <div style={{
              background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 16, padding: 20,
            }}>
              <h2 style={{ color: "#C9A84C", fontSize: 16, marginBottom: 14 }}>Your response</h2>
              {myReaction && (
                <p style={{ color: "#4B9B8E", fontSize: 13, marginBottom: 10 }}>
                  You previously responded: {myReaction.reaction === "agree" ? "✅ Agree" : "💬 Needs discussion"}
                </p>
              )}
              <FormField label="Note (optional)">
                <input value={reactionNote} onChange={(e) => setReactionNote(e.target.value)} placeholder="Say why, if you like" style={inputStyle} />
              </FormField>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => handleReact("agree")}
                  disabled={reactionBusy}
                  style={{
                    background: "linear-gradient(135deg,#4B9B8E,#3a7a6e)", borderRadius: 10,
                    padding: "10px 20px", color: "white", fontWeight: 700, fontSize: 14,
                    border: "none", cursor: reactionBusy ? "default" : "pointer", opacity: reactionBusy ? 0.6 : 1,
                  }}
                >
                  ✅ Agree
                </button>
                <button
                  onClick={() => handleReact("needs_discussion")}
                  disabled={reactionBusy}
                  style={{
                    background: "rgba(212,137,63,0.15)", border: "1px solid rgba(212,137,63,0.4)", borderRadius: 10,
                    padding: "10px 20px", color: "#D4893F", fontWeight: 700, fontSize: 14,
                    cursor: reactionBusy ? "default" : "pointer", opacity: reactionBusy ? 0.6 : 1,
                  }}
                >
                  💬 Needs discussion
                </button>
              </div>
              {saveError && <p style={{ color: "#E08A8A", fontSize: 12, marginTop: 10 }}>{saveError}</p>}
            </div>
          )
        ) : (
          <>
            <div style={{
              background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 16, padding: 20, marginBottom: 20,
            }}>
              <h2 style={{ color: "#C9A84C", fontSize: 16, marginBottom: 14 }}>
                {decision.baseline ? "Update the plan" : "Starting preferences"}
              </h2>

              <FormField label="Destination">
                <input value={form.destination} onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))} style={inputStyle} />
              </FormField>
              <div style={{ display: "flex", gap: 12 }}>
                <FormField label="Days" style={{ flex: 1 }}>
                  <input type="number" min={1} value={form.days} onChange={(e) => setForm((prev) => ({ ...prev, days: Number(e.target.value) || 1 }))} style={inputStyle} />
                </FormField>
                <FormField label="Max budget per person (₹)" style={{ flex: 1 }}>
                  <input type="number" min={0} step={100} value={form.budgetInr} onChange={(e) => setForm((prev) => ({ ...prev, budgetInr: Number(e.target.value) || 0 }))} style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Pace">
                <select value={form.pace} onChange={(e) => setForm((prev) => ({ ...prev, pace: e.target.value as TripPace }))} style={inputStyle}>
                  {PACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Must-have places (comma separated)">
                <input value={mustHavesText} onChange={(e) => setMustHavesText(e.target.value)} style={inputStyle} />
              </FormField>

              {decision.baseline && (
                <div style={{
                  marginTop: 6, marginBottom: 6, background: "rgba(0,0,0,0.18)",
                  borderRadius: 10, padding: "12px 14px",
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#F5E6D3", fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={isExternal} onChange={(e) => setIsExternal(e.target.checked)} />
                    This change is because of something outside anyone&apos;s control (closure, weather, availability)
                  </label>

                  {isExternal && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <FormField label="Category">
                        <select value={exceptionCategory} onChange={(e) => setExceptionCategory(e.target.value as ExceptionCategory)} style={inputStyle}>
                          {EXCEPTION_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Affected place">
                        <input value={exceptionPlace} onChange={(e) => setExceptionPlace(e.target.value)} placeholder="e.g. Amber Fort" style={inputStyle} />
                      </FormField>
                      <FormField label="Explanation">
                        <textarea value={exceptionNote} onChange={(e) => setExceptionNote(e.target.value)} placeholder="e.g. Closed for maintenance until further notice" rows={2} style={{ ...inputStyle, resize: "vertical" as const }} />
                      </FormField>
                      {!exceptionComplete && (
                        <p style={{ color: "#E08A8A", fontSize: 12, margin: 0 }}>
                          Category, affected place, and an explanation are all required before this can be published.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  style={{
                    background: canSave ? "linear-gradient(135deg,#C9A84C,#D4893F)" : "rgba(201,168,76,0.25)",
                    borderRadius: 10, padding: "10px 20px", color: canSave ? "#0F0B1E" : "#8a7c5e",
                    fontWeight: 700, fontSize: 14, border: "none", cursor: canSave ? "pointer" : "default",
                  }}
                >
                  {decision.baseline ? "Publish update" : "Save"}
                </button>
                {savedNotice && <span style={{ color: "#4B9B8E", fontSize: 13 }}>✓ Saved</span>}
                {saveError && <span style={{ color: "#E08A8A", fontSize: 12 }}>{saveError}</span>}
              </div>
            </div>

            {decision.baseline && (
              <div style={{
                background: "rgba(28,22,56,0.9)", border: "1px solid rgba(75,155,142,0.25)",
                borderRadius: 16, padding: 20,
              }}>
                <h2 style={{ color: "#4B9B8E", fontSize: 16, marginBottom: 10 }}>Share with a travel companion</h2>
                {!decision.shareToken ? (
                  <>
                    <p style={{ color: "#C4A882", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                      Generate a link a companion can open to see this exact drift indicator and respond
                      Agree / Needs discussion — without being able to edit the plan themselves.
                    </p>
                    <button
                      onClick={handleShare}
                      disabled={shareBusy}
                      style={{
                        background: "linear-gradient(135deg,#4B9B8E,#3a7a6e)", borderRadius: 10,
                        padding: "10px 20px", color: "white", fontWeight: 700, fontSize: 14,
                        border: "none", cursor: shareBusy ? "default" : "pointer", opacity: shareBusy ? 0.6 : 1,
                      }}
                    >
                      {shareBusy ? "Sharing…" : "🔗 Generate share link"}
                    </button>
                    {shareError && <p style={{ color: "#E08A8A", fontSize: 12, marginTop: 10 }}>{shareError}</p>}
                  </>
                ) : (
                  <>
                    <p style={{ color: "#C4A882", fontSize: 12, marginBottom: 8 }}>Anyone with this link can view and respond:</p>
                    <div style={{
                      background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "8px 12px",
                      color: "#F5E6D3", fontSize: 12, wordBreak: "break-all", marginBottom: 12,
                    }}>
                      {shareLink}
                    </div>
                    {reactionsError ? (
                      <p style={{ color: "#C4A882", fontSize: 12 }}>
                        Couldn&apos;t load responses right now (offline, or the migration hasn&apos;t been run yet).
                      </p>
                    ) : reactions.length === 0 ? (
                      <p style={{ color: "#C4A882", fontSize: 12 }}>No responses yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {reactions.map((r) => (
                          <div key={r.userId} style={{ color: "#C4A882", fontSize: 12 }}>
                            {r.reaction === "agree" ? "✅ Agree" : "💬 Needs discussion"}
                            {r.note ? ` — "${r.note}"` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(15,11,30,0.9)", border: "1px solid rgba(201,168,76,0.3)",
  borderRadius: 10, padding: "10px 12px", color: "#F5E6D3", fontSize: 14,
}

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ color: "#F5E6D3", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
