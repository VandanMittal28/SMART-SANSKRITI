import test from 'node:test'
import assert from 'node:assert/strict'
import { checkCheckpoint, distanceMeters, readProgress, newProgress, progressKey, MONUMENT_RIDDLES } from '../lib/hunt.ts'

const clue = MONUMENT_RIDDLES['taj-mahal'][0]
const now = 1_000_000
const position = { lat: clue.target_lat, lng: clue.target_lng, accuracy: 10, timestamp: now }
test('only a fresh accurate location within the checkpoint radius passes', () => {
  assert.equal(checkCheckpoint(position, clue, now).verified, true)
  assert.equal(checkCheckpoint({ ...position, lat: position.lat + 0.01 }, clue, now).verified, false)
  assert.equal(checkCheckpoint({ ...position, accuracy: 1000 }, clue, now).verified, false)
  assert.equal(checkCheckpoint({ ...position, timestamp: now - 31_000 }, clue, now).verified, false)
  assert.equal(checkCheckpoint({ ...position, lat: NaN }, clue, now).verified, false)
  assert.equal(checkCheckpoint({ ...position, accuracy: -1 }, clue, now).verified, false)
})
test('distance uses real GPS coordinates without scaling', () => {
  assert.equal(distanceMeters(27, 78, 27, 78), 0)
  assert.ok(distanceMeters(0, 0, 0, 1) > 111000)
  assert.ok(distanceMeters(0, 0, 0, 1) < 112000)
})
test('progress resumes including completion and reward status', () => {
  for (const completed of [0, 1, 4, 5]) {
    const p = { ...newProgress(), completed, reward: 'pending' }
    assert.deepEqual(readProgress(JSON.stringify(p), 5), p)
  }
})
test('corrupt and incompatible saves cannot skip checkpoints or crash', () => {
  for (const raw of [null, '{', '{}', JSON.stringify({ ...newProgress(), completed: 6 }), JSON.stringify({ ...newProgress(), completed: -1 }), JSON.stringify({ ...newProgress(), completed: 1.5 }), JSON.stringify({ ...newProgress(), version: 2 })]) {
    assert.equal(readProgress(raw, 5), null)
  }
})
test('people, monuments and modes have separate saved progress', () => {
  const keys = [progressKey(undefined, 'taj-mahal', 'practice'), progressKey('alice', 'taj-mahal', 'practice'), progressKey('bob', 'taj-mahal', 'practice'), progressKey('alice', 'red-fort', 'practice'), progressKey('alice', 'taj-mahal', 'onsite')]
  assert.equal(new Set(keys).size, keys.length)
})
test('each supported hunt has five distinct valid checkpoints', () => {
  for (const clues of Object.values(MONUMENT_RIDDLES)) {
    assert.equal(clues.length, 5)
    assert.equal(new Set(clues.map(c => c.id)).size, 5)
    for (const c of clues) {
      assert.ok(c.riddle && c.hint && c.location_name)
      assert.ok(c.radius_meters > 0)
      assert.ok(Math.abs(c.target_lat) <= 90 && Math.abs(c.target_lng) <= 180)
    }
  }
})
