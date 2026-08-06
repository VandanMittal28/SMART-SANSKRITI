"use client"

import { useMemo } from "react"
import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/lib/authContext"
import { buildSyntheticLeaderboard } from "@/lib/syntheticLeaderboard"

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
  }), [profile])

  const topThree = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)
  const maxXP = leaderboard[0]?.xp || 1

  return (
    <AppShell>
      <div className="px-4 py-3 space-y-4">
        <header className="rounded-2xl border border-[#C9A84C]/25 bg-[#1C1638]/80 p-4 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A6E5C]">Synthetic Rankings</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#C9A84C]">🏆 Heritage League</h1>
          <p className="mt-1 text-sm text-[#C4A882]">Dynamic local leaderboard with your current XP injected in real time.</p>
        </header>

        <section className="grid grid-cols-3 gap-3">
          {topThree.map((entry, idx) => (
            <div key={entry.name + idx} className="rounded-2xl border border-[#C9A84C]/20 bg-[#1C1638]/80 p-3 text-center backdrop-blur-lg">
              <div className="text-3xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
              <p className={`mt-1 text-sm font-semibold ${entry.isCurrentUser ? 'text-[#C9A84C]' : 'text-[#F5E6D3]'}`}>
                {entry.name}{entry.isCurrentUser ? ' (You)' : ''}
              </p>
              <p className="text-xs text-[#C4A882]">{entry.badge || '✨'}</p>
              <p className="mt-1 text-sm font-bold text-[#C9A84C]">⚡ {entry.xp}</p>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          {rest.map((entry) => {
            const width = Math.max(4, Math.round((entry.xp / maxXP) * 100))
            return (
              <div key={entry.rank + entry.name} className={`rounded-2xl border p-3 backdrop-blur-lg ${entry.isCurrentUser ? 'border-[#C9A84C]/40 bg-[#C9A84C]/10' : 'border-white/5 bg-[#1C1638]/75'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-9 text-center text-sm font-bold text-[#C4A882]">#{entry.rank}</span>
                    <span className={`font-medium ${entry.isCurrentUser ? 'text-[#C9A84C]' : 'text-[#F5E6D3]'}`}>
                      {entry.name}{entry.isCurrentUser ? ' (You)' : ''}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#C9A84C]">⚡ {entry.xp}</span>
                </div>
                <div className="h-2 rounded-full bg-black/35">
                  <div className="h-full rounded-full gold-gradient transition-all duration-500" style={{ width: `${width}%` }} />
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </AppShell>
  )
}
