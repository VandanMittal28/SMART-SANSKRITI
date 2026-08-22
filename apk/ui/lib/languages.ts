export const SUPPORTED_LANGUAGES = [
  { id: 'ar', locale: 'ar-SA', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { id: 'da', locale: 'da-DK', name: 'Danish', nativeName: 'Dansk' },
  { id: 'de', locale: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { id: 'el', locale: 'el-GR', name: 'Greek', nativeName: 'Ελληνικά' },
  { id: 'en', locale: 'en-US', name: 'English', nativeName: 'English' },
  { id: 'es', locale: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { id: 'fi', locale: 'fi-FI', name: 'Finnish', nativeName: 'Suomi' },
  { id: 'fr', locale: 'fr-FR', name: 'French', nativeName: 'Français' },
  { id: 'he', locale: 'he-IL', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { id: 'hi', locale: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { id: 'it', locale: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { id: 'ja', locale: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { id: 'ko', locale: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { id: 'ms', locale: 'ms-MY', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { id: 'nl', locale: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
  { id: 'nb', locale: 'nb-NO', name: 'Norwegian', nativeName: 'Norsk' },
  { id: 'pl', locale: 'pl-PL', name: 'Polish', nativeName: 'Polski' },
  { id: 'pt', locale: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português' },
  { id: 'ru', locale: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { id: 'sv', locale: 'sv-SE', name: 'Swedish', nativeName: 'Svenska' },
  { id: 'sw', locale: 'sw-KE', name: 'Swahili', nativeName: 'Kiswahili' },
  { id: 'tr', locale: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
  { id: 'zh', locale: 'zh-CN', name: 'Mandarin Chinese', nativeName: '中文' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['id']

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en'

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language.id === value)
}

export function getLanguageConfig(languageId: SupportedLanguage) {
  return SUPPORTED_LANGUAGES.find((language) => language.id === languageId)
    || SUPPORTED_LANGUAGES.find((language) => language.id === DEFAULT_LANGUAGE)!
}
