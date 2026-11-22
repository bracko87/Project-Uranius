import { expect, it } from 'vitest'
import { syntheticGroupReference, syntheticTenRiderStage } from '../fixtures/syntheticTenRiderStage'

it('provides ten unique fictional starters and a flat, climbing and descending profile', () => {
  const { riders, teams, profilePoints, distanceKm } = syntheticTenRiderStage
  expect(new Set(riders.map(rider => rider.riderId)).size).toBe(10)
  expect(teams.map(team => team.riderIds.length)).toEqual([5, 5])
  expect(distanceKm).toBe(10)
  expect(profilePoints.map(point => point.elevationMetres)).toEqual([100, 100, 300, 150])
})

it('matches hand-computed constant-speed positions and group membership', () => {
  const [start, split, chase, catchUp, finish] = syntheticGroupReference
  const km = (kmh: number, seconds: number) => kmh * seconds / 3600
  expect(start.groups[0].km + km(36, split.second - start.second)).toBe(3)
  expect(chase.groups.map(group => group.km)).toEqual([3 + km(48, 150), 3 + km(36, 150)])
  expect(chase.groups.map(group => group.km + km(group.speedKmh, 150))).toEqual([6, 6])
  expect(finish.groups[0].km).toBe(catchUp.groups[0].km + km(36, 400))
  expect(syntheticGroupReference.map(frame => frame.groups.map(group => group.roster.length))).toEqual([[10], [2, 8], [2, 8], [10], [10]])
  for (const frame of syntheticGroupReference) {
    expect(frame.groups.flatMap(group => [...group.roster]).sort()).toEqual([...start.groups[0].roster].sort())
  }
})
