import Link from 'next/link'
import { Camera, ScanLine } from 'lucide-react'

export function ScanButton() {
  return (
    <Link
      href="/recognition"
      className="group relative -mt-8 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#F2D98C]/35 bg-[linear-gradient(135deg,#E1B85A,#D4893F)] text-[#1A0F00] shadow-[0_18px_36px_rgba(212,137,63,0.35)] transition-transform duration-300 active:scale-95"
      aria-label="Scan monument"
    >
      <span className="absolute inset-0 rounded-[22px] border border-white/20 opacity-50 blur-[1px]" />
      <span className="absolute -inset-2 rounded-[26px] bg-[#C9A84C]/15 blur-md transition-opacity group-active:opacity-100" />
      <ScanLine className="relative z-10 h-6 w-6" />
      <Camera className="absolute bottom-2 right-2 z-10 h-3.5 w-3.5" />
    </Link>
  )
}