// 043C first slice: synthetic multi-stage effects continuity; no DB or official authority.
import {createHash} from 'node:crypto'
import {originalPostStageFatigueReview,originalPhase9ResourceReview} from './uranius-original-engine-effects-review.mjs'
import {reviewOfficialRaceNight} from './uranius-original-fatigue-review.mjs'
const P='synthetic_review_fixture'
const req=(x,m)=>{if(!x)throw Error('043C: '+m)}
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const day=x=>{req(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x,'invalid stage date');return Date.parse(x)/86400000}
const unique=(a,k)=>Array.isArray(a)&&new Set(a.map(k)).size===a.length
const key=x=>x.resourceType+':'+x.resourceId
const cmp=(a,b)=>a<b?-1:a>b?1:0
const stable=x=>{if(x===null||typeof x==='string'||typeof x==='boolean')return x;if(typeof x==='number'){req(Number.isFinite(x),'nonfinite receipt');return x}if(Array.isArray(x))return x.map(stable);req(x&&Object.getPrototypeOf(x)===Object.prototype,'plain receipt required');return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]))}
export const carryoverDigest=x=>createHash('sha256').update(JSON.stringify(stable(x)),'utf8').digest('hex')
const eq=(a,b)=>carryoverDigest(a)===carryoverDigest(b)
const bound=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100
const counter=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0
const fields=['quantity','stageUsesRemaining','maxStageUses','condition','lastUsedDate']
function state(x){
 req(['equipment','asset','supply'].includes(x.resourceType)&&typeof x.resourceId==='string'&&x.resourceId.length>0&&uuid(x.teamId),'invalid resource identity')
 req(fields.every(k=>Object.hasOwn(x,k)),'explicit resource state required')
 req([x.quantity,x.stageUsesRemaining,x.maxStageUses].every(v=>v===null||counter(v))&&(x.condition===null||bound(x.condition)),'invalid resource counter')
 req((x.stageUsesRemaining===null)===(x.maxStageUses===null)&&(x.stageUsesRemaining===null||x.stageUsesRemaining<=x.maxStageUses),'invalid durable limit')
 req(x.lastUsedDate===null||x.stageUsesRemaining!==null,'non-durable last use')
 if(x.lastUsedDate!==null)day(x.lastUsedDate)
 return {resourceType:x.resourceType,resourceId:x.resourceId,teamId:x.teamId,...Object.fromEntries(fields.map(k=>[k,x[k]]))}
}
export function buildStageCarryover(p){
 req(p?.provenance===P&&p.completeSyntheticEvidence===true&&uuid(p.raceId)&&uuid(p.runId)&&uuid(p.stageId)&&counter(p.distanceKm)&&p.distanceKm>0,'complete synthetic stage required')
 req(unique(p.schedule,x=>x.stageId)&&p.schedule.length>=2&&p.schedule.every((x,i)=>uuid(x.stageId)&&x.stageNumber===i+1&&x.weatherCancelled===false),'ordered noncancelled tour required')
 for(let i=0;i<p.schedule.length;i++){day(p.schedule[i].date);if(i)req(day(p.schedule[i].date)>=day(p.schedule[i-1].date),'reversed schedule')}
 const index=p.schedule.findIndex(s=>s.stageId===p.stageId);req(index>=0,'unknown stage')
 const current=p.schedule[index],date=current.date,prior=p.previousReceipt
 req(unique(p.workloads,x=>x.riderId)&&p.workloads.length>0&&unique(p.recoveryReceipts,x=>x.riderId)&&unique(p.resources,key)&&p.resources.length>0,'missing or duplicate stage evidence')
 const scheduleDigest=carryoverDigest(p.schedule)
 let earlier=[],priorDigest=null,expectedRiders=null
 if(index===0){req(prior===null&&p.expectedPreviousDigest===null&&p.recoveryReceipts.length===0,'unexpected prior stage')}
 else{
  req(prior&&typeof p.expectedPreviousDigest==='string'&&carryoverDigest(prior)===p.expectedPreviousDigest,'prior receipt digest mismatch')
  req(prior.version==='043C_stage_carryover_v1'&&prior.provenance===P&&prior.official===false&&prior.hostedWriteAllowed===false&&prior.accountingAllowed===false&&prior.raceId===p.raceId&&prior.stageId===p.schedule[index-1].stageId&&prior.stageNumber===index&&prior.scheduleDigest===scheduleDigest&&prior.date===p.schedule[index-1].date,'prior scope mismatch')
  req(Array.isArray(prior.runHistory)&&prior.runHistory.length===index&&new Set(prior.runHistory).size===index&&!prior.runHistory.includes(p.runId),'repeated or missing run')
  earlier=prior.runHistory;priorDigest=p.expectedPreviousDigest
  expectedRiders=new Map(prior.riders.filter(x=>x.status==='finished').map(x=>[x.riderId,x]))
  req(expectedRiders.size===p.workloads.length&&p.workloads.every(x=>expectedRiders.has(x.riderId)),'withdrawal or roster continuity mismatch')
  req(eq(p.resources.map(state).sort((a,b)=>cmp(key(a),key(b))),prior.resources.map(x=>x.after)),'resource snapshot differs from prior receipt')
 }
 const gap=index===0?0:day(date)-day(prior.date)
 req(gap<=1,'multi-day recovery gap not supported')
 req(gap===0?p.recoveryReceipts.length===0:p.recoveryReceipts.length===p.workloads.length,'incorrect daily recovery coverage')
 const riders=p.workloads.map(w=>{
  req(w.distanceKm===p.distanceKm&&uuid(w.teamId),'workload scope mismatch')
  let seed=w.effectiveFatigueBeforeStage,night=null
  if(index>0){
   const prev=expectedRiders.get(w.riderId);req(prev.teamId===w.teamId,'rider team changed')
   seed=prev.persistedFatigue
   if(gap===1){
    const rec=p.recoveryReceipts.find(x=>x.riderId===w.riderId)
    req(rec&&rec.raceId===p.raceId&&rec.previousStageId===prior.stageId&&rec.stageId===p.stageId&&rec.date===date&&rec.fatigueAfterStage===seed,'daily recovery receipt mismatch')
    night=reviewOfficialRaceNight(rec);seed=night.fatigue
   }
   req(w.effectiveFatigueBeforeStage===seed,'incorrect carried fatigue')
  }
  const effect=originalPostStageFatigueReview(w)
  return {riderId:w.riderId,teamId:w.teamId,status:w.status,seedFatigue:seed,night,effect,persistedFatigue:effect.writeEligible?Math.round(effect.fatigueAfterStage):seed}
 }).sort((a,b)=>cmp(a.riderId,b.riderId))
 const normalized=p.resources.map(x=>{
  const before=state(x)
  req(riders.some(r=>r.teamId===x.teamId)||index>0,'unknown resource team')
  if(x.lastUsedDate!==null)req(day(x.lastUsedDate)<=day(date),'future durable use')
  req(x.selectedStageUses===undefined||counter(x.selectedStageUses),'invalid stage use request')
  if(x.stageUsesRemaining!==null&&x.lastUsedDate===date)req((x.selectedStageUses??0)===0,'same-day durable reuse')
  req(x.selectedQuantity===undefined||counter(x.selectedQuantity),'invalid quantity request')
  req(x.usage===undefined||counter(x.usage),'invalid usage')
  const engine={resourceType:x.resourceType,resourceId:x.resourceId,teamId:x.teamId}
  for(const k of ['quantity','stageUsesRemaining','maxStageUses','condition','selectedQuantity','usage','selectedStageUses','conditionLossPerRaceDay'])if(x[k]!==null&&x[k]!==undefined)engine[k]=x[k]
  return {before,engine}
 })
 const phase9=originalPhase9ResourceReview({provenance:P,completeResourceEvidence:true,distanceKm:p.distanceKm,resources:normalized.map(x=>x.engine)})
 const resources=normalized.map(({before})=>{
  const effect=phase9.rows.find(x=>key(x)===key(before))
  const after={...before,quantity:effect.quantityAfter??before.quantity,stageUsesRemaining:effect.stageUsesAfter??before.stageUsesRemaining,condition:effect.conditionAfter??before.condition,lastUsedDate:(effect.stageUsesUsed??0)>0?date:before.lastUsedDate}
  state(after)
  return {before,after,effect}
 }).sort((a,b)=>cmp(key(a.before),key(b.before)))
 const receipt={version:'043C_stage_carryover_v1',provenance:P,raceId:p.raceId,stageId:p.stageId,runId:p.runId,stageNumber:index+1,date,scheduleDigest,priorDigest,runHistory:[...earlier,p.runId],riders,resources,official:false,hostedWriteAllowed:false,accountingAllowed:false}
 return {receipt,sha256:carryoverDigest(receipt)}
}
