"use client"

import type { DriftAssessment } from "@/lib/driftCalculator"
import type { TripDecisionException } from "@/lib/tripDecisions"

const STATUS_COPY: Record<DriftAssessment["status"], { label: string; color: string; bg: string; border: string }> = {
  stable: { label: "Stable", color: "#4B9B8E", bg: "rgba(75,155,142,0.12)", border: "rgba(75,155,142,0.35)" },
  review: { label: "Worth a second look", color: "#D4893F", bg: "rgba(212,137,63,0.12)", border: "rgba(212,137,63,0.35)" },
  drifted: { label: "Drifted", color: "#E08A8A", bg: "rgba(224,138,138,0.12)", border: "rgba(224,138,138,0.4)" },
}

const DIMENSION_LABEL: Record<string, string> = {
  destination: "Destination",
  days: "Trip length",
  budget: "Budget",
  pace: "Pace",
  mustHaves: "Must-have places",
}

export function DriftIndicatorCard({
  assessment,
  exception,
}: {
  assessment: DriftAssessment
  exception: TripDecisionException | null
}) {
  const status = STATUS_COPY[assessment.status]
  const isExternal = assessment.attribution === "external_constraint"

  return (
    <div style={{
      background: "rgba(28,22,56,0.9)", border: `1px solid ${status.border}`,
      borderRadius: 16, padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ color: "#C9A84C", fontSize: 16, margin: 0 }}>Drift indicator</h2>
        <div style={{
          background: status.bg, border: `1px solid ${status.border}`, color: status.color,
          borderRadius: 999, padding: "4px 12px", fontSize: 13, fontWeight: 700,
        }}>
          {status.label} · {assessment.score}/100
        </div>
      </div>

      {isExternal ? (
        <div style={{
          background: "rgba(75,155,142,0.1)", border: "1px solid rgba(75,155,142,0.3)",
          borderRadius: 10, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ color: "#4B9B8E", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            🌦️ Context changed externally
          </div>
          <p style={{ color: "#F5E6D3", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            This drift was caused by new circumstances at <strong>{exception?.place}</strong>
            {exception ? ` (${exception.category})` : ""} — not by anyone changing their preferences.
            {exception?.note ? ` ${exception.note}` : ""}
          </p>
        </div>
      ) : assessment.score > 0 ? (
        <div style={{
          background: "rgba(212,137,63,0.08)", border: "1px solid rgba(212,137,63,0.25)",
          borderRadius: 10, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ color: "#D4893F", fontWeight: 700, fontSize: 13 }}>
            📝 The plan changed
          </div>
        </div>
      ) : null}

      {assessment.reasons.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assessment.reasons.map((reason) => (
            <div key={reason.dimension} style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10,
              background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: "8px 12px",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#F5E6D3", fontSize: 12, fontWeight: 600 }}>
                  {DIMENSION_LABEL[reason.dimension] ?? reason.dimension}
                </div>
                <div style={{ color: "#C4A882", fontSize: 12, marginTop: 2 }}>{reason.detail}</div>
              </div>
              <div style={{ color: status.color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                +{reason.points}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#C4A882", fontSize: 13, margin: 0 }}>
          No differences from the baseline — the plan is exactly as agreed.
        </p>
      )}
    </div>
  )
}
