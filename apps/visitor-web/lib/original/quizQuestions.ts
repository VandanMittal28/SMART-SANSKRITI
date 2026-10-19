// resolveQuizMonumentId copied unchanged from apk/ui/lib/quizQuestions.ts.
// Only the quiz bank's monument ids are needed to resolve an id, so the
// questions themselves are not copied (the quiz isn't part of this website).

const QUIZ_BANK: Record<string, true> = Object.fromEntries(
  ['taj-mahal', 'red-fort', 'qutub-minar', 'gateway-india', 'hampi', 'golden-temple', 'kedarnath', 'meenakshi', 'mysore-palace', 'hawa-mahal', 'charminar', 'victoria-memorial', 'ajanta', 'konark', 'india-gate'].map((id) => [id, true]),
)

const QUIZ_ALIASES: Record<string, string> = {
  'gateway-of-india': 'gateway-india',
  'golden-temple-amritsar': 'golden-temple',
  'hampi-chariot': 'hampi',
  'stone-chariot': 'hampi',
  'stone-chariot-hampi': 'hampi',
  'vittala-temple': 'hampi',
  'vittala-temple-hampi': 'hampi',
  'kedarnath-temple': 'kedarnath',
  'meenakshi-amman-temple': 'meenakshi',
  'meenakshi-temple': 'meenakshi',
  'mysuru-palace': 'mysore-palace',
  'hawa-mahal-jaipur': 'hawa-mahal',
  'charminar-hyderabad': 'charminar',
  'victoria-memorial-kolkata': 'victoria-memorial',
  'konark-sun-temple': 'konark',
  'india-gate-delhi': 'india-gate',
}

export function resolveQuizMonumentId(monumentId: string) {
  const normalized = monumentId
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const usableId = /[a-z0-9]/.test(normalized) ? normalized : ''
  if (usableId in QUIZ_BANK) return usableId
  if (usableId in QUIZ_ALIASES) return QUIZ_ALIASES[usableId]

  const partialMatch = usableId
    ? Object.keys(QUIZ_BANK).find(
    (id) => usableId.includes(id) || id.includes(usableId),
      )
    : undefined

  return partialMatch || usableId || 'taj-mahal'
}
