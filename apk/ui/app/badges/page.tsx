'use client'

import { Award, Backpack, Target, Brain, Lock, Sparkles, Zap } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/authContext'
import { cn } from '@/lib/utils'

type BadgeId = 'first_steps' | 'explorer' | 'quiz_master' | 'hunter' | 'day_tripper'

type BadgeDef = {
  id: BadgeId
  title: string
  icon: typeof Award
  hint: string
  xpRequired: number
}

const BADGES: BadgeDef[] = [
  { id: 'first_steps', title: 'First Steps', icon: Sparkles, hint: 'Earn 25 XP by checking in to a zone.', xpRequired: 25 },
  { id: 'explorer', title: 'Explorer', icon: Award, hint: 'Earn 100 XP by visiting monuments.', xpRequired: 100 },
  { id: 'quiz_master', title: 'Quiz Master', icon: Brain, hint: 'Earn 200 XP by answering quiz questions.', xpRequired: 200 },
  { id: 'hunter', title: 'Hunter', icon: Target, hint: 'Earn 500 XP by completing the treasure hunt.', xpRequired: 500 },
  { id: 'day_tripper', title: 'Day Tripper', icon: Backpack, hint: 'Earn 1000 XP through exploration.', xpRequired: 1000 },
]

const MAX_XP = 1000

function unlockBadges(totalXp: number): BadgeId[] {
  return BADGES.filter((b) => totalXp >= b.xpRequired).map((b) => b.id)
}

export default function AchievementsPage() {
  const { profile, loading } = useAuth()

  const totalXp = profile?.total_xp || 0
  const earned = unlockBadges(totalXp)
  const xpPct = Math.min(100, Math.round((totalXp / MAX_XP) * 100))
  const monumentsVisited = (profile?.monuments_visited || []).length

  return (
    <AppShell>
      <div className="screen-gutter flex flex-col gap-6 py-5 animate-fade-in">
        <section>
          <h1 className="font-heritage text-2xl font-bold text-[#F6F1E8]">Achievements</h1>
          <p className="mt-1 text-sm text-[#AEB6C8]">Every badge marks a milestone in your heritage journey.</p>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="size-8 text-[#D6A84B]" />
          </div>
        ) : (
          <>
            {profile && (
              <section className="app-card flex items-center justify-between rounded-2xl p-4">
                <div>
                  <p className="font-semibold text-[#F6F1E8]">{profile.full_name || 'Explorer'}</p>
                  <p className="mt-0.5 text-xs text-[#AEB6C8]">
                    {monumentsVisited} monument{monumentsVisited !== 1 ? 's' : ''} visited
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-lg font-bold text-[#D6A84B]">
                  <Zap className="size-4 fill-[#D6A84B]" />
                  {totalXp.toLocaleString()}
                </div>
              </section>
            )}

            <section className="app-card rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[#AEB6C8]">Total XP progress</span>
                <span className="text-sm font-bold text-[#D6A84B]">{xpPct}%</span>
              </div>
              <Progress value={xpPct} className="h-2.5 bg-white/[0.06]" />
              <div className="mt-2 flex justify-between text-[11px] text-[#AEB6C8]">
                <span>0 XP</span>
                <span>{MAX_XP.toLocaleString()} XP</span>
              </div>
            </section>

            <section className="flex flex-col gap-3" aria-label="Badge list">
              {BADGES.map((badge) => {
                const isEarned = earned.includes(badge.id)
                const Icon = badge.icon
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      'flex items-start gap-3.5 rounded-2xl border p-4 transition-colors',
                      isEarned
                        ? 'border-[#D6A84B]/40 bg-[#D6A84B]/[0.07]'
                        : 'border-white/[0.06] bg-[#11182B]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                        isEarned ? 'bg-[#D6A84B]/15 text-[#D6A84B]' : 'bg-white/[0.04] text-[#5A6478]',
                      )}
                    >
                      {isEarned ? <Icon className="h-5 w-5" /> : <Lock className="h-4.5 w-4.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('font-semibold', isEarned ? 'text-[#F6F1E8]' : 'text-[#8891A6]')}>{badge.title}</p>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            isEarned
                              ? 'border-[#63C7BA]/35 bg-[#63C7BA]/10 text-[#8DE0D6]'
                              : 'border-white/10 bg-white/[0.03] text-[#5A6478]',
                          )}
                        >
                          {isEarned ? 'Earned' : 'Locked'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#AEB6C8]">
                        {isEarned ? 'Nice work — keep exploring.' : badge.hint}
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-[#8891A6]">Requires {badge.xpRequired.toLocaleString()} XP</p>
                    </div>
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
