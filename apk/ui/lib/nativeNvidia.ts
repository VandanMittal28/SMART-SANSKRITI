import { isBundledNativeApp } from '@/lib/supabase/client'
import type { SupportedLanguage } from '@/lib/languages'
import type { SceneAssessment, SceneRequestInput } from '@/lib/vision/prompt'

type NativeNvidiaBridge = {
  recordMicrophone: (requestId: string, durationMs: number) => void
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://smart-sanskriti.vercel.app').replace(/\/$/, '')

function bridge(): NativeNvidiaBridge | null {
  if (!isBundledNativeApp()) return null
  return (window as unknown as { SanskritiAndroid?: NativeNvidiaBridge }).SanskritiAndroid ?? null
}

export function hasNativeNvidia(): boolean {
  return isBundledNativeApp()
}

export async function synthesizeNarrationNative(
  text: string,
  language: string,
  voice: string,
): Promise<string> {
  const result = await postApi<{ audioBase64: string }>('/api/narrate', { text, language, voice })
  return result.audioBase64
}

async function postApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90_000),
  })
  const result = await response.json().catch(() => ({})) as T & { error?: string; message?: string }
  if (!response.ok) throw new Error(result.error || result.message || `Sanskriti service returned ${response.status}.`)
  return result
}

export async function recordPhoneMicrophone(durationMs = 5_000): Promise<string> {
  const android = bridge()
  if (!android?.recordMicrophone) throw new Error('Native microphone is unavailable.')
  const requestId = globalThis.crypto?.randomUUID?.() ?? `microphone-${Date.now()}-${Math.random()}`

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('sanskriti-microphone-result', receiveResult)
      reject(new Error('Microphone recording timed out.'))
    }, durationMs + 5_000)
    const receiveResult = (event: Event) => {
      const detail = (event as CustomEvent<{
        requestId?: string
        audioBase64?: string
        error?: string
      }>).detail
      if (detail?.requestId !== requestId) return
      window.clearTimeout(timer)
      window.removeEventListener('sanskriti-microphone-result', receiveResult)
      if (detail.error || !detail.audioBase64) {
        reject(new Error(detail.error || 'The recording was empty.'))
        return
      }
      resolve(detail.audioBase64)
    }
    window.addEventListener('sanskriti-microphone-result', receiveResult)
    android.recordMicrophone(requestId, durationMs)
  })
}

export async function askNativeHeritageChat(question: string, monumentId = '', language = 'en') {
  const reply = await postApi<{ answer: string }>('/api/chat', { question, monument_id: monumentId, lang: language === 'hi' ? 'hi' : 'en' })
  return reply.answer
}

export async function recognizeMonumentNative(imageBase64: string) {
  return postApi<Record<string, unknown>>('/api/recognize', { image_b64: imageBase64 })
}

export async function transcribeAudioNative(audioBase64: string, language: SupportedLanguage) {
  const result = await postApi<{ text: string }>('/api/transcribe', { audio_b64: audioBase64, language: language === 'hi' ? 'hi' : 'en' })
  return result.text
}

export async function translateTextsNative(texts: string[], language: SupportedLanguage) {
  if (language === 'en') return texts
  const result = await postApi<{ translations: string[] }>('/api/translate', { texts, language })
  if (!Array.isArray(result.translations) || result.translations.length !== texts.length) throw new Error('Translation response was incomplete.')
  return result.translations
}

export async function translateExploreGuideNative(
  guide: { directionHint: string; arrivalFact: string; miniFact: string },
  language: SupportedLanguage,
) {
  if (language === 'en') return guide
  const values = await translateTextsNative([guide.directionHint, guide.arrivalFact, guide.miniFact], language)
  return {
    directionHint: values[0], arrivalFact: values[1], miniFact: values[2],
  }
}

/**
 * Heritage Watch scene assessment from inside a packaged app.
 *
 * This used to run over the native bridge against a key compiled into the
 * APK. That key is gone: `apk/app/build.gradle` now ships an empty
 * NVIDIA_API_KEY on purpose, so provider credentials stay on the server.
 * The assessment therefore goes to the same hosted visitor API as every
 * other model call, and the prompt and response validation still live in
 * `@/lib/vision/prompt` so the server and the browser route cannot drift.
 */
export async function assessHeritageSceneNative(
  input: SceneRequestInput | string,
): Promise<SceneAssessment> {
  const request: SceneRequestInput = typeof input === 'string' ? { imageBase64: input } : input
  return postApi<SceneAssessment>('/api/heritage-watch', {
    image: request.imageBase64,
    region: request.regionBase64 ?? null,
    motionContext: request.motionContext ?? null,
  })
}
