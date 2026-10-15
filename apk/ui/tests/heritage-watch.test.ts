import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MOTION_HEIGHT,
  MOTION_WIDTH,
  MotionGate,
  compareFrames,
} from '../lib/vision/motion.ts'
import { CorroborationBuffer } from '../lib/vision/corroboration.ts'
import { parseSceneAssessment, buildScenePrompt } from '../lib/vision/prompt.ts'
import { HERITAGE_WATCH_BY_ID, HERITAGE_WATCH_DEFINITIONS } from '../lib/vision/taxonomy.ts'

/** A uniform grayscale frame at the gate's analysis resolution. */
function blank(value = 40): Uint8ClampedArray {
  return new Uint8ClampedArray(MOTION_WIDTH * MOTION_HEIGHT).fill(value)
}

/** Paints a filled rectangle, in analysis pixels, onto a copy of `frame`. */
function withBlock(
  frame: Uint8ClampedArray,
  x0: number, y0: number, w: number, h: number, value: number,
): Uint8ClampedArray {
  const next = new Uint8ClampedArray(frame)
  for (let y = y0; y < y0 + h && y < MOTION_HEIGHT; y += 1) {
    for (let x = x0; x < x0 + w && x < MOTION_WIDTH; x += 1) next[y * MOTION_WIDTH + x] = value
  }
  return next
}

const compare = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
  compareFrames(a, b, MOTION_WIDTH, MOTION_HEIGHT)

test('an identical frame registers no activity at all', () => {
  const reading = compare(blank(), blank())
  assert.equal(reading.activeCells, 0)
  assert.equal(reading.localizedActivity, false)
  assert.equal(reading.cameraMotion, false)
})

test('panning the phone reads as camera motion, not as activity', () => {
  // Every cell shifts together — exactly what moving the phone looks like.
  const reading = compare(blank(40), blank(140))
  assert.equal(reading.cameraMotion, true)
  assert.equal(reading.localizedActivity, false)
})

test('a small object moving in one cell is detected, not averaged away', () => {
  // The case that matters most: a hand working on a wall covers a fraction of
  // one cell. Scoring a cell by its MEAN brightness hides this completely —
  // measured against real footage it produced a delta of 1-4 units, under any
  // workable threshold. Counting changed pixels catches it.
  const before = blank(40)
  const after = withBlock(before, 2, 2, 6, 6, 230)

  const reading = compare(before, after)
  assert.equal(reading.localizedActivity, true)
  assert.equal(reading.cameraMotion, false)
  assert.equal(reading.activeCells, 1)
  assert.ok(reading.cellChangedFractions[0] >= 0.1)
})

test('a change too faint to clear the per-pixel threshold is ignored', () => {
  const before = blank(40)
  // 10 units of change is below the 20-unit pixelDelta: sensor noise, not an act.
  const after = withBlock(before, 2, 2, 6, 6, 50)

  assert.equal(compare(before, after).localizedActivity, false)
})

test('a change covering too few pixels of a cell is ignored', () => {
  const before = blank(40)
  // 2x2 of a 12x12 cell is under the 10% changed-pixel share.
  const after = withBlock(before, 2, 2, 2, 2, 230)

  assert.equal(compare(before, after).localizedActivity, false)
})

test('the gate needs sustained activity and then respects its cooldown', () => {
  const gate = new MotionGate(3, 8_000)
  const quiet = blank()
  const busy = withBlock(quiet, 2, 2, 6, 6, 230)
  const push = (frame: Uint8ClampedArray, now: number) =>
    gate.push(frame, MOTION_WIDTH, MOTION_HEIGHT, now).shouldInspect

  // The first frame only primes the comparison.
  assert.equal(push(quiet, 1_000), false)

  // Each alternation is a localized change; three in a row open the gate.
  assert.equal(push(busy, 1_500), false)
  assert.equal(push(quiet, 2_000), false)
  assert.equal(push(busy, 2_500), true)

  // Sustained activity continues, but the cooldown holds the next call back.
  assert.equal(push(quiet, 3_000), false)
  assert.equal(push(busy, 3_500), false)
  assert.equal(push(quiet, 4_000), false)
  assert.equal(push(busy, 4_500), false)

  // Past the cooldown it fires again.
  assert.equal(push(quiet, 13_000), true)
})

test('camera motion breaks the streak so panning never triggers a call', () => {
  const gate = new MotionGate(3, 8_000)
  const quiet = blank()
  const busy = withBlock(quiet, 2, 2, 6, 6, 230)
  const push = (frame: Uint8ClampedArray, now: number) =>
    gate.push(frame, MOTION_WIDTH, MOTION_HEIGHT, now)

  push(quiet, 1_000)
  assert.equal(push(busy, 1_500).shouldInspect, false)
  assert.equal(push(quiet, 2_000).shouldInspect, false)

  // Phone swings across the scene: every cell changes at once.
  const panned = blank(200)
  const reading = push(panned, 2_500)
  assert.equal(reading.cameraMotion, true)
  assert.equal(reading.shouldInspect, false)

  // The streak restarted, so one more localized frame is not yet enough.
  assert.equal(push(busy, 3_000).shouldInspect, false)
})

test('a single sighting never raises an incident', () => {
  const buffer = new CorroborationBuffer()
  const raised = buffer.push({
    verdict: 'surface_marking',
    confidence: 0.95,
    at: 1_000,
    rationale: 'A hand moves across a wall.',
  })

  assert.equal(raised, null)
  assert.deepEqual(buffer.pendingCounts(1_000), { surface_marking: 1 })
})

test('two matching sightings raise one incident carrying its evidence', () => {
  const buffer = new CorroborationBuffer()
  buffer.push({ verdict: 'surface_marking', confidence: 0.8, at: 1_000, rationale: 'first' })
  const raised = buffer.push({ verdict: 'surface_marking', confidence: 0.9, at: 9_000, rationale: 'second' })

  assert.ok(raised)
  assert.equal(raised.category, 'surface_marking')
  assert.equal(raised.observations.length, 2)
  assert.ok(Math.abs(raised.confidence - 0.85) < 1e-9)
})

test('low-confidence sightings never accumulate toward a report', () => {
  const buffer = new CorroborationBuffer()
  const weak = HERITAGE_WATCH_BY_ID.physical_altercation.minimumConfidence - 0.01

  assert.equal(buffer.push({ verdict: 'physical_altercation', confidence: weak, at: 1_000, rationale: 'a' }), null)
  assert.equal(buffer.push({ verdict: 'physical_altercation', confidence: weak, at: 2_000, rationale: 'b' }), null)
  assert.deepEqual(buffer.pendingCounts(2_000), {})
})

test('different categories do not corroborate each other', () => {
  const buffer = new CorroborationBuffer()
  buffer.push({ verdict: 'surface_marking', confidence: 0.9, at: 1_000, rationale: 'a' })
  const raised = buffer.push({ verdict: 'littering', confidence: 0.9, at: 2_000, rationale: 'b' })

  assert.equal(raised, null)
})

test('sightings outside the window are dropped before counting', () => {
  const buffer = new CorroborationBuffer({ required: 2, windowMs: 10_000, refractoryMs: 60_000 })
  buffer.push({ verdict: 'littering', confidence: 0.9, at: 1_000, rationale: 'a' })
  const raised = buffer.push({ verdict: 'littering', confidence: 0.9, at: 50_000, rationale: 'b' })

  assert.equal(raised, null, 'the first sighting had expired')
})

test('one continuous act does not file a stream of duplicates', () => {
  const buffer = new CorroborationBuffer({ required: 2, windowMs: 45_000, refractoryMs: 180_000 })
  buffer.push({ verdict: 'climbing_on_structure', confidence: 0.9, at: 1_000, rationale: 'a' })
  assert.ok(buffer.push({ verdict: 'climbing_on_structure', confidence: 0.9, at: 2_000, rationale: 'b' }))

  buffer.push({ verdict: 'climbing_on_structure', confidence: 0.9, at: 3_000, rationale: 'c' })
  assert.equal(
    buffer.push({ verdict: 'climbing_on_structure', confidence: 0.9, at: 4_000, rationale: 'd' }),
    null,
    'still inside the refractory window',
  )

  buffer.push({ verdict: 'climbing_on_structure', confidence: 0.9, at: 200_000, rationale: 'e' })
  assert.ok(
    buffer.push({ verdict: 'climbing_on_structure', confidence: 0.9, at: 201_000, rationale: 'f' }),
    'a later recurrence can be reported again',
  )
})

test('a "none" verdict is inert', () => {
  const buffer = new CorroborationBuffer()
  assert.equal(buffer.push({ verdict: 'none', confidence: 1, at: 1_000, rationale: '' }), null)
  assert.deepEqual(buffer.pendingCounts(1_000), {})
})

test('unusable model replies degrade to no finding, never to a detection', () => {
  for (const reply of ['', 'not json at all', '{"verdict":"loitering","confidence":0.9}', '{"verdict":"surface_marking"}']) {
    const parsed = parseSceneAssessment(reply)
    assert.equal(parsed.verdict, 'none', `reply: ${reply}`)
    assert.equal(parsed.understood, false, `reply: ${reply}`)
  }
})

test('a deliberate "none" is kept apart from a reply we could not read', () => {
  // Both are safe, but only one means the pipeline is alive — collapsing them
  // makes a dead model look like a quiet monument.
  const real = parseSceneAssessment('{"verdict":"none","confidence":0.95,"rationale":"People are walking and standing."}')
  assert.equal(real.verdict, 'none')
  assert.equal(real.understood, true)
  assert.equal(real.rationale, 'People are walking and standing.')

  assert.equal(parseSceneAssessment('garbled').understood, false)
})

test('the reasoning model\'s </think> preamble does not break parsing', () => {
  const reply = '</think>\n{"verdict":"none","confidence":0.95,"rationale":"Visitors are walking."}'
  const parsed = parseSceneAssessment(reply)
  assert.equal(parsed.verdict, 'none')
  assert.equal(parsed.understood, true)
})

test('a valid reply survives markdown fences and percentage confidence', () => {
  const fenced = '```json\n{"verdict":"littering","confidence":82,"rationale":"A wrapper is dropped."}\n```'
  const parsed = parseSceneAssessment(fenced)

  assert.equal(parsed.verdict, 'littering')
  assert.ok(Math.abs(parsed.confidence - 0.82) < 1e-9)
  assert.equal(parsed.rationale, 'A wrapper is dropped.')
})

test('confidence is clamped into 0..1', () => {
  assert.equal(parseSceneAssessment('{"verdict":"littering","confidence":-5,"rationale":"x"}').confidence, 0)
  assert.equal(parseSceneAssessment('{"verdict":"littering","confidence":400,"rationale":"x"}').confidence, 1)
})

test('every category reports under a category the operations console accepts', () => {
  const accepted = ['Property damage', 'Littering', 'Restricted access', 'Harassment', 'Safety hazard', 'Other site-rule concern']
  for (const definition of HERITAGE_WATCH_DEFINITIONS) {
    assert.ok(accepted.includes(definition.reportCategory), definition.id)
  }
})

test('the prompt names every category and keeps its identity guardrails', () => {
  const prompt = buildScenePrompt()
  for (const definition of HERITAGE_WATCH_DEFINITIONS) {
    assert.ok(prompt.includes(`"${definition.id}"`), `missing ${definition.id}`)
  }
  assert.match(prompt, /Never infer from a person's appearance/)
  assert.match(prompt, /Do not identify or describe any individual/)
})
