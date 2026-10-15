"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BadgeCheck,
  Brain,
  Check,
  ChevronRight,
  Compass,
  Flame,
  Globe,
  LogOut,
  MapPinned,
  MessageCircle,
  Pencil,
  Sparkles,
  Target,
  Trophy,
  UserRoundPlus,
  X,
} from 'lucide-react'
import Link from 'next/link'
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
import { isBundledNativeApp } from '@/lib/supabase/client'

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
  scan: { icon: '🏛️', color: '#2F7D63' },
  quiz: { icon: '🧠', color: '#534AB7' },
  hunt: { icon: '🏆', color: '#C66B4E' },
  explore: { icon: '🗺️', color: '#8A6A05' },
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
  const router = useRouter()
  const { availableProfiles, user, profile, setProfile, refreshProfile, signOut } = useAuth()
  const { lang, t } = useLang()
  const { userType, setUserType } = useUser()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [leavingProfile, setLeavingProfile] = useState(false)

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
      color: '#2F7D63',
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
      color: '#C66B4E',
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

  const leaveCurrentProfile = async () => {
    if (leavingProfile) return
    setLeavingProfile(true)
    try {
      await signOut()
      if (isBundledNativeApp()) {
        window.location.replace(new URL('/login', window.location.href).toString())
      } else {
        router.replace('/login')
        router.refresh()
      }
    } finally {
      setLeavingProfile(false)
    }
  }

  /** One row of the settings list: icon, label, optional value, chevron. */
  function Row({
    icon: Icon, label, detail, value, href, onClick, danger,
  }: {
    icon: typeof Globe
    label: string
    detail?: string
    value?: string
    href?: string
    onClick?: () => void
    danger?: boolean
  }) {
    const inner = (
      <>
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${danger ? 'bg-[var(--destructive)]/10 text-[var(--destructive)]' : 'bg-[var(--muted)] text-[var(--foreground)]'}`}>
          <Icon className="size-[19px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[16px] font-semibold ${danger ? 'text-[var(--destructive)]' : 'text-[var(--foreground)]'}`}>
            {label}
          </span>
          {detail && <span className="mt-0.5 block truncate text-[13px] text-[var(--muted-foreground)]">{detail}</span>}
        </span>
        {value && <span className="shrink-0 text-[14px] font-medium text-[var(--muted-foreground)]">{value}</span>}
        <ChevronRight className="size-[18px] shrink-0 text-[var(--muted-foreground)]" />
      </>
    )
    const className = 'flex w-full items-center gap-3.5 px-[22px] py-3 text-left transition-colors active:bg-[var(--muted)]'
    if (href) return <Link className={className} href={href}>{inner}</Link>
    return <button className={className} onClick={onClick} type="button">{inner}</button>
  }

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <h2 className="px-[22px] pb-1.5 pt-6 text-[15px] font-bold text-[var(--muted-foreground)]">{children}</h2>
  )

  return (
    <AppShell>
      <div className="mx-auto max-w-[420px] pb-10">
        {/* ── XP section ─────────────────────────────────────────────────
            Kept from the existing app: identity, XP, rank, the four counters
            and level progress. Everything below it is the minimal list. */}
        <div className="px-[22px] pt-5">
          <h1 className="font-display text-[2rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">Profile</h1>

          <div className="surface mt-4 p-5">
            <div className="flex items-start gap-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--primary)] font-display text-[20px] font-semibold text-[var(--primary-foreground)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{level.title}</p>
                {editingName ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveName()
                        if (event.key === 'Escape') setEditingName(false)
                      }}
                      autoFocus
                      maxLength={50}
                      className="min-w-0 flex-1 rounded-full bg-[var(--muted)] px-4 py-2 text-[17px] font-semibold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      aria-label="Profile name"
                    />
                    <button aria-label="Save name" className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]" onClick={saveName} type="button">
                      <Check className="size-4" />
                    </button>
                    <button aria-label="Cancel" className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--muted)]" onClick={() => setEditingName(false)} type="button">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="min-w-0 truncate font-display text-[22px] font-semibold tracking-[-0.025em] text-[var(--foreground)]">
                      {safeProfile.full_name || safeProfile.username}
                    </h2>
                    <button aria-label="Edit name" className="shrink-0 text-[var(--muted-foreground)]" onClick={() => { setNameDraft(safeProfile.full_name || ''); setEditingName(true) }} type="button">
                      <Pencil className="size-4" />
                    </button>
                  </div>
                )}
                <p className="mt-0.5 truncate text-[13px] text-[var(--muted-foreground)]">@{safeProfile.username}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--primary)]/18 px-3.5 py-1.5 text-[12px] font-bold text-[var(--on-tint)]">
                {safeProfile.total_xp.toLocaleString()} XP
              </span>
              <span className="rounded-full bg-[var(--muted)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--foreground)]">
                Rank #{rank}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[
                { label: t('visited_label'), value: safeProfile.monuments_visited.length, icon: MapPinned },
                { label: 'Quiz XP', value: quizXP, icon: Brain },
                { label: t('badges_label'), value: safeProfile.badges.length, icon: BadgeCheck },
                { label: 'AI questions', value: questionsAsked, icon: MessageCircle },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] bg-[var(--muted)] p-3.5">
                  <item.icon className="size-[17px] text-[var(--muted-foreground)]" />
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{item.label}</p>
                  <p className="mt-0.5 font-display text-[22px] font-semibold text-[var(--foreground)]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-end justify-between">
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {level.next ? `${xpToNext} XP until your next level` : 'Highest heritage level reached'}
                </p>
                <span className="font-display text-[15px] font-semibold text-[var(--foreground)]">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Minimal list ──────────────────────────────────────────────── */}
        <SectionLabel>Your journey</SectionLabel>
        <div className="surface mx-[14px] overflow-hidden py-1.5">
          <Row icon={BadgeCheck} label={t('badges_label')} detail="Achievements you have earned" value={String(safeProfile.badges.length)} href="/badges" />
          <Row icon={Trophy} label="Leaderboard" detail={`You are ranked #${rank}`} href="/leaderboard" />
          <Row icon={Flame} label="Journey signal" detail={recentActivity.length > 0 ? `${recentActivity.length} recent learning moments` : 'Ready for your first discovery'} href="/explore" />
        </div>

        {recentActivity.length > 0 && (
          <>
            <SectionLabel>Recent</SectionLabel>
            <div className="surface mx-[14px] overflow-hidden py-1.5">
              {recentActivity.slice(0, 5).map((item) => {
                const meta = ACTIVITY_META[item.type]
                return (
                  <div key={item.id} className="flex items-center gap-3.5 px-[22px] py-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${meta.color}22` }}>
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-[var(--foreground)]">{item.title}</span>
                      {!!item.detail && <span className="mt-0.5 block truncate text-[13px] text-[var(--muted-foreground)]">{item.detail}</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <SectionLabel>Learning pattern</SectionLabel>
        <div className="surface mx-[14px] space-y-3.5 px-[22px] py-4">
          {activityCounts.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-[14px]">
                <span className="flex items-center gap-2.5 text-[var(--muted-foreground)]">
                  <item.icon className="size-4" style={{ color: item.color }} />
                  {item.label}
                </span>
                <span className="font-semibold text-[var(--foreground)]">{item.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(item.value / activityMaximum) * 100}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>

        <SectionLabel>Preferences</SectionLabel>
        <div className="surface mx-[14px] overflow-hidden py-1.5">
          <Row icon={Globe} label={t('language_label')} value={getLanguageConfig(lang).nativeName} href="/profile" />
          <Row
            icon={Target}
            label={t('mode_title')}
            detail={userType === 'student' ? 'Student mode' : 'Tourist mode'}
            value={t('mode_switch')}
            onClick={() => setUserType(userType === 'student' ? 'tourist' : 'student')}
          />
        </div>

        <SectionLabel>Account</SectionLabel>
        <div className="surface mx-[14px] overflow-hidden py-1.5">
          <Row
            icon={UserRoundPlus}
            label="Switch or add profile"
            detail={`${availableProfiles.length} profile${availableProfiles.length === 1 ? '' : 's'} on this device`}
            onClick={() => void leaveCurrentProfile()}
          />
          <Row icon={LogOut} label="Log out" danger onClick={() => void leaveCurrentProfile()} />
        </div>

        <p className="px-[22px] pt-6 text-center text-[12px] leading-5 text-[var(--muted-foreground)]">
          XP and activity update automatically as you use recognition, quizzes, hunts, exploration and chat.
        </p>
      </div>
    </AppShell>
  )
}
