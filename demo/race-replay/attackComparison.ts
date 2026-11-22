import { syntheticTenRiderStage } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import { runDeterministicRoadRace } from '../../src/race-engine/simulation/runDeterministicRoadRace'
import { createInitialState } from '../../src/race-engine/simulation/createInitialState'
import { RaceAuthority } from '../../src/race-engine/hybrid/raceAuthority'
import type { SimulationOutput } from '../../src/race-engine/domain/SimulationOutput'

const attackTick = 5
const thresholdKm = 0.1
const sustainedSamples = 3

export const attackComparisonInput = {
  ...syntheticTenRiderStage,
  stageId: 'synthetic-attack-comparison',
  riders: syntheticTenRiderStage.riders.map((rider, index) => ({
    ...rider,
    attributes: {
      ...rider.attributes,
      flat: index === 9 ? 96 : 46 + index,
      stamina: index === 9 ? 92 : 54 + index,
      resistance: index === 9 ? 90 : 52 + index,
      recovery: index === 9 ? 90 : 55 + index,
    },
  })),
}

export function observeAttack(output: SimulationOutput, riderId: string, commandSecond: number) {
  const attack = output.events.find(event => event.eventType === 'ATTACK_STARTED'
    && event.actorRiderId === riderId && event.raceSecond >= commandSecond)
  if (!attack?.targetGroupId) throw Error('Accepted attack produced no engine launch event.')
  const track = [{ second: commandSecond, status: 'executing', gapKm: 0 }] as Array<{
    second: number
    status: 'executing' | 'successful' | 'unsuccessful'
    gapKm: number
  }>
  let consecutive = 0
  let established = false
  let ended = false
  for (const frame of output.snapshots.filter(entry => entry.raceSecond > commandSecond)) {
    const lead = frame.groups.find(group => group.groupId === attack.targetGroupId && group.active && group.riderIds.includes(riderId))
    const peloton = frame.groups.find(group => group.groupType === 'peloton' && group.active)
    const gapKm = lead && peloton ? Math.max(0, lead.distanceKm - peloton.distanceKm) : 0
    ended ||= !lead
    consecutive = gapKm >= thresholdKm && !ended ? consecutive + 1 : 0
    established ||= consecutive >= sustainedSamples
    track.push({ second: frame.raceSecond, gapKm, status: established ? 'successful' : ended ? 'unsuccessful' : 'executing' })
  }
  const finalSecond = output.snapshots.at(-1)?.raceSecond ?? commandSecond
  if (track.at(-1)?.status === 'executing') track.push({ second: finalSecond, status: 'unsuccessful', gapKm: 0 })
  return track
}

export function compareAttacks(scenario: 'strong' | 'caught') {
  const input = attackComparisonInput
  const selected = input.riders[scenario === 'strong' ? 9 : 0]
  const startingEnergy = Object.fromEntries(Object.values(createInitialState(input).riders).map(rider => [rider.riderId, rider.energy]))
  const baseline = runDeterministicRoadRace(input)
  const race = new RaceAuthority(input, { [selected.teamId]: 'comparison-manager' })
  race.advanceTo(attackTick)
  const before = race.elapsed()
  const ack = race.submit('comparison-manager', {
    commandId: 'comparison-attack', teamId: selected.teamId, riderId: selected.riderId,
    expectedRevision: 0, requestedTick: attackTick, kind: 'attack', payload: {},
  })
  if (ack.status !== 'accepted') throw Error('Comparison attack was rejected.')
  race.advanceTo(1000)
  const attacked = race.finalize()
  if (!attacked) throw Error('Comparison stage did not finish.')
  const historyIdentical = JSON.stringify(before.frames) === JSON.stringify(baseline.snapshots.slice(0, before.frames.length))
    && JSON.stringify(before.frames) === JSON.stringify(attacked.snapshots.slice(0, before.frames.length))
    && JSON.stringify(before.events) === JSON.stringify(baseline.events.slice(0, before.events.length))
    && JSON.stringify(before.events) === JSON.stringify(attacked.events.slice(0, before.events.length))
  if (!historyIdentical) throw Error('Comparison changed pre-command history.')
  return {
    course: input.profilePoints, distanceKm: input.distanceKm,
    selected: { id: selected.riderId, name: selected.riderName },
    commandSecond: before.raceSecond, historyIdentical, startingEnergy, baseline, attacked,
    track: observeAttack(attacked, selected.riderId, before.raceSecond),
    thresholdKm, sustainedSamples,
  }
}

export type AttackComparison = ReturnType<typeof compareAttacks>
