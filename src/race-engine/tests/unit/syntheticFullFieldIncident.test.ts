import { expect, it } from 'vitest'
import { applyTechnicalIncident } from '../../simulation/applyTechnicalIncident'
import { createInitialState } from '../../simulation/createInitialState'
import { createSyntheticFullFieldStage } from '../fixtures/syntheticFullFieldStage'

it('applies a reproducible fictional puncture with a conserved full field', () => {
  const stage = createSyntheticFullFieldStage('mountain', 96)
  const state = createInitialState(stage)
  const riderId = stage.riders[0].riderId
  const incident = {
    state, riderId, technicalType: 'puncture' as const, severity: 'minor' as const,
    occurrenceIndex: 1, equipmentConditionPercent: 95, mechanicalTimeLossMultiplier: 1,
  }
  const result = applyTechnicalIncident(incident)
  expect(applyTechnicalIncident(incident)).toEqual(result)
  expect(result.event.eventType).toBe('RIDER_TECHNICAL_INCIDENT')
  expect(result.event.actorRiderId).toBe(riderId)
  expect(result.state.groups[result.targetGroupId].riderIds).toEqual([riderId])
  const active = Object.values(result.state.groups).filter(group => group.active)
  expect(active.flatMap(group => group.riderIds).sort()).toEqual(Object.keys(state.riders).sort())
  expect(state.riders[riderId].currentGroupId).toBe(result.sourceGroupId)
})
