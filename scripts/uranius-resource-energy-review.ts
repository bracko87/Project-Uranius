// Original formulas: src/universal-race-engine/runRaceEngine.ts blob
// 606e698eebe12f935b6e28923e41ea7389315fe8, lines 5134–5142,
// 5510–5578, 5659–5687 and calculateRoadStepEnergyComponents.
// Only explicit standardized supply values; no fabricated catalogue bonuses.
import type {SimulationState} from '../src/race-engine/domain/SimulationState'
import type {ApplyMultiGroupEnergyResult} from '../src/race-engine/simulation/applyMultiGroupEnergy'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AK: '+m)}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
const round=(x:number)=>Math.round((x+Number.EPSILON)*1e6)/1e6
const fields=['supplyEnergySavingPct','supplyEnergyPenaltyPct','supplyFatigueReductionPct','supplyFatiguePenaltyPct','supplyRecoveryBonusPoints']
export type EnergyMultipliers=Readonly<Record<string,number>>
export function resolveResourceEnergyReview({evidence,expectedEvidenceSha256,ready}:any){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256&&evidence.stageId===ready.stageId,'frozen supply evidence required')
 const {resources,requests,supplies}=evidence
 req(Array.isArray(supplies)&&new Set(supplies.map(s=>s.resourceId)).size===supplies.length,'unique supply evidence required')
 const allocations=supplies.map(s=>{
  const r=resources.find(x=>x.resourceType==='supply'&&x.resourceId===s.resourceId),q=requests.find(x=>x.resourceType==='supply'&&x.resourceId===s.resourceId)
  req(r&&q&&r.teamId===s.teamId&&ready.rows.some(x=>x.teamId===s.teamId)&&['bidons_water_bottles','energy_gels','nutrition_packs'].includes(s.supplyKey),'invalid consumable binding')
  req(Number.isSafeInteger(r.quantity)&&r.quantity>=0&&Number.isSafeInteger(q.selectedQuantity)&&q.selectedQuantity>=0&&q.selectedStageUses===0&&r.stageUsesRemaining===null,'explicit consumable stock required')
  req(Number.isSafeInteger(s.requiredQuantity)&&s.requiredQuantity>0&&fields.every(k=>typeof s.standardized[k]==='number'&&Number.isFinite(s.standardized[k])&&s.standardized[k]>=0&&s.standardized[k]<=100)&&Object.keys(s.standardized).length===fields.length,'explicit normalized supply input required')
  const active=ready.rows.some(x=>x.teamId===s.teamId&&x.startStatus==='starter')
  // Conservative review-only all-or-none allocation: no invented partial bonus.
  const available=active&&q.selectedQuantity===s.requiredQuantity&&r.quantity>=s.requiredQuantity
  return {resourceId:s.resourceId,teamId:s.teamId,supplyKey:s.supplyKey,available,openingQuantity:r.quantity,requestedQuantity:q.selectedQuantity,standardized:available?s.standardized:Object.fromEntries(fields.map(k=>[k,0]))}
 })
 const rows=ready.rows.map(r=>{
  const p=r.preparation.modifiers
  req(!p||(p.inStageEnergyCostMultiplier===1&&p.postStageFatigueMultiplier===1&&p.postStageRecoveryBonusPoints===0&&p.supplyStagePerformancePct===0),'duplicate or unsupported preparation energy/fatigue source')
  const a=allocations.filter(a=>a.teamId===r.teamId&&a.available),sum=k=>a.reduce((n,x)=>n+x.standardized[k],0)
  const energyCostMultiplier=round(clamp(1-sum('supplyEnergySavingPct')/100+sum('supplyEnergyPenaltyPct')/100,.88,1.18))
  const fatigueMultiplier=round(clamp(1-sum('supplyFatigueReductionPct')/100+sum('supplyFatiguePenaltyPct')/100,.9,1.15))
  const recoveryBonusPoints=round(clamp(sum('supplyRecoveryBonusPoints'),0,4))
  return {riderId:r.riderId,teamId:r.teamId,energyCostMultiplier,roadEnergyMultiplier:clamp(energyCostMultiplier,.9,1),postStageFatigueMultiplier:fatigueMultiplier,postStageRecoveryBonusPoints:recoveryBonusPoints}
 })
 return {version:'043AK_supply_energy_review_v1',evidenceSha256:expectedEvidenceSha256,allocations,rows,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}
}
// The new engine has a different base energy model. Transfer only the original
// road preparation multiplier to its neutral duration-linear cost, before cap.
// Do not scale a previously capped debit or change incident losses.
export function applyReviewEnergyMultiplier(result:ApplyMultiGroupEnergyResult,multipliers?:EnergyMultipliers,stateOverride?:SimulationState){
 if(!multipliers)return result
 const state=stateOverride??result.state
 req(!state.weatherPerformanceEffectsEnabled&&!state.groupShelterEnergyEnabled&&!state.experimentalAbsoluteSpeedEffortEnabled,'unsupported stacked energy effects')
 const riders={...state.riders}
 const applications=result.applications.map(a=>{
  const multiplier=multipliers[a.riderId]
  req(typeof multiplier==='number'&&Number.isFinite(multiplier)&&multiplier>=.9&&multiplier<=1&&a.runtimeFatigueGain===undefined&&!(a.experimentalPullerEnergySurcharge??0)&&riders[a.riderId].energy===a.nextEnergy,'invalid neutral energy evidence')
  const gross=a.result.grossEnergyCost*a.result.efficiencyMultiplier
  const cost=gross*multiplier,nextEnergy=Math.max(0,a.previousEnergy-cost)
  riders[a.riderId]={...riders[a.riderId],energy:nextEnergy}
  return {...a,nextEnergy,energyCost:state.experimentalConservedEnergyLedgerEnabled?Math.min(a.previousEnergy,cost):cost,result:{...a.result,energyCost:state.experimentalConservedEnergyLedgerEnabled?Math.min(a.previousEnergy,cost):cost,nextEnergy},preparationEnergyMultiplier:multiplier}
 })
 const next={...state,riders};validateSimulationState(next)
 return {...result,state:next,applications}
}
