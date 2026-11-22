import { describe, expect, it } from 'vitest'
import { compareAttacks } from './attackComparison'

describe('matched baseline and live attack acceptance', () => {
  it.each([['strong', 'successful'], ['caught', 'unsuccessful']] as const)(
    '%s reaches %s through the engine', (scenario, outcome) => {
      const result = compareAttacks(scenario)
      expect(result.historyIdentical).toBe(true)
      expect(result.track[0].status).toBe('executing')
      expect(result.track.at(-1)?.status).toBe(outcome)
      expect(result.baseline.events.some(event => event.eventType === 'ATTACK_STARTED')).toBe(false)
      expect(result.attacked.finalRiderStates.every(rider => rider.finished)).toBe(true)
      const gap = Math.max(...result.track.map(sample => sample.gapKm))
      if (scenario === 'strong') {
        expect(gap).toBeGreaterThanOrEqual(0.1)
        expect(result.attacked.finalRiderStates.map(rider => rider.finishTimeSeconds))
          .not.toEqual(result.baseline.finalRiderStates.map(rider => rider.finishTimeSeconds))
      }
      const control = result.baseline.finalRiderStates.find(rider => rider.riderId === result.selected.id)!
      const attacked = result.attacked.finalRiderStates.find(rider => rider.riderId === result.selected.id)!
      const start = result.startingEnergy[result.selected.id]
      if (scenario === 'caught') {
        const firstAfterAttack = result.attacked.snapshots.find(frame => frame.raceSecond > result.commandSecond)!
        expect(firstAfterAttack.groups.find(group => group.active && group.riderIds.includes(result.selected.id))?.groupType).toBe('peloton')
      }
      console.log(JSON.stringify({ scenario, gap, outcome,
        firstOutcomeSecond: result.track.find(sample => sample.status !== 'executing')?.second,
        control: [control.finishPosition, control.finishTimeSeconds, start - control.energy],
        attacked: [attacked.finishPosition, attacked.finishTimeSeconds, start - attacked.energy],
        events: [result.baseline.events.length, result.attacked.events.length],
      }))
    },
  )
})
