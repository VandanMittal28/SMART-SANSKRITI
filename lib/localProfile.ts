import type { SupportedLanguage } from '@/lib/languages'

export interface LocalUser {
  id: string
  username: string
  email: string
  isAnonymous: boolean
}

export interface ProfileActivity {
  id: string
  type: 'scan' | 'quiz' | 'hunt' | 'explore' | 'chat'
  title: string
  detail?: string
  xp?: number
  timestamp: string
}

export interface LocalProfile {
  username: string
  full_name: string
  email: string
  phone?: string
  total_xp: number
  monuments_visited: string[]
  quiz_scores: number[]
  badges: string[]
  chat_history: Array<Record<string, unknown>>
  activity_log: ProfileActivity[]
  user_type: 'student' | 'tourist'
  language: SupportedLanguage
  admin_mode: boolean
}

export const EMPTY_PROFILE: LocalProfile = {
  username: '',
  full_name: 'Explorer',
  email: '',
  phone: '',
  total_xp: 0,
  monuments_visited: [],
  quiz_scores: [],
  badges: [],
  chat_history: [],
  activity_log: [],
  user_type: 'tourist',
  language: 'en',
  admin_mode: false,
}

export function getBadgeSetFromProfile(profile: LocalProfile): string[] {
  const badges: string[] = []
  if (profile.monuments_visited.length >= 1) badges.push('first_scan')
  if (profile.quiz_scores.reduce((sum, score) => sum + score, 0) >= 100) badges.push('quiz_master')
  if (profile.monuments_visited.length >= 3) badges.push('explorer')
  if (profile.total_xp >= 500) badges.push('hunter')
  if (profile.total_xp >= 2000) badges.push('legend')
  return badges
}
