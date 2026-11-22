import { expect, it } from 'vitest'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { RaceAuthority } from './raceAuthority'

const owners = { 'synthetic-team-b': 'manager-b' }

it('recovers the last valid revision after interruption without losing accepted commands', () => {
  const authority = new RaceAuthority(syntheticTenRiderStage, owners)
  authority.advanceTo(5)
  const published = authority.elapsed()
  const accepted = authority.submit('manager-b', {
    commandId: 'recover-attack', teamId: 'synthetic-team-b', riderId: 'synthetic-rider-10',
    kind: 'attack', payload: {}, requestedTick: 5, expectedRevision: 0,
  })
  expect(accepted).toEqual({ status: 'accepted', revision: 1, effectiveTick: 5 })
  const saved = authority.exportRecovery()
  const abort = new AbortController()
  abort.abort()
  expect(() => authority.advanceTo(10, abort.signal)).toThrow()
  expect(authority.exportRecovery()).toStrictEqual(saved)
  expect(authority.finalize()).toBeNull()

  authority.advanceTo(10)
  const recovered = RaceAuthority.recover(JSON.parse(JSON.stringify(saved)), owners)
  expect(recovered.elapsed().revision).toBe(1)
  expect(recovered.elapsed().frames).toStrictEqual(published.frames)
  recovered.advanceTo(10)
  expect(recovered.elapsed()).toStrictEqual(authority.elapsed())

  recovered.advanceTo(100)
  authority.advanceTo(100)
  const result = recovered.finalize()
  expect(result).toStrictEqual(authority.finalize())
  expect(result?.events.filter(event => event.eventType === 'ATTACK_STARTED')).toHaveLength(1)
  expect(result?.finalRiderStates.every(rider => rider.finished)).toBe(true)
  expect(recovered.submit('manager-b', {
    commandId: 'closed', teamId: 'synthetic-team-b', riderId: 'synthetic-rider-9',
    kind: 'attack', payload: {}, requestedTick: 100, expectedRevision: 1,
  })).toEqual({ status: 'rejected', reason: 'closed' })

  const finalized = recovered.exportRecovery()
  expect(recovered.finalize()).toStrictEqual(result)
  expect(recovered.exportRecovery()).toStrictEqual(finalized)
  expect(RaceAuthority.recover(finalized, owners).finalize()).toStrictEqual(result)
  expect(() => RaceAuthority.recover({ ...saved, json: saved.json + ' ' }, owners)).toThrow('Invalid race recovery')
})
