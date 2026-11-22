import { expect, it } from 'vitest'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { applyAcceptedAttack } from './applyAcceptedAttack'
import { orderRaceCommand } from './orderRaceCommand'
import { advanceRaceContinuation, beginRaceContinuation, finishRaceContinuation, type RaceContinuation } from './raceContinuation'
import { restoreSimulationCheckpoint } from './simulationCheckpoint'

function issue(continuation: RaceContinuation, number: number, riderId: string, tick: number) {
  const result = orderRaceCommand({
    raceId: syntheticTenRiderStage.raceId, stageId: syntheticTenRiderStage.stageId, tick, completed: false,
  }, continuation.acceptedCommands, 'manager-b', {
    commandId: 'attack-' + number, kind: 'attack', payload: {}, requestedTick: tick,
    expectedRevision: continuation.acceptedCommands.length, teamId: 'synthetic-team-b', riderId,
  })
  if (result.status !== 'accepted') throw new Error('Expected acceptance')
  return result.command
}

it('applies a second attack only to the current revision and preserves earlier frames', () => {
  const initial = advanceRaceContinuation(beginRaceContinuation(syntheticTenRiderStage), 5)
  const first = issue(initial, 1, 'synthetic-rider-10', 5)
  const current = advanceRaceContinuation(applyAcceptedAttack(initial, first), 2)
  const previousFuture = finishRaceContinuation(current)
  const before = restoreSimulationCheckpoint(current.checkpoint)
  const second = issue(current, 2, 'synthetic-rider-9', 7)
  expect(() => applyAcceptedAttack(current, { ...second, expectedRevision: 0 })).toThrow('revision')
  const successor = applyAcceptedAttack(current, second)
  expect(successor.acceptedCommands.map(command => command.sequence)).toEqual([1, 2])
  expect(() => applyAcceptedAttack(successor, second)).toThrow('revision')
  expect(applyAcceptedAttack(current, second)).toStrictEqual(successor)
  const output = finishRaceContinuation(successor)
  expect(output.snapshots.slice(0, current.snapshots.length)).toStrictEqual(previousFuture.snapshots.slice(0, current.snapshots.length))
  expect(output.events.slice(0, before.events.length)).toStrictEqual(before.events)
  expect(output.events.filter(event => event.eventType === 'ATTACK_STARTED').map(event => event.actorRiderId)).toEqual(['synthetic-rider-10', 'synthetic-rider-9'])
})
