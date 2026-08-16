'use client'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { AppCard } from '@/components/mobile/app-card'
import { MapView } from '@/components/mobile/map-view'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/authContext'
import { useUser } from '@/lib/userContext'
import { useLang } from '@/lib/languageContext'
import { Sparkles, Camera, Route, Trophy, ArrowRight, Ticket } from 'lucide-react'


const nearbyMonuments = [
  { name: 'Taj Mahal', location: 'Agra', badge: 'Trending' },
  { name: 'Qutub Minar', location: 'Delhi', badge: 'Nearby' },
  { name: 'Red Fort', location: 'Delhi', badge: 'Story Mode' },
]

const festivals = [
  { name: 'Diwali Walks', date: '18 Oct', note: 'Light trails + heritage nights' },
  { name: 'Holi at the Fort', date: '03 Mar', note: 'Color, music, and local food' },
  { name: 'Monsoon Museums', date: '12 Jul', note: 'Indoor tours and audio guides' },
]

const learningQueue = [
  { title: 'Mughal architecture basics', progress: 72 },
  { title: 'UNESCO landmarks in India', progress: 46 },
  { title: 'Monument quiz streak', progress: 88 },
]

export default function HomePage() {
  const { profile } = useAuth()
  const { userType, userConfig, setUserType } = useUser()
  const { t } = useLang()

  return (
    <AppShell>
      <div className="flex flex-col gap-4 px-4 py-4 animate-fade-in">
        <AppCard className="hero-grid overflow-hidden p-0">
          <div className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#C9A84C]">{t('good_evening')}</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#F5E6D3]">{profile?.username ? `@${profile.username}` : profile?.full_name || t('explorer')}</h2>
                <p className="mt-1 text-sm text-[#D9C7AA]">{userConfig?.subtitle || t('hero_caption_default')}</p>
              </div>
              <div className="rounded-[20px] border border-[#C9A84C]/18 bg-black/20 px-3 py-2 text-right backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#A89A7D]">XP</p>
                <p className="text-xl font-semibold text-[#F7D88C]">{profile?.total_xp ?? 0}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/12 px-3 py-1 text-xs font-semibold text-[#F7D88C]" onClick={() => setUserType(userType === 'student' ? 'tourist' : 'student')}>
                {userType === 'student' ? t('student_mode') : t('tourist_mode')}
              </button>
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#D9C7AA]">
                {t('offline_ready')}
              </button>
            </div>
          </div>
        </AppCard>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: t('nav_scan'), href: '/recognition', icon: Camera },
            { label: t('nav_explore'), href: '/explore', icon: Route },
            { label: t('nav_tickets'), href: '/tickets', icon: Ticket },
            { label: t('nav_hunt'), href: '/hunt', icon: Trophy },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="app-card flex flex-col items-start gap-3 rounded-[20px] p-3 transition-transform active:scale-95">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C9A84C]/12 text-[#F7D88C]"><item.icon className="h-4 w-4" /></span>
              <span className="text-sm font-semibold text-[#F5E6D3]">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F5E6D3]">{t('quick_actions')}</h2>
          <Link href="/profile" className="text-sm text-[#F7D88C]">{t('view_profile')}</Link>
        </div>

        <div className="grid gap-3">
          <Link href="/recognition" className="app-card flex items-center justify-between rounded-[22px] p-4 transition-transform active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9A84C]/12 text-[#F7D88C]"><Camera className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-[#F5E6D3]">{t('scan_monument')}</p>
                <p className="text-sm text-[#C4A882]">{t('scan_monument_desc')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#C9A84C]" />
          </Link>

          <Link href="/explore" className="app-card flex items-center justify-between rounded-[22px] p-4 transition-transform active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4B9B8E]/12 text-[#7EE4D4]"><Route className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-[#F5E6D3]">{t('explore_title')}</p>
                <p className="text-sm text-[#C4A882]">{t('explore_desc')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#C9A84C]" />
          </Link>

          <Link href="/hunt" className="app-card flex items-center justify-between rounded-[22px] p-4 transition-transform active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#534AB7]/15 text-[#AFA7FF]"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-[#F5E6D3]">{t('start_hunt')}</p>
                <p className="text-sm text-[#C4A882]">{t('start_hunt_desc')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#C9A84C]" />
          </Link>

          <Link href="/tickets" className="app-card flex items-center justify-between rounded-[22px] p-4 transition-transform active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4893F]/15 text-[#F7B978]"><Ticket className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-[#F5E6D3]">{t('book_monument_tickets')}</p>
                <p className="text-sm text-[#C4A882]">{t('book_monument_tickets_desc')}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#C9A84C]" />
          </Link>
        </div>

        <MapView
          title={t('plan_itinerary')}
          subtitle={t('plan_itinerary_desc')}
          action={
            <Button asChild size="sm" className="rounded-full bg-[#C9A84C] px-3 text-[#0E0916]">
              <Link href="/explore">{t('explore_now')}</Link>
            </Button>
          }
        >
          <div className="grid grid-cols-3 gap-2">
            {nearbyMonuments.map((item) => (
              <div key={item.name} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-[#F5E6D3]">{item.name}</p>
                <p className="text-xs text-[#C4A882]">{item.location}</p>
                <span className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[10px] text-[#F7D88C]">{item.badge}</span>
              </div>
            ))}
          </div>
        </MapView>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F5E6D3]">{t('festivals_title')}</h2>
            <Link href="/festivals" className="text-sm text-[#F7D88C]">{t('calendar_link')}</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 app-scroll-row">
            {festivals.map((item) => (
              <div key={item.name} className="app-card min-w-[200px] rounded-[22px] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8C7B63]">{item.date}</p>
                <h3 className="mt-1 text-base font-semibold text-[#F5E6D3]">{item.name}</h3>
                <p className="mt-2 text-sm text-[#C4A882]">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 safe-bottom-space">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F5E6D3]">{t('continue_learning')}</h2>
            <Link href="/quiz" className="text-sm text-[#F7D88C]">{t('quiz_link')}</Link>
          </div>
          <div className="space-y-3">
            {learningQueue.map((item) => (
              <div key={item.title} className="app-card rounded-[20px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-medium text-[#F5E6D3]">{item.title}</p>
                  <span className="text-xs text-[#C4A882]">{item.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-[linear-gradient(135deg,#C9A84C,#D4893F)]" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  )
}
