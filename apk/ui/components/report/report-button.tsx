'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Camera } from 'lucide-react'
export function ReportButton(){ const pathname=usePathname(); if(pathname==='/report'||pathname.startsWith('/report/'))return null; const focused=pathname.startsWith('/explore')||pathname.startsWith('/hunt'); return <Link href="/report" onClick={()=>{try{sessionStorage.setItem('sanskriti-report-return',pathname)}catch{}}} aria-label="Report an issue" className={`fixed right-3 ${focused?'top-[calc(env(safe-area-inset-top)+72px)]':'bottom-[calc(env(safe-area-inset-bottom)+88px)]'} z-[90] flex items-center gap-2 rounded-full border border-[#e8be69]/50 bg-[#152333] px-3 py-2 text-xs font-bold text-[#f5d18e] shadow-xl`}><Camera className="size-4"/>Report issue</Link> }
