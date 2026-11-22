import { syntheticGroupReference } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'

const labels: Readonly<Record<string, string>> = { peloton: 'Peloton', lead: 'Breakaway' }
export const fixtureFrames = syntheticGroupReference.map(frame => ({
  second: frame.second,
  groups: frame.groups.map(group => ({ ...group, name: labels[group.id] })),
}))

export function fixtureFrameAt(second: number) {
  return [...fixtureFrames].reverse().find(frame => frame.second <= second) ?? fixtureFrames[0]
}
