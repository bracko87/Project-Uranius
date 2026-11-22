import { expect, it } from 'vitest'
import { fixtureFrames } from './fixture'
import { markerLayout } from './groupMarkers'

it('uses one keyed marker per group and keeps coincident positions exact', () => {
  const split = markerLayout(fixtureFrames[1].groups, 10)
  expect(split.map(marker => marker.id)).toEqual(['lead', 'peloton'])
  expect(split.map(marker => marker.x)).toEqual([242.4, 242.4])
  expect(split[0].y).not.toBe(split[1].y)
  const pursuit = markerLayout(fixtureFrames[2].groups, 10)
  expect(pursuit.map(marker => marker.x)).toEqual([372, 339.6])
  expect(markerLayout(fixtureFrames[3].groups, 10)).toHaveLength(1)
})
