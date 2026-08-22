import type { ReactNode } from 'react'
import { MapPinned } from 'lucide-react'

type MapViewProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  children?: ReactNode
}

export function MapView({ title, subtitle, action, children }: MapViewProps) {
  return (
    <section className="app-card overflow-hidden rounded-[24px]">
      <div className="relative h-56 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.18),transparent_35%),linear-gradient(180deg,#111A33_0%,#0A1022_100%)]">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-medium text-[#F5E6D3] backdrop-blur-md">
          Live map preview
        </div>
        <div className="absolute bottom-0 left-0 right-0 space-y-3 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#C9A84C]">{title}</p>
              {subtitle ? <p className="mt-1 text-sm text-[#D9C7AA]">{subtitle}</p> : null}
            </div>
            {action}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-[#F5E6D3] backdrop-blur-md">
            <MapPinned className="h-4 w-4 text-[#C9A84C]" />
            <span>Nearby places, route hints, and demo movement live here.</span>
          </div>
        </div>
      </div>
      {children ? <div className="p-4">{children}</div> : null}
    </section>
  )
}