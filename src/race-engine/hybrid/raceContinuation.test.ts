import { expect, it } from 'vitest'
import { runDeterministicRoadRace } from '../simulation/runDeterministicRoadRace'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { advanceRaceContinuation, beginRaceContinuation, finishRaceContinuation } from './raceContinuation'

it.each([0, 1, 9, 20, 40])('matches the full baseline from checkpoint tick %s', ticks => {
  const initial = beginRaceContinuation(syntheticTenRiderStage)
  const checkpoint = advanceRaceContinuation(initial, ticks)
  const restored = JSON.parse(JSON.stringify(checkpoint))
  const baseline = runDeterministicRoadRace(syntheticTenRiderStage)
  expect(finishRaceContinuation(restored)).toStrictEqual(baseline)
  expect(checkpoint.snapshots.map(snapshot => snapshot.raceSecond)).toEqual(
    baseline.snapshots.slice(0, checkpoint.snapshots.length).map(snapshot => snapshot.raceSecond),
  )
})
