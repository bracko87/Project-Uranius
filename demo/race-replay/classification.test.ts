import { expect, it } from 'vitest'
import { fixtureFrames, statusFrames } from './fixture'
import { frameAt, hasUniqueGroupMembership } from './timeline'

it('keeps a solo rider active and lists withdrawals and finishers outside active groups', () => {
  expect(fixtureFrames[3].groups.map(group => group.id)).toEqual(['peloton'])
  const before = frameAt(statusFrames, 499)
  const middle = frameAt(statusFrames, 500)
  expect(before.withdrawn).toBeUndefined()
  expect(middle.groups.map(group => group.roster.length)).toEqual([1, 8])
  expect(middle.withdrawn).toHaveLength(1)
  const final = frameAt(statusFrames, 1000)
  expect(final.groups).toEqual([])
  expect(final.finished).toHaveLength(9)
  expect(final.withdrawn).toEqual(middle.withdrawn)
  expect(hasUniqueGroupMembership(middle)).toBe(true)
  expect(hasUniqueGroupMembership(final)).toBe(true)
})
