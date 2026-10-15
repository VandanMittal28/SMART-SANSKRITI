/**
 * Tier 1 of Heritage Watch: a free, on-device gate that decides whether a
 * frame is worth paying a vision-model call for.
 *
 * Running a VLM continuously is not an option — latency, cost and battery all
 * forbid it. Almost every frame from a walking visitor is either static or
 * camera panning, and neither is interesting. This module scores a heavily
 * downscaled grayscale frame and reports `localized activity`: a small part of
 * the frame changing hard while the rest stays put. Panning moves everything
 * at once and is rejected.
 *
 * The statistic is the *share of pixels in a cell that changed*, not the change
 * in the cell's mean brightness. That distinction decides whether the feature
 * works: measured against a hand moving on a monument wall, mean-brightness
 * deltas came out at 1-4 units — indistinguishable from sensor noise, because
 * averaging a small moving object across a whole cell dilutes it away. The same
 * footage moves 9-19% of a cell's pixels, which is unmistakable.
 *
 * Pure functions over plain typed arrays — no canvas, no DOM, so this is
 * directly unit-testable.
 */

/** Analysis grid. Small enough to be ~free, large enough to localize. */
export const MOTION_GRID_COLUMNS = 8
export const MOTION_GRID_ROWS = 6
export const MOTION_CELL_COUNT = MOTION_GRID_COLUMNS * MOTION_GRID_ROWS

/** Analysis resolution. 12x12 pixels per cell keeps the fraction stable. */
export const MOTION_WIDTH = MOTION_GRID_COLUMNS * 12
export const MOTION_HEIGHT = MOTION_GRID_ROWS * 12

export type GrayFrame = Uint8ClampedArray | Uint8Array | Float32Array | number[]

export interface MotionReading {
  /**
   * Per-pixel change mask at the analysis resolution: 1 where the pixel moved.
   * Blob extraction reads this to work out the *shape* of what moved, which is
   * what separates a hand working a wall from a visitor walking past.
   */
  changeMask: Uint8Array
  /** Share of each cell's pixels that changed, 0..1. */
  cellChangedFractions: number[]
  /** Cells whose changed-pixel share cleared the threshold. */
  activeCells: number
  /** activeCells as a share of all cells, 0..1. */
  activeCellRatio: number
  /** True when a small part of the frame changed hard — the shape we want. */
  localizedActivity: boolean
  /** True when most of the frame moved together, i.e. the phone itself moved. */
  cameraMotion: boolean
}

export interface MotionThresholds {
  /** Luminance change for a single pixel to count as changed, 0..255. */
  pixelDelta: number
  /** Share of a cell's pixels that must change for the cell to be active. */
  cellChangedFraction: number
  /** Active cells required for localized activity. One is a real action. */
  minimumActiveCells: number
  /** At or above this active ratio the frame is treated as camera motion. */
  cameraMotionRatio: number
}

export const DEFAULT_MOTION_THRESHOLDS: MotionThresholds = {
  pixelDelta: 20,
  cellChangedFraction: 0.1,
  minimumActiveCells: 1,
  cameraMotionRatio: 0.55,
}

/**
 * Compares two downscaled grayscale frames and classifies the kind of change.
 * Both frames must share the given dimensions.
 */
export function compareFrames(
  previous: GrayFrame,
  current: GrayFrame,
  width: number,
  height: number,
  thresholds: MotionThresholds = DEFAULT_MOTION_THRESHOLDS,
): MotionReading {
  const changed = new Array<number>(MOTION_CELL_COUNT).fill(0)
  const counts = new Array<number>(MOTION_CELL_COUNT).fill(0)
  const changeMask = new Uint8Array(Math.max(0, width * height))

  if (width > 0 && height > 0) {
    for (let y = 0; y < height; y += 1) {
      const row = Math.min(MOTION_GRID_ROWS - 1, Math.floor((y / height) * MOTION_GRID_ROWS))
      for (let x = 0; x < width; x += 1) {
        const column = Math.min(
          MOTION_GRID_COLUMNS - 1,
          Math.floor((x / width) * MOTION_GRID_COLUMNS),
        )
        const cell = row * MOTION_GRID_COLUMNS + column
        const pixel = y * width + x
        if (Math.abs((current[pixel] ?? 0) - (previous[pixel] ?? 0)) >= thresholds.pixelDelta) {
          changed[cell] += 1
          changeMask[pixel] = 1
        }
        counts[cell] += 1
      }
    }
  }

  const cellChangedFractions = changed.map((value, index) =>
    counts[index] > 0 ? value / counts[index] : 0,
  )
  const activeCells = cellChangedFractions.filter(
    fraction => fraction >= thresholds.cellChangedFraction,
  ).length
  const activeCellRatio = activeCells / MOTION_CELL_COUNT

  const cameraMotion = activeCellRatio >= thresholds.cameraMotionRatio
  const localizedActivity = !cameraMotion && activeCells >= thresholds.minimumActiveCells

  return { changeMask, cellChangedFractions, activeCells, activeCellRatio, localizedActivity, cameraMotion }
}

/**
 * Tracks consecutive readings so a single twitch cannot open the gate. The
 * caller feeds every sampled frame; `shouldInspect` goes true only when
 * localized activity has persisted and the rate limit allows another call.
 */
export class MotionGate {
  /** Consecutive localized-activity frames required to open the gate. */
  private readonly sustainedFramesRequired: number
  /** Minimum gap between vision-model calls, in milliseconds. */
  private readonly cooldownMs: number
  private readonly thresholds: MotionThresholds

  private previousFrame: GrayFrame | null = null
  private sustainedFrames = 0
  // "Never inspected", not "inspected at the epoch" — so the first frame is
  // eligible whatever clock origin the caller uses.
  private lastInspectionAt = Number.NEGATIVE_INFINITY

  constructor(
    sustainedFramesRequired = 3,
    cooldownMs = 8_000,
    thresholds: MotionThresholds = DEFAULT_MOTION_THRESHOLDS,
  ) {
    this.sustainedFramesRequired = sustainedFramesRequired
    this.cooldownMs = cooldownMs
    this.thresholds = thresholds
  }

  /** Feeds one frame. Returns the reading plus whether to escalate it. */
  push(
    frame: GrayFrame,
    width: number,
    height: number,
    now: number,
  ): MotionReading & { shouldInspect: boolean } {
    const previous = this.previousFrame
    this.previousFrame = frame

    if (!previous) {
      return {
        changeMask: new Uint8Array(Math.max(0, width * height)),
        cellChangedFractions: new Array<number>(MOTION_CELL_COUNT).fill(0),
        activeCells: 0,
        activeCellRatio: 0,
        localizedActivity: false,
        cameraMotion: false,
        shouldInspect: false,
      }
    }

    const reading = compareFrames(previous, frame, width, height, this.thresholds)
    // Camera motion resets the streak outright: while the phone is moving we
    // cannot tell a scene change from an action, so we wait for it to settle.
    this.sustainedFrames = reading.localizedActivity ? this.sustainedFrames + 1 : 0

    const cooledDown = now - this.lastInspectionAt >= this.cooldownMs
    const shouldInspect = this.sustainedFrames >= this.sustainedFramesRequired && cooledDown
    if (shouldInspect) {
      this.lastInspectionAt = now
      this.sustainedFrames = 0
    }

    return { ...reading, shouldInspect }
  }

  reset() {
    this.previousFrame = null
    this.sustainedFrames = 0
    this.lastInspectionAt = Number.NEGATIVE_INFINITY
  }
}
