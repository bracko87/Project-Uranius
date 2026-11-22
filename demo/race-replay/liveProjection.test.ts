import { expect, it } from 'vitest'
import { acceptRevision, projectionEvents, projectionFrames } from './liveProjection'
import { createDemoAuthority } from './server'

it('preserves the elapsed prefix across an authoritative command revision', () => {
  const race = createDemoAuthority()
  race.advanceTo(5)
  const before = acceptRevision(undefined, race.elapsed())
  expect(race.submit('manager-b', {
    commandId: 'viewer-attack', teamId: 'synthetic-team-b', riderId: 'synthetic-rider-10',
    kind: 'attack', payload: {}, requestedTick: 5, expectedRevision: 0,
  })).toMatchObject({ status: 'accepted', revision: 1 })
  race.advanceTo(6)
  const next = acceptRevision(before, race.elapsed())
  expect(next.revision).toBe(1)
  expect(next.frames.slice(0, before.frames.length)).toEqual(before.frames)
  expect(projectionEvents(next).some(event => event.label.includes('attack started'))).toBe(true)
  expect(projectionFrames(next).at(-1)?.groups.some(group => group.id.startsWith('breakaway'))).toBe(true)
  expect(() => acceptRevision(next, before)).toThrow('Stale')
  expect(() => acceptRevision(before, { ...next, frames: next.frames.slice(1) })).toThrow('Elapsed history')
  expect(() => acceptRevision(undefined, { ...next, raceSecond: 0 })).toThrow('elapsed boundary')
  expect(next).not.toHaveProperty('final')
})
