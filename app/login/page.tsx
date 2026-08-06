'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, AtSign, Database, Landmark, Radio, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeUsername } from '@/lib/authClient'
import { useAuth } from '@/lib/authContext'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
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
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[#08070f] px-4 py-10 text-[#f9eed8] sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_10%,rgba(207,146,62,0.24),transparent_28%),radial-gradient(circle_at_82%_82%,rgba(83,74,183,0.22),transparent_32%),linear-gradient(145deg,#090a10_0%,#17100d_55%,#08090e_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(248,207,132,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(248,207,132,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />

      <section className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[#e9b85d]/25 bg-[#17120f]/80 shadow-[0_30px_100px_rgba(0,0,0,0.58)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden min-h-[560px] overflow-hidden border-r border-[#e9b85d]/15 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(207,146,62,0.3),transparent_52%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f1c56e]/30 bg-[#f1c56e]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f4cf86]">
              <Sparkles className="size-3.5" /> Your heritage identity
            </div>
            <h1 className="mt-8 max-w-md font-serif text-5xl leading-[1.05] text-[#fff1d3]">
              One username. Your whole journey.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-[#d4baa0]">
              Your discoveries, XP, badges, quizzes, and conversations stay synced with Supabase.
            </p>
          </div>

          <div className="relative grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <Database className="size-5 text-[#f2c56d]" />
              <div><p className="text-sm font-semibold text-[#ffe8b8]">Saved to database</p><p className="text-xs text-[#a98d71]">No local profile data</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <Radio className="size-5 text-[#7ecdc0]" />
              <div><p className="text-sm font-semibold text-[#d9fff7]">Realtime updates</p><p className="text-xs text-[#83a9a1]">Changes appear across open tabs</p></div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col justify-center px-6 py-10 sm:px-10">
          <div className="mb-9 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#f4c66f] to-[#ba6d2d] text-[#251407] shadow-[0_8px_30px_rgba(232,166,70,0.28)]">
              <Landmark className="size-6" />
            </div>
            <div>
              <p className="font-serif text-xl font-bold tracking-tight text-[#fff0ce]">Sanskriti AI</p>
              <p className="text-xs tracking-wide text-[#c7a886]">India, remembered beautifully</p>
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e9b85d]"><AtSign className="size-3.5" /> Explorer login</p>
          <h2 className="mt-2 font-serif text-3xl text-[#fff1d6]">What should we call you?</h2>
          <p className="mt-2 text-sm leading-6 text-[#cbb296]">Enter a unique username—no email or password needed.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-[#e7d0b0]" htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8f765f]" />
                <Input
                  autoCapitalize="none"
                  autoComplete="username"
                  className="h-12 border-[#e9b85d]/20 bg-black/25 pl-10 text-[#fff1d6] placeholder:text-[#7f6a57] focus-visible:ring-[#e9b85d]/30"
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
              <div className="flex min-h-5 items-center justify-between gap-3 text-xs">
                <span className="text-[#8f765f]">3–24 letters, numbers, or underscores</span>
                {normalizedUsername && <span className="font-semibold text-[#e9b85d]">@{normalizedUsername}</span>}
              </div>
            </div>

            {error && <p className="rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2.5 text-sm text-red-200" role="alert">{error}</p>}

            <Button className="h-12 w-full bg-gradient-to-r from-[#e0a044] to-[#f0c46e] text-[#261508] hover:brightness-110" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating your journey…' : 'Enter Sanskriti AI'}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-[#8f765f]">
            This passwordless demo identity stays linked to this browser session.
          </p>
        </div>
      </section>
    </main>
  )
}
