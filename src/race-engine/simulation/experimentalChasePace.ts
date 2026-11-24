/**
 * POC ONLY: a valid executed chase instruction activates a bounded peloton
 * cooperation effort while a real breakaway remains physically ahead.
 * Reuses canonical groupCooperationPace; no synthetic gap or catch immunity.
 */
import type {SimulationState} from '../domain/SimulationState'
import type {GroupState} from '../domain/GroupState'
import {calculateGroupCooperationPace} from './groupCooperationPace'

export function calculateExperimentalChaseMultiplier(
 state:SimulationState, group:GroupState, gradientPercent:number,
):number{
 if(group.groupType!=='peloton'||!group.active)return 1
 const breakaways=Object.values(state.groups).filter(other=>
  other.active&&other.groupType==='breakaway'&&other.distanceKm>group.distanceKm)
 if(breakaways.length===0)return 1
 const aheadKm=Math.max(...breakaways.map(other=>other.distanceKm-group.distanceKm))
 // Ignore a gap that is too small to represent an organized chase.
 const gapSeconds=aheadKm/Math.max(group.speedKmh,0.000001)*3600
 if(gapSeconds<5)return 1
 const riders=group.riderIds.map(id=>state.riders[id]).filter(r=>r&&r.stageStatus==='racing')
 if(riders.length<2)return 1
 const chaseRiders=Object.values(state.orders).filter(order=>
  order.type==='chase'&&order.status==='executed'&&
  order.executionRaceSecond!==undefined&&order.executionRaceSecond<=state.raceSecond&&
  group.riderIds.includes(order.riderId)&&
  state.riders[order.riderId]?.teamId===order.teamId&&
  (state.riders[order.riderId]?.energy ?? 0)>5)
 if(chaseRiders.length===0)return 1
 const avgTeamwork=riders.reduce((sum,r)=>sum+r.attributes.teamwork,0)/riders.length
 const cooperation=calculateGroupCooperationPace({
  groupType:'peloton',groupSize:riders.length,
  averageTeamwork:avgTeamwork,gradientPercent,
 })
 // Limit a single chase call to 1.5% additional pace; teamwork and terrain
 // can reduce it further. Every group rider pays energy at the applied speed.
 const collectiveEffort=Math.min(1,chaseRiders.length/2)
 return 1+Math.min(0.015,cooperation.paceBonusPercent/100)*collectiveEffort
}
