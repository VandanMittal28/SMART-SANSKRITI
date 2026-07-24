import {
  getBadgeSetFromProfile,
  getLocalProfile,
  getLocalUser,
  LocalProfile,
  ProfileActivity,
  updateLocalProfile,
} from './localProfile'

function activity(
  type: ProfileActivity['type'],
  title: string,
  detail?: string,
  xp?: number,
): ProfileActivity {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    detail,
    xp,
    timestamp: new Date().toISOString(),
  }
}

function appendActivity(
  current: ProfileActivity[],
  next: ProfileActivity,
) {
  return [next, ...current].slice(0, 40)
}

export async function signUp(email: string, _password: string, fullName: string, _phone: string) {
  const user = getLocalUser()
  updateLocalProfile((prev) => ({
    ...prev,
    email: email || prev.email,
    full_name: fullName || prev.full_name,
  }))
  return { user, error: null }
}

export async function signIn(email: string, _password: string) {
  const user = getLocalUser()
  updateLocalProfile((prev) => ({
    ...prev,
    email: email || prev.email,
  }))
  return { user, error: null }
}

export async function signOut() {
  return { error: null }
}

export async function session(): Promise<{ data: { session: { user: unknown } | null } }> {
  return {
    data: {
      session: null,
    },
  }
}

export async function getCurrentUser() {
  return getLocalUser()
}

export async function getUserProfile() {
  return getLocalProfile()
}

export async function updateUserProfile(_userId: string, updates: Partial<LocalProfile>) {
  updateLocalProfile((prev) => ({ ...prev, ...updates }))
}

export async function addXP(_userId: string, xpDelta: number, eventType: string): Promise<number> {
  const eventActivity =
    eventType === 'ZONE_EXPLORE'
      ? activity('explore', 'Explored a heritage zone', 'Discovered a new part of the monument', xpDelta)
      : eventType === 'HUNT_STEP_DONE'
        ? activity('hunt', 'Solved a treasure-hunt clue', 'Advanced to the next clue', xpDelta)
        : eventType === 'HUNT_COMPLETED'
          ? activity('hunt', 'Completed a treasure hunt', 'Finished the full monument challenge', xpDelta)
          : null

  const updated = updateLocalProfile((prev) => ({
    ...prev,
    total_xp: Math.max(0, (prev.total_xp ?? 0) + xpDelta),
    activity_log: eventActivity
      ? appendActivity(prev.activity_log, eventActivity)
      : prev.activity_log,
  }))
  const badges = getBadgeSetFromProfile(updated)
  updateLocalProfile((prev) => ({ ...prev, badges }))
  window.dispatchEvent(new Event('xp-updated'))
  return updated.total_xp
}

export async function addMonumentVisited(_userId: string, monumentName: string): Promise<string[]> {
  const isNewMonument = !getLocalProfile().monuments_visited.includes(monumentName)
  const updated = updateLocalProfile((prev) => ({
    ...prev,
    monuments_visited: prev.monuments_visited.includes(monumentName)
      ? prev.monuments_visited
      : [...prev.monuments_visited, monumentName],
    activity_log: isNewMonument
      ? appendActivity(
          prev.activity_log,
          activity('scan', `Identified ${monumentName}`, 'Added to your heritage journey', 25),
        )
      : prev.activity_log,
  }))
  const badges = getBadgeSetFromProfile(updated)
  updateLocalProfile((prev) => ({ ...prev, badges }))
  return updated.monuments_visited
}

export async function addQuizScore(
  _userId: string,
  score: number,
  monumentName = 'a heritage monument',
): Promise<number[]> {
  const updated = updateLocalProfile((prev) => ({
    ...prev,
    quiz_scores: [...prev.quiz_scores, score],
    activity_log: appendActivity(
      prev.activity_log,
      activity('quiz', `Answered a ${monumentName} question`, 'Correct answer', score),
    ),
  }))
  const badges = getBadgeSetFromProfile(updated)
  updateLocalProfile((prev) => ({ ...prev, badges }))
  return updated.quiz_scores
}

export async function computeAndSaveBadges(_userId: string, updatedState?: { total_xp?: number; monuments_visited?: string[]; quiz_scores?: number[] }): Promise<string[]> {
  const draft = updateLocalProfile((prev) => ({
    ...prev,
    ...(updatedState || {}),
  }))
  const badges = getBadgeSetFromProfile(draft)
  updateLocalProfile((prev) => ({ ...prev, badges }))
  return badges
}

export async function saveChatMessage(_userId: string, role: string, content: string, monument: string) {
  updateLocalProfile((prev) => ({
    ...prev,
    chat_history: [
      ...prev.chat_history,
      { role, content, monument, timestamp: new Date().toISOString() },
    ].slice(-100),
    activity_log:
      role === 'user'
        ? appendActivity(
            prev.activity_log,
            activity(
              'chat',
              `Asked about ${monument || 'Indian heritage'}`,
              content.slice(0, 90),
            ),
          )
        : prev.activity_log,
  }))
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
