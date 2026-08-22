import { supabase } from '@/lib/supabase/client'
import { DEFAULT_LANGUAGE, isSupportedLanguage, type SupportedLanguage } from '@/lib/languages'
import type { LocalProfile, LocalUser, ProfileActivity } from '@/lib/localProfile'

type ProfileRow = {
  username: string
  full_name: string | null
  email: string | null
  phone: string | null
  total_xp: number
  monuments_visited: string[] | null
  quiz_scores: number[] | null
  profile_badges: string[] | null
  chat_history: Array<Record<string, unknown>> | null
  user_type: 'student' | 'tourist' | null
  language: string | null
  admin_mode: boolean | null
}

type ActivityRow = {
  id: string
  action_type: string
  xp_earned: number
  metadata: Record<string, unknown> | null
  created_at: string
}

function activityType(actionType: string): ProfileActivity['type'] {
  if (actionType.includes('QUIZ')) return 'quiz'
  if (actionType.includes('HUNT')) return 'hunt'
  if (actionType.includes('EXPLORE') || actionType.includes('ZONE')) return 'explore'
  if (actionType.includes('CHAT')) return 'chat'
  return 'scan'
}

function readableAction(actionType: string): string {
  return actionType
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function activityFromRow(row: ActivityRow): ProfileActivity {
  const metadata = row.metadata ?? {}
  return {
    id: row.id,
    type: activityType(row.action_type),
    title: typeof metadata.title === 'string' ? metadata.title : readableAction(row.action_type),
    detail: typeof metadata.detail === 'string' ? metadata.detail : undefined,
    xp: row.xp_earned || undefined,
    timestamp: row.created_at,
  }
}

function profileFromRow(row: ProfileRow, activity: ActivityRow[]): LocalProfile {
  return {
    username: row.username,
    full_name: row.full_name || row.username,
    email: row.email || '',
    phone: row.phone || '',
    total_xp: row.total_xp ?? 0,
    monuments_visited: row.monuments_visited ?? [],
    quiz_scores: row.quiz_scores ?? [],
    badges: row.profile_badges ?? [],
    chat_history: row.chat_history ?? [],
    activity_log: activity.map(activityFromRow),
    user_type: row.user_type === 'student' ? 'student' : 'tourist',
    language: isSupportedLanguage(row.language) ? row.language : DEFAULT_LANGUAGE,
    admin_mode: Boolean(row.admin_mode),
  }
}

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24)
}

function validateUsername(value: string): string {
  const username = normalizeUsername(value)
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new Error('Use 3–24 letters, numbers, or underscores for your username.')
  }
  return username
}

export async function signIn(usernameInput: string) {
  const username = validateUsername(usernameInput)
  const { data: current } = await supabase.auth.getSession()

  if (current.session?.user) {
    const profile = await getUserProfile(current.session.user.id)
    if (profile.username !== username) {
      throw new Error(`This browser is already signed in as @${profile.username}.`)
    }
    return {
      user: {
        id: current.session.user.id,
        username: profile.username,
        email: current.session.user.email || '',
        isAnonymous: current.session.user.is_anonymous === true,
      } satisfies LocalUser,
      error: null,
    }
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        username,
        full_name: username,
      },
    },
  })

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('anonymous') && message.includes('disabled')) {
      throw new Error('Username login is not enabled for this Supabase project yet.')
    }
    if (message.includes('database') || message.includes('duplicate')) {
      throw new Error('That username is already in use. Please choose another one.')
    }
    throw error
  }

  if (!data.user) throw new Error('Supabase did not create a user session.')

  return {
    user: {
      id: data.user.id,
      username,
      email: data.user.email || '',
      isAnonymous: true,
    } satisfies LocalUser,
    error: null,
  }
}

export async function signUp(_email: string, _password: string, fullName: string) {
  return signIn(fullName)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  return { error: null }
}

export async function session() {
  return supabase.auth.getSession()
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const profile = await getUserProfile(data.user.id)
  return {
    id: data.user.id,
    username: profile.username,
    email: data.user.email || '',
    isAnonymous: data.user.is_anonymous === true,
  }
}

export async function getUserProfile(userId: string): Promise<LocalProfile> {
  const [profileResult, activityResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, full_name, email, phone, total_xp, monuments_visited, quiz_scores, profile_badges, chat_history, user_type, language, admin_mode')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_activity')
      .select('id, action_type, xp_earned, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  if (profileResult.error) throw profileResult.error
  if (activityResult.error) throw activityResult.error
  return profileFromRow(profileResult.data as ProfileRow, (activityResult.data ?? []) as ActivityRow[])
}

export async function updateUserProfile(userId: string, updates: Partial<LocalProfile>) {
  const allowed: Partial<ProfileRow> = {}
  if (typeof updates.full_name === 'string') allowed.full_name = updates.full_name.trim().slice(0, 80)
  if (typeof updates.phone === 'string') allowed.phone = updates.phone.trim().slice(0, 30)
  if (updates.user_type === 'student' || updates.user_type === 'tourist') allowed.user_type = updates.user_type
  if (isSupportedLanguage(updates.language)) allowed.language = updates.language as SupportedLanguage
  if (Object.keys(allowed).length === 0) return getUserProfile(userId)

  const { error } = await supabase.from('profiles').update(allowed).eq('id', userId)
  if (error) throw error
  return getUserProfile(userId)
}

export async function addXP(_userId: string, xpDelta: number, eventType: string): Promise<number> {
  const metadata = eventType === 'ZONE_EXPLORE'
    ? { title: 'Explored a heritage zone', detail: 'Discovered a new part of the monument' }
    : eventType === 'HUNT_STEP_DONE'
      ? { title: 'Solved a treasure-hunt clue', detail: 'Advanced to the next clue' }
      : eventType === 'HUNT_COMPLETED'
        ? { title: 'Completed a treasure hunt', detail: 'Finished the full monument challenge' }
        : eventType === 'QUIZ_CORRECT'
          ? { title: 'Answered a heritage question', detail: 'Correct answer' }
          : { title: readableAction(eventType) }

  const { data, error } = await supabase.rpc('log_activity_and_award_xp', {
    p_action_type: eventType,
    p_xp: xpDelta,
    p_metadata: metadata,
  })
  if (error) throw error
  const result = data?.[0]
  if (!result) throw new Error('The XP activity could not be recorded.')
  return result.new_total_xp as number
}

export async function addMonumentVisited(_userId: string, monumentName: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('record_monument', { p_monument: monumentName })
  if (error) throw error
  return (data ?? []) as string[]
}

export async function addQuizScore(
  _userId: string,
  score: number,
  monumentName = 'a heritage monument',
): Promise<number[]> {
  const { data, error } = await supabase.rpc('record_quiz_score', {
    p_score: score,
    p_monument: monumentName,
  })
  if (error) throw error
  return (data ?? []) as number[]
}

export async function computeAndSaveBadges(
  userId: string,
  _updatedState?: { total_xp?: number; monuments_visited?: string[]; quiz_scores?: number[] },
): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('profile_badges')
    .eq('id', userId)
    .single()
  if (error) throw error
  return (data.profile_badges ?? []) as string[]
}

export async function saveChatMessage(_userId: string, role: string, content: string, monument: string) {
  const { error } = await supabase.rpc('append_chat_message', {
    p_role: role,
    p_content: content,
    p_monument: monument,
  })
  if (error) throw error
}

export const authClient = {
  signUp,
  signIn,
  signOut,
  session,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  addXP,
  addMonumentVisited,
  addQuizScore,
  computeAndSaveBadges,
  saveChatMessage,
}
