import { expect, it } from 'vitest'
import { createCanonicalHashedValue } from '../../simulation/canonicalSerialization'
import { runDeterministicRoadRace } from '../../simulation/runDeterministicRoadRace'
import { syntheticTenRiderStage } from '../fixtures/syntheticTenRiderStage'

it('repeats the no-command synthetic stage with identical full output', () => {
  const first = runDeterministicRoadRace(syntheticTenRiderStage)
  const second = runDeterministicRoadRace(syntheticTenRiderStage)
  const firstHash = createCanonicalHashedValue(first).hash
  expect(second).toEqual(first)
  expect(first.finalRiderStates).toHaveLength(10)
  expect(first.finalRiderStates.every(rider => rider.finished)).toBe(true)
  expect(firstHash).toBe('98cdb350835b7fde')
  expect(first.snapshots).toHaveLength(32)
  expect(first.events).toHaveLength(12)
})
