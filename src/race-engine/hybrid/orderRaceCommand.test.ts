import { expect, it } from 'vitest'
import { orderRaceCommand } from './orderRaceCommand'

const clock = { raceId: 'race', stageId: 'stage', tick: 3, completed: false }
const request = {
  commandId: 'first', teamId: 'team', riderId: 'rider',
  kind: 'attack', payload: {}, requestedTick: 3, expectedRevision: 0,
}

it('assigns authoritative tick and ordered sequence on consecutive revisions', () => {
  const first = orderRaceCommand(clock, [], 'owner', request)
  expect(first).toMatchObject({ status: 'accepted', command: { ownerId: 'owner', sequence: 1, effectiveTick: 3 } })
  if (first.status !== 'accepted') throw new Error('Expected acceptance')
  expect(orderRaceCommand({ ...clock, tick: 4 }, [first.command], 'owner', {
    ...request, commandId: 'second', requestedTick: 4, expectedRevision: 1,
  })).toMatchObject({ status: 'accepted', command: { sequence: 2, effectiveTick: 4 } })
  expect(orderRaceCommand(clock, [first.command], 'owner', request)).toEqual({ status: 'rejected', reason: 'duplicate' })
})

it.each([
  [{ ...request, expectedRevision: 1 }, 'stale'],
  [{ ...request, requestedTick: 2 }, 'late'],
  [{ ...request, requestedTick: 4 }, 'future'],
  [{ ...request, payload: { power: 200 } }, 'invalid'],
  [{ ...request, sequence: 99 }, 'invalid'],
])('rejects invalid, stale or out-of-window requests', (input, reason) => {
  expect(orderRaceCommand(clock, [], 'owner', input)).toEqual({ status: 'rejected', reason })
})

it('rejects a request after completion', () => {
  expect(orderRaceCommand({ ...clock, completed: true }, [], 'owner', request)).toEqual({ status: 'rejected', reason: 'closed' })
})
