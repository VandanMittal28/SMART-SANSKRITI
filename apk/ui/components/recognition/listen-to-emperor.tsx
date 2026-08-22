'use client'
import { useLang } from '@/lib/languageContext'
import { Crown } from 'lucide-react'

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
  const { lang, t } = useLang()
  const slug = AUDIO_SLUG_MAP[monumentName]
  if (!slug) return null

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
        <audio
          key={`${slug}_${lang}`}
          controls
          className="h-10 w-full"
          preload="metadata"
        >
          <source src={`/audio/${slug}_${lang}.mp3`} type="audio/mpeg" />
          <source src={`/audio/${slug}_en.mp3`} type="audio/mpeg" />
          Your browser does not support audio.
        </audio>
      </div>
    </section>
  )
}
