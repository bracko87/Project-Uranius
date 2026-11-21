import { describe, expect, it } from 'vitest'
import { createReplayStageModelFromSimulationOutput } from '../../../race-replay/createReplayStageModelFromSimulationOutput'
import type { StageInput } from '../../domain/StageInput'
import { compareLegacyStageResult } from '../../integration/compareLegacyStageResult'
import { runDeterministicShadow } from '../../integration/runDeterministicShadow'

const stageInput: StageInput = {
  raceId: 'synthetic-race',
  stageId: 'synthetic-stage',
  stageName: 'Uranius Synthetic Stage',
  stageFormat: 'road_race',
  distanceKm: 1,
  seed: 'synthetic-seed',
  settings: {
    tickSeconds: 30,
    replaySnapshotIntervalSeconds: 30,
    maximumBreakawaySize: 8,
    minimumSpeedKmh: 36,
    maximumSpeedKmh: 60,
  },
  teams: [{
    teamId: 'synthetic-team',
    teamName: 'Synthetic Team',
    captainRiderId: 'synthetic-rider',
    riderIds: ['synthetic-rider'],
  }, {
    teamId: 'synthetic-team-b',
    teamName: 'Synthetic Team B',
    captainRiderId: 'synthetic-rider-b',
    riderIds: ['synthetic-rider-b'],
  }],
  riders: [{
    riderId: 'synthetic-rider',
    teamId: 'synthetic-team',
    riderName: 'Synthetic Rider',
    teamName: 'Synthetic Team',
    role: 'captain',
    attributes: {
      flat: 75,
      sprint: 85,
      acceleration: 80,
      stamina: 80,
      resistance: 80,
      recovery: 80,
      teamwork: 80,
    },
  }, {
    riderId: 'synthetic-rider-b',
    teamId: 'synthetic-team-b',
    riderName: 'Synthetic Rider B',
    teamName: 'Synthetic Team B',
    role: 'captain',
    attributes: { flat: 60, sprint: 60, acceleration: 60, stamina: 60, resistance: 60, recovery: 60, teamwork: 60 },
  }],
  profilePoints: [
    { kilometre: 0, elevationMetres: 100 },
    { kilometre: 0.5, elevationMetres: 110 },
    { kilometre: 1, elevationMetres: 100 },
  ],
  orders: [],
}

describe('offline synthetic stage', () => {
  it('skips disabled shadow mode and repeats permitted runs exactly', () => {
    expect(runDeterministicShadow('disabled', stageInput).status).toBe('skipped')
    const first = runDeterministicShadow('shadow_read_only', stageInput)
    expect(first.status).toBe('completed')
    expect(runDeterministicShadow('shadow_read_only', stageInput)).toEqual(first)
  })

  it('adapts the replay and compares the fixed synthetic classification', () => {
    const run = runDeterministicShadow('shadow_read_only', stageInput)
    if (run.status !== 'completed') throw new Error('Expected a completed shadow run')
    const replay = createReplayStageModelFromSimulationOutput({
      stageInput,
      simulationOutput: run.output,
    })
    expect(replay.distanceKm).toBe(1)
    expect(replay.finalResults).toHaveLength(2)
    const comparison = compareLegacyStageResult([{
      rider_id: 'synthetic-rider',
      team_id: 'synthetic-team',
      rank: 1,
      status: 'finished',
      elapsed_seconds: null,
    }, {
      rider_id: 'synthetic-rider-b',
      team_id: 'synthetic-team-b',
      rank: 2,
      status: 'finished',
      elapsed_seconds: null,
    }], run.output)
    expect(comparison.matchedRiderCount).toBe(2)
    expect(comparison.teamDifferences).toEqual([])
    expect(comparison.positionDifferences).toEqual([])
    expect(comparison.statusDifferences).toEqual([])
  })
})
