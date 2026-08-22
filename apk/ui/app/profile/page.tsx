"use client"

import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  Brain,
  Check,
  ChevronRight,
  Compass,
  Flame,
  Globe,
  MapPinned,
  MessageCircle,
  Pencil,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { AppCard } from '@/components/mobile/app-card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { getLanguageConfig } from '@/lib/languages'
import { useUser } from '@/lib/userContext'
import {
  type LocalProfile,
  type ProfileActivity,
} from '@/lib/localProfile'
import { buildSyntheticLeaderboard } from '@/lib/syntheticLeaderboard'
import { updateUserProfile } from '@/lib/authClient'

const LEVELS = [
  { min: 0, max: 499, title: 'Heritage Explorer', next: 500 },
  { min: 500, max: 999, title: 'Monument Seeker', next: 1000 },
  { min: 1000, max: 1999, title: 'Culture Guardian', next: 2000 },
  { min: 2000, max: 3499, title: 'History Keeper', next: 3500 },
  { min: 3500, max: 99999, title: 'Sanskriti Master', next: null },
]

const EMPTY_PROFILE: LocalProfile = {
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
}

const BADGES = [
  {
    id: 'first_scan',
    icon: '🏛️',
    title: 'First Glimpse',
    desc: 'Identify your first monument',
    progress: (profile: LocalProfile) => Math.min(1, profile.monuments_visited.length),
    current: (profile: LocalProfile) => profile.monuments_visited.length,
    target: 1,
  },
  {
    id: 'quiz_master',
    icon: '🎓',
    title: 'Quiz Master',
    desc: 'Earn 100 quiz XP',
    progress: (profile: LocalProfile) =>
      Math.min(1, profile.quiz_scores.reduce((sum, score) => sum + score, 0) / 100),
    current: (profile: LocalProfile) =>
      profile.quiz_scores.reduce((sum, score) => sum + score, 0),
    target: 100,
  },
  {
    id: 'explorer',
    icon: '🗺️',
    title: 'Explorer',
    desc: 'Discover 3 monuments',
    progress: (profile: LocalProfile) =>
      Math.min(1, profile.monuments_visited.length / 3),
    current: (profile: LocalProfile) => profile.monuments_visited.length,
    target: 3,
  },
  {
    id: 'hunter',
    icon: '🏆',
    title: 'Treasure Hunter',
    desc: 'Reach 500 total XP',
    progress: (profile: LocalProfile) => Math.min(1, profile.total_xp / 500),
    current: (profile: LocalProfile) => profile.total_xp,
    target: 500,
  },
]

const ACTIVITY_META: Record<
  ProfileActivity['type'],
  { icon: string; color: string }
> = {
  scan: { icon: '🏛️', color: '#4B9B8E' },
  quiz: { icon: '🧠', color: '#534AB7' },
  hunt: { icon: '🏆', color: '#D4893F' },
  explore: { icon: '🗺️', color: '#C9A84C' },
  chat: { icon: '💬', color: '#7ECDC0' },
}

function getLevel(xp: number) {
  return LEVELS.find((level) => xp >= level.min && xp <= level.max) || LEVELS[0]
}

function getNextStep(profile: LocalProfile) {
  if (profile.monuments_visited.length === 0) {
    return {
      eyebrow: 'Start your journey',
      title: 'Identify your first monument',
      description: 'Scan a clear monument photo to unlock contextual audio, quizzes, and XP.',
      href: '/recognition',
      action: 'Scan a monument',
      icon: '📷',
    }
  }

  if (profile.quiz_scores.length === 0) {
    const latest = profile.monuments_visited.at(-1)
    return {
      eyebrow: 'Recommended for you',
      title: `Test what you learned about ${latest || 'your monument'}`,
      description: 'Your recognized monument is ready with a matching knowledge quiz.',
      href: '/quiz',
      action: 'Take the quiz',
      icon: '🧠',
    }
  }

  if (profile.monuments_visited.length < 3) {
    return {
      eyebrow: 'Build your collection',
      title: `${3 - profile.monuments_visited.length} more to unlock Explorer`,
      description: 'Identify another heritage site and grow your personal monument collection.',
      href: '/recognition',
      action: 'Discover another',
      icon: '🗺️',
    }
  }

  if (profile.total_xp < 500) {
    return {
      eyebrow: 'Level-up opportunity',
      title: `${500 - profile.total_xp} XP to Treasure Hunter`,
      description: 'A monument treasure hunt is the fastest route toward your next badge.',
      href: '/hunt',
      action: 'Start a hunt',
      icon: '🏆',
    }
  }

  return {
    eyebrow: 'Keep your streak alive',
    title: 'Explore a new heritage story',
    description: 'Continue your journey with architecture, history, and immersive time travel.',
    href: '/explore',
    action: 'Continue exploring',
    icon: '✨',
  }
}

function fallbackActivity(profile: LocalProfile): ProfileActivity[] {
  const monumentActivities: ProfileActivity[] = profile.monuments_visited
    .slice()
    .reverse()
    .slice(0, 3)
    .map((name, index) => ({
      id: `legacy-monument-${index}`,
      type: 'scan' as const,
      title: `Identified ${name}`,
      detail: 'Part of your monument collection',
      timestamp: '',
    }))

  if (profile.quiz_scores.length > 0) {
    monumentActivities.push({
      id: 'legacy-quiz',
      type: 'quiz',
      title: `${profile.quiz_scores.length} correct quiz answers`,
      detail: `${profile.quiz_scores.reduce((sum, score) => sum + score, 0)} quiz XP earned`,
      timestamp: '',
    })
  }

  return monumentActivities
}

export default function ProfilePage() {
  const { user, profile, setProfile, refreshProfile } = useAuth()
  const { lang, t } = useLang()
  const { userType, setUserType, userConfig } = useUser()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const safeProfile = profile || EMPTY_PROFILE
  const level = getLevel(safeProfile.total_xp)
  const progress = level.next
    ? Math.min(
        100,
        Math.round(
          ((safeProfile.total_xp - level.min) / (level.next - level.min)) * 100,
        ),
      )
    : 100
  const xpToNext = level.next
    ? Math.max(0, level.next - safeProfile.total_xp)
    : 0
  const quizXP = safeProfile.quiz_scores.reduce((sum, score) => sum + score, 0)
  const questionsAsked = safeProfile.chat_history.filter(
    (message) => message.role === 'user',
  ).length
  const nextStep = getNextStep(safeProfile)
  const recentActivity =
    safeProfile.activity_log.length > 0
      ? safeProfile.activity_log.slice(0, 5)
      : fallbackActivity(safeProfile)

  const initials = useMemo(() => {
    const source = safeProfile.full_name || safeProfile.email || 'Explorer'
    return source
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [safeProfile.full_name, safeProfile.email])

  const rank = useMemo(
    () =>
      buildSyntheticLeaderboard(safeProfile).find(
        (entry) => entry.isCurrentUser,
      )?.rank || 1,
    [safeProfile],
  )

  const activityCounts = [
    {
      label: 'Monuments',
      value: safeProfile.monuments_visited.length,
      icon: MapPinned,
      color: '#4B9B8E',
    },
    {
      label: 'Correct answers',
      value: safeProfile.quiz_scores.length,
      icon: Brain,
      color: '#534AB7',
    },
    {
      label: 'AI questions',
      value: questionsAsked,
      icon: MessageCircle,
      color: '#D4893F',
    },
  ]
  const activityMaximum = Math.max(1, ...activityCounts.map((item) => item.value))

  const beginNameEdit = () => {
    setNameDraft(safeProfile.full_name || '')
    setEditingName(true)
  }

  const saveName = async () => {
    const name = nameDraft.trim()
    if (name && user) {
      setProfile((current) =>
        current ? { ...current, full_name: name } : current,
      )
      try {
        await updateUserProfile(user.id, { full_name: name })
        await refreshProfile()
      } catch {
        await refreshProfile()
      }
    }
    setEditingName(false)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 px-4 pb-8">
        <AppCard className="overflow-hidden p-0">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(201,168,76,0.2),transparent_34%),linear-gradient(135deg,rgba(28,22,56,0.98),rgba(9,13,25,0.98))] p-5 lg:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-xl font-semibold text-[#F7D88C]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#8C7B63]">
                    {level.title}
                  </p>
                  {editingName ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveName()
                          if (event.key === 'Escape') setEditingName(false)
                        }}
                        autoFocus
                        maxLength={50}
                        className="min-w-0 rounded-xl border border-[#C9A84C]/35 bg-black/25 px-3 py-2 text-lg font-semibold text-[#F5E6D3] outline-none focus:border-[#C9A84C]"
                        aria-label="Profile name"
                      />
                      <button
                        type="button"
                        onClick={saveName}
                        aria-label="Save profile name"
                        className="rounded-lg p-2 text-[#7ECDC0] hover:bg-white/5"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        aria-label="Cancel editing"
                        className="rounded-lg p-2 text-[#C4A882] hover:bg-white/5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold text-[#F5E6D3]">
                        {safeProfile.full_name || t('explorer')}
                      </h1>
                      <button
                        type="button"
                        onClick={beginNameEdit}
                        aria-label="Edit profile name"
                        className="rounded-lg p-2 text-[#8C7B63] transition hover:bg-white/5 hover:text-[#F7D88C]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <p className="mt-1 text-sm text-[#C4A882]">
                    {userConfig?.subtitle || t('profile_subtitle')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="rounded-full border border-[#C9A84C]/25 bg-[#C9A84C]/12 px-3 py-1.5 text-xs font-semibold text-[#F7D88C]">
                  ⚡ {safeProfile.total_xp.toLocaleString()} XP
                </span>
                <span className="rounded-full border border-[#4B9B8E]/25 bg-[#4B9B8E]/12 px-3 py-1.5 text-xs font-semibold text-[#7ECDC0]">
                  Rank #{rank}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  label: t('visited_label'),
                  value: safeProfile.monuments_visited.length,
                  icon: MapPinned,
                },
                {
                  label: 'Quiz XP',
                  value: quizXP,
                  icon: Brain,
                },
                {
                  label: t('badges_label'),
                  value: safeProfile.badges.length,
                  icon: BadgeCheck,
                },
                {
                  label: 'AI questions',
                  value: questionsAsked,
                  icon: MessageCircle,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-white/10 bg-white/5 p-3"
                >
                  <item.icon className="h-4 w-4 text-[#F7D88C]" />
                  <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-[#8C7B63]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#F5E6D3]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AppCard>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <AppCard>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8C7B63]">
                  {t('current_level')}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#F5E6D3]">
                  {level.title}
                </h2>
                <p className="mt-1 text-sm text-[#C4A882]">
                  {level.next
                    ? `${xpToNext} XP until your next level`
                    : 'You reached the highest heritage level'}
                </p>
              </div>
              <div className="rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/12 px-3 py-1 text-sm font-semibold text-[#F7D88C]">
                {progress}%
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,#C9A84C,#D4893F)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </AppCard>

          <AppCard>
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-[#D4893F]" />
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8C7B63]">
                  Journey signal
                </p>
                <p className="mt-1 text-sm font-semibold text-[#F5E6D3]">
                  {recentActivity.length > 0
                    ? `${recentActivity.length} recent learning moments`
                    : 'Ready for your first discovery'}
                </p>
              </div>
            </div>
          </AppCard>
        </div>

        <AppCard className="border-[#C9A84C]/25 bg-[linear-gradient(135deg,rgba(201,168,76,0.11),rgba(75,155,142,0.08))]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/20 text-2xl">
                {nextStep.icon}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A84C]">
                  {nextStep.eyebrow}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#F5E6D3]">
                  {nextStep.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#C4A882]">
                  {nextStep.description}
                </p>
              </div>
            </div>
            <Button
              asChild
              className="shrink-0 rounded-xl bg-[#C9A84C] text-[#0E0916]"
            >
              <a href={nextStep.href}>{nextStep.action}</a>
            </Button>
          </div>
        </AppCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <AppCard>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F7D88C]" />
              <div>
                <h2 className="font-semibold text-[#F5E6D3]">Learning pattern</h2>
                <p className="text-xs text-[#8C7B63]">
                  Calculated from your real app activity
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {activityCounts.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#C4A882]">
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-semibold text-[#F5E6D3]">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.value / activityMaximum) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-[#7ECDC0]" />
                <div>
                  <h2 className="font-semibold text-[#F5E6D3]">Recent journey</h2>
                  <p className="text-xs text-[#8C7B63]">Your latest discoveries</p>
                </div>
              </div>
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((item) => {
                  const meta = ACTIVITY_META[item.type]
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/7 bg-black/15 p-3"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${meta.color}18` }}
                      >
                        {meta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#F5E6D3]">
                          {item.title}
                        </p>
                        {!!item.detail && (
                          <p className="truncate text-xs text-[#8C7B63]">
                            {item.detail}
                          </p>
                        )}
                      </div>
                      {!!item.xp && (
                        <span className="shrink-0 text-xs font-semibold text-[#C9A84C]">
                          +{item.xp} XP
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-2xl">🏛️</p>
                <p className="mt-2 text-sm font-semibold text-[#F5E6D3]">
                  Your journey starts here
                </p>
                <p className="mt-1 text-xs text-[#8C7B63]">
                  Scans, quizzes, hunts, and questions will appear here.
                </p>
              </div>
            )}
          </AppCard>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#F5E6D3]">
                Badge progress
              </h2>
              <p className="text-xs text-[#8C7B63]">
                Every badge reflects your actual journey
              </p>
            </div>
            <a
              href="/badges"
              className="text-xs font-semibold text-[#C9A84C] hover:text-[#F7D88C]"
            >
              View all
            </a>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {BADGES.map((badge) => {
              const earned = safeProfile.badges.includes(badge.id)
              const badgeProgress = badge.progress(safeProfile)
              return (
                <div
                  key={badge.id}
                  className={`app-card rounded-[20px] p-4 ${
                    earned ? 'border-[#C9A84C]/30 bg-[#C9A84C]/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{earned ? badge.icon : '🔒'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[#F5E6D3]">{badge.title}</p>
                        <span className="text-xs text-[#8C7B63]">
                          {Math.min(badge.current(safeProfile), badge.target)}/{badge.target}
                        </span>
                      </div>
                      <p className="text-sm text-[#C4A882]">{badge.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#8C7B63]" />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[#C9A84C] transition-all duration-500"
                      style={{ width: `${badgeProgress * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <div
            className="app-card flex items-center justify-between rounded-[20px] px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-[#F7D88C]" />
              <div>
                <p className="text-sm font-semibold text-[#F5E6D3]">
                  {t('language_label')}
                </p>
                <p data-no-translate className="text-xs text-[#C4A882]">
                  {getLanguageConfig(lang).nativeName}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setUserType(userType === 'student' ? 'tourist' : 'student')
            }
            className="app-card flex items-center justify-between rounded-[20px] px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-[#7ECDC0]" />
              <div>
                <p className="text-sm font-semibold text-[#F5E6D3]">
                  {t('mode_title')}
                </p>
                <p className="text-xs text-[#C4A882]">
                  {userType === 'student' ? 'Student mode' : 'Tourist mode'}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#C9A84C]">
              {t('mode_switch')}
            </span>
          </button>
        </div>

        <AppCard className="safe-bottom-space">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-[#F7D88C]" />
            <div className="flex-1">
              <p className="font-semibold text-[#F5E6D3]">
                Your progress belongs to you
              </p>
              <p className="text-sm text-[#C4A882]">
                XP and activity update automatically as you use recognition,
                quizzes, hunts, exploration, and chat.
              </p>
            </div>
          </div>
        </AppCard>
      </div>
    </AppShell>
  )
}
