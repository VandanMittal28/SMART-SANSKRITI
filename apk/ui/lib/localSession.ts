import { EMPTY_PROFILE, type LocalProfile, type LocalUser } from '@/lib/localProfile'

const LOCAL_SESSION_KEY = 'sanskriti-ai-local-session-v1'
const LOCAL_USER_PREFIX = 'local:'

export interface StoredLocalSession {
  user: LocalUser
  profile: LocalProfile
}

export function isLocalUserId(userId: string): boolean {
  return userId.startsWith(LOCAL_USER_PREFIX)
}

export function readLocalSession(): StoredLocalSession | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || 'null') as StoredLocalSession | null
    if (!stored?.user?.id || !stored.user.username || !stored.profile?.username) return null
    return stored
  } catch {
    return null
  }
}

export function writeLocalSession(session: StoredLocalSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session))
}

export function createLocalSession(username: string): StoredLocalSession {
  const existing = readLocalSession()
  if (existing?.user.username === username) return existing

  const user: LocalUser = {
    id: `${LOCAL_USER_PREFIX}${username}`,
    username,
    email: '',
    isAnonymous: true,
  }
  const profile: LocalProfile = {
    ...EMPTY_PROFILE,
    username,
    full_name: username,
    monuments_visited: [],
    quiz_scores: [],
    badges: [],
    chat_history: [],
    activity_log: [],
  }
  const session = { user, profile }
  writeLocalSession(session)
  return session
}

export function updateLocalProfile(
  userId: string,
  updater: Partial<LocalProfile> | ((profile: LocalProfile) => LocalProfile),
): LocalProfile {
  const session = readLocalSession()
  if (!session || session.user.id !== userId) {
    throw new Error('The local profile is unavailable.')
  }
  const profile = typeof updater === 'function'
    ? updater(session.profile)
    : { ...session.profile, ...updater }
  writeLocalSession({ ...session, user: { ...session.user, username: profile.username }, profile })
  return profile
}

export function clearLocalSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOCAL_SESSION_KEY)
}
