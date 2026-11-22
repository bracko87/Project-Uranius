import { expect, it } from 'vitest'
import { runDeterministicRoadRace } from '../simulation/runDeterministicRoadRace'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { applyAcceptedAttack } from './applyAcceptedAttack'
import { orderRaceCommand } from './orderRaceCommand'
import { advanceRaceContinuation, beginRaceContinuation, finishRaceContinuation } from './raceContinuation'
import { restoreSimulationCheckpoint } from './simulationCheckpoint'

it('changes only the future of a real engine run after an accepted attack', () => {
  const baseline = runDeterministicRoadRace(syntheticTenRiderStage)
  const tick = 5
  const prefix = advanceRaceContinuation(beginRaceContinuation(syntheticTenRiderStage), tick)
  const before = restoreSimulationCheckpoint(prefix.checkpoint)
  const result = orderRaceCommand({ raceId: before.raceId, stageId: before.stageId, tick, completed: false }, [], 'owner', {
    commandId: 'first', teamId: 'synthetic-team-a', riderId: 'synthetic-rider-1',
    kind: 'attack', payload: {}, requestedTick: tick, expectedRevision: 0,
  })
  if (result.status !== 'accepted') throw new Error('Expected acceptance')
  const committed = applyAcceptedAttack(prefix, result.command)
  const next = restoreSimulationCheckpoint(advanceRaceContinuation(committed, 1).checkpoint)
  const unchanged = restoreSimulationCheckpoint(advanceRaceContinuation(prefix, 1).checkpoint)
  const future = finishRaceContinuation(committed)

  expect(future.snapshots.slice(0, prefix.snapshots.length)).toStrictEqual(baseline.snapshots.slice(0, prefix.snapshots.length))
  expect(future.events.slice(0, before.events.length)).toStrictEqual(before.events)
  expect(future.events.filter(event => event.eventType === 'ATTACK_STARTED').map(event => event.actorRiderId)).toContain('synthetic-rider-1')
  expect(next.riders['synthetic-rider-1'].energy).toBeLessThan(before.riders['synthetic-rider-1'].energy)
  expect(next.riders['synthetic-rider-1'].currentGroupId).not.toBe(unchanged.riders['synthetic-rider-1'].currentGroupId)
  expect(future.snapshots.slice(prefix.snapshots.length)).not.toStrictEqual(baseline.snapshots.slice(prefix.snapshots.length))
  const completed = restoreSimulationCheckpoint(advanceRaceContinuation(committed, 100).checkpoint)
  expect(completed.completed).toBe(true)
  expect(future.finalRiderStates.map(rider => rider.finishTimeSeconds)).toEqual(
    future.finalRiderStates.map(rider => completed.riders[rider.riderId].finishTimeSeconds),
  )
  expect(future.finalRiderStates.every(rider => rider.finished)).toBe(true)
})
