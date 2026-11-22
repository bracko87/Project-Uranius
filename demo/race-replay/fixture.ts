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
