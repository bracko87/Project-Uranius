import { expect, it } from 'vitest'
import { createBreakawayGroup } from '../simulation/createBreakawayGroup'
import { createInitialState } from '../simulation/createInitialState'
import { simulateMultiGroupTick } from '../simulation/simulateMultiGroupTick'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { applyAcceptedAttack } from './applyAcceptedAttack'
import { applyAcceptedPursuit } from './applyAcceptedPursuit'
import { orderRaceCommand } from './orderRaceCommand'
import { advanceRaceContinuation, beginRaceContinuation, finishRaceContinuation, type RaceContinuation } from './raceContinuation'
import { captureSimulationCheckpoint, restoreSimulationCheckpoint } from './simulationCheckpoint'

const flat = {
  ...syntheticTenRiderStage,
  profilePoints: [{ kilometre: 0, elevationMetres: 100 }, { kilometre: 10, elevationMetres: 100 }],
}

function command(run: RaceContinuation, kind: string, riderId: string, payload: object) {
  const state = restoreSimulationCheckpoint(run.checkpoint)
  const tick = state.raceSecond / state.input.settings.tickSeconds
  const result = orderRaceCommand({ raceId: state.raceId, stageId: state.stageId, tick, completed: state.completed },
    run.acceptedCommands, 'fictional-manager', {
      commandId: kind + riderId, teamId: state.riders[riderId].teamId, riderId, kind, payload,
      expectedRevision: run.acceptedCommands.length, requestedTick: tick,
    })
  if (result.status !== 'accepted') throw Error('Expected ordered command.')
  return result.command
}

function chaseFixture(leadSeconds: number) {
  const initial = beginRaceContinuation(flat)
  const original = createInitialState(flat)
  const lead = createBreakawayGroup({ state: original, sourceGroupId: 'peloton_main', riderIds: ['synthetic-rider-2'], speedKmh: 42, initialGapSeconds: leadSeconds })
  const chase = createBreakawayGroup({ state: lead.state, sourceGroupId: 'peloton_main', riderIds: ['synthetic-rider-10'], speedKmh: 40, initialGapSeconds: 15 })
  const group = { ...chase.breakawayGroup, groupType: 'chase' as const }
  const state = { ...chase.state, groups: { ...chase.state.groups, [group.groupId]: group } }
  const run = { ...initial, checkpoint: captureSimulationCheckpoint(state) }
  return { run, lead, group, state }
}

it('applies physical pursuit with higher energy use and allows a gap to survive', () => {
  const { run, lead, group, state } = chaseFixture(55)
  const ordered = command(run, 'chase', 'synthetic-rider-10', { targetGroupId: lead.breakawayGroupId })
  const committed = applyAcceptedPursuit(run, ordered)
  const armed = restoreSimulationCheckpoint(committed.checkpoint)
  expect(armed.riders).toStrictEqual(state.riders)
  const withChase = simulateMultiGroupTick(armed)
  const withoutChase = simulateMultiGroupTick(state)
  const proposal = withChase.movement.proposals.find(entry => entry.groupId === group.groupId)
  const normal = withoutChase.movement.proposals.find(entry => entry.groupId === group.groupId)
  expect(proposal?.appliedSpeedKmh).toBeGreaterThan(normal!.appliedSpeedKmh)
  expect(withChase.state.riders['synthetic-rider-10'].energy).toBeLessThan(withoutChase.state.riders['synthetic-rider-10'].energy)
  expect(withChase.state.groups[lead.breakawayGroupId].distanceKm).toBeGreaterThan(withChase.state.groups[group.groupId].distanceKm)
  expect(simulateMultiGroupTick(armed)).toStrictEqual(withChase)
})

it('follows an actual later move without replacing elapsed frames', () => {
  const run = advanceRaceContinuation(beginRaceContinuation(flat), 5)
  const followed = applyAcceptedPursuit(run, command(run, 'follow', 'synthetic-rider-9', { targetRiderId: 'synthetic-rider-10' }))
  const attack = applyAcceptedAttack(followed, command(followed, 'attack', 'synthetic-rider-10', {}))
  const after = restoreSimulationCheckpoint(advanceRaceContinuation(attack, 1).checkpoint)
  expect(after.liveFollows).toEqual({})
  expect(after.groups.breakaway_2.createdAtKm).toBe(restoreSimulationCheckpoint(run.checkpoint).riders['synthetic-rider-9'].distanceKm)
  const output = finishRaceContinuation(attack)
  expect(output.snapshots.slice(0, run.snapshots.length)).toStrictEqual(finishRaceContinuation(run).snapshots.slice(0, run.snapshots.length))
  expect(output.events.some(event => event.eventType === 'ATTACK_STARTED')).toBe(true)
  expect(finishRaceContinuation(attack)).toStrictEqual(output)
})

it('can fail to follow when the rider cannot outpace the source group', () => {
  const run = advanceRaceContinuation(beginRaceContinuation(flat), 5)
  const followed = applyAcceptedPursuit(run, command(run, 'follow', 'synthetic-rider-1', { targetRiderId: 'synthetic-rider-10' }))
  const attack = applyAcceptedAttack(followed, command(followed, 'attack', 'synthetic-rider-10', {}))
  const after = restoreSimulationCheckpoint(advanceRaceContinuation(attack, 1).checkpoint)
  expect(after.liveFollows).toEqual({})
  expect(after.riders['synthetic-rider-1'].currentGroupId).toBe('peloton_main')
  expect(after.groups.breakaway_2).toBeUndefined()
})

it('merges only after a pursuing group closes the distance in simulated movement', () => {
  const { run, lead, group } = chaseFixture(14.4)
  const ordered = command(run, 'chase', 'synthetic-rider-10', { targetGroupId: lead.breakawayGroupId })
  const before = restoreSimulationCheckpoint(applyAcceptedPursuit(run, ordered).checkpoint)
  expect(before.groups[group.groupId].distanceKm).toBeLessThan(before.groups[lead.breakawayGroupId].distanceKm)
  const tick = simulateMultiGroupTick(before)
  const sourceDistance = tick.appliedMovement.state.groups[group.groupId].distanceKm
  const targetDistance = tick.appliedMovement.state.groups[lead.breakawayGroupId].distanceKm
  expect(sourceDistance).toBeGreaterThanOrEqual(targetDistance)
  const caught = tick.state.events.find(event => event.eventType === 'GROUP_CAUGHT' && event.payload.cause === 'live_pursuit')
  expect(caught?.sourceGroupId).toBe(group.groupId)
  expect(tick.state.riders['synthetic-rider-10'].distanceKm).toBe(targetDistance)
  expect(tick.state.groups[group.groupId].active).toBe(false)
})
