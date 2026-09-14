'use client'
import { useLang } from '@/lib/languageContext'
import { Crown, Loader2, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MONUMENTS } from '@/lib/monumentData'
import { hasNativeNvidia, synthesizeNarrationNative } from '@/lib/nativeNvidia'
import { getLanguageConfig } from '@/lib/languages'
import { getNvidiaNarrationVoice } from '@/lib/narrationProfiles'

interface ListenToEmperorProps {
  monumentName: string
}

const AUDIO_SLUG_MAP: Record<string, string> = {
  'Taj Mahal': 'taj_mahal',
  'Red Fort': 'red_fort',
  'Qutub Minar': 'qutub_minar',
  'Hampi': 'hampi',
  'Konark Sun Temple': 'sun_temple',
  'Ajanta Caves': 'ajanta_caves',
  'Hawa Mahal Jaipur': 'hawa_mahal',
  'Ellora Caves': 'ellora_caves',
  'Sanchi Stupa': 'sanchi_stupa',
}

export function ListenToEmperor({ monumentName }: ListenToEmperorProps) {
  const { lang, t, translate } = useLang()
  const slug = AUDIO_SLUG_MAP[monumentName]
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const monumentEntry = Object.entries(MONUMENTS).find(([, monument]) => monument.name === monumentName)
  const monumentId = monumentEntry?.[0] || 'yatrik-guide'
  const monument = monumentEntry?.[1]

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
    window.speechSynthesis?.cancel()
    setPlaying(false)
    setLoading(false)
  }

  useEffect(() => () => {
    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    window.speechSynthesis?.cancel()
  }, [lang])

  if (!slug || !monument) return null

  const playTranslatedNarration = async () => {
    if (playing || loading) {
      stop()
      return
    }
    setLoading(true)
    const source = `${monument.timePeriods.construction} ${monument.timePeriods.modern}`
    let narration = source
    try {
      narration = await translate(source)
    } catch {
      // The source narration remains usable if translation is temporarily offline.
    }

    const voice = getNvidiaNarrationVoice(monumentId, lang)
    if (hasNativeNvidia() && voice) {
      try {
        const base64 = await synthesizeNarrationNative(narration, voice.language, voice.voice)
        const binary = window.atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
        const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
        const audio = new Audio(url)
        audioRef.current = audio
        audioUrlRef.current = url
        audio.onended = stop
        audio.onerror = stop
        setLoading(false)
        setPlaying(true)
        await audio.play()
        return
      } catch {
        // Fall through to the device/browser voice.
      }
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(narration)
      utterance.lang = getLanguageConfig(lang).locale
      utterance.rate = 0.88
      utterance.onend = stop
      utterance.onerror = stop
      setLoading(false)
      setPlaying(true)
      window.speechSynthesis.speak(utterance)
      return
    }
    stop()
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#D6A84B]/20 bg-[#11182B]">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D6A84B]/10 text-[#D6A84B]">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#D6A84B]">Voice from history</p>
          <h3 className="mt-1 font-heritage text-lg font-bold text-[#F6F1E8]">{t('listen_emperor')}</h3>
          <p className="mt-1 text-xs leading-5 text-[#AEB6C8]">
            {t('historical_narration')} {monumentName}
          </p>
        </div>
      </div>
      <div className="border-t border-white/8 bg-[#0D1426] px-4 py-3">
        {lang === 'en' || lang === 'hi' ? (
          <audio key={`${slug}_${lang}`} controls className="h-10 w-full" preload="metadata">
            <source src={`/audio/${slug}_${lang}.mp3`} type="audio/mpeg" />
            <source src={`/audio/${slug}_en.mp3`} type="audio/mpeg" />
            Your browser does not support audio.
          </audio>
        ) : (
          <button
            type="button"
            onClick={playTranslatedNarration}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D6A84B] px-4 text-sm font-bold text-[#171004]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {loading ? 'Preparing narration…' : playing ? 'Stop narration' : 'Play in selected language'}
          </button>
        )}
      </div>
    </section>
  )
}
