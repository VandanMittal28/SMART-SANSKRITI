import assert from 'node:assert/strict'
import test from 'node:test'

import { blobDensity, blobHeight, blobWidth, dominantBlob, extractBlobs } from '../lib/vision/blobs.ts'
import {
  ActivityTracker,
  confidencePenalty,
  describeSignature,
} from '../lib/vision/signature.ts'

const W = 96
const H = 72

function mask(rects: Array<[number, number, number, number]>): Uint8Array {
  const data = new Uint8Array(W * H)
  for (const [x0, y0, w, h] of rects) {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) data[y * W + x] = 1
    }
  }
  return data
}

// ── Blob extraction ───────────────────────────────────────────────────────

test('an empty mask yields no regions', () => {
  assert.deepEqual(extractBlobs(new Uint8Array(W * H), W, H), [])
})

test('one rectangle becomes one region with the right box and centroid', () => {
  const blobs = extractBlobs(mask([[10, 8, 6, 4]]), W, H)
  assert.equal(blobs.length, 1)
  const blob = blobs[0]
  assert.equal(blob.area, 24)
  assert.equal(blobWidth(blob), 6)
  assert.equal(blobHeight(blob), 4)
  assert.ok(Math.abs(blob.centroidX - 12.5) < 0.001)
  assert.ok(Math.abs(blob.centroidY - 9.5) < 0.001)
  assert.ok(blobDensity(blob) > 0.99)
})

test('separate rectangles stay separate, largest first', () => {
  const blobs = extractBlobs(mask([[5, 5, 4, 4], [60, 40, 8, 8]]), W, H)
  assert.equal(blobs.length, 2)
  assert.equal(blobs[0].area, 64)
  assert.equal(blobs[1].area, 16)
  assert.equal(dominantBlob(blobs)?.area, 64)
})

test('regions below the noise floor are discarded', () => {
  // A 2x2 speck is 4 pixels, under the 12-pixel minimum.
  assert.deepEqual(extractBlobs(mask([[20, 20, 2, 2]]), W, H), [])
})

test('touching rectangles merge into one region', () => {
  const blobs = extractBlobs(mask([[10, 10, 5, 5], [15, 10, 5, 5]]), W, H)
  assert.equal(blobs.length, 1)
  assert.equal(blobs[0].area, 50)
  assert.equal(blobWidth(blobs[0]), 10)
})

test('a fully changed frame does not overflow the stack', () => {
  const full = new Uint8Array(W * H).fill(1)
  const blobs = extractBlobs(full, W, H)
  assert.equal(blobs.length, 1)
  assert.equal(blobs[0].area, W * H)
})

// ── Motion signature ──────────────────────────────────────────────────────

const box = (x: number, y: number, size = 8) => ({
  area: size * size,
  minX: x, minY: y, maxX: x + size - 1, maxY: y + size - 1,
  centroidX: x + size / 2, centroidY: y + size / 2,
})

test('a hand held at one spot reads as anchored, not traversing', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(20, 20), W, H, 0)
  // Small jitter around the same place, as a working hand does.
  signature = tracker.push(box(21, 20), W, H, 500)
  signature = tracker.push(box(20, 21), W, H, 1000)
  signature = tracker.push(box(21, 21), W, H, 1500)

  assert.equal(signature.anchored, true)
  assert.equal(signature.traversing, false)
  assert.equal(signature.samples, 4)
  assert.equal(signature.sustainedMs, 1500)
})

test('someone walking across reads as traversing, not anchored', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(10, 30), W, H, 0)
  for (let step = 1; step <= 4; step += 1) {
    // Steady movement in one direction, within the continuity radius.
    signature = tracker.push(box(10 + step * 9, 30), W, H, step * 500)
  }
  assert.equal(signature.traversing, true)
  assert.equal(signature.anchored, false)
})

test('a large region reversing direction reads as erratic', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(30, 30, 26), W, H, 0)
  const path = [38, 30, 40, 31, 37]
  path.forEach((x, index) => {
    signature = tracker.push(box(x, 30, 26), W, H, (index + 1) * 400)
  })
  assert.equal(signature.erratic, true)
})

test('a far jump starts a new track rather than inventing a long path', () => {
  const tracker = new ActivityTracker()
  tracker.push(box(5, 5), W, H, 0)
  tracker.push(box(6, 5), W, H, 500)
  const signature = tracker.push(box(80, 60), W, H, 1000)

  assert.equal(signature.samples, 1, 'the track restarted')
  assert.equal(signature.pathPixels, 0)
})

test('samples outside the window leave the track', () => {
  const tracker = new ActivityTracker({ continuityFactor: 1.5, windowMs: 2_000, anchoredDriftFactor: 0.9 })
  tracker.push(box(20, 20), W, H, 0)
  tracker.push(box(21, 20), W, H, 500)
  const signature = tracker.push(box(21, 21), W, H, 9_000)
  assert.equal(signature.samples, 1)
})

test('a dropped object reads as descending', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(40, 10), W, H, 0)
  signature = tracker.push(box(40, 16), W, H, 400)
  signature = tracker.push(box(40, 22), W, H, 800)
  assert.equal(signature.descending, true)
})

// ── Motion contradicting the category ─────────────────────────────────────

test('marking a surface is penalised when the motion is a walk-through', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(10, 30), W, H, 0)
  for (let step = 1; step <= 4; step += 1) signature = tracker.push(box(10 + step * 9, 30), W, H, step * 500)

  assert.ok(confidencePenalty('surface_marking', signature) >= 0.2,
    'a passer-by must clear a higher bar to be called vandalism')
  assert.equal(confidencePenalty('restricted_area_entry', signature), 0,
    'crossing a boundary is movement, so movement is consistent')
})

test('an altercation is penalised unless the motion is a struggle', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(20, 20), W, H, 0)
  signature = tracker.push(box(21, 20), W, H, 500)
  signature = tracker.push(box(20, 21), W, H, 1000)
  signature = tracker.push(box(21, 21), W, H, 1500)

  // Two people standing close and still are not fighting.
  assert.ok(confidencePenalty('physical_altercation', signature) >= 0.2)
  // The same stillness is exactly right for working on a surface.
  assert.equal(confidencePenalty('surface_marking', signature), 0)
})

test('an unmeasured track never penalises anything', () => {
  const tracker = new ActivityTracker()
  const signature = tracker.push(box(10, 10), W, H, 0)
  for (const category of ['surface_marking', 'physical_altercation', 'littering'] as const) {
    assert.equal(confidencePenalty(category, signature), 0,
      'with too few samples we judge on the image alone')
  }
})

test('smoking is never penalised by motion, since it is read from the image', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(10, 30), W, H, 0)
  for (let step = 1; step <= 4; step += 1) signature = tracker.push(box(10 + step * 9, 30), W, H, step * 500)
  assert.equal(confidencePenalty('fire_or_smoking', signature), 0)
})

test('the motion description is plain language the model can use', () => {
  const tracker = new ActivityTracker()
  let signature = tracker.push(box(20, 20), W, H, 0)
  signature = tracker.push(box(21, 20), W, H, 500)
  signature = tracker.push(box(20, 21), W, H, 1000)
  signature = tracker.push(box(21, 21), W, H, 1500)

  const text = describeSignature(signature)
  assert.match(text, /1\.5s/)
  assert.match(text, /stayed in one place/)
  assert.doesNotMatch(describeSignature({ ...signature, samples: 0 }), /%/)
})
