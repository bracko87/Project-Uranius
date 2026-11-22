import { Buffer } from 'node:buffer'
import { performance } from 'node:perf_hooks'
import { expect, it } from 'vitest'
import { createCanonicalHashedValue } from '../../simulation/canonicalSerialization'
import { runDeterministicRoadRace } from '../../simulation/runDeterministicRoadRace'
import { createSyntheticFullFieldStage } from '../fixtures/syntheticFullFieldStage'

const scenarios = [
  ['flat', 24, 'a16eeb4aa3fd0bc6', 86, 26],
  ['hilly', 48, '7ed8f7c2a7e0d7c6', 89, 50],
  ['mountain', 96, 'c5152197cecfe4d0', 100, 98],
  ['flat', 96, '364c8989142147b5', 86, 98],
] as const

it.each(scenarios)('repeats the %s %d-rider synthetic field', (terrain, fieldSize, baselineHash, frames, events) => {
  const input = createSyntheticFullFieldStage(terrain, fieldSize)
  const start = performance.now()
  const first = runDeterministicRoadRace(input)
  const firstMilliseconds = Math.round(performance.now() - start)
  const repeatStart = performance.now()
  const repeat = runDeterministicRoadRace(input)
  const repeatMilliseconds = Math.round(performance.now() - repeatStart)
  const hash = createCanonicalHashedValue(first).hash
  expect(hash).toBe(baselineHash)
  expect(createCanonicalHashedValue(repeat).hash).toBe(baselineHash)
  expect(first.snapshots).toHaveLength(frames)
  expect(first.events).toHaveLength(events)
  expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThanOrEqual(1024 * 1024)
  expect(Math.max(firstMilliseconds, repeatMilliseconds)).toBeLessThanOrEqual(20_000)
  expect(first.finalRiderStates.map(rider => rider.riderId).sort()).toEqual(input.riders.map(rider => rider.riderId).sort())
  expect(new Set(first.finalRiderStates.map(rider => rider.riderId)).size).toBe(fieldSize)
  expect(first.finalRiderStates.every(rider => rider.finished)).toBe(true)
  console.log('URANIUS_FULL_FIELD', JSON.stringify({
    terrain, fieldSize, hash, firstMilliseconds, repeatMilliseconds,
    bytes: Buffer.byteLength(JSON.stringify(first)), frames: first.snapshots.length, events: first.events.length,
  }))
}, 180_000)
