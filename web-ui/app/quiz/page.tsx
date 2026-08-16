"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { Check, Star, Clock, BarChart2, ChevronDown } from "lucide-react"
import Link from "next/link"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useAuth } from "@/lib/authContext"
import { addXP, addQuizScore, computeAndSaveBadges } from "@/lib/authClient"
import { useLang } from "@/lib/languageContext"
import { getMonument, saveMonument, clearMonument, type StoredMonument } from "@/lib/monumentStore"
import { resolveQuizMonumentId } from "@/lib/quizQuestions"

interface Question {
  id: string
  question: string
  options: string[]
  correct_index: number
}

interface Monument {
  id: string
  name: string
}

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad', 'victoria-memorial': 'Victoria Memorial Kolkata',
  'ajanta': 'Ajanta Caves', 'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-10">
      <div className="w-10 h-10 border-4 rounded-full animate-spin"
        style={{ borderColor: 'rgba(201,168,76,0.2)', borderTopColor: '#C9A84C' }} />
    </div>
  )
}

export default function QuizPage() {
  // Keep the first client render identical to the server render. Browser storage
  // is loaded after hydration because it is unavailable during SSR.
  const [lastMonument, setLastMonument] = useState<StoredMonument | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answering, setAnswering] = useState(false)
  const [monumentId, setMonumentId] = useState('taj-mahal')
  const [monuments, setMonuments] = useState<Monument[]>([])
  const [monumentSelected, setMonumentSelected] = useState(false)
  const { toast, showToast, hideToast } = useToast()
  const { user, profile, setProfile } = useAuth()
  const { t } = useLang()

  useEffect(() => {
    const storedMonument = getMonument()
    if (storedMonument) {
      const resolvedId = resolveQuizMonumentId(storedMonument.id)
      const resolvedName = MONUMENT_NAMES[resolvedId] || storedMonument.name
      const resolvedMonument = { ...storedMonument, id: resolvedId, name: resolvedName }

      setLastMonument(resolvedMonument)
      setMonumentId(resolvedId)
      setMonumentSelected(true)

      if (resolvedId !== storedMonument.id) {
        saveMonument(resolvedId, resolvedName)
      }
    }
  }, [])

  // Load monument list for selector
  useEffect(() => {
    api.getNearby().then(res => {
      const list: Monument[] = (res.data.monuments || []).map((m: { id: string; name: string }) => ({
        id: m.id, name: MONUMENT_NAMES[m.id] || m.name,
      }))
      if (list.length > 0) setMonuments(list)
    }).catch(() => {
      setMonuments(Object.entries(MONUMENT_NAMES).map(([id, name]) => ({ id, name })))
    })
  }, [])

  const fetchQuestions = (mid = monumentId) => {
    setLoading(true)
    setError(null)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setScore(0)
    setXpEarned(0)
    setFinished(false)
    setAnswering(false)
    const recognizedContext =
      lastMonument?.id === mid
        ? lastMonument
        : { name: MONUMENT_NAMES[mid] || mid.replace(/-/g, ' ') }

    api.getQuestions(mid, recognizedContext)
      .then(res => {
        setQuestions(res.data.questions)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load questions. Check your connection.')
        setLoading(false)
      })
  }

  useEffect(() => {
    if (monumentSelected) fetchQuestions(monumentId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monumentId, monumentSelected])

  const handleAnswer = async (selectedIndex: number) => {
    if (answering || selectedAnswer !== null) return
    setSelectedAnswer(selectedIndex)
    setAnswering(true)

    const current = questions[currentIndex]
    const correct = selectedIndex === current.correct_index

    if (correct) {
      setScore(prev => prev + 1)
      setXpEarned(prev => prev + 10)
      showToast('+10 XP for correct answer!')
      try {
        if (user) {
          const newXP = await addXP(user.id, 10, 'QUIZ_CORRECT')
          setProfile((prev) => prev ? { ...prev, total_xp: newXP } : prev)
          const newQuizScores = await addQuizScore(
            user.id,
            10,
            lastMonument?.name || MONUMENT_NAMES[monumentId] || monumentId.replace(/-/g, ' '),
          )
          await computeAndSaveBadges(user.id, { total_xp: newXP, quiz_scores: newQuizScores })
          window.dispatchEvent(new Event('xp-updated'))
        }
      } catch { /* silent */ }
    }

    setTimeout(async () => {
      if (currentIndex + 1 >= questions.length) {
        setFinished(true)
        if (user) {
          try {
            window.dispatchEvent(new Event('xp-updated'))
          } catch { /* silent */ }
        }
      } else {
        setCurrentIndex(prev => prev + 1)
        setSelectedAnswer(null)
        setAnswering(false)
      }
    }, 1500)
  }

  const handlePlayAgain = () => fetchQuestions(monumentId)

  // Monument not selected yet — show select screen
  if (!monumentSelected && !loading) {
    const monumentList = monuments.length > 0
      ? monuments
      : Object.entries(MONUMENT_NAMES).map(([id, name]) => ({ id, name }))

    return (
      <AppShell>
        <div style={{ padding: 24 }}>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 32, color: '#C9A84C', fontWeight: 700 }}>
            {t('heritage_quiz')}
          </h1>
          <div style={{
            marginTop: 48, textAlign: 'center',
            background: 'rgba(28,22,56,0.9)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 20, padding: 56, maxWidth: 500, margin: '48px auto'
          }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🏛️</div>
            <h2 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: 26, margin: '0 0 12px' }}>
              {t('select_monument_first')}
            </h2>
            <p style={{ color: '#C4A882', fontSize: 16, marginBottom: 28, lineHeight: 1.6 }}>
              {t('scan_monument_msg')}
            </p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                onChange={e => {
                  const selectedId = e.target.value
                  const selectedName = monumentList.find(m => m.id === selectedId)?.name || selectedId
                  setMonumentId(selectedId)
                  setMonumentSelected(true)
                  saveMonument(selectedId, selectedName)
                  setLastMonument({ id: selectedId, name: selectedName, timestamp: Date.now() })
                }}
                defaultValue=""
                style={{
                  padding: '12px 40px 12px 16px',
                  background: 'rgba(28,22,56,0.9)',
                  border: '1px solid #C9A84C',
                  color: '#C9A84C', borderRadius: 10,
                  fontSize: 16, cursor: 'pointer',
                  minWidth: 240, marginBottom: 16,
                  appearance: 'none',
                }}
              >
                <option value="" disabled>{t('choose_monument')}</option>
                {monumentList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: 12, top: 14, width: 16, height: 16, color: '#C9A84C', pointerEvents: 'none' }} />
            </div>
            <div>
              <a href="/recognition" style={{ color: '#4B9B8E', textDecoration: 'none', fontSize: 14 }}>
                📷 Or scan a monument photo →
              </a>
            </div>
            <div style={{ marginTop: 12 }}>
              <p style={{ color: '#C4A882', fontSize: 14 }}>
                💡 Tip: Identify a monument using the{' '}
                <a href="/recognition" style={{ color: '#4B9B8E' }}>Recognition page</a>
                {' '}and the quiz will auto-load!
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-[#C9A84C] mb-6">{t('heritage_quiz')}</h1>
          <LoadingSpinner />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-[#C9A84C] mb-6">{t('heritage_quiz')}</h1>
          <div style={{ background: 'rgba(196,91,58,0.1)', border: '1px solid rgba(196,91,58,0.5)', borderRadius: 12, padding: 16, color: '#E8A85C', textAlign: 'center', margin: '16px 0' }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <p>Could not connect to server.</p>
            <button onClick={() => fetchQuestions(monumentId)} style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid #C9A84C', color: '#C9A84C', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginTop: 8 }}>{t('try_again')}</button>
          </div>
        </div>
      </AppShell>
    )
  }

  const question = questions[currentIndex]
  const baseMonumentOptions = monuments.length > 0
    ? monuments
    : Object.entries(MONUMENT_NAMES).map(([id, name]) => ({ id, name }))
  const monumentOptions =
    lastMonument && !baseMonumentOptions.some((item) => item.id === lastMonument.id)
      ? [{ id: lastMonument.id, name: lastMonument.name }, ...baseMonumentOptions]
      : baseMonumentOptions

  return (
    <AppShell>
      <div className="p-4 lg:p-8 animate-fade-in">
        {!finished ? (
          <>
            {/* Auto-loaded monument banner */}
            {lastMonument && (
              <div style={{
                background: 'rgba(75,155,142,0.1)',
                border: '1px solid rgba(75,155,142,0.4)',
                borderRadius: '12px', padding: '12px 16px',
                marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '12px'
              }}>
                <div style={{ color: '#4B9B8E', fontSize: '14px' }}>
                  🏛️ <strong>Auto-loaded:</strong> {lastMonument.name} — recognized just now
                </div>
                <button
                  onClick={() => {
                    setMonumentSelected(false)
                    setMonumentId('')
                    clearMonument()
                    setLastMonument(null)
                  }}
                  style={{
                    background: 'none', border: 'none',
                    color: '#7A6E5C', cursor: 'pointer',
                    fontSize: '12px', flexShrink: 0
                  }}
                >
                  ✕ Change
                </button>
              </div>
            )}
            {/* Header with monument selector */}
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="font-serif text-2xl lg:text-3xl font-bold text-[#C9A84C]">{t('heritage_quiz')}</h1>
                <span className="inline-block mt-2 px-3 py-1 bg-[#D4893F]/20 text-[#D4893F] text-xs font-bold uppercase rounded-full">Medium</span>
              </div>
              {/* Monument selector */}
              <div className="relative">
                <select
                  value={monumentId}
                  onChange={e => {
                    const selectedId = e.target.value
                    const selectedName = monumentOptions.find(m => m.id === selectedId)?.name || selectedId
                    setMonumentId(selectedId)
                    setMonumentSelected(true)
                    saveMonument(selectedId, selectedName)
                    setLastMonument({ id: selectedId, name: selectedName, timestamp: Date.now() })
                  }}
                  className="appearance-none pl-3 pr-8 py-2 bg-[#1C1638] border border-[#C9A84C]/40 text-[#C9A84C] text-sm rounded-lg focus:outline-none focus:border-[#C9A84C] cursor-pointer"
                >
                  {monumentOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-[#C9A84C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-[#F5E6D3]">{t('question_of')} {currentIndex + 1} {t('of')} {questions.length}</p>
              <div className="flex gap-2">
                {questions.map((_, idx) => (
                  <div key={idx} className={`w-3 h-3 rounded-full transition-all ${idx <= currentIndex ? "bg-[#C9A84C]" : "bg-[#1C1638]"}`} />
                ))}
              </div>
              <span className="px-3 py-1 bg-[#534AB7]/20 text-[#534AB7] text-sm rounded-full animate-xp-pulse">⚡ +{xpEarned} {t('xp_earned')}</span>
            </div>

            {/* Question card */}
            {question && (
              <div className="glass-card rounded-xl p-6 mb-6">
                <h2 className="font-serif text-xl lg:text-2xl font-bold text-[#F5E6D3] mb-6">{question.question}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx
                    const isCorrect = idx === question.correct_index
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={selectedAnswer !== null}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          isSelected ? isCorrect ? "bg-[#4B9B8E] border-[#4B9B8E] text-white" : "bg-[#DC2626]/20 border-[#DC2626] text-[#F5E6D3]"
                          : selectedAnswer !== null && isCorrect ? "bg-[#4B9B8E]/30 border-[#4B9B8E] text-white"
                          : "border-[#C9A84C]/30 text-[#C4A882] hover:border-[#C9A84C] hover:text-[#F5E6D3]"
                        }`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                        {isSelected && isCorrect && (<span className="float-right flex items-center gap-1 text-white"><Check className="w-5 h-5" /> CORRECT</span>)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedAnswer !== null && selectedAnswer === question?.correct_index && (
              <div className="p-4 bg-[#4B9B8E]/10 border-l-4 border-[#4B9B8E] rounded-r-lg mb-6 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#4B9B8E]">{t('correct')}</span>
                  <span className="px-2 py-1 bg-[#534AB7]/20 text-[#534AB7] text-xs rounded-full animate-xp-pulse">⚡ +10 XP</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-md mx-auto text-center animate-slide-up">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-serif text-4xl font-bold text-[#C9A84C] mb-2">{t('score')}: {score} {t('of')} {questions.length}</h2>
            <div className="inline-block px-4 py-2 bg-[#534AB7]/20 rounded-full mb-4 animate-xp-pulse">
              <span className="text-[#534AB7] font-bold">⚡ +{xpEarned} {t('xp_earned')}</span>
            </div>
            <div className="flex items-center justify-center gap-4 mb-6 text-[#C4A882]">
              <div className="flex items-center gap-2"><Clock className="w-5 h-5" /><span>{t('quiz_complete')}</span></div>
            </div>
            <div className="glass-card rounded-xl p-4 inline-block mb-6">
              <Star className="w-12 h-12 text-[#C9A84C] mx-auto mb-2" />
              <p className="text-[#C9A84C] font-semibold">Quiz Master!</p>
            </div>
            <div className="glass-card rounded-xl p-4 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#C4A882] flex items-center gap-2"><BarChart2 className="w-5 h-5" />{t('accuracy')}</span>
                <span className="text-[#C9A84C] font-bold">{questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%</span>
              </div>
              <div className="h-3 bg-[#1C1638] rounded-full overflow-hidden">
                <div className="h-full gold-gradient rounded-full transition-all duration-1000" style={{ width: `${questions.length > 0 ? (score / questions.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handlePlayAgain} className="px-6 py-3 border border-[#C9A84C]/50 text-[#C9A84C] font-semibold rounded-xl transition-all duration-300 hover:bg-[#C9A84C]/10">{t('play_again')}</button>
              <Link href="/achievements" className="px-6 py-3 gold-gradient text-[#0F0B1E] font-semibold rounded-xl transition-all duration-300 hover:scale-105">{t('view_leaderboard')}</Link>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
