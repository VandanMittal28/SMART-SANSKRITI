"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import type { TripPace } from "@/lib/driftCalculator"
import {
  createTripDecision,
  listTripDecisions,
  PACE_OPTIONS,
  type TripDecision,
} from "@/lib/tripDecisions"

export default function DecisionsListPage() {
  const router = useRouter()
  const [decisions, setDecisions] = useState<TripDecision[]>([])
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState("")
  const [destination, setDestination] = useState("")
  const [days, setDays] = useState(3)
  const [budgetInr, setBudgetInr] = useState(3000)
  const [pace, setPace] = useState<TripPace>("balanced")
  const [mustHaves, setMustHaves] = useState("")

  useEffect(() => {
    setDecisions(listTripDecisions())
  }, [])

  const canCreate = destination.trim().length > 0 && days > 0 && budgetInr > 0

  const handleCreate = () => {
    if (!canCreate) return
    const decision = createTripDecision(
      title.trim() || `${destination.trim()} trip`,
      {
        destination: destination.trim(),
        days,
        budgetInr,
        pace,
        mustHaves: mustHaves.split(",").map((place) => place.trim()).filter(Boolean),
      },
    )
    router.push(`/decisions/${decision.id}`)
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        <h1 style={{ color: "#C9A84C", fontFamily: "Georgia,serif", fontSize: 24, marginBottom: 4 }}>
          🤝 Plan Together
        </h1>
        <p style={{ color: "#C4A882", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Lock in a trip plan everyone agreed on, then see exactly how — and why — it drifts
          as things change.
        </p>

        {decisions.length > 0 && (
          <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {decisions.map((decision) => (
              <button
                key={decision.id}
                onClick={() => router.push(`/decisions/${decision.id}`)}
                style={{
                  textAlign: "left", background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.2)",
                  borderRadius: 12, padding: "12px 16px", cursor: "pointer", width: "100%",
                }}
              >
                <div style={{ color: "#F5E6D3", fontSize: 15, fontWeight: 600 }}>{decision.title}</div>
                <div style={{ color: "#C4A882", fontSize: 12, marginTop: 4 }}>
                  {decision.current.destination} · {decision.current.days} days · ₹{decision.current.budgetInr.toLocaleString("en-IN")}
                  {decision.baseline ? " · baseline locked" : " · not locked yet"}
                </div>
              </button>
            ))}
          </div>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: "linear-gradient(135deg,#C9A84C,#D4893F)", borderRadius: 12,
              padding: "12px 20px", color: "#0F0B1E", fontWeight: 700, fontSize: 14,
              border: "none", cursor: "pointer",
            }}
          >
            + New shared trip decision
          </button>
        ) : (
          <div style={{
            background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 16, padding: 20,
          }}>
            <h2 style={{ color: "#C9A84C", fontSize: 16, marginBottom: 14 }}>Starting preferences</h2>

            <FormField label="Trip name (optional)">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Agra weekend with the group" style={inputStyle} />
            </FormField>
            <FormField label="Destination">
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Delhi" style={inputStyle} />
            </FormField>
            <div style={{ display: "flex", gap: 12 }}>
              <FormField label="Days" style={{ flex: 1 }}>
                <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} style={inputStyle} />
              </FormField>
              <FormField label="Max budget per person (₹)" style={{ flex: 1 }}>
                <input type="number" min={0} step={100} value={budgetInr} onChange={(e) => setBudgetInr(Number(e.target.value) || 0)} style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Pace">
              <select value={pace} onChange={(e) => setPace(e.target.value as TripPace)} style={inputStyle}>
                {PACE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Must-have places (comma separated)">
              <input value={mustHaves} onChange={(e) => setMustHaves(e.target.value)} placeholder="e.g. Red Fort, India Gate" style={inputStyle} />
            </FormField>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={handleCreate}
                disabled={!canCreate}
                style={{
                  background: canCreate ? "linear-gradient(135deg,#C9A84C,#D4893F)" : "rgba(201,168,76,0.25)",
                  borderRadius: 10, padding: "10px 20px", color: canCreate ? "#0F0B1E" : "#8a7c5e",
                  fontWeight: 700, fontSize: 14, border: "none", cursor: canCreate ? "pointer" : "default",
                }}
              >
                Create
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: "transparent", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10,
                  padding: "10px 20px", color: "#C4A882", fontSize: 14, cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
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
