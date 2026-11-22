import type { RaceEvent } from '../domain/RaceEvent'
import type { TeamOrder } from '../domain/TeamOrder'
import { createOutputReplaySnapshot } from '../simulation/createMultiGroupSimulationOutput'
import type { AcceptedRaceCommand } from './orderRaceCommand'
import type { RaceContinuation } from './raceContinuation'
import { captureSimulationCheckpoint, restoreSimulationCheckpoint } from './simulationCheckpoint'

export function applyAcceptedAttack(continuation: RaceContinuation, command: AcceptedRaceCommand): RaceContinuation {
  const state = restoreSimulationCheckpoint(continuation.checkpoint)
  if (state.completed || command.raceId !== state.raceId || command.stageId !== state.stageId
    || command.effectiveTick * state.input.settings.tickSeconds !== state.raceSecond) {
    throw new Error('Attack does not match the current race boundary.')
  }
  const revision = continuation.acceptedCommands.length
  if (command.expectedRevision !== revision || command.sequence !== revision + 1
    || continuation.acceptedCommands.some(previous => previous.commandId === command.commandId)) {
    throw new Error('Attack does not match the current command revision.')
  }
  const rider = state.riders[command.riderId]
  const group = rider && state.groups[rider.currentGroupId]
  const team = state.teams[command.teamId]
  const orderId = 'live:' + command.commandId
  if (!rider || !team || rider.teamId !== team.teamId || rider.stageStatus !== 'racing'
    || !group?.active || group.riderIds.length < 2 || Object.hasOwn(state.orders, orderId)) {
    throw new Error('Rider is not eligible for this attack.')
  }

  const order: TeamOrder = {
    orderId, teamId: team.teamId, riderId: rider.riderId, type: 'attack', status: 'loaded',
    eligibleFromKm: state.currentKm, eligibleUntilKm: state.stageDistanceKm,
    priority: 0, maximumFollowers: 0, metadata: { uraniusLiveCommand: true },
  }
  const event: RaceEvent = {
    sequenceNumber: state.nextEventSequenceNumber, eventType: 'ORDER_LOADED',
    raceSecond: state.raceSecond, kmMarker: state.currentKm,
    actorRiderId: rider.riderId, teamId: rider.teamId, sourceGroupId: group.groupId,
    targetGroupId: null, relatedRiderIds: [rider.riderId],
    payload: { orderId, orderType: 'attack', commandSequence: command.sequence },
    commentaryText: null,
  }
  const sealedFrames = continuation.snapshots.map((_, index) =>
    continuation.sealedFrames?.[index] ?? createOutputReplaySnapshot({
      replaySnapshots: continuation.snapshots, events: state.events,
    }, index),
  )
  return {
    ...continuation, sealedFrames, acceptedCommands: [...continuation.acceptedCommands, command],
    checkpoint: captureSimulationCheckpoint({
      ...state,
      orders: { ...state.orders, [orderId]: order },
      teams: { ...state.teams, [team.teamId]: { ...team, activeOrderIds: [...team.activeOrderIds, orderId] } },
      events: [...state.events, event], nextEventSequenceNumber: state.nextEventSequenceNumber + 1,
    }),
  }
}
