import Link from 'next/link'
import { Camera, ScanLine } from 'lucide-react'

export function ScanButton() {
  return (
    <Link
      href="/recognition"
      className="group relative -mt-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F3DFC0]/25 bg-[#D6A84B] text-[#171004] shadow-[0_8px_24px_rgba(214,168,75,0.24)] transition-transform duration-200 active:scale-95"
      aria-label="Scan monument"
    >
      <ScanLine className="relative z-10 h-6 w-6" />
      <Camera className="absolute bottom-2 right-2 z-10 h-3.5 w-3.5" />
    </Link>
  )
}
