import { frameAt, type ReplayFrame } from './timeline'
import { syntheticGroupReference } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'

const labels: Readonly<Record<string, string>> = { peloton: 'Peloton', lead: 'Breakaway' }
export const fixtureFrames: readonly ReplayFrame[] = syntheticGroupReference.map(frame => ({
  second: frame.second,
  ...(frame.second === 600 ? { terminalKm: { lead: 6 } } : {}),
  ...(frame.second === 1000 ? { finished: frame.groups[0].roster, terminalKm: { peloton: 10 } } : {}),
  groups: frame.second === 1000 ? [] : frame.groups.map(group => ({ ...group, name: labels[group.id] })),
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
  second,
  groups: speedKmh === 0 ? [] : [{ ...fixtureFrames[0].groups[0], km, speedKmh }],
  ...(speedKmh === 0 ? { finished: fixtureFrames[0].groups[0].roster, terminalKm: { peloton: km } } : {}),
}))

export const fixtureEvents = [
  { second: 300, label: 'Two riders formed the breakaway' },
  { second: 600, label: 'The peloton caught the breakaway' },
] as const

const roster = fixtureFrames[0].groups[0].roster
export const statusFrames: readonly ReplayFrame[] = [
  fixtureFrames[0],
  {
    second: 500, withdrawn: [roster[9]], groups: [
      { id: 'lead', name: 'Solo rider', km: 5, speedKmh: 36, roster: [roster[0]] },
      { id: 'peloton', name: 'Peloton', km: 5, speedKmh: 32, roster: roster.slice(1, 9) },
    ],
  },
  { second: 1000, withdrawn: [roster[9]], finished: roster.slice(0, 9), groups: [], terminalKm: { lead: 10, peloton: 10 } },
]
