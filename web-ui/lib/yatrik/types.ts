export type YatrikState =
  | 'idle'
  | 'fly-in'
  | 'landing'
  | 'talking'
  | 'listening'
  | 'pointing'
  | 'celebrating'
  | 'muted'

export type YatrikEventType =
  | 'welcome'
  | 'xp-awarded'
  | 'badge-unlocked'
  | 'scan-result'
  | 'quiz-outcome'
  | 'hunt-prompt'
  | 'route-prompt'
  | 'arrival-story'
  | 'explore-complete'
  | 'custom'

export interface YatrikEvent {
  id: string
  type: YatrikEventType
  caption: string
  narration?: string | null
  priority: number
  state?: YatrikState
  durationMs?: number
}

export type YatrikEventInput = Omit<YatrikEvent, 'id'> & { id?: string }

export interface YatrikFrameGroup {
  frames: string[]
  fps: number
  loop: boolean
}

export interface YatrikAssetManifest {
  version: string
  width: number
  height: number
  states: Record<YatrikState, YatrikFrameGroup>
}
