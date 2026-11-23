import type { StageInput, StageRiderInput } from '../../src/race-engine/domain/StageInput'
import { syntheticTenRiderStage } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'

interface CatalogRider {
  rider_id: number
  team_id: number
  label: string
  team_label: string
  flat: number
  climbing: number
  stamina: number
  resistance: number
}

interface CatalogStage {
  stage_id: number
  label: string
  distance_m: number
}

interface CatalogTerrain {
  distance_m: number
  elevation_m: number
}

// Offline-only additions. Account slots are logical keys, never Auth credentials.
export const syntheticWorldDraft = {
  season: 1,
  calendar: [1, 2, 3].map(stageId => ({ stageId, seasonDay: stageId + 6 })),
  managers: [{ slot: 'fixture-manager-a', teamId: 1 }, { slot: 'fixture-manager-b', teamId: 2 }],
  clubProfiles: Array.from({ length: 20 }, (_, i) => ({
    teamId: i + 1,
    clubId: '00000000-0000-4000-8000-' + String(i + 11).padStart(12, '0'),
    countryCode: i % 2 ? 'FR' : 'DE',
  })),
  balances: Array.from({ length: 20 }, (_, i) => ({ teamId: i + 1, credits: 10_000 })),
  equipment: ['road_base', 'wheel_base'],
} as const

export function buildSyntheticStage(
  stage: CatalogStage,
  stageRiders: readonly CatalogRider[],
  terrain: readonly CatalogTerrain[],
): StageInput {
  const teams = new Map<string, StageRiderInput[]>()
  for (const row of [...stageRiders].sort((a, b) => a.rider_id - b.rider_id)) {
    const teamId = String(row.team_id)
    const roster = teams.get(teamId) ?? []
    roster.push({
      riderId: String(row.rider_id),
      teamId,
      teamName: row.team_label,
      riderName: row.label,
      role: roster.length ? 'domestique' : 'captain',
      attributes: {
        ...syntheticTenRiderStage.riders[(row.rider_id - 1) % 10].attributes,
        flat: row.flat,
        climbing: row.climbing,
        stamina: row.stamina,
        resistance: row.resistance,
      },
    })
    teams.set(teamId, roster)
  }

  return {
    raceId: 'uranius-synthetic-season-1',
    stageId: String(stage.stage_id),
    stageName: stage.label,
    stageFormat: 'road_race',
    distanceKm: stage.distance_m / 1000,
    seed: 'uranius-synthetic-catalog-v1-stage-' + stage.stage_id,
    settings: syntheticTenRiderStage.settings,
    teams: [...teams].map(([teamId, roster]) => ({
      teamId,
      teamName: roster[0].teamName,
      captainRiderId: roster[0].riderId,
      riderIds: roster.map(rider => rider.riderId),
    })),
    riders: [...teams.values()].flat(),
    profilePoints: [...terrain].sort((a, b) => a.distance_m - b.distance_m).map(point => ({
      kilometre: point.distance_m / 1000,
      elevationMetres: point.elevation_m,
    })),
    orders: [],
  }
}
