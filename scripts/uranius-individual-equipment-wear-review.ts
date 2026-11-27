// Offline adaptation: original Phase9 wear rate, actual physical distance
// instead of scheduled stage distance. No resource persistence or repair.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {resolveResourceMechanicalReview} from './uranius-resource-mechanical-review.mjs'
import {originalPhase9ResourceReview} from './uranius-original-engine-effects-review.mjs'
import {resolveWearProtection} from './uranius-original-preparation-effects-review.mjs'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
const P='synthetic_review_fixture',req=(x:unknown,m:string)=>{if(!x)throw Error('043AM: '+m)}
const uniq=(a:any[],f:(x:any)=>string)=>Array.isArray(a)&&new Set(a.map(f)).size===a.length
export function reviewIndividualEquipmentWear({finish,ready,mechanicalEvidence,expectedMechanicalSha256,sportingRows,protectionEvidence,expectedProtectionSha256}:any){
 const mechanical=resolveResourceMechanicalReview({evidence:mechanicalEvidence,expectedEvidenceSha256:expectedMechanicalSha256,ready})
 const protection=protectionEvidence?resolveWearProtection({evidence:protectionEvidence,expectedEvidenceSha256:expectedProtectionSha256,ready}):null
 if(protection)req(carryoverDigest(protectionEvidence.resources)===carryoverDigest(mechanicalEvidence.resources)&&carryoverDigest(protectionEvidence.requests)===carryoverDigest(mechanicalEvidence.requests),'protection opening ledger mismatch')
 const state=finish?.state
 req(state?.completed&&state.stageId===ready.stageId&&state.raceId===ready.raceId&&Number.isFinite(state.stageDistanceKm)&&state.stageDistanceKm>0&&finish.classificationSha256===carryoverDigest(finish.classification),'complete scoped physical finish required')
 validateSimulationState(state)
 req(uniq(finish.classification,r=>r.riderId)&&uniq(sportingRows,r=>r.riderId)&&sportingRows.length===ready.rows.length&&finish.classification.length===Object.keys(state.riders).length,'complete terminal roster required')
 const mileage=ready.rows.map(r=>{
  const actual=state.riders[r.riderId],physical=finish.classification.find(x=>x.riderId===r.riderId),sport=sportingRows.find(x=>x.riderId===r.riderId)
  req(sport&&sport.teamId===r.teamId,'missing sporting rider')
  if(r.startStatus==='dns'){
   req(!actual&&!physical&&sport.status==='dns','nonstarter has physical mileage')
   return {riderId:r.riderId,teamId:r.teamId,status:'dns',physicalStatus:'dns',distanceKm:0}
  }
  req(r.startStatus==='starter'&&actual&&physical&&actual.teamId===r.teamId&&physical.teamId===r.teamId&&['finished','dnf'].includes(actual.stageStatus)&&physical.status===actual.stageStatus,'terminal physical rider mismatch')
  req(actual.stageStatus==='finished'?['finished','otl'].includes(sport.status):sport.status==='dnf','sporting and physical status mismatch')
  const distanceKm=actual.distanceKm
  req(Number.isFinite(distanceKm)&&distanceKm>=0&&distanceKm<=state.stageDistanceKm&& (actual.stageStatus!=='finished'||distanceKm===state.stageDistanceKm),'invalid terminal mileage')
  return {riderId:r.riderId,teamId:r.teamId,status:sport.status,physicalStatus:actual.stageStatus,distanceKm}
 })
 req(mileage.filter(r=>r.physicalStatus!=='dns').length===Object.keys(state.riders).length,'unexpected physical rider')
 const assignments=mechanical.rows.flatMap(r=>r.components.map(c=>({riderId:r.riderId,teamId:r.teamId,category:c.category,resourceId:c.resourceId})))
 req(uniq(assignments,r=>r.resourceId),'duplicate physical assignment')
 const rows=mechanicalEvidence.resources.filter(r=>r.resourceType==='equipment').map(before=>{
  const assignment=assignments.find(a=>a.resourceId===before.resourceId),request=mechanicalEvidence.requests.find(r=>r.resourceType==='equipment'&&r.resourceId===before.resourceId)
  // Physical components are condition-only resources; counters belong to
  // separate stock/asset ledgers and are not silently consumed here.
  req(request&&request.selectedQuantity===0&&request.selectedStageUses===0&&Number.isFinite(request.conditionLossPerRaceDay)&&request.conditionLossPerRaceDay>=0&&before.quantity===null&&before.stageUsesRemaining===null&&before.maxStageUses===null&&before.lastUsedDate===null&&Number.isFinite(before.condition)&&before.condition>=0&&before.condition<=100,'condition-only component resource required')
  const rider=assignment?mileage.find(r=>r.riderId===assignment.riderId):null
  if(assignment)req(rider&&rider.teamId===before.teamId,'component rider scope mismatch')
  const distanceKm=rider?.distanceKm??0
  const intensity=protection?protection.teams.find(t=>t.teamId===before.teamId)?.wearIntensity:1
  req(typeof intensity==='number'&&Number.isFinite(intensity)&&intensity>=.35-1e-12&&intensity<=1,'invalid protection intensity')
  const effect=distanceKm>0?originalPhase9ResourceReview({provenance:P,completeResourceEvidence:true,distanceKm,resources:[{resourceType:'equipment',resourceId:before.resourceId,teamId:before.teamId,condition:before.condition,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:request.conditionLossPerRaceDay*intensity}]}).rows[0]:null
  const after={...before,condition:effect?.conditionAfter??before.condition}
  return {resourceId:before.resourceId,riderId:assignment?.riderId??null,category:assignment?.category??null,distanceKm,configuredWear:request.conditionLossPerRaceDay,...(protection?{wearIntensity:intensity,effectiveWear:request.conditionLossPerRaceDay*intensity}:{}),conditionUsed:effect?.conditionUsed??0,before,after,effect}
 }).sort((a,b)=>a.resourceId.localeCompare(b.resourceId))
 req(assignments.every(a=>rows.some(r=>r.resourceId===a.resourceId)),'missing component wear receipt')
 const receipt={version:'043AM_individual_equipment_wear_v1',provenance:P,raceId:ready.raceId,stageId:ready.stageId,runId:ready.runId,date:ready.date,physicalClassificationSha256:finish.classificationSha256,mechanicalEvidenceSha256:expectedMechanicalSha256,mileage,mileageSha256:carryoverDigest(mileage),rows,...(protection?{wearProtection:protection}:{}),official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}
 return {receipt,sha256:carryoverDigest(receipt)}
}
