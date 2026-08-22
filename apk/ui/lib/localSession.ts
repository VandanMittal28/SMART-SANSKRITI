import { EMPTY_PROFILE, type LocalProfile, type LocalUser } from '@/lib/localProfile'

const LOCAL_SESSION_KEY = 'sanskriti-ai-local-session-v1'
const LOCAL_PROFILE_STORE_KEY = 'sanskriti-ai-local-profiles-v2'
const LOCAL_USER_PREFIX = 'local:'

export interface StoredLocalSession {
  user: LocalUser
  profile: LocalProfile
}

interface StoredLocalProfileVault {
  activeUserId: string | null
  sessions: StoredLocalSession[]
}

export function isLocalUserId(userId: string): boolean {
  return userId.startsWith(LOCAL_USER_PREFIX)
}

function validSession(value: StoredLocalSession | null | undefined): value is StoredLocalSession {
  return Boolean(value?.user?.id && value.user.username && value.profile?.username)
}

function readVault(): StoredLocalProfileVault {
  if (typeof window === 'undefined') return { activeUserId: null, sessions: [] }
  try {
    const rawVault = localStorage.getItem(LOCAL_PROFILE_STORE_KEY)
    if (rawVault !== null) {
      const stored = JSON.parse(rawVault) as Partial<StoredLocalProfileVault> | null
      const sessions = Array.isArray(stored?.sessions) ? stored.sessions.filter(validSession) : []
      const activeUserId = sessions.some((session) => session.user.id === stored?.activeUserId)
        ? stored?.activeUserId ?? null
        : null
      return { activeUserId, sessions }
    }

    const legacy = JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || 'null') as StoredLocalSession | null
    const migrated: StoredLocalProfileVault = validSession(legacy)
      ? { activeUserId: legacy.user.id, sessions: [legacy] }
      : { activeUserId: null, sessions: [] }
    localStorage.setItem(LOCAL_PROFILE_STORE_KEY, JSON.stringify(migrated))
    localStorage.removeItem(LOCAL_SESSION_KEY)
    return migrated
  } catch {
    return { activeUserId: null, sessions: [] }
  }
}

function writeVault(vault: StoredLocalProfileVault): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_PROFILE_STORE_KEY, JSON.stringify(vault))
}

export function listLocalSessions(): StoredLocalSession[] {
  return readVault().sessions
}

export function readLocalSession(): StoredLocalSession | null {
  const vault = readVault()
  return vault.sessions.find((session) => session.user.id === vault.activeUserId) ?? null
}

export function writeLocalSession(session: StoredLocalSession): void {
  const vault = readVault()
  const existingIndex = vault.sessions.findIndex((candidate) => candidate.user.id === session.user.id)
  const sessions = [...vault.sessions]
  if (existingIndex >= 0) sessions[existingIndex] = session
  else sessions.push(session)
  writeVault({ activeUserId: session.user.id, sessions })
}

export function createLocalSession(username: string): StoredLocalSession {
  const existing = listLocalSessions().find((session) => session.profile.username === username)
  if (existing) {
    writeLocalSession(existing)
    return existing
  }

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
  const vault = readVault()
  writeVault({ ...vault, activeUserId: null })
}
