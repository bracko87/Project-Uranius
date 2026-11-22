import { measuredCrossingSecond } from '../../src/race-replay/measuredCrossingSecond'
import type { ReplayFrame, ReplayGroup } from './timeline'

export function raceGaps(frames: readonly ReplayFrame[], frame: ReplayFrame) {
  const leader = frame.groups.reduce<ReplayGroup | undefined>((first, group) => !first || group.km > first.km ? group : first, undefined)
  if (!leader) return []
  const track = frames.filter(sample => sample.second < frame.second).flatMap(sample => {
    const group = sample.groups.find(group => group.id === leader.id)
    return group ? [{ second: sample.second, km: group.km }] : []
  })
  track.push({ second: frame.second, km: leader.km })
  const continuous = track.every((sample, index) => index === 0 || sample.km >= track[index - 1].km)
  return frame.groups.map(group => {
    const distanceKm = leader.km - group.km
    const crossing = continuous ? measuredCrossingSecond(track, group.km) : null
    return { distanceKm, gapSeconds: distanceKm === 0 ? 0 : crossing === null ? null : frame.second - crossing }
  })
}
