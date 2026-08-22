import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type BottomSheetProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, title, subtitle, onClose, children }: BottomSheetProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close sheet backdrop"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[420px] rounded-t-[28px] border border-white/10 bg-[#09101F]/96 px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_rgba(0,0,0,0.45)] transition-transform duration-300 ${open ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/20" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#F5E6D3]">{title}</h3>
            {subtitle ? <p className="text-sm text-[#C4A882]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-[#F5E6D3]"
            aria-label="Close sheet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}