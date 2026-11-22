import { expect, it } from 'vitest'
import {
  checkpointSchema, commandSchema, eventSchema, raceInputSchema, raceStateSchema,
  resultSchema, timelineSchema,
} from './versionedRaceContracts'

const race = { version: 1, raceId: 'synthetic-race', stageId: 'synthetic-stage' }
const group = { id: 'g1', km: 0, speedKmh: 36, memberIds: ['r1', 'r2'] }
const sample = { ...race, raceSecond: 0, groups: [group] }

it('verifies versioned input and exclusive group membership', () => {
  const input = {
    ...race, seed: 'synthetic-seed', ruleset: 'offline-test', distanceKm: 1,
    profile: [{ km: 0, elevationMetres: 0 }, { km: 1, elevationMetres: 30 }],
    riders: [{ id: 'r1', teamId: 't1' }, { id: 'r2', teamId: 't2' }],
  }
  expect(raceInputSchema.safeParse(input).success).toBe(true)
  expect(raceInputSchema.safeParse({ ...input, distanceKm: 2 }).success).toBe(false)
  expect(raceInputSchema.safeParse({ ...input, version: 2 }).success).toBe(false)
  expect(raceStateSchema.safeParse(sample).success).toBe(true)
  expect(raceStateSchema.safeParse({ ...sample, groups: [group, { ...group, id: 'g2' }] }).success).toBe(false)
})

it('checks ordered timeline coordinates and consistent stage identity', () => {
  const timeline = { ...race, revision: 0, samples: [sample, { ...sample, raceSecond: 3 }] }
  expect(timelineSchema.safeParse(timeline).success).toBe(true)
  expect(timelineSchema.safeParse({ ...timeline, samples: [sample, sample] }).success).toBe(false)
  expect(timelineSchema.safeParse({ ...timeline, stageId: 'other-stage' }).success).toBe(false)
})

it('validates attack commands, event coordinates, checkpoint metadata and classification', () => {
  const command = { ...race, commandId: 'c1', sequence: 1, effectiveTick: 0, kind: 'attack', riderId: 'r1', teamId: 't1' }
  expect(commandSchema.safeParse(command).success).toBe(true)
  expect(commandSchema.safeParse({ ...command, effectiveTick: -1 }).success).toBe(false)
  expect(eventSchema.safeParse({ ...race, sequence: 1, raceSecond: 0, km: 0, kind: 'start' }).success).toBe(true)
  expect(eventSchema.safeParse({ ...race, sequence: 1, raceSecond: -1, km: 0, kind: 'start' }).success).toBe(false)
  expect(checkpointSchema.safeParse({ ...race, tick: 0, stateVersion: 1, stateDigest: 'a'.repeat(64) }).success).toBe(true)
  expect(checkpointSchema.safeParse({ ...race, tick: 0, stateVersion: 1, stateDigest: 'invalid' }).success).toBe(false)
  const finished = { riderId: 'r1', status: 'finished', rank: 1, seconds: 60 }
  expect(resultSchema.safeParse({ ...race, classifications: [finished] }).success).toBe(true)
  expect(resultSchema.safeParse({ ...race, classifications: [finished, { ...finished, riderId: 'r2' }] }).success).toBe(false)
  expect(resultSchema.safeParse({ ...race, classifications: [{ ...finished, status: 'dnf' }] }).success).toBe(false)
})
