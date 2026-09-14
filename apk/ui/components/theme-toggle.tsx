'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLang } from '@/lib/languageContext'
import { cn } from '@/lib/utils'

type AndroidThemeBridge = {
  setTheme?: (theme: 'dark' | 'light') => void
}

export function AppThemeSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const theme = resolvedTheme === 'light' ? 'light' : 'dark'
    const color = theme === 'light' ? '#F7F1E5' : '#080D1D'
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
    const android = (window as unknown as { SanskritiAndroid?: AndroidThemeBridge }).SanskritiAndroid
    android?.setTheme?.(theme)
  }, [resolvedTheme])

  return null
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useLang()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isLight = mounted && resolvedTheme === 'light'
  const label = isLight ? t('theme_switch_to_dark') : t('theme_switch_to_light')

  return (
    <button
      aria-label={label}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full border border-[#D6A84B]/20 bg-[#11182B] text-[#F3DFC0] transition-colors hover:bg-[#D6A84B]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84B]/40',
        className,
      )}
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      title={label}
      type="button"
    >
      {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
      <span className="sr-only">{label}</span>
    </button>
  )
}
