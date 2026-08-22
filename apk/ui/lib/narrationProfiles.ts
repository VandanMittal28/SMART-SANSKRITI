import { getLanguageConfig, type SupportedLanguage } from '@/lib/languages'

export type HeritageVoiceProfile = 'mughal-court' | 'hindu-temple' | 'sikh-heritage' | 'neutral-guide'

const MUGHAL_MONUMENTS = new Set(['taj-mahal', 'red-fort'])
const HINDU_MONUMENTS = new Set(['konark', 'kedarnath', 'meenakshi', 'hampi', 'mysore-palace', 'hawa-mahal'])
const SIKH_MONUMENTS = new Set(['golden-temple'])

const NVIDIA_LOCALE: Partial<Record<SupportedLanguage, string>> = {
  ar: 'AR-AR', de: 'DE-DE', en: 'EN-US', es: 'ES-US', fr: 'FR-FR', hi: 'HI-IN',
  it: 'IT-IT', ja: 'JA-JP', ko: 'KO-KR', pt: 'PT-BR', zh: 'ZH-CN',
}

export function getHeritageVoiceProfile(monumentId: string): HeritageVoiceProfile {
  if (SIKH_MONUMENTS.has(monumentId)) return 'sikh-heritage'
  if (HINDU_MONUMENTS.has(monumentId)) return 'hindu-temple'
  if (MUGHAL_MONUMENTS.has(monumentId)) return 'mughal-court'
  return 'neutral-guide'
}

export function getNvidiaNarrationVoice(monumentId: string, language: SupportedLanguage) {
  const locale = NVIDIA_LOCALE[language]
  if (!locale) return null

  const profile = getHeritageVoiceProfile(monumentId)
  // Leo is NVIDIA Magpie's warm male guide voice. The Calm style is available
  // for EN-US; other locales use the same male speaker without an unsupported
  // emotion suffix.
  const voice = language === 'en'
    ? 'Magpie-Multilingual.EN-US.Leo.Calm'
    : `Magpie-Multilingual.${locale}.Leo`

  return {
    language: language === 'ar' ? 'ar-XA' : getLanguageConfig(language).locale,
    profile,
    voice,
  }
}

export function getYatrikNarrationVoice(language: SupportedLanguage) {
  return getNvidiaNarrationVoice('yatrik-guide', language)
}
