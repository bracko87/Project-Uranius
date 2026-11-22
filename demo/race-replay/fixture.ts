import { frameAt, type ReplayFrame } from './timeline'
import { syntheticGroupReference } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'

const labels: Readonly<Record<string, string>> = { peloton: 'Peloton', lead: 'Breakaway' }
export const fixtureFrames: readonly ReplayFrame[] = syntheticGroupReference.map(frame => ({
  second: frame.second,
  ...(frame.second === 600 ? { terminalKm: { lead: 6 } } : {}),
  groups: frame.groups.map(group => ({ ...group, name: labels[group.id] })),
}))

export function fixtureFrameAt(second: number) {
  return frameAt(fixtureFrames, second)
}

const climbEnd = 300 + 4 * 3600 / 29.7
export const terrainFrames: readonly ReplayFrame[] = [
  [0, 0, 36],
  [300, 3, 29.7],
  [climbEnd, 7, 39.24],
  [climbEnd + 3 * 3600 / 39.24, 10, 0],
].map(([second, km, speedKmh]) => ({
  second, groups: [{ ...fixtureFrames[0].groups[0], km, speedKmh }],
}))

export const fixtureEvents = [
  { second: 300, label: 'Two riders formed the breakaway' },
  { second: 600, label: 'The peloton caught the breakaway' },
] as const
