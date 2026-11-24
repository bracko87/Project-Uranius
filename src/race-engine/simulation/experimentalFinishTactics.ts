/**
 * OFFLINE OPT-IN POC: deterministic final-sprint/lead-out effects.
 * Executed orders affect ranking only for riders in the same finishing group,
 * in the final 3km. No fabricated time gap or persistent pace boost.
 */
import type {SimulationState} from '../domain/SimulationState'
import type {GroupState} from '../domain/GroupState'

export interface ExperimentalFinishTactic {
  readonly sprintBonus: number
  readonly energyCost: number
}

export function calculateExperimentalFinishTactics(
  state:SimulationState, group:GroupState, riderId:string,
):ExperimentalFinishTactic {
 const rider=state.riders[riderId]
 if(!rider||!group.riderIds.includes(riderId))return {sprintBonus:0,energyCost:0}
 const eligible=Object.values(state.orders)
  .filter(o=>o.status==='executed'&&
   o.eligibleFromKm>=state.stageDistanceKm-3&&
   o.eligibleFromKm<state.stageDistanceKm&&
   o.executionRaceSecond!==undefined&&
   o.executionRaceSecond<=state.raceSecond)
  .sort((a,b)=>a.orderId.localeCompare(b.orderId))
 const sprint=eligible.some(o=>o.type==='sprint'&&o.riderId===riderId&&o.teamId===rider.teamId)
 const leadouts=eligible.filter(o=>o.type==='leadout'&&o.targetRiderId===riderId&&
  o.riderId!==riderId&&o.teamId===rider.teamId&&
  state.riders[o.riderId]?.teamId===rider.teamId&&
  group.riderIds.includes(o.riderId))
 const leadoutRider=eligible.some(o=>o.type==='leadout'&&o.riderId===riderId&&
  o.targetRiderId!==null&&o.targetRiderId!==undefined&&
  group.riderIds.includes(o.targetRiderId)&&
  state.riders[o.targetRiderId]?.teamId===rider.teamId)
 return {
  sprintBonus:(sprint?8:0)+Math.min(leadouts.length,2)*4,
  energyCost:Math.min(rider.energy,(sprint?1:0)+(leadoutRider?0.75:0)),
 }
}
