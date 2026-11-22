import { expect, it } from 'vitest'
import { buildLiveRequest } from './liveControls'
import { createDemoAuthority } from './server'

it('sends the observed revision and tick and blocks orders after completion', () => {
  const race = createDemoAuthority()
  race.advanceTo(5)
  const selection = {
    commandId: 'browser-follow', teamId: 'synthetic-team-b', riderId: 'synthetic-rider-9',
    kind: 'follow', targetId: 'synthetic-rider-10',
  }
  const payload = buildLiveRequest(race.elapsed(), 30, selection)
  expect(payload).toMatchObject({ requestedTick: 5, expectedRevision: 0, payload: { targetRiderId: 'synthetic-rider-10' } })
  expect(race.submit('manager-b', payload)).toMatchObject({ status: 'accepted', revision: 1 })
  expect(buildLiveRequest(race.elapsed(), 30, selection).expectedRevision).toBe(1)
  race.advanceTo(100)
  expect(() => buildLiveRequest(race.elapsed(), 30, selection)).toThrow('Race completed')
})
