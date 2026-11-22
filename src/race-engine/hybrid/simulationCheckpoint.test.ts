import { expect, it } from 'vitest'
import { createInitialState } from '../simulation/createInitialState'
import { simulateMultiGroupTick } from '../simulation/simulateMultiGroupTick'
import { syntheticTenRiderStage } from '../tests/fixtures/syntheticTenRiderStage'
import { captureSimulationCheckpoint, restoreSimulationCheckpoint } from './simulationCheckpoint'

it('round trips progressed state including pending orders and produces the same future ticks', () => {
  let current = createInitialState({
    ...syntheticTenRiderStage,
    orders: [{
      orderId: 'pending-attack', teamId: 'synthetic-team-a', riderId: 'synthetic-rider-1',
      type: 'attack', status: 'loaded', eligibleFromKm: 2, eligibleUntilKm: 4, priority: 1, maximumFollowers: 0,
    }],
  })
  current = simulateMultiGroupTick(current).state
  expect(current.raceSecond).toBeGreaterThan(0)
  const checkpoint = captureSimulationCheckpoint(current)
  let restored = restoreSimulationCheckpoint(JSON.parse(JSON.stringify(checkpoint)))
  expect(restored).not.toBe(current)
  expect(restored).toStrictEqual(current)
  expect(Object.keys(restored.riders)).toEqual(Object.keys(current.riders))
  for (let tick = 0; tick < 10; tick++) {
    current = simulateMultiGroupTick(current).state
    restored = simulateMultiGroupTick(restored).state
    expect(restored).toStrictEqual(current)
  }
  expect(current.events.some(event => event.eventType === 'ATTACK_STARTED')).toBe(true)
  expect(restoreSimulationCheckpoint(checkpoint).raceSecond).toBeLessThan(current.raceSecond)
})

it('rejects corrupted state and unsupported engine versions', () => {
  const checkpoint = captureSimulationCheckpoint(createInitialState(syntheticTenRiderStage))
  expect(() => restoreSimulationCheckpoint({ ...checkpoint, stateJson: checkpoint.stateJson + ' ' })).toThrow('digest mismatch')
  expect(() => restoreSimulationCheckpoint({ ...checkpoint, stateVersion: 2 } as unknown as typeof checkpoint)).toThrow('Unsupported')
})
