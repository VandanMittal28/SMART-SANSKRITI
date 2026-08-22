import { supabase } from '@/lib/supabase/client'
import { DEFAULT_LANGUAGE, isSupportedLanguage, type SupportedLanguage } from '@/lib/languages'
import type { LocalProfile, LocalUser, ProfileActivity } from '@/lib/localProfile'
import { getBadgeSetFromProfile } from '@/lib/localProfile'
import { isLocalUserId, readLocalSession, updateLocalProfile } from '@/lib/localSession'

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
  mascot_intro_seen_at: string | null
}

type ActivityRow = {
  id: string
  action_type: string
  xp_earned: number
  metadata: Record<string, unknown> | null
  created_at: string
}

const PROFILE_FIELDS = 'username, full_name, email, phone, total_xp, monuments_visited, quiz_scores, profile_badges, chat_history, user_type, language, admin_mode'
const PROFILE_FIELDS_WITH_MASCOT = 'username, full_name, email, phone, total_xp, monuments_visited, quiz_scores, profile_badges, chat_history, user_type, language, admin_mode, mascot_intro_seen_at'
let mascotIntroColumnAvailable: boolean | null = null

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
    mascot_intro_seen_at: row.mascot_intro_seen_at,
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
  if (isLocalUserId(userId)) {
    const session = readLocalSession()
    if (!session || session.user.id !== userId) throw new Error('The local profile is unavailable.')
    return session.profile
  }
  const profileRequest = mascotIntroColumnAvailable === false
    ? supabase.from('profiles').select(PROFILE_FIELDS).eq('id', userId).single()
    : supabase.from('profiles').select(PROFILE_FIELDS_WITH_MASCOT).eq('id', userId).single()
  const [initialProfileResult, activityResult] = await Promise.all([
    profileRequest,
    supabase
      .from('user_activity')
      .select('id, action_type, xp_earned, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  let profileError = initialProfileResult.error
  let profileData: ProfileRow | null = initialProfileResult.data
    ? mascotIntroColumnAvailable === false
      ? {
        ...(initialProfileResult.data as unknown as Omit<ProfileRow, 'mascot_intro_seen_at'>),
        mascot_intro_seen_at: null,
      }
      : initialProfileResult.data as unknown as ProfileRow
    : null
  if (
    profileError
    && (profileError.code === '42703' || profileError.message.includes('mascot_intro_seen_at'))
  ) {
    mascotIntroColumnAvailable = false
    const legacyResult = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', userId)
      .single()
    profileError = legacyResult.error
    profileData = legacyResult.data
      ? {
        ...(legacyResult.data as unknown as Omit<ProfileRow, 'mascot_intro_seen_at'>),
        mascot_intro_seen_at: null,
      }
      : null
  } else if (!profileError && mascotIntroColumnAvailable !== false) {
    mascotIntroColumnAvailable = true
  }

  if (profileError) throw profileError
  if (!profileData) throw new Error('The profile could not be loaded.')
  if (activityResult.error) throw activityResult.error
  return profileFromRow(profileData, (activityResult.data ?? []) as ActivityRow[])
}

export async function updateUserProfile(userId: string, updates: Partial<LocalProfile>) {
  if (isLocalUserId(userId)) return updateLocalProfile(userId, updates)
  const allowed: Partial<ProfileRow> = {}
  if (typeof updates.username === 'string') allowed.username = validateUsername(updates.username)
  if (typeof updates.full_name === 'string') allowed.full_name = updates.full_name.trim().slice(0, 80)
  if (typeof updates.phone === 'string') allowed.phone = updates.phone.trim().slice(0, 30)
  if (updates.user_type === 'student' || updates.user_type === 'tourist') allowed.user_type = updates.user_type
  if (isSupportedLanguage(updates.language)) allowed.language = updates.language as SupportedLanguage
  if (Object.keys(allowed).length === 0) return getUserProfile(userId)

  const { error } = await supabase.from('profiles').update(allowed).eq('id', userId)
  if (error) throw error
  return getUserProfile(userId)
}

export async function markMascotIntroSeen(userId: string): Promise<string> {
  if (isLocalUserId(userId)) {
    const seenAt = new Date().toISOString()
    updateLocalProfile(userId, { mascot_intro_seen_at: seenAt })
    return seenAt
  }
  if (mascotIntroColumnAvailable === false) {
    throw new Error('The installed profile schema does not include mascot_intro_seen_at yet.')
  }
  const seenAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('profiles')
    .update({ mascot_intro_seen_at: seenAt })
    .eq('id', userId)
    .is('mascot_intro_seen_at', null)
    .select('mascot_intro_seen_at')
    .maybeSingle()

  if (error) throw error
  if (data?.mascot_intro_seen_at) return data.mascot_intro_seen_at as string

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('mascot_intro_seen_at')
    .eq('id', userId)
    .single()
  if (readError) throw readError
  if (!existing.mascot_intro_seen_at) throw new Error('The Yatrik welcome could not be saved.')
  return existing.mascot_intro_seen_at as string
}

export async function addXP(userId: string, xpDelta: number, eventType: string): Promise<number> {
  const metadata = eventType === 'ZONE_EXPLORE'
    ? { title: 'Explored a heritage zone', detail: 'Discovered a new part of the monument' }
    : eventType === 'HUNT_STEP_DONE'
      ? { title: 'Solved a treasure-hunt clue', detail: 'Advanced to the next clue' }
      : eventType === 'HUNT_COMPLETED'
        ? { title: 'Completed a treasure hunt', detail: 'Finished the full monument challenge' }
        : eventType === 'QUIZ_CORRECT'
          ? { title: 'Answered a heritage question', detail: 'Correct answer' }
      : { title: readableAction(eventType) }

  if (isLocalUserId(userId)) {
    const profile = updateLocalProfile(userId, (current) => ({
      ...current,
      total_xp: Math.max(0, current.total_xp + xpDelta),
      activity_log: [{
        id: `local-${Date.now()}`,
        type: activityType(eventType),
        title: metadata.title,
        detail: metadata.detail,
        xp: xpDelta,
        timestamp: new Date().toISOString(),
      }, ...current.activity_log].slice(0, 40),
    }))
    return profile.total_xp
  }

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

export async function addMonumentVisited(userId: string, monumentName: string): Promise<string[]> {
  if (isLocalUserId(userId)) {
    const profile = updateLocalProfile(userId, (current) => ({
      ...current,
      monuments_visited: current.monuments_visited.includes(monumentName)
        ? current.monuments_visited
        : [...current.monuments_visited, monumentName],
    }))
    return profile.monuments_visited
  }
  const { data, error } = await supabase.rpc('record_monument', { p_monument: monumentName })
  if (error) throw error
  return (data ?? []) as string[]
}

export async function addQuizScore(
  userId: string,
  score: number,
  monumentName = 'a heritage monument',
): Promise<number[]> {
  if (isLocalUserId(userId)) {
    const profile = updateLocalProfile(userId, (current) => ({
      ...current,
      quiz_scores: [...current.quiz_scores, score],
    }))
    return profile.quiz_scores
  }
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
  if (isLocalUserId(userId)) {
    const current = await getUserProfile(userId)
    const badges = getBadgeSetFromProfile({ ...current, ..._updatedState })
    updateLocalProfile(userId, { badges })
    return badges
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('profile_badges')
    .eq('id', userId)
    .single()
  if (error) throw error
  return (data.profile_badges ?? []) as string[]
}

export async function saveChatMessage(userId: string, role: string, content: string, monument: string) {
  if (isLocalUserId(userId)) {
    updateLocalProfile(userId, (current) => ({
      ...current,
      chat_history: [...current.chat_history, { role, content, monument, timestamp: new Date().toISOString() }],
    }))
    return
  }
  const { error } = await supabase.rpc('append_chat_message', {
    p_role: role,
    p_content: content,
    p_monument: monument,
  })
  if (error) throw error
}

export async function saveChatExchange(
  userId: string,
  userContent: string,
  assistantContent: string,
  monument: string,
) {
  if (isLocalUserId(userId)) {
    const timestamp = new Date().toISOString()
    updateLocalProfile(userId, (current) => ({
      ...current,
      chat_history: [
        ...current.chat_history,
        { role: 'user', content: userContent, monument, timestamp },
        { role: 'assistant', content: assistantContent, monument, timestamp },
      ],
    }))
    return
  }
  const { error } = await supabase.rpc('append_chat_exchange', {
    p_user_content: userContent,
    p_assistant_content: assistantContent,
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
  markMascotIntroSeen,
  addXP,
  addMonumentVisited,
  addQuizScore,
  computeAndSaveBadges,
  saveChatMessage,
  saveChatExchange,
}
