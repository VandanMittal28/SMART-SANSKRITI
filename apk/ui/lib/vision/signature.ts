/**
 * Temporal analysis of the activity region: what the motion is *doing*, not
 * just that it exists.
 *
 * This is the part that makes the detector specific. A vision model shown one
 * still frame has to guess from pose alone, and a raised arm looks much the
 * same whether someone is pointing at a carving or scratching it. Motion over
 * several seconds separates them, because the acts have different shapes:
 *
 *   - marking a surface   stays anchored in one small place for seconds
 *   - walking past        drifts steadily across the frame and leaves
 *   - an altercation      covers a large area and reverses direction often
 *   - dropping litter     moves downward, then stops
 *
 * The signature is handed to the vision model as context, and is also used to
 * raise the confidence bar for categories the motion contradicts. It raises
 * the bar rather than excluding outright: a false negative on monument damage
 * is worse than one extra frame sent for a second look.
 *
 * Pure: the caller supplies `now`. No DOM, no timers.
 */

import type { Blob } from './blobs.ts'
import { blobHeight, blobWidth } from './blobs.ts'
import type { HeritageWatchCategory } from './taxonomy.ts'

export interface MotionSignature {
  /** Frames contributing to the current track. */
  samples: number
  /** How long the activity has persisted, in milliseconds. */
  sustainedMs: number
  /** Mean region size as a share of the frame, 0..1. */
  areaFraction: number
  /** Straight-line distance from first to latest centroid, in analysis pixels. */
  driftPixels: number
  /** Total distance travelled along the path, in analysis pixels. */
  pathPixels: number
  /** Net downward movement, in analysis pixels. Negative means upward. */
  verticalDriftPixels: number
  /** Stayed in one place: the signature of working on a surface. */
  anchored: boolean
  /** Moved steadily in one direction: someone passing through. */
  traversing: boolean
  /** Large and frequently reversing: a struggle rather than a task. */
  erratic: boolean
  /** Moved downward then settled: something released. */
  descending: boolean
}

export const EMPTY_SIGNATURE: MotionSignature = {
  samples: 0,
  sustainedMs: 0,
  areaFraction: 0,
  driftPixels: 0,
  pathPixels: 0,
  verticalDriftPixels: 0,
  anchored: false,
  traversing: false,
  erratic: false,
  descending: false,
}

interface Sample {
  x: number
  y: number
  area: number
  at: number
}

export interface TrackerOptions {
  /**
   * How far a region's centroid may jump between frames and still count as the
   * same activity, as a multiple of the region's own size. Generous, because
   * sampling is only ~2 Hz.
   */
  continuityFactor: number
  /** Samples older than this leave the track. */
  windowMs: number
  /** Drift under this share of the region's size counts as staying put. */
  anchoredDriftFactor: number
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = {
  continuityFactor: 1.5,
  windowMs: 12_000,
  anchoredDriftFactor: 0.9,
}

/**
 * Follows the dominant activity region across frames and summarises it.
 */
export class ActivityTracker {
  private samples: Sample[] = []
  private lastSize = 1
  private readonly options: TrackerOptions

  constructor(options: TrackerOptions = DEFAULT_TRACKER_OPTIONS) {
    this.options = options
  }

  /**
   * Feeds the frame's dominant region, or null when nothing moved. Returns the
   * signature of the activity tracked so far.
   */
  push(blob: Blob | null, frameWidth: number, frameHeight: number, now: number): MotionSignature {
    if (!blob) {
      // Losing the region for one frame does not end the activity; letting the
      // window expire does.
      this.expire(now)
      return this.summarise(frameWidth, frameHeight, now)
    }

    const size = Math.max(blobWidth(blob), blobHeight(blob), 1)
    const previous = this.samples[this.samples.length - 1]

    if (previous) {
      const jump = Math.hypot(blob.centroidX - previous.x, blob.centroidY - previous.y)
      // A jump far larger than the region itself is a different activity, so
      // the track restarts rather than reporting a fictitious long path.
      if (jump > size * this.options.continuityFactor) this.samples = []
    }

    this.lastSize = size
    this.samples.push({ x: blob.centroidX, y: blob.centroidY, area: blob.area, at: now })
    this.expire(now)
    return this.summarise(frameWidth, frameHeight, now)
  }

  reset() {
    this.samples = []
    this.lastSize = 1
  }

  private expire(now: number) {
    this.samples = this.samples.filter(sample => now - sample.at <= this.options.windowMs)
  }

  private summarise(frameWidth: number, frameHeight: number, now: number): MotionSignature {
    const samples = this.samples
    if (samples.length === 0) return { ...EMPTY_SIGNATURE }

    const first = samples[0]
    const last = samples[samples.length - 1]
    const frameArea = Math.max(1, frameWidth * frameHeight)

    let pathPixels = 0
    let reversals = 0
    let previousDx = 0
    for (let index = 1; index < samples.length; index += 1) {
      const dx = samples[index].x - samples[index - 1].x
      const dy = samples[index].y - samples[index - 1].y
      pathPixels += Math.hypot(dx, dy)
      if (previousDx !== 0 && Math.sign(dx) !== 0 && Math.sign(dx) !== Math.sign(previousDx)) {
        reversals += 1
      }
      if (dx !== 0) previousDx = dx
    }

    const driftPixels = Math.hypot(last.x - first.x, last.y - first.y)
    const verticalDriftPixels = last.y - first.y
    const areaFraction =
      samples.reduce((sum, sample) => sum + sample.area, 0) / samples.length / frameArea
    const sustainedMs = Math.max(0, last.at - first.at)
    const size = Math.max(this.lastSize, 1)

    const anchored =
      samples.length >= 3 && driftPixels <= size * this.options.anchoredDriftFactor

    // Moving in a consistent direction: path barely longer than the net drift.
    const traversing =
      samples.length >= 3 && driftPixels > size && pathPixels <= driftPixels * 1.6

    // Covering ground without getting anywhere, over a large area.
    const erratic =
      samples.length >= 4 &&
      areaFraction >= 0.06 &&
      pathPixels > driftPixels * 2.2 &&
      reversals >= 2

    const descending =
      samples.length >= 3 &&
      verticalDriftPixels > size * 0.6 &&
      Math.abs(last.x - first.x) < Math.abs(verticalDriftPixels)

    return {
      samples: samples.length,
      sustainedMs,
      areaFraction,
      driftPixels,
      pathPixels,
      verticalDriftPixels,
      anchored,
      traversing,
      erratic,
      descending,
    }
  }
}

/** One plain sentence describing the motion, handed to the vision model. */
export function describeSignature(signature: MotionSignature): string {
  if (signature.samples === 0) return 'No sustained movement was tracked in this view.'

  const seconds = (signature.sustainedMs / 1000).toFixed(1)
  const size = (signature.areaFraction * 100).toFixed(0)
  const shape = signature.anchored
    ? 'has stayed in one place'
    : signature.erratic
      ? 'has moved back and forth repeatedly over a wide area'
      : signature.traversing
        ? 'has moved steadily in one direction across the view'
        : signature.descending
          ? 'has moved downward and settled'
          : 'has shifted around without a clear direction'

  return `Over the last ${seconds}s, a moving region covering about ${size}% of the view ${shape}.`
}

/**
 * How much to raise a category's confidence bar when the tracked motion does
 * not match how that act looks. Returns 0 when the motion is consistent, or
 * when the category is not motion-defined.
 */
export function confidencePenalty(
  category: HeritageWatchCategory,
  signature: MotionSignature,
): number {
  // Without a usable track there is nothing to contradict, so judge on the
  // image alone rather than penalising blindly.
  if (signature.samples < 3) return 0

  switch (category) {
    case 'surface_marking':
      // Marking a wall keeps the hand in one place. Someone crossing the view
      // is the classic false positive here.
      if (signature.traversing) return 0.25
      return signature.anchored ? 0 : 0.1

    case 'climbing_on_structure':
      // Climbing is sustained contact, not a walk-through.
      if (signature.traversing) return 0.2
      return 0

    case 'restricted_area_entry':
      // Crossing a boundary is movement; a stationary person is not entering.
      return signature.anchored ? 0.2 : 0

    case 'physical_altercation':
      // The most harmful false positive in the set, so it must look like a
      // struggle: wide, reversing movement rather than a passing embrace.
      if (signature.erratic) return 0
      if (signature.traversing || signature.anchored) return 0.25
      return 0.15

    case 'littering':
      return signature.descending ? 0 : 0.15

    case 'fire_or_smoking':
      // Visual, not motion-defined: flame and smoke read from the image.
      return 0

    default:
      return 0
  }
}
