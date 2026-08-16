"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { Send, GraduationCap, Building } from "lucide-react"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useAuth } from "@/lib/authContext"
import { saveChatMessage } from "@/lib/authClient"
import { useLang } from "@/lib/languageContext"
import { getChatCacheKey, getCache, setCache, CACHE_DURATION } from '@/lib/cache'
import { recordingToWavBase64 } from '@/lib/audio'

interface Message { id: number; role: "assistant" | "user"; content: string }

export default function ChatPage() {
  const { t, lang } = useLang()
  const suggestedQuestions = [t('when_built'), t('who_built'), t('what_legend'), t('best_time_visit'), t('entry_fee_q')]

  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", content: t('namaste_greeting') }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const monumentId = "taj-mahal"
  const [listening, setListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastWasVoiceRef = useRef(false)
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast, showToast, hideToast } = useToast()
  const { user } = useAuth()

  // ── Robust Browser TTS ─────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setIsSpeaking(true)

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  // Reset greeting when language changes
  useEffect(() => {
    setMessages([{ id: 1, role: "assistant", content: t('namaste_greeting') }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // ── Send Message ───────────────────────────────────────
  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const userMsg: Message = { id: Date.now(), role: "user", content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    // Check cache first
    const cacheKey = getChatCacheKey(trimmed, monumentId)
    const cachedAnswer = getCache(cacheKey, CACHE_DURATION.chat)
    
    if (cachedAnswer) {
      // ✨ Voice in → voice out ONLY (no text bubble)
      if (lastWasVoiceRef.current) {
        speakText(cachedAnswer)
        lastWasVoiceRef.current = false
      } else {
        // Text in → text out only + lightning bolt for cached result
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: cachedAnswer + ' ⚡' }])
      }
      setLoading(false)
      return
    }

    try {
      const res = await api.askChat(trimmed, monumentId, lang)
      const aiAnswer = res.data.answer

      // Cache the response
      setCache(cacheKey, aiAnswer)

      // ✨ Voice in → voice out ONLY (no text bubble)
      if (lastWasVoiceRef.current) {
        speakText(aiAnswer)
        lastWasVoiceRef.current = false
      } else {
        // Text in → text out only
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: aiAnswer }])
      }

      if (user) { 
        saveChatMessage(user.id, 'user', trimmed, monumentId).catch(() => null)
        saveChatMessage(user.id, 'assistant', aiAnswer, monumentId).catch(() => null) 
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: t('sorry_trouble') }])
    } finally { setLoading(false) }
  }

  const handleSend = () => sendMessage(input.trim())

  // ── Voice Input (NVIDIA speech model) ─────────────────
  const startVoice = async () => {
    if (voiceRecorderRef.current?.state === 'recording') {
      voiceRecorderRef.current.stop()
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
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_b64: audioBase64, language: lang }),
          })
          const data = await response.json()
          if (!response.ok || !data.text) {
            throw new Error(data.error || 'Transcription failed')
          }

          const spokenText = String(data.text).trim()
          setInput(spokenText)
          lastWasVoiceRef.current = true
          await sendMessage(spokenText)
        } catch (error) {
          console.error('Voice transcription failed:', error)
          showToast(lang === 'hi' ? 'आवाज़ समझ नहीं आई।' : 'Could not understand the recording.')
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
      window.speechSynthesis?.cancel()
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current)
      if (voiceRecorderRef.current?.state === 'recording') voiceRecorderRef.current.stop()
    }
  }, [])

  return (
    <AppShell>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
      <div className="flex flex-col h-[calc(100vh-96px)] lg:h-screen">
        <div className="flex items-center justify-between p-4 border-b border-[#C9A84C]/20 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center"><Building className="w-5 h-5 text-[#C9A84C]" /></div>
            <h1 className="font-serif text-xl font-bold text-[#C9A84C]">{t('ai_chatbot')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 px-3 py-1 bg-[#534AB7]/20 text-[#534AB7] text-sm rounded-full"><GraduationCap className="w-4 h-4" />{t('student_mode')}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-[80%] p-4 rounded-xl ${message.role === "user" ? "bg-[#D4893F]/20 border-l-4 border-[#D4893F] text-[#F5E6D3]" : "glass-card border-l-4 border-[#4B9B8E] text-[#F5E6D3]"}`}>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🏛️</span>
                    <span className="text-sm text-[#4B9B8E] font-medium">{t('heritage_guide')}</span>
                  </div>
                )}
                <p className="leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="glass-card border-l-4 border-[#4B9B8E] text-[#F5E6D3] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2"><span className="text-lg">🏛️</span><span className="text-sm text-[#4B9B8E] font-medium">{t('heritage_guide')}</span></div>
                <div className="flex gap-1 items-center h-5">{[0,1,2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#4B9B8E', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />))}</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {suggestedQuestions.map((question) => (
            <button key={question} onClick={() => { setInput(question); sendMessage(question) }} className="flex-shrink-0 px-3 py-1 glass-card rounded-full text-sm text-[#C4A882] hover:text-[#C9A84C] hover:border-[#C9A84C] transition-colors">{question}</button>
          ))}
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-[#C9A84C]/20">
          <div className="flex items-center gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={t('ask_placeholder')} className="flex-1 bg-[#1C1638] border border-[#C9A84C]/30 rounded-xl px-4 py-3 text-[#F5E6D3] placeholder:text-[#C4A882] focus:outline-none focus:border-[#C9A84C] transition-colors" />
            <button onClick={startVoice} className={`px-3 py-3 rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-1.5 text-sm font-medium ${listening ? 'bg-[#4B9B8E] text-white animate-pulse' : 'purple-gradient text-white'}`}>
              {listening ? '🎙️' : '🎤'}<span className="hidden sm:inline">{listening ? t('listening') : t('ask_by_voice')}</span>
            </button>
            <button onClick={handleSend} disabled={loading} className="p-3 gold-gradient rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"><Send className="w-5 h-5 text-[#0F0B1E]" /></button>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
