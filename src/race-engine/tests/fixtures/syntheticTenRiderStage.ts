import type { StageInput, StageRiderInput } from '../../domain/StageInput'

const riders: StageRiderInput[] = Array.from({ length: 10 }, (_, index) => {
  const team = index < 5 ? 'a' : 'b'
  return {
    riderId: 'synthetic-rider-' + (index + 1),
    teamId: 'synthetic-team-' + team,
    riderName: 'Fictional Rider ' + (index + 1),
    teamName: 'Fictional Team ' + team,
    role: index % 5 === 0 ? 'captain' : 'domestique',
    attributes: {
      flat: 70 + index, climbing: 80 - index, sprint: 65 + index,
      acceleration: 75, stamina: 80, resistance: 75, recovery: 75, teamwork: 80,
    },
  }
})

export const syntheticTenRiderStage: StageInput = {
  raceId: 'synthetic-micro-race',
  stageId: 'synthetic-ten-km-stage',
  stageName: 'Synthetic Ten Kilometre Stage',
  stageFormat: 'road_race',
  distanceKm: 10,
  seed: 'uranius-micro-v1',
  settings: {
    tickSeconds: 30, replaySnapshotIntervalSeconds: 30,
    maximumBreakawaySize: 8, minimumSpeedKmh: 24, maximumSpeedKmh: 72,
  },
  teams: ['a', 'b'].map(team => {
    const roster = riders.filter(rider => rider.teamId === 'synthetic-team-' + team)
    return { teamId: roster[0].teamId, teamName: roster[0].teamName, captainRiderId: roster[0].riderId, riderIds: roster.map(rider => rider.riderId) }
  }),
  riders,
  profilePoints: [
    { kilometre: 0, elevationMetres: 100 },
    { kilometre: 3, elevationMetres: 100 },
    { kilometre: 7, elevationMetres: 300 },
    { kilometre: 10, elevationMetres: 150 },
  ],
  orders: [],
}

const roster = riders.map(rider => rider.riderId)

// Independent reference samples for movement and timeline checks.
export const syntheticGroupReference = [
  { second: 0, groups: [{ id: 'peloton', km: 0, speedKmh: 36, roster }] },
  { second: 300, groups: [
    { id: 'lead', km: 3, speedKmh: 48, roster: roster.slice(0, 2) },
    { id: 'peloton', km: 3, speedKmh: 36, roster: roster.slice(2) },
  ] },
  { second: 450, groups: [
    { id: 'lead', km: 5, speedKmh: 24, roster: roster.slice(0, 2) },
    { id: 'peloton', km: 4.5, speedKmh: 36, roster: roster.slice(2) },
  ] },
  { second: 600, groups: [{ id: 'peloton', km: 6, speedKmh: 36, roster }] },
  { second: 1000, groups: [{ id: 'peloton', km: 10, speedKmh: 0, roster }] },
] as const
