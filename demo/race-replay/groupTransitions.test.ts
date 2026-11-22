import { expect, it } from 'vitest'
import { fixtureEvents, fixtureFrames } from './fixture'
import { elapsedEvents, frameAt, hasUniqueGroupMembership } from './timeline'

it('exposes the split at the recorded instant and preserves unique rider identities', () => {
  expect(elapsedEvents(fixtureEvents, 299.99)).toEqual([])
  expect(elapsedEvents(fixtureEvents, 300)).toEqual([fixtureEvents[0]])
  const before = frameAt(fixtureFrames, 299.99)
  const after = frameAt(fixtureFrames, 300)
  expect(before.groups[0].id).toBe(after.groups[1].id)
  expect(after.groups[0].roster).toEqual(before.groups[0].roster.slice(0, 2))
  expect(after.groups[1].roster).toEqual(before.groups[0].roster.slice(2))
  expect(hasUniqueGroupMembership(after)).toBe(true)
  expect(hasUniqueGroupMembership({ ...after, groups: [after.groups[0], ...after.groups] })).toBe(false)
})
