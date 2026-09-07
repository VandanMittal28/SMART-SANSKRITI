"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { Send, GraduationCap, Compass, Landmark, Mic, MicOff, Volume2 } from "lucide-react"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useAuth } from "@/lib/authContext"
import { saveChatExchange } from "@/lib/authClient"
import { useLang } from "@/lib/languageContext"
import { useUser } from "@/lib/userContext"
import { cn } from "@/lib/utils"
import { getChatCacheKey, getCache, setCache, CACHE_DURATION } from '@/lib/cache'
import { recordingToWavBase64 } from '@/lib/audio'
import { isMonumentQuestion, monumentOnlyRefusal, offlineHeritageAnswer } from '@/lib/offlineHeritage'
import { hasNativeNvidia, recordPhoneMicrophone, transcribeAudioNative, synthesizeNarrationNative } from '@/lib/nativeNvidia'
import { getNvidiaNarrationVoice } from '@/lib/narrationProfiles'

interface Message { id: string | number; role: "assistant" | "user"; content: string }

export default function ChatPage() {
  const { t, lang } = useLang()
  const suggestedQuestions = [t('when_built'), t('who_built'), t('what_legend'), t('best_time_visit'), t('entry_fee_q')]

  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", content: t('namaste_greeting') }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  // No monument is preselected here — this is the general Ask AI chat reachable
  // from anywhere in the app, so the assistant infers the monument from each
  // question instead of assuming one.
  const monumentId = ""
  const [listening, setListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastWasVoiceRef = useRef(false)
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const voiceAudioUrlRef = useRef<string | null>(null)
  const { toast, showToast, hideToast } = useToast()
  const { user, profile } = useAuth()
  const { userType } = useUser()

  // ── Browser TTS fallback (used when the native NVIDIA voice is unavailable,
  // e.g. running in a plain browser instead of the bundled Android app) ────
  const speakWithBrowserTts = useCallback((text: string) => {
    if (!window.speechSynthesis) { setIsSpeaking(false); return }
    window.speechSynthesis.cancel()

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const targetLang = lang === 'hi' ? 'hi' : 'en'
      const voice = voices.find(v =>
        v.lang.includes(targetLang) &&
        (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.lang.includes(targetLang))
      ) || voices.find(v => v.lang.includes(targetLang))

      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
      let idx = 0

      const speakNext = () => {
        if (idx >= sentences.length) { setIsSpeaking(false); return }
        const utterance = new SpeechSynthesisUtterance(sentences[idx].trim())
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
        utterance.rate = 0.9
        utterance.pitch = 1.0
        if (voice) utterance.voice = voice
        utterance.onend = () => { idx++; speakNext() }
        utterance.onerror = () => setIsSpeaking(false)
        window.speechSynthesis.speak(utterance)
      }
      speakNext()
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
      setTimeout(() => doSpeak(), 300)
    } else {
      doSpeak()
    }
  }, [lang])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause()
      voiceAudioRef.current.src = ''
      voiceAudioRef.current = null
    }
    if (voiceAudioUrlRef.current) {
      URL.revokeObjectURL(voiceAudioUrlRef.current)
      voiceAudioUrlRef.current = null
    }
  }, [])

  // ── Voice reply: the real device speaks answers through the same native
  // NVIDIA voice used everywhere else in the app (e.g. Yatrik's greeting).
  // Browser speechSynthesis is only a fallback for non-bundled environments,
  // since Android WebView usually has no usable built-in TTS voices.
  const speakText = useCallback(async (text: string) => {
    stopSpeaking()
    setIsSpeaking(true)
    const voice = getNvidiaNarrationVoice(monumentId || 'yatrik-guide', lang)

    if (hasNativeNvidia() && voice) {
      try {
        const audioBase64 = await synthesizeNarrationNative(text, voice.language, voice.voice)
        const binary = window.atob(audioBase64)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
        const audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
        const audio = new Audio(audioUrl)
        voiceAudioRef.current = audio
        voiceAudioUrlRef.current = audioUrl
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('Native voice reply could not be played.'))
          audio.play().catch(reject)
        })
        voiceAudioRef.current = null
        URL.revokeObjectURL(audioUrl)
        voiceAudioUrlRef.current = null
        setIsSpeaking(false)
        return
      } catch (error) {
        console.warn('Native voice reply failed; using the device voice instead:', error)
      }
    }

    speakWithBrowserTts(text)
  }, [lang, monumentId, speakWithBrowserTts, stopSpeaking])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  // Hydrate the durable conversation on login, profile changes, and language
  // changes. Realtime profile updates keep other open tabs in sync.
  useEffect(() => {
    const persisted = (profile?.chat_history ?? []).flatMap((message, index): Message[] => {
      const role = message.role
      const content = message.content
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return []
      const timestamp = typeof message.timestamp === 'string' ? message.timestamp : 'saved'
      return [{ id: `${timestamp}-${index}`, role, content }]
    })
    setMessages([{ id: 'greeting', role: "assistant", content: t('namaste_greeting') }, ...persisted])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, profile?.chat_history])

  const persistExchange = async (question: string, answer: string) => {
    if (!user) return
    try {
      await saveChatExchange(user.id, question, answer, monumentId)
    } catch (error) {
      console.warn('Chat persistence unavailable:', error)
    }
  }

  // ── Send Message ───────────────────────────────────────
  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const userMsg: Message = { id: Date.now(), role: "user", content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    if (!isMonumentQuestion(trimmed)) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: monumentOnlyRefusal(lang),
      }])
      setLoading(false)
      return
    }

    // Check cache first
    const cacheKey = getChatCacheKey(trimmed, monumentId)
    const cachedAnswer = getCache(cacheKey, CACHE_DURATION.chat)
    
    if (cachedAnswer) {
      // Voice or text in, the reply always gets a text bubble so the visitor
      // can confirm what was heard/answered; voice questions are also spoken.
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: cachedAnswer + ' ⚡' }])
      if (lastWasVoiceRef.current) {
        void speakText(cachedAnswer)
        lastWasVoiceRef.current = false
      }
      await persistExchange(trimmed, cachedAnswer)
      setLoading(false)
      return
    }

    try {
      const res = await api.askChat(trimmed, monumentId, lang)
      const aiAnswer = res.data.answer

      // Cache the response
      setCache(cacheKey, aiAnswer)

      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: aiAnswer }])
      if (lastWasVoiceRef.current) {
        void speakText(aiAnswer)
        lastWasVoiceRef.current = false
      }

      await persistExchange(trimmed, aiAnswer)
    } catch {
      const fallbackAnswer = offlineHeritageAnswer(trimmed, monumentId, lang)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: fallbackAnswer }])
      if (lastWasVoiceRef.current) {
        void speakText(fallbackAnswer)
        lastWasVoiceRef.current = false
      }
      await persistExchange(trimmed, fallbackAnswer)
    } finally { setLoading(false) }
  }

  const handleSend = () => sendMessage(input.trim())

  const voiceErrorToast = (error: unknown) => {
    const message = error instanceof Error ? error.message : ''
    if (/permission/i.test(message)) {
      return lang === 'hi'
        ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया सेटिंग्स में जाकर माइक्रोफ़ोन एक्सेस चालू करें।'
        : 'Microphone access was not granted. Enable it for this app in Settings to use voice.'
    }
    return lang === 'hi' ? 'आवाज़ समझ नहीं आई।' : 'Could not understand the recording.'
  }

  // ── Voice Input (NVIDIA speech model) ─────────────────
  const startVoice = async () => {
    if (voiceRecorderRef.current?.state === 'recording') {
      voiceRecorderRef.current.stop()
      return
    }

    if (hasNativeNvidia()) {
      setListening(true)
      showToast(t('listening'))
      try {
        const audioBase64 = await recordPhoneMicrophone(5_000)
        const spokenText = await transcribeAudioNative(audioBase64, lang === 'hi' ? 'hi' : 'en')
        if (!spokenText) throw new Error('Transcription was empty')
        setInput(spokenText)
        lastWasVoiceRef.current = true
        await sendMessage(spokenText)
      } catch (error) {
        console.error('Voice transcription failed:', error)
        showToast(voiceErrorToast(error))
      } finally {
        setListening(false)
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      voiceRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstart = () => {
        setListening(true)
        showToast(t('listening'))
        voiceTimerRef.current = setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop()
        }, 5_000)
      }
      recorder.onstop = async () => {
        if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current)
        voiceTimerRef.current = null
        voiceRecorderRef.current = null
        setListening(false)
        stream.getTracks().forEach((track) => track.stop())
        if (chunks.length === 0) return

        try {
          const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          const audioBase64 = await recordingToWavBase64(audio)
          let spokenText = ''
          if (hasNativeNvidia()) {
            spokenText = await transcribeAudioNative(audioBase64, lang === 'hi' ? 'hi' : 'en')
          } else {
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_b64: audioBase64, language: lang }),
            })
            const data = await response.json()
            if (!response.ok || !data.text) throw new Error(data.error || 'Transcription failed')
            spokenText = String(data.text).trim()
          }
          if (!spokenText) throw new Error('Transcription was empty')
          setInput(spokenText)
          lastWasVoiceRef.current = true
          await sendMessage(spokenText)
        } catch (error) {
          console.error('Voice transcription failed:', error)
          showToast(voiceErrorToast(error))
        }
      }

      recorder.start(100)
    } catch {
      setListening(false)
      showToast(lang === 'hi' ? 'माइक्रोफोन अनुमति आवश्यक है।' : 'Microphone access is required.')
    }
  }

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      stopSpeaking()
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current)
      if (voiceRecorderRef.current?.state === 'recording') voiceRecorderRef.current.stop()
    }
  }, [stopSpeaking])

  const modeCopy = userType === 'student' ? t('student_mode') : t('mode_title')
  const ModeIcon = userType === 'student' ? GraduationCap : Compass

  return (
    <AppShell>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
      <div className="flex h-[calc(100dvh-64px-72px)] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6A84B]/15 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#D6A84B]/12 text-[#D6A84B]">
              <Landmark className="h-4.5 w-4.5" />
            </span>
            <h1 className="font-heritage text-lg font-bold text-[#F6F1E8]">{t('ai_chatbot')}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 rounded-full bg-[#63C7BA]/15 px-2.5 py-1 text-xs font-semibold text-[#63C7BA]"
              >
                <Volume2 className="h-3.5 w-3.5 animate-pulse" />{t('speaking')}
              </button>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-[#7C3AED]/15 px-2.5 py-1 text-xs font-semibold text-[#B9A2F5]">
              <ModeIcon className="h-3.5 w-3.5" />{modeCopy}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <div key={message.id} className={cn('flex animate-fade-in', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl border-l-4 p-3.5 text-sm leading-relaxed text-[#F6F1E8]',
                  message.role === 'user'
                    ? 'border-[#C66B4E] bg-[#C66B4E]/12'
                    : 'border-[#63C7BA] bg-[#11182B]',
                )}
              >
                {message.role === 'assistant' && (
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-[#63C7BA]" />
                    <span className="text-xs font-semibold text-[#63C7BA]">{t('heritage_guide')}</span>
                  </div>
                )}
                <p>{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-2xl border-l-4 border-[#63C7BA] bg-[#11182B] p-3.5 text-[#F6F1E8]">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-[#63C7BA]" />
                  <span className="text-xs font-semibold text-[#63C7BA]">{t('heritage_guide')}</span>
                </div>
                <div className="flex h-5 items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-2 w-2 rounded-full bg-[#63C7BA]" style={{ animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        <div className="app-scroll-row flex gap-2 overflow-x-auto px-4 py-2">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              onClick={() => { setInput(question); sendMessage(question) }}
              className="shrink-0 rounded-full border border-[#D6A84B]/20 bg-[#11182B] px-3 py-1.5 text-xs font-medium text-[#AEB6C8] transition-colors hover:border-[#D6A84B]/50 hover:text-[#D6A84B]"
            >
              {question}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="border-t border-[#D6A84B]/15 p-3.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('ask_placeholder')}
              className="h-11 flex-1 rounded-xl border border-[#D6A84B]/25 bg-[#171F34] px-4 text-sm text-[#F6F1E8] outline-none placeholder:text-[#8891A6] focus:border-[#D6A84B]"
            />
            <button
              onClick={startVoice}
              disabled={isSpeaking}
              aria-label={listening ? t('listening') : t('ask_by_voice')}
              aria-pressed={listening}
              className={cn(
                'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-transform active:scale-95 disabled:opacity-50',
                listening ? 'animate-pulse bg-[#63C7BA]' : 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]',
              )}
            >
              {listening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={handleSend}
              disabled={loading}
              aria-label="Send message"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D6A84B] text-[#171004] transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
