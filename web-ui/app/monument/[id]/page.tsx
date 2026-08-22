import MonumentPageClient from './monument-page-client'

const MONUMENT_IDS = [
  'taj-mahal',
  'red-fort',
  'qutub-minar',
  'gateway-india',
  'hampi',
  'golden-temple',
  'kedarnath',
  'meenakshi',
  'mysore-palace',
  'hawa-mahal',
  'charminar',
  'victoria-memorial',
  'ajanta',
  'konark',
  'india-gate',
] as const

export function generateStaticParams() {
  return MONUMENT_IDS.map((id) => ({ id }))
}

export default function MonumentPage() {
  return <MonumentPageClient />
}
