"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { OrnamentalDivider } from "@/components/ornamental-divider"
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
    } catch {
      setResult({
        monument_name: 'Unknown',
        is_unknown: true,
        brief_description: 'Could not identify. It might not be a recognized monument or the image was unclear.',
        suggestions: suggestMonuments(),
      })
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
      <div className="p-4 lg:p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C]">
            {t('monument_recognition')}
          </h1>
        </div>

        <OrnamentalDivider />

        {/* Upload / Camera tab buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, marginTop: 16 }}>
          {(['upload', 'camera'] as const).map(tab => (
            <button key={tab}
              onClick={() => {
                setActiveTab(tab)
                if (tab === 'camera') startCamera()
                else stopCamera()
              }}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === tab ? 'rgba(201,168,76,0.2)' : 'transparent',
                border: activeTab === tab ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
                color: activeTab === tab ? '#C9A84C' : '#C4A882'
              }}
            >
              {tab === 'upload' ? t('upload_photo') : t('use_camera')}
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
              }}>📸 Capture</button>
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

        {/* Error state when result is unknown */}
        {!loading && result?.is_unknown && !hasIdentifiedMonument && (
          <div style={{ background: 'rgba(196,91,58,0.1)', border: '1px solid rgba(196,91,58,0.5)', borderRadius: 12, padding: 16, color: '#E8A85C', textAlign: 'center', margin: '24px 0' }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <p>{t('not_identified')}</p>
            <p style={{ fontSize: '13px', marginTop: 4 }}>{t('try_clearer')}</p>
            <button
              onClick={() => setResult(null)}
              style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid #C9A84C', color: '#C9A84C', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginTop: 8 }}
            >
              {t('try_again')}
            </button>
          </div>
        )}

        {/* Results section */}
        {!loading && result && hasIdentifiedMonument && (
          <div className="mt-8 space-y-8 animate-slide-up">
            <ResultCard result={result} imagePreview={imagePreview} fileName={fileName} />

            {result.low_confidence && (
              <div style={{
                background: 'rgba(196,91,58,0.1)', border: '1px solid rgba(196,91,58,0.45)',
                borderRadius: 10, padding: '10px 14px', color: '#E8A85C', fontSize: '13px'
              }}>
                ⚠️ Low confidence detection. Features are enabled, but please verify monument details.
              </div>
            )}

            {/* XP badge */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                gap: '6px', padding: '4px 12px',
                background: 'rgba(83,74,183,0.2)',
                border: '1px solid rgba(83,74,183,0.5)',
                borderRadius: '999px', marginBottom: '12px',
                animation: 'pulse 2s ease infinite'
              }}>
                <span style={{ color: '#9B92F0', fontSize: '13px', fontWeight: 700 }}>
                  ⚡ +25 XP earned!
                </span>
              </div>
            )}

            {/* Let's Explore button — shown for all demo monuments */}
            {(() => {
              const name = result.monument_name || ''
              const id = result.monument_id || ''
              const isDemoMonument =
                name.toLowerCase().includes('taj') ||
                name.toLowerCase().includes('red fort') ||
                name.toLowerCase().includes('qutub') ||
                name.toLowerCase().includes('konark') ||
                id === 'taj-mahal' || id === 'red-fort' || id === 'qutub-minar' || id === 'konark'
              if (!name || name === 'Unknown' || !isDemoMonument) return null
              return (
                <button
                  onClick={() => router.push('/explore')}
                  style={{
                    background: 'linear-gradient(135deg, #C9A84C, #D4893F)',
                    borderRadius: '16px', padding: '14px 28px',
                    color: '#0F0B1E', fontWeight: '700', fontSize: '16px',
                    width: '100%', border: 'none', cursor: 'pointer',
                    marginTop: '16px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '10px', letterSpacing: '0.5px'
                  }}
                >
                  🗺️ Let&apos;s Explore {name.split(' ').slice(0,2).join(' ')}
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>+350 XP available</span>
                </button>
              )
            })()}

            {/* Listen to Emperor */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <ListenToEmperor monumentName={result.monument_name} />
            )}

            {/* 🎧 Audio Guide Card */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <div style={{
                background: 'rgba(28,22,56,0.9)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '16px', padding: '20px', marginTop: '16px'
              }}>
                <h3 style={{ color: '#C9A84C', fontFamily: 'Georgia, serif',
                             fontSize: '18px', marginBottom: '12px' }}>
                  🎧 Audio Guide
                </h3>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <button
                    onClick={() => speak(`Welcome to ${result.monument_name}. ${getMonumentDescription()}`)}
                    disabled={isSpeaking}
                    style={{
                      background: isSpeaking ? 'rgba(75,155,142,0.3)' : 'linear-gradient(135deg,#4B9B8E,#3a7a6e)',
                      border: 'none', borderRadius: '10px', padding: '8px 16px',
                      color: 'white', fontSize: '13px', cursor: 'pointer'
                    }}
                  >
                    {isSpeaking ? '🔊 Speaking...' : '▶️ Play Guide'}
                  </button>

                  {isSpeaking && (
                    <button onClick={stopSpeaking} style={{
                      background: 'rgba(220,38,38,0.2)', border: '1px solid #DC2626',
                      borderRadius: '10px', padding: '8px 16px',
                      color: '#DC2626', fontSize: '13px', cursor: 'pointer'
                    }}>⏹️ Stop</button>
                  )}

                  <button
                    onClick={isListening ? stopListening : startListening}
                    style={{
                      background: isListening ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)',
                      border: `1px solid ${isListening ? '#C9A84C' : 'rgba(201,168,76,0.27)'}`,
                      borderRadius: '10px', padding: '8px 16px',
                      color: '#C9A84C', fontSize: '13px', cursor: 'pointer',
                      animation: isListening ? 'pulse 1s infinite' : 'none'
                    }}
                  >
                    {isListening ? '🎤 Listening...' : '🎤 Ask Question'}
                  </button>

                  <button onClick={toggleMute} style={{
                    background: 'rgba(28,22,56,0.5)', border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: '10px', padding: '8px 12px',
                    color: '#C4A882', fontSize: '13px', cursor: 'pointer'
                  }}>
                    {isMuted ? '🔇' : '🔔'}
                  </button>

                  <button
                    onClick={() => setAudioLang(audioLang === 'en' ? 'hi' : 'en')}
                    style={{
                      background: 'rgba(83,74,183,0.2)', border: '1px solid #534AB7',
                      borderRadius: '10px', padding: '8px 12px',
                      color: '#534AB7', fontSize: '13px', cursor: 'pointer'
                    }}
                  >
                    {audioLang === 'en' ? 'हि' : 'EN'}
                  </button>
                </div>

                {isThinking && (
                  <p style={{ color: '#4B9B8E', fontSize: '13px', fontStyle: 'italic' }}>🤔 Thinking...</p>
                )}

                {lastAnswer && !isThinking && (
                  <div style={{
                    background: 'rgba(75,155,142,0.1)', borderLeft: '3px solid #4B9B8E',
                    borderRadius: '8px', padding: '12px',
                    color: '#F5E6D3', fontSize: '14px', lineHeight: '1.6'
                  }}>
                    {lastAnswer}
                  </div>
                )}
              </div>
            )}

            {/* Monument Detail Tabs */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <MonumentDetailTabs monumentName={result.monument_name} />
            )}

            {/* Quick action buttons */}
            {result.monument_name && result.monument_name !== 'Unknown' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                <a href="/quiz" style={{
                  padding: '10px 18px', background: 'linear-gradient(135deg, #D4893F, #C9A84C)',
                  color: '#0F0B1E', borderRadius: '10px', textDecoration: 'none', fontSize: '13px',
                  fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  🧠 {t('take_quiz')} — {result.monument_name.split(' ')[0]}
                </a>
                <a href="/hunt" style={{
                  padding: '10px 18px', background: 'rgba(83,74,183,0.2)',
                  border: '1px solid rgba(83,74,183,0.5)', color: '#9B92F0', borderRadius: '10px',
                  textDecoration: 'none', fontSize: '13px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  🗺️ {t('treasure_hunt')}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
