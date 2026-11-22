import type { RaceAuthority } from '../../src/race-engine/hybrid/raceAuthority'
import type { ReplayEvent, ReplayFrame } from './timeline'

export type ElapsedProjection = ReturnType<RaceAuthority['elapsed']>
export type LiveProjection = ElapsedProjection & { final?: NonNullable<ReturnType<RaceAuthority['finalize']>> }

export function acceptRevision(previous: LiveProjection | undefined, incoming: LiveProjection): LiveProjection {
  if (incoming.frames.some(frame => frame.raceSecond > incoming.raceSecond)
    || incoming.events.some(event => event.raceSecond > incoming.raceSecond)
    || (!incoming.completed && incoming.final)) throw new Error('Response exceeds the elapsed boundary.')
  if (previous) {
    if (incoming.raceId !== previous.raceId || incoming.stageId !== previous.stageId
      || incoming.revision < previous.revision || incoming.raceSecond < previous.raceSecond
      || (previous.completed && !incoming.completed)) throw new Error('Stale race response.')
    const samePrefix = <T>(old: readonly T[], next: readonly T[]) =>
      old.length <= next.length && old.every((entry, index) => JSON.stringify(entry) === JSON.stringify(next[index]))
    if (!samePrefix(previous.frames, incoming.frames) || !samePrefix(previous.events, incoming.events)
      || !samePrefix(previous.riderStatuses, incoming.riderStatuses)) throw new Error('Elapsed history mismatch.')
  }
  return incoming
}

const names = { peloton: 'Peloton', breakaway: 'Breakaway', chase: 'Chase group', dropped: 'Dropped group', finished: 'Finished' }

export function projectionFrames(projection: Pick<LiveProjection, 'frames' | 'riderStatuses'>): ReplayFrame[] {
  return projection.frames.map((sample, index) => {
    const status = projection.riderStatuses[index]
    const active = sample.groups.filter(group => group.active && group.groupType !== 'finished' && group.riderIds.length)
    return {
      second: sample.raceSecond,
      finished: status.finished, withdrawn: status.withdrawn,
      terminalKm: Object.fromEntries(sample.groups.filter(group => !group.active).map(group => [group.groupId, group.distanceKm])),
      groups: active.map(group => ({
        id: group.groupId,
        name: names[group.groupType] + (group.groupType === 'peloton' ? '' : ' ' + group.groupId.split('_').at(-1)),
        km: group.distanceKm, speedKmh: group.speedKmh, roster: group.riderIds,
      })),
    }
  })
}

export function projectionEvents(projection: Pick<LiveProjection, 'events'>): ReplayEvent[] {
  return projection.events.map(event => ({
    second: event.raceSecond,
    label: event.commentaryText ?? event.eventType.toLowerCase().replaceAll('_', ' ')
      + (event.actorRiderId ? ' · ' + event.actorRiderId : ''),
  }))
}
