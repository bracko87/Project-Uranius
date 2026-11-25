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
 /** When provided, select authorized riders BEFORE the cyclic rotation. */
 readonly eligibleOrderedRiderIds?:readonly string[]
 /** OFFLINE: rider-specific fixed duty epochs; no candidate-count modulo rotation. */
 readonly experimentalStableDutyRotation?:boolean
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
 readonly model:'ordered_cyclic_rotation_candidate'|'rider_stable_duty_candidate'
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
 const permitted=input.eligibleOrderedRiderIds===undefined?null:
  new Set(input.eligibleOrderedRiderIds)
 const candidates=permitted===null?(qualified.length?qualified:pool):
  qualified.filter(p=>permitted.has(p.riderId))
 // An empty authorized pool must not fall back to unauthorized riders.
 if(candidates.length===0)return {
  groupMeanBaseKmh:base.baseSpeedKmh,
  groupCapabilityMean:base.averageCapabilityScore,
  leaderCapabilityMean:base.averageCapabilityScore,
  potentialLeaderBaseKmh:base.baseSpeedKmh,
  potentialGainKmh:0,potentialGainPercent:0,
  designatedRiderIds:[],rotationIndex:0,
  eligibleRiderCount:base.eligibleRiderCount,
  model:input.experimentalStableDutyRotation?'rider_stable_duty_candidate':'ordered_cyclic_rotation_candidate',
 }
 // Each rider's duty window depends only on their identity and the race clock,
 // never on the size of the authorized pool. Adding candidates cannot change
 // when an already-authorized rider is eligible for a shift.
 const stable=input.experimentalStableDutyRotation===true
 const clockEpoch=Math.floor(input.raceSecond/(input.tickSeconds*10))
 const dutyHash=(id:string)=>Array.from(id).reduce((n,c)=>
  (n*31+c.charCodeAt(0))>>>0,2166136261)
 const onDuty=stable?candidates.filter(p=>
  (dutyHash(p.riderId)+clockEpoch)%3!==0):candidates
 const dutyPool=stable&&onDuty.length?onDuty:candidates
 const rotationIndex=stable?clockEpoch:
  Math.floor(input.raceSecond/input.tickSeconds)%candidates.length
 const leaders=stable?dutyPool.slice(0,Math.min(slots,dutyPool.length)):
  Array.from({length:Math.min(slots,candidates.length)},(_,i)=>
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
  model:stable?'rider_stable_duty_candidate':'ordered_cyclic_rotation_candidate'}
}
