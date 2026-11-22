import { expect, it } from 'vitest'
import { createCanonicalHashedValue } from '../simulation/canonicalSerialization'
import { runDeterministicRoadRace } from '../simulation/runDeterministicRoadRace'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { orderRaceCommand } from './orderRaceCommand'
import { advanceRaceContinuation, beginRaceContinuation, finishRaceContinuation } from './raceContinuation'

it('preserves frozen timeline and final results with empty, rejected and no-op input', () => {
  const baseline = runDeterministicRoadRace(syntheticTenRiderStage)
  const initial = beginRaceContinuation(syntheticTenRiderStage)
  const live = advanceRaceContinuation(initial, 5)
  const noOp = advanceRaceContinuation(live, 0)
  expect(noOp).toStrictEqual(live)

  const rejected = orderRaceCommand({
    raceId: syntheticTenRiderStage.raceId, stageId: syntheticTenRiderStage.stageId, tick: 5, completed: false,
  }, [], 'owner', {
    commandId: 'late', teamId: 'synthetic-team-a', riderId: 'synthetic-rider-1',
    kind: 'attack', payload: {}, expectedRevision: 0, requestedTick: 4,
  })
  expect(rejected).toEqual({ status: 'rejected', reason: 'late' })

  for (const candidate of [initial, live, noOp]) {
    const output = finishRaceContinuation(candidate)
    expect(output).toStrictEqual(baseline)
    expect(createCanonicalHashedValue(output).hash).toBe('98cdb350835b7fde')
    expect(createCanonicalHashedValue(output.finalRiderStates).hash).toBe(
      createCanonicalHashedValue(baseline.finalRiderStates).hash,
    )
  }
})
