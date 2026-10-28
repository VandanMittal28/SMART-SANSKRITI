/**
 * Connected-component extraction over the motion change mask.
 *
 * Counting changed pixels tells you *how much* moved. It cannot tell you a
 * hand working at a wall from a visitor walking across the frame, because both
 * move a similar number of pixels. Grouping those pixels into regions — and
 * then watching how each region behaves over time — is what separates them.
 *
 * Iterative flood fill with an explicit stack: a recursive version blows the
 * JS stack on a frame where most pixels changed, which is exactly the camera
 * pan case we see constantly.
 */

export interface Blob {
  /** Changed pixels in this region. */
  area: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  centroidX: number
  centroidY: number
}

export interface BlobOptions {
  /** Regions smaller than this are sensor noise, not activity. */
  minimumArea: number
  /** Stop after this many regions; a noisy frame is not worth exhausting. */
  maximumBlobs: number
}

export const DEFAULT_BLOB_OPTIONS: BlobOptions = {
  minimumArea: 12,
  maximumBlobs: 24,
}

export function blobWidth(blob: Blob): number {
  return blob.maxX - blob.minX + 1
}

export function blobHeight(blob: Blob): number {
  return blob.maxY - blob.minY + 1
}

/** Share of the bounding box actually filled — a solid body vs scattered noise. */
export function blobDensity(blob: Blob): number {
  const box = blobWidth(blob) * blobHeight(blob)
  return box > 0 ? blob.area / box : 0
}

/**
 * Finds 4-connected regions of changed pixels, largest first.
 */
export function extractBlobs(
  mask: Uint8Array,
  width: number,
  height: number,
  options: BlobOptions = DEFAULT_BLOB_OPTIONS,
): Blob[] {
  if (width <= 0 || height <= 0 || mask.length < width * height) return []

  const visited = new Uint8Array(width * height)
  const blobs: Blob[] = []
  // Reused across regions so a busy frame does not allocate repeatedly.
  const stack: number[] = []

  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) continue

    visited[start] = 1
    stack.length = 0
    stack.push(start)

    let area = 0
    let sumX = 0
    let sumY = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0

    while (stack.length > 0) {
      const pixel = stack.pop() as number
      const x = pixel % width
      const y = (pixel - x) / width

      area += 1
      sumX += x
      sumY += y
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      if (x > 0) pushIfNew(pixel - 1)
      if (x < width - 1) pushIfNew(pixel + 1)
      if (y > 0) pushIfNew(pixel - width)
      if (y < height - 1) pushIfNew(pixel + width)
    }

    if (area >= options.minimumArea) {
      blobs.push({
        area,
        minX, minY, maxX, maxY,
        centroidX: sumX / area,
        centroidY: sumY / area,
      })
    }

    if (blobs.length >= options.maximumBlobs) break

    function pushIfNew(neighbour: number) {
      if (mask[neighbour] === 1 && visited[neighbour] === 0) {
        visited[neighbour] = 1
        stack.push(neighbour)
      }
    }
  }

  return blobs.sort((a, b) => b.area - a.area)
}

/** The region most likely to be the activity: simply the largest one. */
export function dominantBlob(blobs: Blob[]): Blob | null {
  return blobs.length > 0 ? blobs[0] : null
}
