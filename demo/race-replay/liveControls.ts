import type { LiveProjection } from './liveProjection'

export function buildLiveRequest(projection: LiveProjection, tickSeconds: number, command: {
  commandId: string
  teamId: string
  riderId: string
  kind: string
  targetId: string
}) {
  if (projection.completed) throw new Error('Race completed.')
  const { commandId, teamId, riderId, kind, targetId } = command
  const payload = kind === 'chase' ? { targetGroupId: targetId }
    : kind === 'follow' || kind === 'support' ? { targetRiderId: targetId } : {}
  return {
    commandId, teamId, riderId, kind, payload,
    expectedRevision: projection.revision, requestedTick: projection.raceSecond / tickSeconds,
  }
}
