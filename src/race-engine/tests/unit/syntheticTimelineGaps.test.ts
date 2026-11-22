import { expect, it } from 'vitest'
import { measuredCrossingSecond } from '../../../race-replay/measuredCrossingSecond'
import { eventSchema, timelineSchema } from '../../contracts/versionedRaceContracts'
import { syntheticGroupReference } from '../fixtures/syntheticTenRiderStage'

const race = { version: 1, raceId: 'synthetic-micro-race', stageId: 'synthetic-ten-km-stage' }
const samples = syntheticGroupReference.map(frame => ({
  ...race, raceSecond: frame.second,
  groups: frame.groups.map(group => ({ id: group.id, km: group.km, speedKmh: group.speedKmh, memberIds: [...group.roster] })),
}))

it('distinguishes simultaneous distance from measured crossing time', () => {
  const at450 = samples[2]
  expect(at450.groups.map(group => group.id)).toEqual(['lead', 'peloton'])
  expect(at450.groups[0].km - at450.groups[1].km).toBe(0.5)
  const track = (id: string) => samples.flatMap(frame => {
    const group = frame.groups.find(entry => entry.id === id)
    return group ? [{ second: frame.raceSecond, km: group.km }] : []
  })
  expect(measuredCrossingSecond(track('lead'), 5)).toBe(450)
  expect(measuredCrossingSecond(track('peloton'), 5)).toBe(500)
  expect(measuredCrossingSecond(track('peloton').slice(0, 3), 5)).toBeNull()
  expect(() => measuredCrossingSecond([{ second: 0, km: 2 }, { second: 1, km: 1 }], 2)).toThrow('Invalid position chronology')
})

it('validates sample chronology and elapsed split and catch events', () => {
  expect(timelineSchema.safeParse({ ...race, revision: 0, samples }).success).toBe(true)
  const events = [
    { ...race, sequence: 1, raceSecond: 300, km: 3, kind: 'split' },
    { ...race, sequence: 2, raceSecond: 600, km: 6, kind: 'catch' },
  ]
  expect(events.every(event => eventSchema.safeParse(event).success)).toBe(true)
  expect(events.filter(event => event.raceSecond <= 450).map(event => event.kind)).toEqual(['split'])
})
