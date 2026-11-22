import type { StageInput } from '../../domain/StageInput'
import { syntheticTenRiderStage } from './syntheticTenRiderStage'

const profiles = {
  flat: [70, 72, 70, 75],
  hilly: [70, 240, 100, 280],
  mountain: [100, 650, 430, 1080],
} as const

export function createSyntheticFullFieldStage(
  terrain: keyof typeof profiles,
  fieldSize: 24 | 48 | 96,
): StageInput {
  const teamCount = fieldSize / 8
  const riders = Array.from({ length: fieldSize }, (_, index) => {
    const team = Math.floor(index / 8) + 1
    const prototype = syntheticTenRiderStage.riders[index % 10]
    return {
      ...prototype,
      riderId: 'full-field-rider-' + String(index + 1).padStart(3, '0'),
      teamId: 'full-field-team-' + team,
      riderName: 'Fictional Rider ' + (index + 1),
      teamName: 'Fictional Team ' + team,
      role: index % 8 === 0 ? 'captain' as const : 'domestique' as const,
      attributes: {
        ...prototype.attributes,
        flat: 64 + index * 7 % 29,
        climbing: 63 + index * 11 % 31,
        sprint: 60 + index * 17 % 34,
      },
    }
  })
  return {
    ...syntheticTenRiderStage,
    stageId: 'synthetic-' + terrain + '-' + fieldSize,
    stageName: 'Synthetic ' + terrain + ' road stage',
    seed: 'uranius-full-field-v1-' + terrain,
    distanceKm: 30,
    profilePoints: profiles[terrain].map((elevationMetres, index) => ({ kilometre: index * 10, elevationMetres })),
    teams: Array.from({ length: teamCount }, (_, index) => {
      const roster = riders.slice(index * 8, index * 8 + 8)
      return { teamId: roster[0].teamId, teamName: roster[0].teamName, captainRiderId: roster[0].riderId, riderIds: roster.map(rider => rider.riderId) }
    }),
    riders,
  }
}
