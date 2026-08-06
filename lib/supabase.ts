export { supabase } from '@/lib/supabase/client'

export type UserProfile = {
  id: string
  username: string
  email: string | null
  full_name: string
  phone: string | null
  user_type: 'student' | 'tourist'
  language: 'en' | 'hi'
  total_xp: number
  monuments_visited: string[]
  quiz_scores: number[]
  profile_badges: string[]
  chat_history: Array<Record<string, unknown>>
  created_at: string
  updated_at: string
}
