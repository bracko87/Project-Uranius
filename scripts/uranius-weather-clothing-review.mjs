// Original archived SQL baseline_03_plpgsql_751_900 lines 1866–2160.
// Candidate threshold recovered; hashtext evidence is explicit synthetic input.
// No actual illness creation: archived create_rider_health_case call is incompatible
// with the recovered legacy signature/type contract.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewRainJacketExposure,reviewRainJacketRequirement} from './uranius-original-preparation-effects-review.mjs'
import {medicalCenterReview} from './uranius-original-resource-health-review.mjs'
const P='synthetic_review_fixture',req=(x,m)=>{if(!x)throw Error('043AP: '+m)}
const uniq=(a,k)=>Array.isArray(a)&&new Set(a.map(k)).size===a.length
const integer=x=>Number.isSafeInteger(x)&&x>=0
const day=x=>{req(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString().slice(0,10)===x,'invalid date');return Date.parse(x)/86400000}
const flags=()=>({official:false,hostedWriteAllowed:false,healthWriteAllowed:false,authoritativeSourceVerified:false})
export function resolveClothingAllocation({evidence,expectedEvidenceSha256,ready}){
 req(evidence?.provenance===P&&carryoverDigest(evidence)===expectedEvidenceSha256&&evidence.stageId===ready.stageId&&evidence.date===ready.date,'frozen clothing evidence required')
 const {resources,requests,units,plans}=evidence,key=x=>x.resourceType+':'+x.resourceId
 req(uniq(resources,key)&&uniq(requests,key)&&resources.length===requests.length&&resources.every(r=>requests.some(q=>key(q)===key(r)))&&uniq(units,u=>u.resourceId)&&uniq(plans,p=>p.riderId)&&plans.length===ready.rows.length,'complete unique jacket allocation evidence required')
 const requirement=reviewRainJacketRequirement(evidence.weather)
 const assigned=new Set()
 const rows=ready.rows.map(r=>{
  const p=plans.find(p=>p.riderId===r.riderId)
  req(p&&p.teamId===r.teamId&&typeof p.requested==='boolean'&&(p.resourceId===null||typeof p.resourceId==='string')&&(p.requested||p.resourceId===null),'invalid rider jacket plan')
  const starter=r.startStatus==='starter'
  req(starter||!p.requested&&p.resourceId===null,'nonstarter jacket request')
  if(p.resourceId===null)return {riderId:r.riderId,teamId:r.teamId,starter,requested:p.requested,resourceId:null,jacketUsed:false}
  const u=units.find(x=>x.resourceId===p.resourceId),resource=resources.find(x=>x.resourceType==='supply'&&x.resourceId===p.resourceId)
  req(u&&resource&&u.teamId===r.teamId&&resource.teamId===r.teamId&&!assigned.has(p.resourceId),'missing, foreign or reused jacket unit')
  assigned.add(p.resourceId)
  req(starter&&p.requested,'unselected jacket assignment')
  const available=resource.stageUsesRemaining>0&&resource.lastUsedDate!==evidence.date
  return {riderId:r.riderId,teamId:r.teamId,starter,requested:p.requested,resourceId:p.resourceId,jacketUsed:available}
 })
 const unitRows=units.map(u=>{
  const r=resources.find(r=>r.resourceType==='supply'&&r.resourceId===u.resourceId),q=requests.find(q=>q.resourceType==='supply'&&q.resourceId===u.resourceId)
  req(r&&q&&r.teamId===u.teamId&&ready.rows.some(x=>x.teamId===u.teamId)&&r.quantity===null&&r.condition===null&&r.maxStageUses===25&&integer(r.stageUsesRemaining)&&r.stageUsesRemaining<=25&&(r.lastUsedDate===null||day(r.lastUsedDate)<=day(evidence.date)),'invalid durable rain jacket unit')
  const used=rows.some(x=>x.resourceId===u.resourceId&&x.jacketUsed)
  req(q.selectedQuantity===0&&q.conditionLossPerRaceDay===0&&q.selectedStageUses===(used?1:0),'jacket use ledger mismatch')
  return {resourceId:u.resourceId,teamId:u.teamId,openingUses:r.stageUsesRemaining,used,closingUses:r.stageUsesRemaining-(used?1:0)}
 })
 return {version:'043AP_jacket_allocation_v1',evidenceSha256:expectedEvidenceSha256,requirement,rows,units:unitRows,...flags()}
}
export function reviewClothingExposure({evidence,expectedEvidenceSha256,ready,finish,priorExposures,expectedPriorExposuresSha256}){
 const allocation=resolveClothingAllocation({evidence,expectedEvidenceSha256,ready})
 req(carryoverDigest(priorExposures)===expectedPriorExposuresSha256&&uniq(priorExposures,x=>x.stageId+':'+x.riderId)&&priorExposures.every(x=>x.required===true&&typeof x.jacketUsed==='boolean'&&day(x.date)<day(evidence.date)&&ready.rows.some(r=>r.riderId===x.riderId&&r.teamId===x.teamId)),'invalid prior exposure history')
 req(finish?.state?.completed&&finish.state.stageId===ready.stageId&&finish.classificationSha256===carryoverDigest(finish.classification)&&uniq(finish.classification,x=>x.riderId),'complete physical finish evidence required')
 const {medicalCenters,hashWitnesses}=evidence
 req(uniq(medicalCenters,x=>x.teamId)&&medicalCenters.length===new Set(ready.rows.map(r=>r.teamId)).size&&medicalCenters.every(c=>ready.rows.some(r=>r.teamId===c.teamId)&&integer(c.level)),'complete medical center levels required')
 req(uniq(hashWitnesses,x=>x.riderId)&&hashWitnesses.length===ready.rows.length,'complete synthetic hashtext witnesses required')
 const exposures=[],candidates=[]
 for(const r of allocation.rows){
  const physical=finish.classification.find(x=>x.riderId===r.riderId)
  req(r.starter===Boolean(physical)&&(!physical||physical.teamId===r.teamId),'physical clothing roster mismatch')
  const h=hashWitnesses.find(h=>h.riderId===r.riderId)
  const key=r.riderId+'-'+ready.stageId+'-weather-illness'
  req(h&&h.key===key&&Number.isInteger(h.signedHashtext)&&h.signedHashtext>=-2147483647&&h.signedHashtext<=2147483647,'invalid synthetic hashtext witness')
  const x=reviewRainJacketExposure({weather:evidence.weather,physicalStatus:physical?.status??'dns',jacketUsed:r.jacketUsed})
  if(!x.exposureRecorded)continue
  const event={stageId:ready.stageId,runId:ready.runId,date:evidence.date,riderId:r.riderId,teamId:r.teamId,required:true,jacketUsed:r.jacketUsed,illnessRiskScore:x.illnessRiskScore}
  exposures.push(event)
  if(r.jacketUsed)continue
  const recentUnprotectedCount=1+priorExposures.filter(x=>x.riderId===r.riderId&&!x.jacketUsed&&day(x.date)>=day(evidence.date)-14).length
  const medical=medicalCenterReview(medicalCenters.find(c=>c.teamId===r.teamId).level)
  const threshold=45*medical.riskMultiplier,roll=Math.abs(h.signedHashtext)%100
  const eligible=recentUnprotectedCount>=2&&roll<threshold
  candidates.push({riderId:r.riderId,teamId:r.teamId,recentUnprotectedCount,roll,threshold,medicalCenterLevel:medical.level,eligible,caseCreationVerified:false,availabilityChanged:false,legacyRequestedStartDate:new Date((day(evidence.date)+1)*86400000).toISOString().slice(0,10),legacyArguments:[3,10,2]})
 }
 const receipt={version:'043AP_weather_exposure_v1',allocation,priorExposuresSha256:expectedPriorExposuresSha256,physicalClassificationSha256:finish.classificationSha256,exposures,candidates,history:[...priorExposures,...exposures],hashtextParityVerified:false,healthCaseCreationVerified:false,...flags()}
 return {receipt,sha256:carryoverDigest(receipt)}
}
