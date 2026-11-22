import { expect, it } from 'vitest'
import { fixtureFrames } from './fixture'
import { frameAt } from './timeline'

it('uses checkpoint coordinates and bounds intermediate positions', () => {
  expect(frameAt(fixtureFrames, 300)).toEqual(fixtureFrames[1])
  expect(frameAt(fixtureFrames, 375).groups.map(group => group.km)).toEqual([4, 3.75])
  expect(frameAt(fixtureFrames, 525).groups.map(group => group.km)).toEqual([5.5, 5.25])
  expect(frameAt(fixtureFrames, 299).groups.map(group => group.id)).toEqual(['peloton'])
  expect(frameAt(fixtureFrames, 2000)).toEqual(fixtureFrames.at(-1))
})
