"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { UploadZone } from "@/components/recognition/upload-zone"
import { ResultCard } from "@/components/recognition/result-card"
import { MonumentDetailTabs } from "@/components/recognition/monument-detail-tabs"
import { ListenToEmperor } from "@/components/recognition/listen-to-emperor"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useAuth } from "@/lib/authContext"
import { addXP, addMonumentVisited, computeAndSaveBadges } from "@/lib/authClient"
import { saveMonument, monumentNameToId } from "@/lib/monumentStore"
import { useLang } from "@/lib/languageContext"
import { useAudioGuide } from "@/hooks/useAudioGuide"
import { resolveQuizMonumentId } from "@/lib/quizQuestions"
import { Brain, Camera, Compass, Languages, Mic, Pause, Play, RotateCcw, Upload, Volume2, VolumeX, WifiOff } from 'lucide-react'
import { 
  getCache, setCache, 
  CACHE_DURATION
} from '@/lib/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecognitionResult = Record<string, any>

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad', 'victoria-memorial': 'Victoria Memorial Kolkata',
  'ajanta': 'Ajanta Caves', 'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

const CONFIDENCE_THRESHOLD = 0.65

async function hashFile(file: File): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buffer)
      const bytes = new Uint8Array(digest)
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
    } catch (e) {
      // Fallback on error
    }
  }
  // Fallback for non-secure contexts (e.g. mobile over local HTTP IP where WebCrypto is blocked)
  return `fallback_${file.name.replace(/[^a-zA-Z0-9]/g, '')}_${file.size}_${file.lastModified}`
}

function suggestMonuments(baseName?: string): string[] {
  const list = Object.values(MONUMENT_NAMES)
  if (!baseName) return list.slice(0, 3)
  const needle = baseName.toLowerCase()
  const ranked = list
    .map(name => ({
      name,
      score: name.toLowerCase().includes(needle) ? 2 : needle.includes(name.toLowerCase()) ? 1 : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.name)
  const unique = Array.from(new Set(ranked))
  return unique.slice(0, 3)
}

function getConfidenceValue(resultData: RecognitionResult): number {
  if (typeof resultData.confidence === 'number') return resultData.confidence
  if (typeof resultData.confidence_score === 'number') return resultData.confidence_score / 100
  if (typeof resultData.confidence === 'string') {
    const map: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.35 }
    return map[resultData.confidence.toLowerCase()] || 0.5
  }
  return 0.5
}

function persistRecognizedMonument(resultData: RecognitionResult) {
  const name =
    typeof resultData.monument_name === 'string'
      ? resultData.monument_name.trim()
      : ''
  if (!name || name === 'Unknown') return resultData

  const monumentId = resolveQuizMonumentId(monumentNameToId(name))
  resultData.monument_id = monumentId
  saveMonument(monumentId, name, {
    summary:
      typeof resultData.brief_description === 'string'
        ? resultData.brief_description
        : undefined,
    location:
      typeof resultData.location === 'string' ? resultData.location : undefined,
    era_or_dynasty:
      typeof resultData.era_or_dynasty === 'string'
        ? resultData.era_or_dynasty
        : undefined,
    architecture_style:
      typeof resultData.architecture_style === 'string'
        ? resultData.architecture_style
        : undefined,
    category:
      typeof resultData.category === 'string' ? resultData.category : undefined,
  })

  return resultData
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-10">
      <div className="w-10 h-10 border-4 rounded-full animate-spin"
        style={{ borderColor: 'rgba(201,168,76,0.2)', borderTopColor: '#C9A84C' }} />
    </div>
  )
}

export default function RecognitionPage() {
  const router = useRouter()
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast, showToast, hideToast } = useToast()
  const { user, profile, setProfile } = useAuth()
  const { t } = useLang()

  // Audio Guide hook
  const {
    isSpeaking, speak, stopSpeaking,
    isListening, startListening, stopListening,
    isThinking, lastAnswer,
    lang: audioLang, setLang: setAudioLang,
    isMuted, toggleMute, setCurrentZone
  } = useAudioGuide()

  useEffect(() => {
    const monumentName =
      typeof result?.monument_name === 'string' ? result.monument_name : ''
    if (!monumentName || monumentName === 'Unknown') {
      setCurrentZone(null)
      return
    }

    setCurrentZone(
      typeof result?.monument_id === 'string'
        ? result.monument_id
        : resolveQuizMonumentId(monumentNameToId(monumentName)),
    )
  }, [result, setCurrentZone])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setLoading(true)
    setResult(null)
    setRecognitionError(null)
    setFileName(file.name)

    // Show preview immediately
    const previewReader = new FileReader()
    previewReader.onload = (e) => {
      if (e.target?.result) setImagePreview(e.target.result as string)
    }
    previewReader.readAsDataURL(file)

    const preprocessImage = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Image processing timeout')), 10000)
        const canvas = document.createElement('canvas')
        const img = new Image()
        img.onload = () => {
          clearTimeout(timeout)
          try {
            const maxW = 640
            const scale = Math.min(1, maxW / img.width)
            canvas.width = img.width * scale
            canvas.height = img.height * scale
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            // Normalize contrast/lighting for monument textures.
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              const avg = (r + g + b) / 3
              const enhanced = Math.min(255, Math.max(0, (avg - 120) * 1.12 + 120))
              data[i] = Math.min(255, r * 0.82 + enhanced * 0.18)
              data[i + 1] = Math.min(255, g * 0.82 + enhanced * 0.18)
              data[i + 2] = Math.min(255, b * 0.82 + enhanced * 0.18)
            }

            // Lightweight edge emphasis to improve structure detection.
            const copy = new Uint8ClampedArray(data)
            const width = canvas.width
            const height = canvas.height
            const kernel = [
              0, -1, 0,
              -1, 5, -1,
              0, -1, 0,
            ]
            for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                  let sum = 0
                  let k = 0
                  for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                      const idx = ((y + ky) * width + (x + kx)) * 4 + c
                      sum += copy[idx] * kernel[k++]
                    }
                  }
                  const idx = (y * width + x) * 4 + c
                  data[idx] = Math.max(0, Math.min(255, sum))
                }
              }
            }

            ctx.putImageData(imageData, 0, 0)
            resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1])
          } catch (e) { reject(e) }
        }
        img.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Invalid image format'))
        }
        img.src = URL.createObjectURL(f)
      })
    }

    const imageHash = await hashFile(file)
    const cacheKey = `recognition_hash_${imageHash}`
    const cached = getCache(cacheKey, CACHE_DURATION.recognition)
    if (cached) {
      const cachedResult = persistRecognizedMonument({ ...cached })
      setResult(cachedResult)
      setLoading(false)
      showToast('⚡ Instant result!')
      return
    }

    // Set a timeout to notify user if backend is spinning up
    const slowWarningTimer = setTimeout(() => {
      showToast('⏳ Analyzing the monument image...')
    }, 6000)

    try {
      const base64 = await preprocessImage(file)
      const res = await api.recognize(base64, file.name, {
        context_prompt: 'Identify the Indian monument and return monument_name, location (city/state), era_or_dynasty, architecture_style, confidence_score, and key_identifiers.',
        requested_fields: ['monument_name', 'location', 'era_or_dynasty', 'architecture_style', 'confidence_score', 'key_identifiers'],
      })
      const resultData = { ...res.data } as RecognitionResult
      const confidenceValue = getConfidenceValue(resultData)
      const hasDetectedMonument =
        typeof resultData.monument_name === 'string' &&
        resultData.monument_name.trim().length > 0 &&
        resultData.monument_name !== 'Unknown'

      if (confidenceValue < CONFIDENCE_THRESHOLD) {
        resultData.low_confidence = true
        if (!hasDetectedMonument) resultData.is_unknown = true
        resultData.suggestions = suggestMonuments(resultData.monument_name)
        resultData.brief_description = resultData.brief_description || 'Low-confidence recognition. Review suggested matches below.'
      }

      if (!hasDetectedMonument) {
        resultData.is_unknown = true
        resultData.suggestions = suggestMonuments(resultData.monument_name)
        resultData.brief_description = resultData.brief_description || 'Could not identify the monument clearly. Review suggested matches below.'
      }

      const connectedResult = persistRecognizedMonument(resultData)
      setCache(cacheKey, connectedResult)
      setResult(connectedResult)

      if (
        res.data.monument_name &&
        res.data.monument_name !== 'Unknown' &&
        res.data.monument_name !== null &&
        res.data.monument_name !== ''
      ) {
        try {
          if (user) {
            const newXP = await addXP(user.id, 25, 'MONUMENT_VISIT')
            setProfile((prev: any) => prev ? { ...prev, total_xp: newXP } : prev)
            const newVisited = await addMonumentVisited(user.id, res.data.monument_name)
            await computeAndSaveBadges(user.id, { total_xp: newXP, monuments_visited: newVisited })
            window.dispatchEvent(new Event('xp-updated'))
          }
        } catch (err) { console.warn('XP award failed:', err) }

        showToast('⚡ +25 XP for identifying ' + res.data.monument_name + '!')
      } else {
        showToast(resultData.is_unknown ? 'Low confidence result. Check suggestions.' : 'Monument identified! 🏛️')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Recognition request failed.'
      console.error('Monument recognition failed:', error)
      setResult(null)
      setRecognitionError(
        /failed to fetch|network|resolve host|internet|timeout/i.test(message)
          ? 'Connect to the internet and try the same photo again.'
          : 'The recognition service could not process this photo. Please try again.',
      )
    } finally {
      clearTimeout(slowWarningTimer)
      setLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setCameraStream(stream)
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      alert('Camera access denied. Please allow camera permission in your browser.')
    }
  }

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      stopCamera()
      setActiveTab('upload')
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
      await handleFileUpload(file)
    }, 'image/jpeg', 0.9)
  }

  const getMonumentDescription = () => {
    if (!result) return ''
    return result.brief_description || result.history || result.significance ||
      `${result.monument_name} is an important Indian heritage site.`
  }

  const hasIdentifiedMonument = Boolean(
    result?.monument_name && result.monument_name !== 'Unknown'
  )

  return (
    <AppShell>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <div className="screen-gutter py-5 animate-fade-in">
        <div className="mb-4">
          <h1 className="font-heritage text-[28px] font-bold leading-9 text-[#F6F1E8]">
            {t('monument_recognition')}
          </h1>
          <p className="mt-1 text-sm text-[#AEB6C8]">Identify a monument using your camera or a saved photo.</p>
        </div>

        {/* Upload / Camera tab buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16, padding: 4, background: '#11182B', borderRadius: 12 }}>
          {(['upload', 'camera'] as const).map(tab => (
            <button key={tab}
              onClick={() => {
                setActiveTab(tab)
                if (tab === 'camera') startCamera()
                else stopCamera()
              }}
              style={{
                minHeight: 44, padding: '8px 12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === tab ? '#D6A84B' : 'transparent',
                border: 'none',
                color: activeTab === tab ? '#171004' : '#AEB6C8'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>{tab === 'upload' ? <Upload size={15} /> : <Camera size={15} />}{tab === 'upload' ? t('upload_photo') : t('use_camera')}</span>
            </button>
          ))}
        </div>

        {/* Camera UI */}
        {activeTab === 'camera' && (
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <video ref={videoRef} autoPlay playsInline
              style={{ width: '100%', maxHeight: 380, objectFit: 'cover', background: '#1C1638', display: 'block' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 12, background: 'rgba(15,11,30,0.9)' }}>
              <button onClick={capturePhoto} style={{
                padding: '12px 32px', borderRadius: 999,
                background: 'linear-gradient(135deg, #D4893F, #C9A84C)',
                color: 'white', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700
              }}><Camera size={18} style={{ display: 'inline', marginRight: 8 }} />Capture</button>
              <button onClick={() => { stopCamera(); setActiveTab('upload') }} style={{
                padding: '12px 24px', borderRadius: 999,
                background: 'rgba(196,91,58,0.2)', color: '#E8A85C',
                border: '1px solid rgba(196,91,58,0.5)', cursor: 'pointer', fontSize: 14
              }}>Stop</button>
            </div>
          </div>
        )}

        {/* Upload zone */}
        {activeTab === 'upload' && (
          <UploadZone onFileSelect={handleFileUpload} />
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8">
            <p className="text-center text-[#C4A882] mb-4">{t('identifying')}</p>
            <LoadingSpinner />
          </div>
        )}

        {!loading && recognitionError && (
          <section className="my-5 rounded-2xl border border-[#E8928B]/20 bg-[#11182B] p-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#E8928B]/10 text-[#E8928B]">
              <WifiOff className="h-5 w-5" />
            </div>
            <p className="mt-4 font-heritage text-xl font-bold text-[#F6F1E8]">Recognition is offline</p>
            <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-[#AEB6C8]">{recognitionError}</p>
            <button
              type="button"
              onClick={() => setRecognitionError(null)}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D6A84B] px-6 text-sm font-bold text-[#171004]"
            >
              <RotateCcw className="h-4 w-4" /> Choose photo again
            </button>
          </section>
        )}

        {/* Error state when result is unknown */}
        {!loading && result?.is_unknown && !hasIdentifiedMonument && (
          <section className="my-5 rounded-2xl border border-[#E8928B]/20 bg-[#11182B] p-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#E8928B]/10 text-[#E8928B]">
              <Camera className="h-5 w-5" />
            </div>
            <p className="mt-4 font-heritage text-xl font-bold text-[#F6F1E8]">{t('not_identified')}</p>
            <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-[#AEB6C8]">{t('try_clearer')}</p>
            <div className="mx-auto mt-4 grid max-w-[300px] grid-cols-2 gap-2 text-left text-xs text-[#C7CDDA]">
              <span className="rounded-lg bg-[#171F34] px-3 py-2">Use daylight</span>
              <span className="rounded-lg bg-[#171F34] px-3 py-2">Show full structure</span>
            </div>
            <button
              onClick={() => setResult(null)}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D6A84B] px-6 text-sm font-bold text-[#171004]"
            >
              <RotateCcw className="h-4 w-4" /> {t('try_again')}
            </button>
          </section>
        )}

        {/* Results section */}
        {!loading && result && hasIdentifiedMonument && (
          <div className="mt-5 space-y-4 animate-slide-up">
            <ResultCard result={result} imagePreview={imagePreview} fileName={fileName} />

            {result.monument_name && result.monument_name !== 'Unknown' && (
              <ListenToEmperor monumentName={result.monument_name} />
            )}

            {result.low_confidence && (
              <div style={{
                background: 'rgba(196,91,58,0.1)', border: '1px solid rgba(196,91,58,0.45)',
                borderRadius: 10, padding: '10px 14px', color: '#E8A85C', fontSize: '13px'
              }}>
                ⚠️ Low confidence detection. Features are enabled, but please verify monument details.
              </div>
            )}

            {/* Recognition reward */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <div className="flex min-h-11 items-center justify-between rounded-xl border border-[#63C7BA]/16 bg-[#63C7BA]/[0.06] px-4">
                <span className="text-xs font-bold text-[#8DE0D6]">Monument added to your journey</span>
                <span className="text-xs font-bold text-[#F3DFC0]">+25 XP</span>
              </div>
            )}

            {/* Primary next actions */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => speak(`Welcome to ${result.monument_name}. ${getMonumentDescription()}`)} className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-[#D6A84B]/16 bg-[#11182B] text-xs font-bold text-[#F3DFC0]">
                  <Volume2 className="h-5 w-5 text-[#D6A84B]" /> Audio guide
                </button>
                <button type="button" onClick={() => router.push('/explore')} className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-[#D6A84B]/16 bg-[#11182B] text-xs font-bold text-[#F3DFC0]">
                  <Compass className="h-5 w-5 text-[#D6A84B]" /> Start tour
                </button>
                <button type="button" onClick={() => router.push('/quiz')} className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-[#D6A84B]/16 bg-[#11182B] text-xs font-bold text-[#F3DFC0]">
                  <Brain className="h-5 w-5 text-[#D6A84B]" /> Take quiz
                </button>
              </div>
            )}

            {/* Audio and voice controls */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <section className="rounded-2xl border border-white/8 bg-[#11182B] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8891A6]">Listen and learn</p>
                    <h3 className="mt-1 font-heritage text-lg font-bold text-[#F6F1E8]">Your monument audio guide</h3>
                    <p className="mt-1 text-xs text-[#AEB6C8]">Narration and questions in {audioLang === 'en' ? 'English' : 'Hindi'}</p>
                  </div>
                  <button type="button" onClick={toggleMute} aria-label={isMuted ? 'Unmute audio guide' : 'Mute audio guide'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-[#171F34] text-[#D6A84B]">
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => speak(`Welcome to ${result.monument_name}. ${getMonumentDescription()}`)}
                    disabled={isSpeaking}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D6A84B] px-3 text-sm font-bold text-[#171004] disabled:opacity-60"
                  >
                    {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isSpeaking ? 'Playing' : 'Play guide'}
                  </button>
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${isListening ? 'border-[#63C7BA] bg-[#63C7BA]/12 text-[#8DE0D6]' : 'border-white/10 bg-[#171F34] text-[#F6F1E8]'}`}
                  >
                    <Mic className="h-4 w-4" />{isListening ? 'Listening…' : 'Ask a question'}
                  </button>
                </div>

                <div className="mt-2 flex justify-between">
                  {isSpeaking ? <button type="button" onClick={stopSpeaking} className="inline-flex min-h-10 items-center gap-2 px-1 text-xs font-bold text-[#E8928B]"><RotateCcw className="h-3.5 w-3.5" /> Stop narration</button> : <span />}
                  <button type="button" onClick={() => setAudioLang(audioLang === 'en' ? 'hi' : 'en')} className="inline-flex min-h-10 items-center gap-2 px-1 text-xs font-bold text-[#D6A84B]"><Languages className="h-3.5 w-3.5" /> {audioLang === 'en' ? 'हिंदी' : 'English'}</button>
                </div>

                {isThinking && (
                  <p className="mt-3 text-xs font-semibold text-[#8DE0D6]">Preparing an answer…</p>
                )}

                {lastAnswer && !isThinking && (
                  <div className="mt-3 rounded-xl border-l-2 border-[#63C7BA] bg-[#63C7BA]/[0.06] p-3 text-sm leading-6 text-[#F6F1E8]">
                    {lastAnswer}
                  </div>
                )}
              </section>
            )}

            {/* Monument Detail Tabs */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <MonumentDetailTabs monumentName={result.monument_name} />
            )}

            {/* Secondary actions */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <div className="grid grid-cols-2 gap-2">
                <a href="/quiz" className="grid min-h-12 place-items-center rounded-xl bg-[#D6A84B] px-3 text-sm font-bold text-[#171004]">{t('take_quiz')}</a>
                <a href="/hunt" className="grid min-h-12 place-items-center rounded-xl border border-white/10 bg-[#171F34] px-3 text-sm font-bold text-[#F6F1E8]">{t('treasure_hunt')}</a>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
