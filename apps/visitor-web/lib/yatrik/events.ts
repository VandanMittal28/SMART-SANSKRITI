import type { YatrikEvent, YatrikEventInput, YatrikEventType, YatrikState } from '@/lib/yatrik/types'

type YatrikListener = (event: YatrikEvent) => void

const listeners = new Set<YatrikListener>()

const stateForEvent: Record<YatrikEventType, YatrikState> = {
  welcome: 'talking',
  'xp-awarded': 'celebrating',
  'badge-unlocked': 'celebrating',
  'scan-result': 'pointing',
  'quiz-outcome': 'celebrating',
  'hunt-prompt': 'pointing',
  'route-prompt': 'pointing',
  'arrival-story': 'talking',
  'explore-complete': 'celebrating',
  custom: 'talking',
}

function createEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `yatrik-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function emitYatrikEvent(input: YatrikEventInput): string {
  const event: YatrikEvent = {
    ...input,
    id: input.id ?? createEventId(),
    state: input.state ?? stateForEvent[input.type],
  }
  listeners.forEach((listener) => listener(event))
  return event.id
}

export function subscribeToYatrikEvents(listener: YatrikListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
