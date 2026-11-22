import { expect, it } from 'vitest'
import { calculateTerrainSpeed } from '../../src/race-engine/simulation/terrainSpeed'
import { terrainFrames } from './fixture'
import { frameAt } from './timeline'

it('matches flat, climbing and descending motion from the precomputed samples', () => {
  for (const [index, gradient] of [0, 5, -5].entries()) {
    const sample = terrainFrames[index]
    const expected = calculateTerrainSpeed({
      baseSpeedKmh: 36, gradientPercent: gradient, minimumSpeedKmh: 12, maximumSpeedKmh: 90,
    }).speedKmh
    expect(sample.groups[0].speedKmh).toBeCloseTo(expected, 8)
    const later = frameAt(terrainFrames, sample.second + 30)
    expect(later.groups[0].km - sample.groups[0].km).toBeCloseTo(expected / 120, 8)
  }
})
