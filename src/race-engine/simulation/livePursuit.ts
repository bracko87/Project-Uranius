import type { SimulationState } from '../domain/SimulationState'
import type { RaceEvent } from '../domain/RaceEvent'
import type { AppliedAttackOrderEffect } from './applyExecutedTeamOrderEffects'
import { createBreakawayGroup } from './createBreakawayGroup'
import { calculateMultiGroupMovement } from './multiGroupMovement'

export function prepareLiveFollows(initial: SimulationState, attacks: readonly AppliedAttackOrderEffect[]): SimulationState {
  let state = initial
  for (const [followerId, targetId] of Object.entries(initial.liveFollows ?? {}).sort()) {
    const attack = attacks.find(effect => effect.order.riderId === targetId)
    if (!attack) continue
    const pending = { ...state.liveFollows }
    delete pending[followerId]
    state = { ...state, liveFollows: pending }
    const rider = state.riders[followerId]
    const target = state.riders[targetId]
    const source = rider && state.groups[rider.currentGroupId]
    if (!rider || !target || rider.stageStatus !== 'racing' || rider.energy <= 0
      || !source?.active || source.riderIds.length < 2 || source.groupId !== attack.separation.sourceGroupId
      || target.currentGroupId === source.groupId) continue
    const split = createBreakawayGroup({
      state, sourceGroupId: source.groupId, riderIds: [rider.riderId],
      speedKmh: source.speedKmh, initialGapSeconds: 0,
    })
    const candidate: SimulationState = {
      ...split.state,
      groups: {
        ...split.state.groups,
        [split.breakawayGroupId]: { ...split.breakawayGroup, groupType: 'chase' },
      },
      livePursuits: { ...split.state.livePursuits, [rider.riderId]: target.currentGroupId },
    }
    const sourceMove = calculateMultiGroupMovement(state).proposals.find(proposal => proposal.groupId === source.groupId)
    const chaseMove = calculateMultiGroupMovement(candidate).proposals.find(proposal => proposal.groupId === split.breakawayGroupId)
    if (sourceMove && chaseMove && chaseMove.appliedSpeedKmh > sourceMove.appliedSpeedKmh) {
      state = candidate
    }
  }
  return state
}

export function mergeLivePursuits(before: SimulationState, after: SimulationState): SimulationState {
  let state = after
  for (const [riderId, targetId] of Object.entries(before.livePursuits ?? {}).sort()) {
    const pursuitId = before.riders[riderId]?.currentGroupId
    if (!pursuitId) continue
    const from = state.groups[pursuitId]
    const target = state.groups[targetId]
    const start = before.groups[pursuitId]
    const targetStart = before.groups[targetId]
    if (!from?.active || !target?.active || from.groupType !== 'chase' || pursuitId === targetId
      || targetStart.distanceKm < start.distanceKm
      || from.distanceKm <= start.distanceKm || from.distanceKm < target.distanceKm) continue
    const riders = { ...state.riders }
    for (const id of from.riderIds) {
      riders[id] = { ...riders[id], currentGroupId: targetId, distanceKm: target.distanceKm, speedKmh: target.speedKmh }
    }
    const event: RaceEvent = {
      eventType: 'GROUP_CAUGHT', sequenceNumber: state.nextEventSequenceNumber,
      raceSecond: state.raceSecond, kmMarker: target.distanceKm,
      actorRiderId: riderId, teamId: riders[riderId].teamId,
      sourceGroupId: pursuitId, targetGroupId: targetId, relatedRiderIds: [...from.riderIds],
      payload: { cause: 'live_pursuit' }, commentaryText: null,
    }
    const pursuits = { ...state.livePursuits }
    for (const id of from.riderIds) delete pursuits[id]
    state = {
      ...state, riders, livePursuits: pursuits,
      groups: {
        ...state.groups,
        [pursuitId]: { ...from, active: false, riderIds: [], distanceKm: target.distanceKm, speedKmh: target.speedKmh, gapFromLeaderSeconds: target.gapFromLeaderSeconds },
        [targetId]: { ...target, riderIds: [...target.riderIds, ...from.riderIds].sort() },
      },
      events: [...state.events, event], nextEventSequenceNumber: state.nextEventSequenceNumber + 1,
    }
  }
  return state
}
