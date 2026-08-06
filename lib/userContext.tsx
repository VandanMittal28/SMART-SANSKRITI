'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/lib/authContext'
import { addXP, updateUserProfile } from '@/lib/authClient'
import type { LocalProfile } from '@/lib/localProfile'

type UserType = 'student' | 'tourist' | null

interface UserConfig {
  label: string
  subtitle: string
  color: string
  border: string
  bg: string
  chatbot_persona: string
  content_focus: string[]
  recommended_duration: string
  icon: string
}

const USER_TYPES: Record<string, UserConfig> = {
  student: {
    label: '🎓 Student',
    subtitle: 'Curriculum-aligned learning with quizzes & XP',
    color: '#4B9B8E',
    border: 'rgba(75, 155, 142, 0.5)',
    bg: 'rgba(75, 155, 142, 0.08)',
    chatbot_persona: 'You are an educational heritage guide for students. Use simple language, explain historical dates and rulers clearly, mention architectural terms with definitions, connect facts to school curriculum. End responses with a quiz hint or interesting fact to remember.',
    content_focus: ['Historical dates & rulers', 'Architectural features', 'Cultural significance', 'Quiz-ready facts'],
    recommended_duration: '20–30 min per monument',
    icon: '🎓',
  },
  tourist: {
    label: '🧳 Tourist',
    subtitle: 'Story-driven exploration with photography & culture tips',
    color: '#D4893F',
    border: 'rgba(212, 137, 63, 0.5)',
    bg: 'rgba(212, 137, 63, 0.08)',
    chatbot_persona: 'You are a warm, storytelling heritage guide for tourists visiting India. Use vivid, conversational language. Share legends, local myths, photography tips, best spots, nearby food, and cultural experiences. Make the visitor feel the magic.',
    content_focus: ['Stories & legends', 'Photography spots', 'Cultural experiences', 'Local tips & food'],
    recommended_duration: '1–2 hours per monument',
    icon: '🧳',
  },
}

interface UserContextType {
  userType: UserType
  userConfig: UserConfig | null
  setUserType: (type: UserType) => void
  isSelected: boolean
  profile: LocalProfile | null
  level: string
  badges: Array<{ unlocked?: boolean; [key: string]: unknown }>
  refreshProfile: () => Promise<void>
  addXpLocal: (_xp: number, _monumentId?: string) => Promise<void>
}

const UserContext = createContext<UserContextType>({
  userType: null,
  userConfig: null,
  setUserType: () => {},
  isSelected: false,
  profile: null,
  level: 'Starter',
  badges: [],
  refreshProfile: async () => {},
  addXpLocal: async () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth()
  const [userType, setUserTypeState] = useState<UserType>(null)

  useEffect(() => {
    setUserTypeState(profile?.user_type ?? null)
  }, [profile?.user_type])

  const setUserType = (type: UserType) => {
    setUserTypeState(type)
    if (type && user) {
      void updateUserProfile(user.id, { user_type: type }).then(() => refreshProfile())
    }
  }

  const userConfig = userType ? USER_TYPES[userType] : null

  const addXpLocal = async (xp: number, monumentId?: string) => {
    if (!user) return
    await addXP(user.id, xp, monumentId ? `EXPLORE_${monumentId}` : 'EXPLORE')
    await refreshProfile()
  }

  return (
    <UserContext.Provider value={{
      userType,
      userConfig,
      setUserType,
      isSelected: Boolean(userType),
      profile,
      level: profile ? `Level ${Math.floor(profile.total_xp / 100) + 1}` : 'Starter',
      badges: (profile?.badges ?? []).map((code) => ({ code, unlocked: true })),
      refreshProfile,
      addXpLocal,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}

export { USER_TYPES }
