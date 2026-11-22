import type { RaceEvent } from '../domain/RaceEvent'
import { calculateStageProfileCategory } from '../simulation/stageProfileCategory'
import { createOutputReplaySnapshot } from '../simulation/createMultiGroupSimulationOutput'
import type { AcceptedRaceCommand } from './orderRaceCommand'
import type { RaceContinuation } from './raceContinuation'
import { captureSimulationCheckpoint, restoreSimulationCheckpoint } from './simulationCheckpoint'

export function applyAcceptedPursuit(continuation: RaceContinuation, command: AcceptedRaceCommand): RaceContinuation {
  const state = restoreSimulationCheckpoint(continuation.checkpoint)
  const revision = continuation.acceptedCommands.length
  if (command.kind === 'attack' || state.completed || command.raceId !== state.raceId || command.stageId !== state.stageId
    || command.expectedRevision !== revision || command.sequence !== revision + 1
    || command.effectiveTick * state.input.settings.tickSeconds !== state.raceSecond
    || continuation.acceptedCommands.some(previous => previous.commandId === command.commandId)) {
    throw new Error('Pursuit does not match the current race revision.')
  }
  const rider = state.riders[command.riderId]
  const group = rider && state.groups[rider.currentGroupId]
  if (!rider || rider.teamId !== command.teamId || rider.stageStatus !== 'racing' || !group?.active || rider.energy <= 0) {
    throw new Error('Rider is not eligible for pursuit.')
  }
  const pursuits = { ...state.livePursuits }
  const follows = { ...state.liveFollows }
  delete pursuits[rider.riderId]
  delete follows[rider.riderId]
  if (command.kind === 'chase') {
    const target = state.groups[command.payload.targetGroupId]
    if (group.groupType !== 'chase' || calculateStageProfileCategory(state.input).category !== 'flat'
      || !target?.active || target.distanceKm <= group.distanceKm) {
      throw new Error('Chase requires a flat stage and an active target ahead of the chase group.')
    }
    pursuits[rider.riderId] = target.groupId
  } else {
    const target = state.riders[command.payload.targetRiderId]
    if (!target || target.riderId === rider.riderId || target.stageStatus !== 'racing'
      || target.currentGroupId !== group.groupId) {
      throw new Error('Follow requires a different racing rider in the same group.')
    }
    follows[rider.riderId] = target.riderId
  }
  const event: RaceEvent = {
    sequenceNumber: state.nextEventSequenceNumber, eventType: 'ORDER_ACCEPTED',
    raceSecond: state.raceSecond, kmMarker: state.currentKm,
    actorRiderId: rider.riderId, teamId: rider.teamId, sourceGroupId: group.groupId,
    targetGroupId: command.kind === 'chase' ? command.payload.targetGroupId : null,
    relatedRiderIds: command.kind === 'follow' ? [command.payload.targetRiderId] : [],
    payload: { commandId: command.commandId, orderType: command.kind }, commentaryText: null,
  }
  return {
    ...continuation,
    acceptedCommands: [...continuation.acceptedCommands, command],
    sealedFrames: continuation.snapshots.map((_, index) =>
      continuation.sealedFrames?.[index] ?? createOutputReplaySnapshot({
        replaySnapshots: continuation.snapshots, events: state.events,
      }, index)),
    checkpoint: captureSimulationCheckpoint({
      ...state, livePursuits: pursuits, liveFollows: follows,
      events: [...state.events, event], nextEventSequenceNumber: state.nextEventSequenceNumber + 1,
    }),
  }
}
