import { expect, it } from 'vitest'
import { simulateMultiGroupTick } from '../simulation/simulateMultiGroupTick'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { applyAcceptedPursuit } from './applyAcceptedPursuit'
import { orderRaceCommand } from './orderRaceCommand'
import { advanceRaceContinuation, beginRaceContinuation, finishRaceContinuation, type RaceContinuation } from './raceContinuation'
import { restoreSimulationCheckpoint } from './simulationCheckpoint'

function apply(run: RaceContinuation, kind: 'support' | 'effort', payload: object) {
  const state = restoreSimulationCheckpoint(run.checkpoint)
  const tick = state.raceSecond / state.input.settings.tickSeconds
  const ordered = orderRaceCommand({ raceId: state.raceId, stageId: state.stageId, tick, completed: state.completed },
    run.acceptedCommands, 'fictional-manager', {
      commandId: kind, riderId: 'synthetic-rider-1', teamId: 'synthetic-team-a', kind, payload,
      requestedTick: tick, expectedRevision: run.acceptedCommands.length,
    })
  if (ordered.status !== 'accepted') throw Error('Expected an ordered live effort.')
  return applyAcceptedPursuit(run, ordered.command)
}

it('uses the existing cooperation cap and pays for extra pacing in the same group', () => {
  const run = advanceRaceContinuation(beginRaceContinuation(syntheticTenRiderStage), 2)
  expect(() => apply(run, 'support', { targetRiderId: 'synthetic-rider-10' })).toThrow('teammate')
  const supported = apply(run, 'support', { targetRiderId: 'synthetic-rider-2' })
  const normal = simulateMultiGroupTick(restoreSimulationCheckpoint(run.checkpoint))
  const active = simulateMultiGroupTick(restoreSimulationCheckpoint(supported.checkpoint))
  const boosted = active.movement.proposals[0]
  expect(boosted.appliedSpeedKmh).toBeGreaterThan(normal.movement.proposals[0].appliedSpeedKmh)
  expect(boosted.cooperationPaceBonusPercent).toBeLessThanOrEqual(3)
  expect(active.state.riders['synthetic-rider-1'].energy).toBeLessThan(normal.state.riders['synthetic-rider-1'].energy)
  expect(active.state.riders['synthetic-rider-2'].currentGroupId).toBe('peloton_main')
  expect(active.state.liveSupports).toEqual({})
  expect(finishRaceContinuation(supported).snapshots.slice(0, run.snapshots.length)).toStrictEqual(
    finishRaceContinuation(run).snapshots.slice(0, run.snapshots.length),
  )
})

it('limits extra peloton effort to late-stage racing and consumes it after one tick', () => {
  const start = beginRaceContinuation(syntheticTenRiderStage)
  expect(() => apply(start, 'effort', {})).toThrow('late-stage')
  const run = advanceRaceContinuation(start, 25)
  const effort = apply(run, 'effort', {})
  const normal = simulateMultiGroupTick(restoreSimulationCheckpoint(run.checkpoint))
  const active = simulateMultiGroupTick(restoreSimulationCheckpoint(effort.checkpoint))
  expect(active.movement.proposals[0].appliedSpeedKmh).toBeGreaterThan(normal.movement.proposals[0].appliedSpeedKmh)
  expect(active.state.riders['synthetic-rider-1'].energy).toBeLessThan(normal.state.riders['synthetic-rider-1'].energy)
  expect(active.state.liveEfforts).toEqual([])
  expect(finishRaceContinuation(effort).finalRiderStates.some(rider => rider.riderId !== 'synthetic-rider-1' && rider.finishPosition === 1)).toBe(true)
})
