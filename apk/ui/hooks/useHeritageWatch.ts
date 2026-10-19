'use client'

/**
 * Heritage Watch — opt-in ambient monitoring on the Explore camera.
 *
 * Explore already holds the camera up to the monument during AR navigation.
 * This hook borrows that existing stream to notice acts of damage, and routes
 * what it finds into the monument operations console for a human to confirm.
 *
 * Pipeline (each tier exists to make the next one affordable or trustworthy):
 *   1. `MotionGate`        — free, on-device; discards static frames and panning
 *   2. `extractBlobs`      — groups the changed pixels into activity regions
 *   3. `ActivityTracker`   — what that region has been *doing* over seconds
 *   4. `assessScene`       — one NVIDIA vision call on the keyframe, a crop of
 *                            the moving region, and the measured motion
 *   5. `CorroborationBuffer` — repeat observations, with the bar raised for
 *                            categories the motion contradicts
 *   6. `submitDetection`   — files it for human review; never dispatches staff
 *
 * Nothing leaves the device until tier 3 is satisfied: a single frame is never
 * uploaded on its own, and no video is ever recorded or streamed.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { FrameSampler } from '@/lib/vision/frame'
import { MOTION_HEIGHT, MOTION_WIDTH, MotionGate } from '@/lib/vision/motion'
import { dominantBlob, extractBlobs, type Blob } from '@/lib/vision/blobs'
import {
  ActivityTracker,
  EMPTY_SIGNATURE,
  confidencePenalty,
  describeSignature,
  type MotionSignature,
} from '@/lib/vision/signature'
import { CorroborationBuffer, type RaisedIncident } from '@/lib/vision/corroboration'
import { assessScene } from '@/lib/vision/classifier'
import { submitDetection, type SubmissionContext, type SubmissionReceipt } from '@/lib/vision/submission'
import { isMmsSite } from '@/lib/visitorApi'
import { HERITAGE_WATCH_BY_ID, isHeritageWatchCategory, type HeritageWatchCategory } from '@/lib/vision/taxonomy'

/** Motion sampling cadence. 2 Hz is ample for human-scale actions. */
const SAMPLE_INTERVAL_MS = 500

export type HeritageWatchPhase =
  | 'off'
  /** Turned on, but Explore has not handed over a camera stream yet. */
  | 'awaiting-camera'
  | 'starting'
  | 'watching'
  | 'inspecting'
  | 'corroborating'
  | 'submitting'
  | 'unavailable'

export interface HeritageWatchStatus {
  phase: HeritageWatchPhase
  /** Categories with evidence accumulating but not yet enough to report. */
  pending: Partial<Record<HeritageWatchCategory, number>>
  /** Detections filed in this session, newest first. */
  receipts: SubmissionReceipt[]
  /** Vision calls made this session — surfaced so the cost stays visible. */
  inspections: number
  lastMessage: string
  error: string | null
}

interface Options {
  enabled: boolean
  stream: MediaStream | null
  context: SubmissionContext
}

const EMPTY_STATUS: HeritageWatchStatus = {
  phase: 'off',
  pending: {},
  receipts: [],
  inspections: 0,
  lastMessage: '',
  error: null,
}

export function useHeritageWatch({ enabled, stream, context }: Options) {
  const [status, setStatus] = useState<HeritageWatchStatus>(EMPTY_STATUS)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const samplerRef = useRef<FrameSampler | null>(null)
  const gateRef = useRef<MotionGate | null>(null)
  const trackerRef = useRef<ActivityTracker | null>(null)
  const bufferRef = useRef<CorroborationBuffer | null>(null)
  // The region and signature that opened the gate, captured at sample time so
  // the inspection describes the motion that actually triggered it.
  const pendingRegionRef = useRef<Blob | null>(null)
  const signatureRef = useRef<MotionSignature>(EMPTY_SIGNATURE)
  const inspectingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const activeRef = useRef(false)

  // Context changes every render (new object literal from the caller), so it
  // is held in a ref rather than a dependency — otherwise the sampling loop
  // would tear down and restart on every parent render.
  const contextRef = useRef(context)
  contextRef.current = context

  const patch = useCallback((update: Partial<HeritageWatchStatus>) => {
    setStatus(previous => ({ ...previous, ...update }))
  }, [])

  const fileIncident = useCallback(async (incident: RaisedIncident, keyframe: string) => {
    const definition = HERITAGE_WATCH_BY_ID[incident.category]
    patch({ phase: 'submitting', lastMessage: `Filing ${definition.label.toLowerCase()} for review…` })
    try {
      const receipt = await submitDetection(incident, {
        ...contextRef.current,
        keyframeBase64: keyframe,
      })
      setStatus(previous => ({
        ...previous,
        phase: activeRef.current ? 'watching' : 'off',
        receipts: [receipt, ...previous.receipts].slice(0, 10),
        lastMessage: `${definition.label} sent for staff review.`,
        error: null,
      }))
    } catch (error) {
      patch({
        phase: activeRef.current ? 'watching' : 'off',
        error: error instanceof Error ? error.message : 'Could not reach the operations console.',
        lastMessage: 'Detection could not be filed.',
      })
    }
  }, [patch])

  const inspect = useCallback(async () => {
    const video = videoRef.current
    const sampler = samplerRef.current
    const buffer = bufferRef.current
    if (!video || !sampler || !buffer || inspectingRef.current) return

    const keyframe = sampler.captureKeyframe(video)
    if (!keyframe) return

    const region = pendingRegionRef.current
    const signature = signatureRef.current
    const regionCrop = region
      ? sampler.captureRegion(video, region, MOTION_WIDTH, MOTION_HEIGHT)
      : null

    inspectingRef.current = true
    abortRef.current = new AbortController()
    patch({ phase: 'inspecting', lastMessage: 'Checking what the camera is seeing…' })

    try {
      const assessment = await assessScene(
        { imageBase64: keyframe, regionBase64: regionCrop, motionContext: describeSignature(signature) },
        abortRef.current.signal,
      )
      setStatus(previous => ({ ...previous, inspections: previous.inspections + 1 }))

      const incident = buffer.push({
        verdict: assessment.verdict,
        confidence: assessment.confidence,
        at: Date.now(),
        rationale: assessment.rationale,
        penalty: isHeritageWatchCategory(assessment.verdict)
          ? confidencePenalty(assessment.verdict, signature)
          : 0,
      })

      if (incident) {
        await fileIncident(incident, keyframe)
        return
      }

      const pending = buffer.pendingCounts(Date.now())
      const hasPending = Object.keys(pending).length > 0
      patch({
        phase: activeRef.current ? (hasPending ? 'corroborating' : 'watching') : 'off',
        pending,
        // An unreadable reply is not a clean frame; it means this check told
        // us nothing, and that should be visible rather than look like calm.
        error: assessment.understood ? null : assessment.rationale,
        lastMessage: hasPending
          ? 'Possible activity seen once. Waiting for a second look before reporting.'
          : assessment.understood
            ? 'Nothing of concern seen.'
            : 'That camera check could not be read.',
      })
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      patch({
        phase: activeRef.current ? 'watching' : 'off',
        error: error instanceof Error ? error.message : 'Scene check failed.',
        lastMessage: 'Scene check could not complete.',
      })
    } finally {
      inspectingRef.current = false
      abortRef.current = null
    }
  }, [fileIncident, patch])

  useEffect(() => {
    if (!enabled || !stream) {
      activeRef.current = false
      abortRef.current?.abort()
      videoRef.current?.pause()
      videoRef.current = null
      samplerRef.current?.dispose()
      samplerRef.current = null
      gateRef.current = null
      trackerRef.current = null
      bufferRef.current = null
      pendingRegionRef.current = null
      signatureRef.current = EMPTY_SIGNATURE
      inspectingRef.current = false
      // Turned on with no stream yet is not the same as turned off, and
      // saying "off" there reads as a fault the visitor cannot act on.
      setStatus(previous => ({
        ...EMPTY_STATUS,
        receipts: previous.receipts,
        phase: enabled ? 'awaiting-camera' : 'off',
        lastMessage: enabled ? 'Waiting for the camera to open.' : '',
      }))
      return
    }

    // Only the four staffed sites have an operations team to receive a
    // detection. Watching anywhere else would spend vision calls producing
    // reports with nowhere to go, so say so instead of appearing to work.
    if (!isMmsSite(contextRef.current.monumentId)) {
      activeRef.current = false
      setStatus(previous => ({
        ...EMPTY_STATUS,
        receipts: previous.receipts,
        phase: 'unavailable',
        lastMessage: `${contextRef.current.monumentName} has no monument operations team connected yet.`,
      }))
      return
    }

    activeRef.current = true
    patch({ phase: 'starting', lastMessage: 'Starting Heritage Watch…', error: null })

    // A detached <video> decodes the shared stream without disturbing the
    // element the AR HUD renders; a MediaStream can back several elements.
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    videoRef.current = video
    samplerRef.current = new FrameSampler()
    gateRef.current = new MotionGate()
    trackerRef.current = new ActivityTracker()
    bufferRef.current = new CorroborationBuffer()
    signatureRef.current = EMPTY_SIGNATURE
    pendingRegionRef.current = null

    let timer: number | undefined
    let cancelled = false

    void video.play().then(() => {
      if (cancelled) return
      patch({ phase: 'watching', lastMessage: 'Watching for damage to the monument.' })
      timer = window.setInterval(() => {
        const sampler = samplerRef.current
        const gate = gateRef.current
        if (!sampler || !gate || inspectingRef.current) return
        const frame = sampler.sampleGrayFrame(video)
        if (!frame) return
        const now = Date.now()
        const reading = gate.push(frame, MOTION_WIDTH, MOTION_HEIGHT, now)

        // Panning tells us nothing about activity, so it must not pollute the
        // track with a long fictitious path.
        const blobs = reading.cameraMotion
          ? []
          : extractBlobs(reading.changeMask, MOTION_WIDTH, MOTION_HEIGHT)
        const region = dominantBlob(blobs)
        const tracker = trackerRef.current
        if (tracker) {
          signatureRef.current = tracker.push(region, MOTION_WIDTH, MOTION_HEIGHT, now)
        }
        if (region) pendingRegionRef.current = region

        if (reading.shouldInspect) void inspect()
      }, SAMPLE_INTERVAL_MS)
    }).catch(() => {
      if (!cancelled) {
        patch({ phase: 'unavailable', error: 'The camera stream could not be read on this device.' })
      }
    })

    return () => {
      cancelled = true
      activeRef.current = false
      if (timer !== undefined) window.clearInterval(timer)
      abortRef.current?.abort()
      video.pause()
      video.srcObject = null
      samplerRef.current?.dispose()
      samplerRef.current = null
      gateRef.current = null
      trackerRef.current = null
      bufferRef.current = null
      pendingRegionRef.current = null
      inspectingRef.current = false
    }
  }, [enabled, stream, inspect, patch])

  const clearError = useCallback(() => {
    setStatus(previous => (previous.error === null ? previous : { ...previous, error: null }))
  }, [])

  return { ...status, clearError }
}
