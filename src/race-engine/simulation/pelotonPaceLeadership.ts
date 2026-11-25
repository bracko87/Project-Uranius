/**
 * Experimental peloton pace leadership model.
 * Calculates who can set the pace from a verified group, not who wins.
 * No movement, mutations, free catch or production integration.
 */
import type {RiderState} from '../domain/RiderState'
import {calculatePelotonBasePace} from './pelotonPace'

export interface PelotonPaceLeadershipInput {
 readonly riders:readonly RiderState[]
 readonly minimumSpeedKmh:number
 readonly maximumSpeedKmh:number
 readonly raceSecond:number
 readonly tickSeconds:number
 readonly maximumActiveLeaders?:number
}
export interface PelotonPaceLeadershipResult {
 readonly groupMeanBaseKmh:number
 readonly leaderCapabilityMean:number
 readonly groupCapabilityMean:number
 readonly potentialLeaderBaseKmh:number
 readonly potentialGainKmh:number
 readonly potentialGainPercent:number
 readonly designatedRiderIds:readonly string[]
 readonly rotationIndex:number
 readonly eligibleRiderCount:number
 readonly model:'ordered_cyclic_rotation_candidate'
}

export function calculatePelotonPaceLeadership(input:PelotonPaceLeadershipInput):PelotonPaceLeadershipResult{
 if(!Number.isInteger(input.raceSecond)||input.raceSecond<0||
  !Number.isInteger(input.tickSeconds)||input.tickSeconds<=0)
   throw Error('pelotonPaceLeadership: invalid race clock')
 const slots=input.maximumActiveLeaders??3
 if(!Number.isInteger(slots)||slots<1||slots>5)
  throw Error('pelotonPaceLeadership: active leaders must be 1..5')
 const base=calculatePelotonBasePace({
  riders:input.riders,minimumSpeedKmh:input.minimumSpeedKmh,
  maximumSpeedKmh:input.maximumSpeedKmh,
 })
 // Qualifying leaders must be able to contribute today; a very depleted
 // nominally strong rider is not eligible just for having a high flat rating.
 const pool=base.riderContributions.slice().sort((a,b)=>
  b.capabilityScore-a.capabilityScore||a.riderId.localeCompare(b.riderId))
 const qualified=pool.filter(p=>p.capabilityScore>=base.averageCapabilityScore&&
  input.riders.some(r=>r.riderId===p.riderId&&r.energy>5))
 const candidates=qualified.length?qualified:pool
 const rotationIndex=Math.floor(input.raceSecond/input.tickSeconds)%
  candidates.length
 const leaders=Array.from({length:Math.min(slots,candidates.length)},(_,i)=>
  candidates[(rotationIndex+i)%candidates.length])
 const leaderCapabilityMean=leaders.reduce((sum,r)=>sum+r.capabilityScore,0)/leaders.length
 const speedRangeKmh=input.maximumSpeedKmh-input.minimumSpeedKmh
 const speed=Math.min(input.maximumSpeedKmh,input.minimumSpeedKmh+
  speedRangeKmh*(leaderCapabilityMean/100)*0.5)
 return {groupMeanBaseKmh:base.baseSpeedKmh,
  groupCapabilityMean:base.averageCapabilityScore,leaderCapabilityMean,
  potentialLeaderBaseKmh:speed,
  potentialGainKmh:Math.max(0,speed-base.baseSpeedKmh),
  potentialGainPercent:base.baseSpeedKmh>0?
   Math.max(0,(speed/base.baseSpeedKmh-1)*100):0,
  designatedRiderIds:leaders.map(p=>p.riderId),rotationIndex,
  eligibleRiderCount:base.eligibleRiderCount,
  model:'ordered_cyclic_rotation_candidate'}
}
