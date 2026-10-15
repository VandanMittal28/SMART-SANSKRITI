'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, AtSign, BadgeCheck, Cloud, UserRoundPlus, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SanskritiLogo from '@/components/SanskritiLogo'
import { normalizeUsername } from '@/lib/authClient'
import { useAuth } from '@/lib/authContext'
import { isBundledNativeApp } from '@/lib/supabase/client'
import { usesLocalProfiles } from '@/lib/nativePlatform'
import { LanguageSelect } from '@/components/language-select'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginPage() {
  const router = useRouter()
  const { availableProfiles, error: authError, signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [standaloneApp, setStandaloneApp] = useState(false)
  const normalizedUsername = normalizeUsername(username)

  useEffect(() => {
    setStandaloneApp(usesLocalProfiles())
  }, [])

  async function openProfile(profileUsername: string) {
    setError('')
    setIsSubmitting(true)

    try {
      await signIn(profileUsername)
      if (isBundledNativeApp()) {
        window.location.replace(new URL('/', window.location.href).toString())
        return
      }
      router.replace('/')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to start your session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await openProfile(username)
  }

  return (
    <main className="mobile-shell min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <section className="mobile-scroll flex min-h-dvh flex-col">
        {/* Hero. The photograph carries the first impression; everything above
            it is kept to a single row so the image is what you see first. */}
        <div className="relative h-[52dvh] min-h-[360px] w-full shrink-0 overflow-hidden">
          <Image
            src="/hero-monuments.png"
            alt=""
            fill
            priority
            sizes="420px"
            className="object-cover object-center"
          />
          {/* Two scrims rather than one: the top keeps the brand row legible
              over a bright sky, the bottom carries the image into the canvas. */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[rgba(14,16,11,0.62)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-b from-transparent via-[rgba(14,16,11,0.55)] to-[var(--background)]" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[22px] pt-[calc(env(safe-area-inset-top)+18px)]">
            <div className="flex items-center gap-2.5">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] shadow-[0_4px_14px_rgba(14,16,11,0.35)]">
                <SanskritiLogo size={44} className="h-full w-full object-cover" />
              </span>
              <span className="leading-none">
                <span className="block font-display text-[17px] font-semibold tracking-tight text-white">
                  Sanskriti <span className="text-[var(--primary)]">AI</span>
                </span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">
                  Living Heritage
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <LanguageSelect />
              <ThemeToggle className="size-10" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-[22px] pb-11">
            <p className="eyebrow text-white/85">Explorer login</p>
            <h1 className="mt-3 max-w-[19rem] font-display text-[2.15rem] font-semibold leading-[1.06] tracking-[-0.03em] text-white [text-shadow:0_2px_18px_rgba(14,16,11,0.45)]">
              Discover India&apos;s{' '}
              <span className="text-[var(--primary)]">living heritage</span>
            </h1>
          </div>
        </div>

        {/* The card lifts over the photograph so the two read as one surface. */}
        <div className="relative z-10 -mt-6 flex flex-1 flex-col gap-4 px-[22px] pb-[calc(28px+env(safe-area-inset-bottom))]">
          {usesLocalProfiles() && availableProfiles.length > 0 && (
            <section className="surface p-5" aria-labelledby="saved-profiles-title">
              <div className="mb-3.5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight" id="saved-profiles-title">
                    <UsersRound className="size-[18px] text-[var(--muted-foreground)]" />
                    Continue as
                  </h2>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--muted-foreground)]">
                    Each profile keeps its own progress.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted-foreground)]">
                  {availableProfiles.length} saved
                </span>
              </div>
              <div className="space-y-2">
                {availableProfiles.map((saved) => {
                  const displayName = saved.profile.full_name || saved.profile.username
                  const initials = displayName.slice(0, 2).toUpperCase()
                  return (
                    <button
                      className="flex w-full items-center gap-3 rounded-[20px] bg-[var(--muted)] p-3 text-left transition active:scale-[0.99] disabled:opacity-50"
                      disabled={isSubmitting}
                      key={saved.user.id}
                      onClick={() => void openProfile(saved.profile.username)}
                      type="button"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] font-display text-[13px] font-semibold text-[var(--primary-foreground)]">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold">{displayName}</span>
                        <span className="block truncate text-[11px] text-[var(--muted-foreground)]">
                          @{saved.profile.username} · {saved.profile.total_xp.toLocaleString()} XP
                        </span>
                      </span>
                      <ArrowRight className="size-[18px] shrink-0 text-[var(--muted-foreground)]" />
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <form className="surface p-5" onSubmit={handleSubmit}>
            <h2 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.025em]">
              {usesLocalProfiles() && availableProfiles.length > 0 ? (
                <span className="flex items-center gap-2">
                  <UserRoundPlus className="size-[18px] text-[var(--muted-foreground)]" />
                  Create another profile
                </span>
              ) : (
                <>What should we <span className="text-accent-word">call you?</span></>
              )}
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
              {standaloneApp
                ? 'Your XP, badges, chats and monument visits stay on this phone.'
                : 'Keeps your XP, badges, chats and monument visits synced.'}
            </p>

            <div className="mt-4 space-y-2.5">
              <Label className="sr-only" htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-[18px] top-1/2 size-[17px] -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  autoCapitalize="none"
                  autoComplete="username"
                  className="h-[58px] rounded-full border-0 bg-[var(--muted)] pl-12 text-[15px] text-[var(--foreground)] shadow-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
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
              <div className="flex min-h-7 flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
                <span className="text-[var(--muted-foreground)]">3–24 letters, numbers or underscores</span>
                {normalizedUsername && (
                  <span className="rounded-full bg-[var(--primary)]/15 px-2.5 py-1 font-bold text-[var(--foreground)]">
                    @{normalizedUsername}
                  </span>
                )}
              </div>
            </div>

            {(error || authError) && (
              <p className="mt-3 rounded-[18px] bg-[var(--destructive)]/10 px-4 py-3 text-[13px] leading-5 text-[var(--destructive)]" role="alert">
                {error || authError}
              </p>
            )}

            <Button className="btn-primary mt-4" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Opening profile…' : availableProfiles.length > 0 && standaloneApp ? 'Create profile' : 'Enter Sanskriti AI'}
              {!isSubmitting && <ArrowRight className="size-[18px]" />}
            </Button>
          </form>

          <div className="grid grid-cols-2 gap-3">
            <div className="surface p-4">
              <Cloud className="mb-2.5 size-[18px] text-[var(--muted-foreground)]" />
              <p className="text-[13px] font-bold">{standaloneApp ? 'Device saved' : 'Cloud saved'}</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--muted-foreground)]">
                {standaloneApp ? 'Works without a login' : 'Works across visits'}
              </p>
            </div>
            <div className="surface p-4">
              <BadgeCheck className="mb-2.5 size-[18px] text-[var(--muted-foreground)]" />
              <p className="text-[13px] font-bold">No password</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--muted-foreground)]">Browser-linked demo</p>
            </div>
          </div>

          <p className="mt-auto pt-2 text-center text-[11px] leading-5 text-[var(--muted-foreground)]">
            Each device profile keeps its own XP, badges, chats and journey history.
          </p>
        </div>
      </section>
    </main>
  )
}
