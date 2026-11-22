import { expect, it } from 'vitest'
import { fixtureFrameAt } from './fixture'

it('selects the expected start, split and catch groups', () => {
  expect(fixtureFrameAt(0).groups.map(group => group.roster.length)).toEqual([10])
  expect(fixtureFrameAt(300).groups.map(group => group.roster.length)).toEqual([2, 8])
  expect(fixtureFrameAt(600).groups.map(group => group.roster.length)).toEqual([10])
})
