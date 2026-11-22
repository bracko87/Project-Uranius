import { expect, it } from 'vitest'
import { fixtureFrames } from './fixture'
import { raceGaps } from './raceGaps'

it('measures shared-distance passage time rather than using a pace conversion', () => {
  expect(raceGaps(fixtureFrames, fixtureFrames[2])).toEqual([
    { distanceKm: 0, gapSeconds: 0 },
    { distanceKm: 0.5, gapSeconds: 37.5 },
  ])
  const current = { ...fixtureFrames[2], groups: [fixtureFrames[2].groups[0], { ...fixtureFrames[2].groups[1], km: 2.9 }] }
  expect(raceGaps(fixtureFrames, current)[1]).toEqual({ distanceKm: 2.1, gapSeconds: null })
})
