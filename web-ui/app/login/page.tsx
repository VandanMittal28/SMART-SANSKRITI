'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, AtSign, BadgeCheck, Cloud, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SanskritiLogo from '@/components/SanskritiLogo'
import { normalizeUsername } from '@/lib/authClient'
import { useAuth } from '@/lib/authContext'

export default function LoginPage() {
  const router = useRouter()
  const { error: authError, signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const normalizedUsername = normalizeUsername(username)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await signIn(username)
      router.replace('/')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to start your session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mobile-shell min-h-dvh text-[#f9eed8]">
      <section className="mobile-scroll flex min-h-dvh flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center overflow-hidden rounded-2xl border border-[#f1c56e]/20 bg-[#1a0f00] shadow-[0_10px_30px_rgba(232,166,70,0.24)]">
              <SanskritiLogo size={46} />
            </div>
            <div>
              <p className="font-serif text-xl font-bold tracking-tight text-[#fff0ce]">Sanskriti AI</p>
              <p className="text-xs text-[#c7a886]">Mobile heritage guide</p>
            </div>
          </div>
          <div className="grid size-10 place-items-center rounded-full border border-[#f1c56e]/20 bg-[#f1c56e]/10 text-[#f4cf86]">
            <Sparkles className="size-4" />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mb-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e9b85d]/20 bg-[#e9b85d]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e9b85d]">
              <AtSign className="size-3.5" />
              Explorer login
            </p>
            <h1 className="mt-5 max-w-[16rem] font-serif text-[2.55rem] leading-[0.98] text-[#fff1d6]">
              What should we call you?
            </h1>
            <p className="mt-4 max-w-[19rem] text-sm leading-6 text-[#cbb296]">
              Pick a username to keep your XP, badges, chats, and monument visits synced.
            </p>
          </div>

          <form className="space-y-4 rounded-2xl border border-[#e9b85d]/18 bg-[#10162a]/76 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-[#e7d0b0]" htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8f765f]" />
                <Input
                  autoCapitalize="none"
                  autoComplete="username"
                  className="h-14 rounded-2xl border-[#e9b85d]/20 bg-black/28 pl-11 text-base text-[#fff1d6] placeholder:text-[#7f6a57] focus-visible:ring-[#e9b85d]/30"
                  id="username"
                  maxLength={30}
                  minLength={3}
                  onChange={(event) => { setUsername(event.target.value); setError('') }}
                  placeholder="heritage_explorer"
                  required
                  spellCheck={false}
                  value={username}
                />
              </div>
              <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#9d846b]">3-24 letters, numbers, or underscores</span>
                {normalizedUsername && <span className="rounded-full bg-[#e9b85d]/10 px-2.5 py-1 font-semibold text-[#e9b85d]">@{normalizedUsername}</span>}
              </div>
            </div>

            {(error || authError) && (
              <p className="rounded-2xl border border-red-400/30 bg-red-950/30 px-3.5 py-3 text-sm leading-5 text-red-200" role="alert">
                {error || authError}
              </p>
            )}

            <Button className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#e0a044] to-[#f0c46e] text-base font-bold text-[#261508] shadow-[0_16px_34px_rgba(224,160,68,0.22)] hover:brightness-110" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating journey...' : 'Enter Sanskriti AI'}
              {!isSubmitting && <ArrowRight className="size-5" />}
            </Button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <Cloud className="mb-2 size-4 text-[#7ecdc0]" />
              <p className="text-xs font-semibold text-[#d9fff7]">Cloud saved</p>
              <p className="mt-1 text-[11px] leading-4 text-[#83a9a1]">Works across visits</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <BadgeCheck className="mb-2 size-4 text-[#f2c56d]" />
              <p className="text-xs font-semibold text-[#ffe8b8]">No password</p>
              <p className="mt-1 text-[11px] leading-4 text-[#a98d71]">Browser-linked demo</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] leading-5 text-[#8f765f]">
          Your profile is private to this anonymous session.
        </p>
      </section>
    </main>
  )
}
