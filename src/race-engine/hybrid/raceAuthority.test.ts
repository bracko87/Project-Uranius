import { expect, it } from 'vitest'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { RaceAuthority } from './raceAuthority'

const owners = { 'synthetic-team-a': 'manager-a', 'synthetic-team-b': 'manager-b' }
const first = {
  commandId: 'a1', teamId: 'synthetic-team-a', riderId: 'synthetic-rider-3',
  expectedRevision: 0, requestedTick: 5, kind: 'attack', payload: {},
}
const second = { ...first, commandId: 'b1', teamId: 'synthetic-team-b', riderId: 'synthetic-rider-10' }

it('serializes competing owners and deduplicates repeat requests', () => {
  const race = new RaceAuthority(syntheticTenRiderStage, owners)
  race.advanceTo(5)
  expect(race.submit('manager-b', first)).toEqual({ status: 'rejected', reason: 'ownership' })
  expect(race.submit('manager-a', { ...first, riderId: 'synthetic-rider-10' })).toEqual({ status: 'rejected', reason: 'eligibility' })
  const accepted = race.submit('manager-a', first)
  expect(accepted).toEqual({ status: 'accepted', revision: 1, effectiveTick: 5 })
  expect(race.submit('manager-b', second)).toEqual({ status: 'rejected', reason: 'stale' })
  expect(race.submit('manager-a', first)).toEqual(accepted)
  expect(race.submit('manager-a', { ...first, riderId: 'synthetic-rider-4' })).toEqual({ status: 'rejected', reason: 'duplicate' })
  expect(race.submit('manager-b', first)).toEqual({ status: 'rejected', reason: 'duplicate' })
  expect(race.submit('manager-b', { ...second, expectedRevision: 1 })).toMatchObject({ status: 'accepted', revision: 2 })
})

it('publishes elapsed frames only and isolates them from caller mutation', () => {
  const race = new RaceAuthority(syntheticTenRiderStage, owners)
  race.advanceTo(5)
  const past = race.elapsed()
  expect(Object.keys(past).sort()).toEqual(['completed', 'events', 'frames', 'raceId', 'raceSecond', 'revision', 'stageId'])
  race.elapsed().frames.splice(0)
  expect(race.elapsed()).toEqual(past)
  expect(race.submit('manager-a', first)).toMatchObject({ status: 'accepted' })
  race.advanceTo(6)
  const view = race.elapsed()
  expect(view.frames.slice(0, past.frames.length)).toStrictEqual(past.frames)
  expect(view.events.slice(0, past.events.length)).toStrictEqual(past.events)
  expect(view.frames.every(frame => frame.raceSecond <= view.raceSecond)).toBe(true)
  expect(view.events.every(event => event.raceSecond <= view.raceSecond)).toBe(true)
  expect(view.completed).toBe(false)
  expect(() => race.advanceTo(4)).toThrow('server tick')
})
