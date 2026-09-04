"use client"

import { useMemo } from "react"
import { Medal, Trophy, Zap } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/lib/authContext"
import { buildSyntheticLeaderboard } from "@/lib/syntheticLeaderboard"
import { cn } from "@/lib/utils"

const RANK_ACCENT = ["text-[#F3D48A]", "text-[#D8DEE9]", "text-[#D9A066]"]

export default function LeaderboardPage() {
  const { profile } = useAuth()

  const leaderboard = useMemo(() => buildSyntheticLeaderboard(profile || {
    username: '',
    full_name: 'Explorer',
    email: 'local@sanskriti.ai',
    total_xp: 0,
    monuments_visited: [],
    quiz_scores: [],
    badges: [],
    chat_history: [],
    activity_log: [],
    user_type: 'tourist',
    language: 'en',
    admin_mode: false,
    mascot_intro_seen_at: null,
  }), [profile])

  const topThree = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)
  const maxXP = leaderboard[0]?.xp || 1

  return (
    <AppShell>
      <div className="screen-gutter flex flex-col gap-6 py-5 animate-fade-in">
        <section>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#D6A84B]">
            <Trophy className="h-3.5 w-3.5" /> Heritage league
          </p>
          <h1 className="mt-1.5 font-heritage text-2xl font-bold text-[#F6F1E8]">Leaderboard</h1>
          <p className="mt-1 text-sm text-[#AEB6C8]">Ranked by XP, with your progress reflected live.</p>
        </section>

        <section className="grid grid-cols-3 gap-2.5" aria-label="Top three explorers">
          {topThree.map((entry, idx) => (
            <div
              key={entry.name + idx}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center",
                entry.isCurrentUser ? "border-[#D6A84B]/45 bg-[#D6A84B]/[0.08]" : "border-white/[0.06] bg-[#11182B]",
              )}
            >
              <Medal className={cn("h-6 w-6", RANK_ACCENT[idx])} />
              <p className={cn("truncate text-xs font-semibold", entry.isCurrentUser ? "text-[#D6A84B]" : "text-[#F6F1E8]")}>
                {entry.name}
              </p>
              {entry.isCurrentUser && <p className="text-[10px] font-medium text-[#AEB6C8]">You</p>}
              <p className="flex items-center gap-1 text-xs font-bold text-[#D6A84B]">
                <Zap className="h-3 w-3 fill-[#D6A84B]" /> {entry.xp}
              </p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2.5" aria-label="Remaining rankings">
          {rest.map((entry) => {
            const width = Math.max(4, Math.round((entry.xp / maxXP) * 100))
            return (
              <div
                key={entry.rank + entry.name}
                className={cn(
                  "rounded-2xl border p-3.5",
                  entry.isCurrentUser ? "border-[#D6A84B]/40 bg-[#D6A84B]/[0.07]" : "border-white/[0.06] bg-[#11182B]",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-[#8891A6]">#{entry.rank}</span>
                    <span className={cn("truncate text-sm font-semibold", entry.isCurrentUser ? "text-[#D6A84B]" : "text-[#F6F1E8]")}>
                      {entry.name}{entry.isCurrentUser ? " (You)" : ""}
                    </span>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-[#D6A84B]">
                    <Zap className="h-3.5 w-3.5 fill-[#D6A84B]" /> {entry.xp}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#D6A84B] to-[#C66B4E] transition-all duration-500" style={{ width: `${width}%` }} />
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </AppShell>
  )
}
