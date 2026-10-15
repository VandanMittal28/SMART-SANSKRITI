/**
 * Canvas plumbing for Heritage Watch: pulls frames off the Explore camera
 * stream at two very different resolutions.
 *
 *  - The motion gate needs a tiny grayscale grid, sampled often and cheaply.
 *  - The vision model needs one readable JPEG, sampled rarely.
 *
 * Both reuse a single pair of canvases, because allocating one per frame on a
 * mid-range Android WebView is the difference between a smooth AR view and a
 * stuttering one.
 */

import { MOTION_HEIGHT, MOTION_WIDTH } from './motion.ts'

/** Long edge of the keyframe sent to the model. */
const KEYFRAME_LONG_EDGE = 768
/** Long edge of the activity crop. Smaller than the keyframe but far closer. */
const REGION_LONG_EDGE = 448
const KEYFRAME_QUALITY = 0.72

export class FrameSampler {
  private motionCanvas: HTMLCanvasElement | null = null
  private keyframeCanvas: HTMLCanvasElement | null = null
  private regionCanvas: HTMLCanvasElement | null = null

  private canvas(which: 'motion' | 'keyframe' | 'region', width: number, height: number) {
    const existing = which === 'motion'
      ? this.motionCanvas
      : which === 'keyframe' ? this.keyframeCanvas : this.regionCanvas
    const canvas = existing ?? document.createElement('canvas')
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    if (which === 'motion') this.motionCanvas = canvas
    else if (which === 'keyframe') this.keyframeCanvas = canvas
    else this.regionCanvas = canvas
    return canvas
  }

  /** Downscaled grayscale frame for the motion gate, or null if not ready. */
  sampleGrayFrame(video: HTMLVideoElement): Uint8ClampedArray | null {
    if (!video.videoWidth || !video.videoHeight) return null
    const canvas = this.canvas('motion', MOTION_WIDTH, MOTION_HEIGHT)
    // `willReadFrequently` keeps the surface in software memory; without it
    // every getImageData round-trips the GPU and dominates the frame budget.
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    context.drawImage(video, 0, 0, MOTION_WIDTH, MOTION_HEIGHT)
    const { data } = context.getImageData(0, 0, MOTION_WIDTH, MOTION_HEIGHT)

    const gray = new Uint8ClampedArray(MOTION_WIDTH * MOTION_HEIGHT)
    for (let pixel = 0; pixel < gray.length; pixel += 1) {
      const offset = pixel * 4
      // Rec. 601 luma — cheaper than a colour-space conversion and plenty for
      // frame differencing.
      gray[pixel] =
        data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114
    }

    return gray
  }

  /** One JPEG keyframe as raw base64 (no data URL prefix), or null. */
  captureKeyframe(video: HTMLVideoElement): string | null {
    if (!video.videoWidth || !video.videoHeight) return null

    const scale = KEYFRAME_LONG_EDGE / Math.max(video.videoWidth, video.videoHeight)
    const width = Math.max(1, Math.round(video.videoWidth * Math.min(1, scale)))
    const height = Math.max(1, Math.round(video.videoHeight * Math.min(1, scale)))

    const canvas = this.canvas('keyframe', width, height)
    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', KEYFRAME_QUALITY)
    const comma = dataUrl.indexOf(',')
    return comma < 0 ? null : dataUrl.slice(comma + 1)
  }

  /**
   * Crops the moving region out of the video at full sensor resolution, so the
   * model sees detail that the 768px keyframe throws away. Coordinates arrive
   * in analysis-grid space and are scaled up here.
   */
  captureRegion(
    video: HTMLVideoElement,
    region: { minX: number; minY: number; maxX: number; maxY: number },
    analysisWidth: number,
    analysisHeight: number,
  ): string | null {
    if (!video.videoWidth || !video.videoHeight) return null
    if (analysisWidth <= 0 || analysisHeight <= 0) return null

    const scaleX = video.videoWidth / analysisWidth
    const scaleY = video.videoHeight / analysisHeight

    // Context matters as much as the region itself: a hand means little
    // without the wall it is touching.
    const padX = (region.maxX - region.minX + 1) * 0.6
    const padY = (region.maxY - region.minY + 1) * 0.6

    const left = Math.max(0, Math.floor((region.minX - padX) * scaleX))
    const top = Math.max(0, Math.floor((region.minY - padY) * scaleY))
    const right = Math.min(video.videoWidth, Math.ceil((region.maxX + 1 + padX) * scaleX))
    const bottom = Math.min(video.videoHeight, Math.ceil((region.maxY + 1 + padY) * scaleY))

    const sourceWidth = right - left
    const sourceHeight = bottom - top
    if (sourceWidth < 16 || sourceHeight < 16) return null

    const scale = Math.min(1, REGION_LONG_EDGE / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = this.canvas('region', width, height)
    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(video, left, top, sourceWidth, sourceHeight, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', KEYFRAME_QUALITY)
    const comma = dataUrl.indexOf(',')
    return comma < 0 ? null : dataUrl.slice(comma + 1)
  }

  dispose() {
    this.motionCanvas = null
    this.keyframeCanvas = null
    this.regionCanvas = null
  }
}
