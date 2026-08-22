import axios from 'axios'
import { SupportedLanguage } from '@/lib/languages'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://heritageai-backend.onrender.com'

export const apiClient = axios.create({
  baseURL: API,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
})

// Default user for demo
export const DEFAULT_USER = 'demo_user'

// All API functions
export const api = {
  // Monuments
  getNearby: () =>
    apiClient.get('/geo/nearby'),

  // Legacy alias
  nearby: () =>
    apiClient.get('/geo/nearby'),

  checkin: (lat: number, lng: number, userId = DEFAULT_USER) =>
    apiClient.post('/geo/checkin', { lat, lng, user_id: userId }),

  // Chat
  askChat: (question: string, monumentId = '', lang?: SupportedLanguage) =>
    axios.post('/api/chat', {
      question, monument_id: monumentId, lang
    }),

  // Recognition
  recognize: (imageB64: string, filename = 'image.jpg', options?: Record<string, unknown>) =>
    axios.post('/api/recognize', {
      image_b64: imageB64,
      filename,
      ...(options || {}),
    }),

  // Quiz
  getQuestions: (
    monumentId = 'taj-mahal',
    context?: {
      name?: string
      summary?: string
      location?: string
      era_or_dynasty?: string
      architecture_style?: string
      category?: string
    },
  ) =>
    axios.post('/api/quiz', {
      monument_id: monumentId,
      monument_name: context?.name,
      summary: context?.summary,
      location: context?.location,
      era_or_dynasty: context?.era_or_dynasty,
      architecture_style: context?.architecture_style,
      category: context?.category,
    }),

  // Hunt
  getHuntClue: (userId = DEFAULT_USER) =>
    apiClient.get(`/game/hunt/clue?user_id=${userId}`),

  verifyHunt: (userId = DEFAULT_USER, answerIndex: number, huntId = 'taj-mahal-1') =>
    apiClient.post('/game/hunt/verify', {
      user_id: userId,
      answer_index: answerIndex,
      hunt_id: huntId
    }),

  // XP
  awardXP: (userId = DEFAULT_USER, xpDelta: number, eventType = '') =>
    apiClient.post('/game/xp', {
      user_id: userId,
      xp_delta: xpDelta,
      event_type: eventType
    }),

  // Leaderboard
  getLeaderboard: () =>
    apiClient.get('/game/leaderboard'),

  // Legacy alias
  leaderboard: () =>
    apiClient.get('/game/leaderboard'),

  // Itinerary
  getItinerary: (monumentId: string, days = 3) =>
    axios.post('/api/itinerary', {
      monument_id: monumentId, days
    }),

  // Legacy aliases
  itinerary: (monumentId: string, days = 3) =>
    axios.post('/api/itinerary', {
      monument_id: monumentId, days
    }),

  leadCapture: (payload: Record<string, unknown>) =>
    apiClient.post('/tourism/lead', payload),
}

export default api
