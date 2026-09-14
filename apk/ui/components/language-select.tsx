'use client'

import { Globe } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useLang } from '@/lib/languageContext'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'

export function LanguageSelect() {
  const { lang, setLang, t } = useLang()

  return (
    <Select value={lang} onValueChange={(value) => setLang(value as typeof lang)}>
      <SelectTrigger
        aria-label={t('language_label')}
        className="h-9 gap-1.5 rounded-full border-[#D6A84B]/20 bg-[#D6A84B]/8 px-3 text-[11px] font-bold text-[#F3DFC0] hover:bg-[#D6A84B]/12 focus-visible:ring-[#D6A84B]/40 [&_svg]:size-3 [&_svg]:text-[#F3DFC0] [&_svg]:opacity-100"
      >
        <Globe className="size-3.5 shrink-0" />
        <span data-no-translate>{lang.toUpperCase()}</span>
      </SelectTrigger>
      <SelectContent data-no-translate className="max-h-72 border-[#D6A84B]/20 bg-[#171F34] text-[#F6F1E8]" align="end">
        {SUPPORTED_LANGUAGES.map((language) => (
          <SelectItem
            key={language.id}
            value={language.id}
            className="text-sm focus:bg-[#D6A84B]/12 focus:text-[#F6F1E8]"
          >
            {language.id.toUpperCase()} · {language.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
