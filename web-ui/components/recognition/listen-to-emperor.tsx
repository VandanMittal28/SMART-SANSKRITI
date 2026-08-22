'use client'
import { useLang } from '@/lib/languageContext'

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
    <div style={{
      background: 'linear-gradient(135deg,rgba(212,137,63,0.1),rgba(201,168,76,0.05))',
      border: '1px solid rgba(212,137,63,0.35)',
      borderRadius: '14px', padding: '1.2rem 1.5rem',
      marginTop: '1.5rem'
    }}>
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: '1.05rem', color: '#E8C97A',
        fontWeight: 600, marginBottom: '0.4rem'
      }}>
        {t('listen_emperor')}
      </div>
      <div style={{
        color: '#C4A882', fontSize: '0.82rem',
        fontStyle: 'italic', marginBottom: '0.8rem'
      }}>
        {t('historical_narration')} {monumentName}
      </div>
      <audio
        key={`${slug}_${lang}`}
        controls
        style={{ width: '100%', height: '40px', borderRadius: '8px' }}
        preload="metadata"
      >
        <source src={`/audio/${slug}_${lang}.mp3`} type="audio/mpeg" />
        <source src={`/audio/${slug}_en.mp3`} type="audio/mpeg" />
        Your browser does not support audio.
      </audio>
    </div>
  )
}
