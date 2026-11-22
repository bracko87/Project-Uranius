import { expect, it } from 'vitest'
import { createBreakawayGroup } from '../../simulation/createBreakawayGroup'
import { createInitialState } from '../../simulation/createInitialState'
import { reconcileBreakawayGroups } from '../../simulation/reconcileBreakawayGroups'
import { syntheticTenRiderStage } from '../fixtures/syntheticTenRiderStage'

it('splits two riders and returns the caught group to the peloton once', () => {
  const state = createInitialState(syntheticTenRiderStage)
  const split = createBreakawayGroup({
    state, sourceGroupId: 'peloton_main',
    riderIds: ['synthetic-rider-1', 'synthetic-rider-6'], speedKmh: 45, initialGapSeconds: 0,
  })
  expect(split.state.groups.peloton_main.riderIds).toHaveLength(8)
  expect(split.state.groups[split.breakawayGroupId].riderIds).toHaveLength(2)
  const first = reconcileBreakawayGroups(split.state)
  expect(first.reabsorbedBreakawayGroupIds).toEqual([split.breakawayGroupId])
  expect(first.state.groups[split.breakawayGroupId].active).toBe(false)
  expect([...first.state.groups.peloton_main.riderIds].sort()).toEqual(Object.keys(state.riders).sort())
  expect(reconcileBreakawayGroups(first.state).reabsorbedBreakawayGroupIds).toEqual([])
})
