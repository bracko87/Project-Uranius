import { z } from 'zod'

const id = z.string().min(1)
const nonNegative = z.number().finite().nonnegative()
const counter = nonNegative.int()
const version = z.literal(1)
const raceKey = z.object({ version, raceId: id, stageId: id })
const position = z.object({
  id,
  km: nonNegative,
  speedKmh: nonNegative,
  memberIds: z.array(id).min(1),
}).strict()
const profilePoint = z.object({ km: nonNegative, elevationMetres: z.number().finite() }).strict()
const rider = z.object({ id, teamId: id }).strict()

export const raceInputSchema = raceKey.extend({
  seed: id,
  ruleset: id,
  distanceKm: z.number().finite().positive(),
  profile: z.array(profilePoint).min(2),
  riders: z.array(rider).min(2),
}).strict().refine(input =>
  input.profile[0].km === 0
  && input.profile[input.profile.length - 1].km === input.distanceKm
  && input.profile.every((point, index) => index === 0 || point.km > input.profile[index - 1].km)
  && new Set(input.riders.map(entry => entry.id)).size === input.riders.length,
)

export const raceStateSchema = raceKey.extend({
  raceSecond: nonNegative,
  groups: z.array(position),
}).strict().refine(state => {
  const members = state.groups.flatMap(group => group.memberIds)
  return new Set(state.groups.map(group => group.id)).size === state.groups.length
    && new Set(members).size === members.length
})

export const commandSchema = raceKey.extend({
  commandId: id,
  sequence: counter.positive(),
  effectiveTick: counter,
  teamId: id,
  riderId: id,
  kind: z.literal('attack'),
}).strict()

export const eventSchema = raceKey.extend({
  sequence: counter.positive(),
  raceSecond: nonNegative,
  km: nonNegative,
  kind: id,
}).strict()

export const timelineSchema = raceKey.extend({
  revision: counter,
  samples: z.array(raceStateSchema),
}).strict().refine(timeline => timeline.samples.every((sample, index) =>
  sample.raceId === timeline.raceId
  && sample.stageId === timeline.stageId
  && (index === 0 || sample.raceSecond > timeline.samples[index - 1].raceSecond),
))

export const checkpointSchema = raceKey.extend({
  tick: counter,
  stateVersion: counter.positive(),
  stateDigest: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()

const classification = z.discriminatedUnion('status', [
  z.object({ riderId: id, status: z.literal('finished'), rank: counter.positive(), seconds: nonNegative }).strict(),
  z.object({ riderId: id, status: z.enum(['dnf', 'dns']), rank: z.null(), seconds: z.null() }).strict(),
])
export const resultSchema = raceKey.extend({
  classifications: z.array(classification),
}).strict().refine(result => {
  const ranks = result.classifications.flatMap(row => row.rank === null ? [] : [row.rank])
  return new Set(result.classifications.map(row => row.riderId)).size === result.classifications.length
    && new Set(ranks).size === ranks.length
})
