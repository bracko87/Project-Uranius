import { expect, it } from 'vitest'
import { courseProfile, distanceX } from './courseProfile'
import { syntheticTenRiderStage } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'

it('uses the same linear kilometre scale for profile and markers', () => {
  const { profilePoints, distanceKm } = syntheticTenRiderStage
  expect([0, 3, 7, 10].map(km => distanceX(km, distanceKm))).toEqual([48, 242.4, 501.59999999999997, 696])
  expect(courseProfile(profilePoints, distanceKm)).toContain('48,204 242.4,204 501.59999999999997,26 696,159.5')
})
