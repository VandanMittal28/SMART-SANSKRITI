import { getLanguageConfig, type SupportedLanguage } from '@/lib/languages'

export type HeritageVoiceProfile = 'mughal-court' | 'hindu-temple' | 'sikh-heritage' | 'neutral-guide'

const MUGHAL_MONUMENTS = new Set(['taj-mahal', 'red-fort'])
const HINDU_MONUMENTS = new Set(['konark', 'kedarnath', 'meenakshi', 'hampi', 'mysore-palace', 'hawa-mahal'])
const SIKH_MONUMENTS = new Set(['golden-temple'])

const NVIDIA_LOCALE: Partial<Record<SupportedLanguage, string>> = {
  ar: 'AR-AR', de: 'DE-DE', en: 'EN-US', es: 'ES-US', fr: 'FR-FR', hi: 'HI-IN',
  it: 'IT-IT', ja: 'JA-JP', ko: 'KO-KR', pt: 'PT-BR', zh: 'ZH-CN',
}

const DEFAULT_SPEAKER: Partial<Record<SupportedLanguage, string>> = {
  ar: 'Sofia', de: 'Pascal', en: 'Aria', es: 'Isabela', fr: 'Louise', hi: 'Sofia',
  it: 'Isabela', ja: 'Louise', ko: 'Aria', pt: 'Isabela', zh: 'Siwei',
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
  if (language === 'en' || language === 'hi') {
    const speaker = profile === 'mughal-court'
      ? 'Pascal'
      : profile === 'hindu-temple'
        ? 'Sofia'
        : profile === 'sikh-heritage'
          ? 'Leo'
          : 'Siwei'
    // A Hindi-locale speaker gives English narration an Indian delivery while
    // keeping Hindi narration native. Different speakers distinguish the site traditions.
    return {
      language: getLanguageConfig(language).locale,
      profile,
      voice: `Magpie-Multilingual.HI-IN.${speaker}`,
    }
  }

  return {
    language: language === 'ar' ? 'ar-XA' : getLanguageConfig(language).locale,
    profile,
    voice: `Magpie-Multilingual.${locale}.${DEFAULT_SPEAKER[language]}`,
  }
}
