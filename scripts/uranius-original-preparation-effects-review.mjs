// Archived SQL baseline_04_sql_dump_361_416 lines 603–810;
// baseline_04_sql_dump_241_360 lines 8740–8770;
// baseline_03_plpgsql_751_900 lines 1866–2100.
// Explicit review inputs; no inference of original live catalogue rows.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
const P='synthetic_review_fixture',req=(x,m)=>{if(!x)throw Error('043AO: '+m)}
const finite=x=>typeof x==='number'&&Number.isFinite(x)
export function reviewRainJacketRequirement({temperatureC,rainChancePct,precipitationMm,condition}){
 req((temperatureC===null||finite(temperatureC))&&(rainChancePct===null||finite(rainChancePct)&&rainChancePct>=0&&rainChancePct<=100)&&(precipitationMm===null||finite(precipitationMm)&&precipitationMm>=0)&&typeof condition==='string','explicit weather evidence required')
 const rain=(rainChancePct??0)>=40||(precipitationMm??0)>=2||/rain|shower|storm|drizzle/.test(condition.toLowerCase())
 const cold=temperatureC!==null&&temperatureC<15
 return {required:rain||cold,isRain:rain,isCold:cold,reason:rain&&cold?'rain and temperature below 15°C':rain?'rain':cold?'temperature below 15°C':'not required'}
}
// Exposure score is not an illness probability, diagnosis, or selection penalty.
export function reviewRainJacketExposure({weather,physicalStatus,jacketUsed}){
 req(['finished','dnf','dns'].includes(physicalStatus)&&typeof jacketUsed==='boolean','explicit terminal exposure evidence required')
 const requirement=reviewRainJacketRequirement(weather)
 return {...requirement,exposureRecorded:requirement.required&&physicalStatus==='finished',illnessRiskScore:requirement.required&&physicalStatus==='finished'?(jacketUsed?10:60):null,official:false,healthWriteAllowed:false}
}
export function reviewWorkshopConditionFactor(condition){
 req(condition===null||finite(condition)&&condition>=0&&condition<=100,'invalid workshop condition')
 const c=condition??0
 return c>=90?1:c>=75?.95:c>=60?.85:c>=45?.7:c>=30?.5:0
}
// Numeric snapshot effects are already standardized; do not apply condition
// scaling twice. Original archived SQL takes max(abs(value)), capped 30/50.
export function resolveWearProtection({evidence,expectedEvidenceSha256,ready}){
 req(evidence?.provenance===P&&carryoverDigest(evidence)===expectedEvidenceSha256&&evidence.stageId===ready.stageId&&evidence.date===ready.date,'frozen wear protection evidence required')
 const {resources,requests,assets}=evidence
 const key=x=>x.resourceType+':'+x.resourceId,uniq=(a,k)=>Array.isArray(a)&&new Set(a.map(k)).size===a.length
 req(uniq(resources,key)&&uniq(requests,key)&&resources.length===requests.length&&resources.every(r=>requests.some(q=>key(q)===key(r)))&&uniq(assets,a=>a.resourceId),'complete unique wear protection evidence required')
 const rows=assets.map(a=>{
  req(Object.keys(a).sort().join(',')==='effects,resourceId,sourceKey,teamId'&&['equipment_van','mobile_workshop'].includes(a.sourceKey)&&Array.isArray(a.effects)&&a.effects.length>0&&a.effects.every(finite),'explicit standardized protection effects required')
  const r=resources.find(r=>r.resourceType==='asset'&&r.resourceId===a.resourceId),q=requests.find(q=>q.resourceType==='asset'&&q.resourceId===a.resourceId)
  req(r&&q&&r.teamId===a.teamId&&ready.rows.some(x=>x.teamId===a.teamId)&&Number.isSafeInteger(r.stageUsesRemaining)&&r.stageUsesRemaining>=0&&Number.isSafeInteger(q.selectedStageUses)&&q.selectedStageUses>=0&&q.selectedStageUses<=1&&q.selectedQuantity===0&&finite(r.condition)&&r.condition>=0&&r.condition<=100,'invalid protection asset binding')
  const active=ready.rows.some(x=>x.teamId===a.teamId&&x.startStatus==='starter')
  const available=active&&q.selectedStageUses===1&&r.stageUsesRemaining>=1&&r.lastUsedDate!==evidence.date&&r.condition>0
  const maxEffect=Math.min(a.sourceKey==='equipment_van'?30:50,Math.max(...a.effects.map(Math.abs)))
  return {resourceId:a.resourceId,teamId:a.teamId,sourceKey:a.sourceKey,available,protectionPct:available?maxEffect:0}
 })
 const teams=[...new Set(ready.rows.map(r=>r.teamId))].sort().map(teamId=>{
  const max=k=>Math.max(0,...rows.filter(r=>r.teamId===teamId&&r.sourceKey===k).map(r=>r.protectionPct))
  const van=max('equipment_van'),workshop=max('mobile_workshop')
  return {teamId,equipmentVanProtectionPct:van,mobileWorkshopFieldRecoveryPct:workshop,wearIntensity:(1-van/100)*(1-workshop/100)}
 })
 return {version:'043AO_wear_protection_v1',evidenceSha256:expectedEvidenceSha256,assets:rows,teams,official:false,hostedWriteAllowed:false,authoritativeSourceVerified:false}
}
