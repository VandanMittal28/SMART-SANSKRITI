"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { Check, Star, Clock, BarChart2, ChevronDown, Landmark, Camera, Lightbulb, PartyPopper, TriangleAlert, X, Zap } from "lucide-react"
import Link from "next/link"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/authContext"
import { addXP, addQuizScore, computeAndSaveBadges } from "@/lib/authClient"
import { useLang } from "@/lib/languageContext"
import { getMonument, saveMonument, clearMonument, type StoredMonument } from "@/lib/monumentStore"
import { getQuizQuestions, resolveQuizMonumentId } from "@/lib/quizQuestions"
import { cn } from "@/lib/utils"

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
      <Spinner className="size-9 text-[#D6A84B]" />
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
        const localQuestions = getQuizQuestions(mid)
        if (localQuestions.length > 0) {
          setQuestions(localQuestions)
          setError(null)
        } else {
          setError('Questions are not available for this monument yet.')
        }
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
        <div className="screen-gutter flex flex-col gap-6 py-5 animate-fade-in">
          <h1 className="font-heritage text-2xl font-bold text-[#F6F1E8]">{t('heritage_quiz')}</h1>

          <div className="app-card flex flex-col items-center rounded-2xl p-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#D6A84B]/12 text-[#D6A84B]">
              <Landmark className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-heritage text-xl font-bold text-[#F6F1E8]">{t('select_monument_first')}</h2>
            <p className="mt-2 text-sm leading-6 text-[#AEB6C8]">{t('scan_monument_msg')}</p>

            <div className="relative mt-6 w-full max-w-[280px]">
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
                className="w-full appearance-none rounded-xl border border-[#D6A84B]/40 bg-[#171F34] px-4 py-3 pr-10 text-sm font-semibold text-[#D6A84B] outline-none"
              >
                <option value="" disabled>{t('choose_monument')}</option>
                {monumentList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D6A84B]" />
            </div>

            <Link href="/recognition" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#63C7BA]">
              <Camera className="h-3.5 w-3.5" /> Or scan a monument photo
            </Link>
            <p className="mt-3 flex items-start gap-1.5 text-left text-xs leading-5 text-[#AEB6C8]">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D6A84B]" />
              Tip: identify a monument on the{' '}
              <Link href="/recognition" className="text-[#63C7BA]">Recognition page</Link>
              {' '}and the quiz auto-loads.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="screen-gutter py-5">
          <h1 className="font-heritage text-2xl font-bold text-[#F6F1E8]">{t('heritage_quiz')}</h1>
          <LoadingSpinner />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="screen-gutter py-5">
          <h1 className="font-heritage text-2xl font-bold text-[#F6F1E8]">{t('heritage_quiz')}</h1>
          <div className="mt-4 rounded-2xl border border-[#C66B4E]/40 bg-[#C66B4E]/10 p-5 text-center">
            <TriangleAlert className="mx-auto h-6 w-6 text-[#E8A85C]" />
            <p className="mt-2 text-sm text-[#E8A85C]">Could not connect to server.</p>
            <button
              onClick={() => fetchQuestions(monumentId)}
              className="mt-3 rounded-lg border border-[#D6A84B]/50 bg-[#D6A84B]/15 px-4 py-2 text-sm font-semibold text-[#D6A84B]"
            >
              {t('try_again')}
            </button>
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
      <div className="screen-gutter flex flex-col gap-5 py-5 animate-fade-in">
        {!finished ? (
          <>
            {lastMonument && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#63C7BA]/35 bg-[#63C7BA]/10 px-4 py-3">
                <p className="text-xs leading-5 text-[#8DE0D6]">
                  <strong className="font-bold">Auto-loaded:</strong> {lastMonument.name} — recognized just now
                </p>
                <button
                  onClick={() => {
                    setMonumentSelected(false)
                    setMonumentId('')
                    clearMonument()
                    setLastMonument(null)
                  }}
                  className="flex shrink-0 items-center gap-1 text-xs text-[#8891A6]"
                >
                  <X className="h-3 w-3" /> Change
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-heritage text-xl font-bold text-[#F6F1E8]">{t('heritage_quiz')}</h1>
                <span className="mt-1.5 inline-block rounded-full bg-[#C66B4E]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E8A85C]">Medium</span>
              </div>
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
                  className="cursor-pointer appearance-none rounded-lg border border-[#D6A84B]/35 bg-[#171F34] py-2 pl-3 pr-8 text-sm text-[#D6A84B] outline-none"
                >
                  {monumentOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#D6A84B]" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-[#F6F1E8]">{t('question_of')} {currentIndex + 1} {t('of')} {questions.length}</p>
              <div className="flex gap-1.5">
                {questions.map((_, idx) => (
                  <div key={idx} className={cn('h-2 w-2 rounded-full transition-colors', idx <= currentIndex ? 'bg-[#D6A84B]' : 'bg-white/10')} />
                ))}
              </div>
              <span className="flex items-center gap-1 rounded-full bg-[#7C3AED]/15 px-2.5 py-1 text-xs font-semibold text-[#B9A2F5] animate-xp-pulse">
                <Zap className="h-3 w-3 fill-current" /> +{xpEarned}
              </span>
            </div>

            {question && (
              <div className="app-card rounded-2xl p-5">
                <h2 className="font-heritage text-lg font-bold leading-7 text-[#F6F1E8]">{question.question}</h2>
                <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {question.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx
                    const isCorrect = idx === question.correct_index
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={selectedAnswer !== null}
                        className={cn(
                          'rounded-xl border-2 p-4 text-left text-sm transition-colors duration-300',
                          isSelected
                            ? isCorrect ? 'border-[#63C7BA] bg-[#63C7BA] text-[#071B19]' : 'border-[#DC2626] bg-[#DC2626]/15 text-[#F6F1E8]'
                            : selectedAnswer !== null && isCorrect
                              ? 'border-[#63C7BA] bg-[#63C7BA]/25 text-[#071B19]'
                              : 'border-[#D6A84B]/25 text-[#AEB6C8] hover:border-[#D6A84B]/50 hover:text-[#F6F1E8]',
                        )}
                      >
                        <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                        {isSelected && isCorrect && (
                          <span className="float-right flex items-center gap-1 font-semibold"><Check className="h-4 w-4" /> Correct</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedAnswer !== null && selectedAnswer === question?.correct_index && (
              <div className="rounded-r-lg border-l-4 border-[#63C7BA] bg-[#63C7BA]/10 p-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#8DE0D6]">{t('correct')}</span>
                  <span className="rounded-full bg-[#7C3AED]/15 px-2 py-1 text-xs text-[#B9A2F5] animate-xp-pulse">+10 XP</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center text-center animate-slide-up">
            <PartyPopper className="h-12 w-12 text-[#D6A84B]" />
            <h2 className="mt-3 font-heritage text-2xl font-bold text-[#F6F1E8]">{t('score')}: {score} {t('of')} {questions.length}</h2>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED]/15 px-4 py-1.5 text-sm font-bold text-[#B9A2F5] animate-xp-pulse">
              <Zap className="h-3.5 w-3.5 fill-current" /> +{xpEarned} {t('xp_earned')}
            </span>
            <div className="mt-4 flex items-center gap-2 text-sm text-[#AEB6C8]">
              <Clock className="h-4 w-4" /> {t('quiz_complete')}
            </div>

            <div className="app-card mt-6 flex flex-col items-center rounded-2xl px-6 py-5">
              <Star className="h-9 w-9 text-[#D6A84B]" />
              <p className="mt-2 font-semibold text-[#D6A84B]">Quiz Master!</p>
            </div>

            <div className="app-card mt-4 w-full rounded-2xl p-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[#AEB6C8]"><BarChart2 className="h-4 w-4" />{t('accuracy')}</span>
                <span className="font-bold text-[#D6A84B]">{questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D6A84B] to-[#C66B4E] transition-all duration-1000"
                  style={{ width: `${questions.length > 0 ? (score / questions.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button onClick={handlePlayAgain} className="rounded-xl border border-[#D6A84B]/40 px-6 py-3 text-sm font-semibold text-[#D6A84B] transition-colors hover:bg-[#D6A84B]/10">
                {t('play_again')}
              </button>
              <Link href="/profile" className="rounded-xl bg-[#D6A84B] px-6 py-3 text-sm font-semibold text-[#171004] transition-transform active:scale-95">
                {t('view_leaderboard')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
