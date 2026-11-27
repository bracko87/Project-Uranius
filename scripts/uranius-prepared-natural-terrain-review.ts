// Offline only. Existing 043AU physical runner plus one review-only closing ledger.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewHistoricalNaturalTerrain} from './uranius-historical-natural-terrain-review'
import {bindLegacyReadiness} from './uranius-frozen-readiness-review.mjs'
import {resolveWearProtection} from './uranius-original-preparation-effects-review.mjs'
import {resolveClothingAllocation,reviewClothingExposure} from './uranius-weather-clothing-review.mjs'
import {reviewIndividualEquipmentWear} from './uranius-individual-equipment-wear-review'
import {originalPhase9ResourceReview,originalPostStageFatigueReview} from './uranius-original-engine-effects-review.mjs'
const P='synthetic_review_fixture',req=(x:unknown,m:string)=>{if(!x)throw Error('043AV: '+m)}
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false})
const digest=carryoverDigest
const validDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x
export function reviewPreparedNaturalTerrain({packet,expectedPacketSha256}:any){
 req(packet?.provenance===P&&digest(packet)===expectedPacketSha256,'frozen prepared terrain packet required')
 const {input,source,context,preparation,difficultyCategory}=packet
 req(preparation&&Number.isInteger(difficultyCategory)&&difficultyCategory>=1&&difficultyCategory<=5,'explicit preparation and difficulty required')
 const ready=bindLegacyReadiness({source,expectedSourceSha256:digest(source),input}).receipt
 const {mechanical,performance,energy,protection,clothing,priorExposures}=preparation
 req(mechanical&&performance&&energy&&protection&&clothing&&Array.isArray(priorExposures),'complete preparation bindings required')
 const {resources,requests}=mechanical
 req(Array.isArray(resources)&&Array.isArray(requests)&&new Set(resources.map(r=>r.resourceId)).size===resources.length&&new Set(requests.map(r=>r.resourceId)).size===requests.length&&resources.length===requests.length,'unique physical ledger required')
 for(const e of [energy,protection,clothing])req(digest(e.resources)===digest(resources)&&digest(e.requests)===digest(requests),'preparation opening ledger mismatch')
 req(clothing.weather.condition===context.weatherCondition&&clothing.weather.rainChancePct===context.rainProbabilityPct&&clothing.weather.precipitationMm===context.precipitationMm,'clothing and incident weather mismatch')
 for(const r of resources){
  const q=requests.find(q=>q.resourceId===r.resourceId&&q.resourceType===r.resourceType)
  req(q&&['selectedQuantity','selectedStageUses','conditionLossPerRaceDay'].every(k=>Number.isFinite(q[k])&&q[k]>=0)&&Number.isSafeInteger(q.selectedQuantity)&&Number.isSafeInteger(q.selectedStageUses),'invalid resource request')
  req(['equipment','asset','supply'].includes(r.resourceType)&&ready.rows.some(x=>x.teamId===r.teamId)&&['quantity','stageUsesRemaining','maxStageUses','condition','lastUsedDate'].every(k=>Object.hasOwn(r,k)),'explicit resource owner/state required')
  req(r.quantity===null||Number.isSafeInteger(r.quantity)&&r.quantity>=0,'invalid quantity')
  req(r.stageUsesRemaining===null&&r.maxStageUses===null||Number.isSafeInteger(r.stageUsesRemaining)&&Number.isSafeInteger(r.maxStageUses)&&r.stageUsesRemaining>=0&&r.stageUsesRemaining<=r.maxStageUses,'invalid durable counter')
  req(r.condition===null||Number.isFinite(r.condition)&&r.condition>=0&&r.condition<=100,'invalid resource condition')
  req(r.lastUsedDate===null||validDay(r.lastUsedDate)&&r.lastUsedDate<=ready.date,'future or invalid resource use date')
  req((r.quantity!==null||q.selectedQuantity===0)&&(r.stageUsesRemaining!==null||q.selectedStageUses===0),'request without counter')
 }
 const wearProtection=resolveWearProtection({evidence:protection,expectedEvidenceSha256:digest(protection),ready})
 const clothingAllocation=resolveClothingAllocation({evidence:clothing,expectedEvidenceSha256:digest(clothing),ready})
 // Validate exposure history before the physical run as far as possible.
 req(new Set(priorExposures.map(x=>x.stageId+':'+x.riderId)).size===priorExposures.length&&priorExposures.every(x=>validDay(x.date)&&x.date<ready.date),'invalid opening exposure history')
 const physicalPacket={provenance:P,input,source,context,preparation:{mechanical,performance,energy}}
 const physical=reviewHistoricalNaturalTerrain({packet:physicalPacket,expectedPacketSha256:digest(physicalPacket)})
 const finish={state:physical.finalState,classification:physical.classification,classificationSha256:physical.classificationSha256}
 const individualWear=reviewIndividualEquipmentWear({finish,ready,mechanicalEvidence:mechanical,expectedMechanicalSha256:digest(mechanical),sportingRows:physical.classification,protectionEvidence:protection,expectedProtectionSha256:digest(protection)})
 const clothingExposure=reviewClothingExposure({evidence:clothing,expectedEvidenceSha256:digest(clothing),ready,finish,priorExposures,expectedPriorExposuresSha256:digest(priorExposures)})
 req(digest(clothingExposure.receipt.allocation)===digest(clothingAllocation),'clothing allocation changed')
 const supply=physical.preparation!.supply,resourceMechanical=physical.preparation!.mechanical
 const resourceRows=resources.map(before=>{
  const q=requests.find(q=>q.resourceId===before.resourceId)
  if(before.resourceType==='equipment'){
   const w=individualWear.receipt.rows.find(r=>r.resourceId===before.resourceId)
   req(w&&digest(w.before)===digest(before),'component ledger mismatch')
   return {before,after:w.after,effect:w.effect}
  }
  let usedQuantity=0,usedStageUses=0
  if(before.resourceType==='asset'){
   const m=resourceMechanical.supportRows.find(x=>x.resourceId===before.resourceId),w=wearProtection.assets.find(x=>x.resourceId===before.resourceId)
   req(m||w,'unbound asset')
   if(m&&w)req(m.available===w.available,'shared asset allocation mismatch')
   usedStageUses=m?.available||w?.available?1:0
   req(q.selectedQuantity===0,'asset quantity unsupported')
  }else{
   const a=supply.allocations.find(x=>x.resourceId===before.resourceId),j=clothingAllocation.units.find(x=>x.resourceId===before.resourceId)
   req(Boolean(a)!==Boolean(j),'supply must have exactly one allocation type')
   if(a){req(energy.mode==='archived_consumable_fallback_v1','fallback accounting only');usedQuantity=a.usableQuantity}
   if(j)usedStageUses=j.used?1:0
  }
  req(usedQuantity<=q.selectedQuantity&&usedStageUses<=q.selectedStageUses,'allocation exceeds request')
  req(!usedStageUses||before.lastUsedDate!==ready.date,'duplicate daily use')
  const allocation={requestedQuantity:q.selectedQuantity,requestedStageUses:q.selectedStageUses,usedQuantity,usedStageUses,unfulfilledQuantity:q.selectedQuantity-usedQuantity,unfulfilledStageUses:q.selectedStageUses-usedStageUses}
  if(!usedQuantity&&!usedStageUses)return {before,after:before,effect:null,allocation}
  const engine={resourceType:before.resourceType,resourceId:before.resourceId,teamId:before.teamId,selectedQuantity:usedQuantity,selectedStageUses:usedStageUses,conditionLossPerRaceDay:q.conditionLossPerRaceDay}
  for(const k of ['quantity','stageUsesRemaining','maxStageUses','condition'])if(before[k]!==null)engine[k]=before[k]
  const effect=originalPhase9ResourceReview({provenance:P,completeResourceEvidence:true,distanceKm:input.distanceKm,resources:[engine]}).rows[0]
  req((effect.quantityUsed??0)===usedQuantity&&(effect.stageUsesUsed??0)===usedStageUses,'closing debit mismatch')
  return {before,after:{...before,quantity:effect.quantityAfter??before.quantity,stageUsesRemaining:effect.stageUsesAfter??before.stageUsesRemaining,condition:effect.conditionAfter??before.condition,lastUsedDate:usedStageUses?ready.date:before.lastUsedDate},effect,allocation}
 })
 const riders=ready.rows.map(r=>{
  const terminal=physical.finalState.riders[r.riderId],row=physical.classification.find(x=>x.riderId===r.riderId)
  const a=supply.rows.find(x=>x.riderId===r.riderId)
  req(terminal&&row&&a,'terminal workload missing')
  let correctedEnergy=terminal.energy,finishWitness=null
  if(row.status==='finished'){
   const tick=physical.ticks.find(t=>t.finishDetection.candidates.some(c=>c.riderId===r.riderId))
   const c=tick?.finishDetection.candidates.find(c=>c.riderId===r.riderId),e=tick?.appliedEnergy.applications.find(a=>a.riderId===r.riderId)
   req(c&&e&&Number.isFinite(c.crossingFraction)&&c.crossingFraction>=0&&c.crossingFraction<=1,'fractional finish evidence missing')
   correctedEnergy=Math.max(0,e.previousEnergy-e.result.grossEnergyCost*e.result.efficiencyMultiplier*a.roadEnergyMultiplier*c.crossingFraction)
   finishWitness={crossingFraction:c.crossingFraction,previousEnergy:e.previousEnergy,neutralCost:e.result.grossEnergyCost*e.result.efficiencyMultiplier,multiplier:a.roadEnergyMultiplier}
  }
  const applications=physical.applications.filter(x=>x.riderId===r.riderId)
  const workload={provenance:P,completeWorkloadEvidence:true,riderId:r.riderId,teamId:r.teamId,status:row.status,eligibleToStart:true,effectiveFatigueBeforeStage:r.condition.fatigueBeforeStage,startEnergy:r.condition.startingEnergy,rawFinishEnergy:correctedEnergy,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm:input.distanceKm,difficultyCategory,postStageFatigueMultiplier:a.postStageFatigueMultiplier,postStageRecoveryBonusPoints:a.postStageRecoveryBonusPoints,recoverySkill:r.recoverySkill,morale:r.condition.morale,preparationIncidentRiskMultiplier:r.preparation.modifiers?.incidentRiskMultiplier??1,incidents:applications.map(x=>({incidentId:x.incidentId,incidentType:physical.trace.incidents.find(i=>i.incident.incidentId===x.incidentId).incident.kind})),breakawaySegments:[]}
  const effect=originalPostStageFatigueReview(workload)
  return {riderId:r.riderId,teamId:r.teamId,status:row.status,workload,effect,persistedFatigue:Math.round(effect.fatigueAfterStage),energyAudit:{fullTickEnergy:terminal.energy,correctedEnergy,alreadyAppliedIncidentLoss:applications.reduce((n,x)=>n+x.beforeEnergy-x.afterEnergy,0),additionalIncidentDeduction:0,finishWitness}}
 })
 const receipt={version:'043AV_prepared_natural_terrain_receipt_v1',provenance:P,raceId:ready.raceId,stageId:ready.stageId,runId:ready.runId,date:ready.date,physicalClassificationSha256:finish.classificationSha256,physicalObservationSha256:physical.observationsSha256,openingLedgerSha256:digest(resources),riders,resources:resourceRows,individualWear,clothingExposure,weatherMovementVerified:false,...flags()}
 return {physical,receipt,receiptSha256:digest(receipt),...flags()}
}
