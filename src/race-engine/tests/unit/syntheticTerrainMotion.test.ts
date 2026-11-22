import { expect, it } from 'vitest'
import { calculateTerrainSpeed } from '../../simulation/terrainSpeed'

it.each([
  [0, 36, 0.3],
  [5, 29.7, 0.2475],
  [-5, 39.24, 0.327],
])('matches expected speed and 30-second advance at %s percent', (gradientPercent, expectedSpeed, expectedAdvance) => {
  const { speedKmh } = calculateTerrainSpeed({
    baseSpeedKmh: 36, gradientPercent, minimumSpeedKmh: 12, maximumSpeedKmh: 90,
  })
  expect(speedKmh).toBeCloseTo(expectedSpeed, 8)
  expect(speedKmh * 30 / 3600).toBeCloseTo(expectedAdvance, 8)
})
