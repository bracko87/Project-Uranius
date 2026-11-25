/**
 * OFFLINE candidate only: fund the potential pace-leadership advantage.
 * No mutation, no movement, no automatic orders or production integration.
 */
import type {RiderState} from '../domain/RiderState'
import {calculatePelotonPaceLeadership} from './pelotonPaceLeadership'

export interface FundedPelotonLeadershipInput {
 readonly riders:readonly RiderState[]
 readonly minimumSpeedKmh:number
 readonly maximumSpeedKmh:number
 readonly raceSecond:number
 readonly tickSeconds:number
 readonly eligibleOrderedRiderIds:readonly string[]
 readonly maximumActiveLeaders?:number
}
export interface FundedPelotonLeadershipResult {
 readonly baseSpeedKmh:number
 readonly fundedSpeedKmh:number
 readonly fundedBonusPercent:number
 readonly selectedRiderIds:readonly string[]
 readonly surchargeByRiderId:Readonly<Record<string,number>>
 readonly totalSurcharge:number
 readonly reason:'no_orders'|'no_capable_leaders'|'no_funding'|'funded'
}
const round=(n:number)=>Number(n.toFixed(6))
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))

export function calculateFundedPelotonLeadership(input:FundedPelotonLeadershipInput):FundedPelotonLeadershipResult {
 const leadership=calculatePelotonPaceLeadership({
  riders:input.riders,minimumSpeedKmh:input.minimumSpeedKmh,
  maximumSpeedKmh:input.maximumSpeedKmh,raceSecond:input.raceSecond,
  tickSeconds:input.tickSeconds,maximumActiveLeaders:input.maximumActiveLeaders,
 })
 const none=(reason:FundedPelotonLeadershipResult['reason']):FundedPelotonLeadershipResult=>({
  baseSpeedKmh:leadership.groupMeanBaseKmh,fundedSpeedKmh:leadership.groupMeanBaseKmh,
  fundedBonusPercent:0,selectedRiderIds:[],surchargeByRiderId:{},
  totalSurcharge:0,reason,
 })
 const permitted=new Set(input.eligibleOrderedRiderIds)
 if(permitted.size===0)return none('no_orders')
 // A rider must BOTH be nominated for pursuit and qualify as an able leader.
 const qualified=leadership.designatedRiderIds.filter(id=>permitted.has(id))
 if(qualified.length===0)return none('no_capable_leaders')
 const nominated=qualified.map(id=>input.riders.find(r=>r.riderId===id)!)
 if(nominated.some(r=>r.stageStatus!=='racing'||r.energy<=5))
  return none('no_funding')
 // Leadership advantage is capped separately from its potential physical maximum.
 // This is a bounded hypothesis, not a historically calibrated multiplier.
 const desiredBonusPercent=clamp(leadership.potentialGainPercent,0,3)
 if(desiredBonusPercent===0)return none('no_capable_leaders')
 const desiredCharge=nominated.map(r=>{
  const stamina=r.attributes.stamina
  const gross=round((input.tickSeconds/60)*0.06*desiredBonusPercent*
   (1.15-0.003*stamina))
  return {rider:r,charge:gross,available:Math.max(0,r.energy-5)}
 })
 const affordability=clamp(Math.min(...desiredCharge.map(p=>
  p.charge>0?p.available/p.charge:1)),0,1)
 const fundedBonusPercent=round(desiredBonusPercent*affordability)
 if(fundedBonusPercent<=0)return none('no_funding')
 const fundedSpeedKmh=round(Math.min(input.maximumSpeedKmh,
  leadership.groupMeanBaseKmh*(1+fundedBonusPercent/100)))
 const actualPercent=round(Math.max(0,100*(fundedSpeedKmh/
  leadership.groupMeanBaseKmh-1)))
 const charges=Object.fromEntries(desiredCharge.map(p=>[
  p.rider.riderId,round(Math.min(p.available,
   p.charge*(desiredBonusPercent?actualPercent/desiredBonusPercent:0)))
 ]))
 return {baseSpeedKmh:leadership.groupMeanBaseKmh,fundedSpeedKmh,
  fundedBonusPercent:actualPercent,selectedRiderIds:nominated.map(r=>r.riderId),
  surchargeByRiderId:charges,totalSurcharge:round(Object.values(charges)
   .reduce((sum,c)=>sum+c,0)),reason:'funded'}
}
