// Original source blob 606e698eebe12f935b6e28923e41ea7389315fe8:
// roadStageSkillWeights (flat) and calculateRiderSuitabilityScores.
// Normalized stage percentage supplied explicitly, NOT derived from catalogue.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
const req=(ok:unknown,m:string)=>{if(!ok)throw Error('043AL: '+m)}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
const round4=(x:number)=>Math.round((x+Number.EPSILON)*10000)/10000
export type EquipmentCapabilityAdjustments=Readonly<Record<string,number>>
export function resolveEquipmentPerformanceReview({evidence,expectedEvidenceSha256,ready,input,mechanical}:any){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256&&evidence.stageId===ready.stageId&&input.stageId===ready.stageId,'frozen performance evidence required')
 req(input.stageFormat==='road_race'&&input.orders.length===0&&input.profilePoints.every(p=>p.elevationMetres===input.profilePoints[0].elevationMetres),'flat no-command scope required')
 req(Array.isArray(evidence.rows)&&evidence.rows.length===ready.rows.length&&new Set(evidence.rows.map(r=>r.riderId)).size===evidence.rows.length,'complete unique equipment percentages required')
 req(mechanical&&mechanical.rows.length===ready.rows.length,'verified mechanical setup evidence required')
 const rows=ready.rows.map(r=>{
  const x=evidence.rows.find(x=>x.riderId===r.riderId),m=mechanical.rows.find(x=>x.riderId===r.riderId),rider=input.riders.find(x=>x.riderId===r.riderId)
  req(x&&m&&x.teamId===r.teamId&&m.teamId===r.teamId&&typeof x.equipmentStagePerformancePct==='number'&&Number.isFinite(x.equipmentStagePerformancePct)&&x.equipmentStagePerformancePct>=-20&&x.equipmentStagePerformancePct<=20,'invalid normalized equipment percentage')
  req(x.equipmentStagePerformancePct===0||m.equipmentConditionPercent>0,'nonneutral performance for unusable component')
  req(!r.preparation.modifiers||r.preparation.modifiers.equipmentStagePerformancePct===0&&r.preparation.modifiers.performanceBonusPoints===0,'duplicate equipment performance source')
  if(r.startStatus==='starter')req(rider&&rider.teamId===r.teamId,'missing starter attributes')
  // DNS has no physical capability, but its full setup remains in the receipt.
  if(!rider)return {riderId:r.riderId,teamId:r.teamId,eligible:false,equipmentConditionPercent:m.equipmentConditionPercent,equipmentStagePerformancePct:x.equipmentStagePerformancePct,stageSkillScore:0,equipmentPerformanceAdjustment:0}
  const a=rider.attributes
  req([a.sprint,a.flat,a.stamina,a.resistance,a.raceIq,a.teamwork].every(v=>Number.isFinite(v)&&v>=0&&v<=100),'invalid historical flat skill evidence')
  const score=a.sprint*.3+a.flat*.25+a.stamina*.2+a.resistance*.1+a.raceIq*.1+a.teamwork*.05
  const adjustment=round4(score*clamp(x.equipmentStagePerformancePct,-20,20)/100)
  return {riderId:r.riderId,teamId:r.teamId,eligible:r.startStatus==='starter',equipmentConditionPercent:m.equipmentConditionPercent,equipmentStagePerformancePct:x.equipmentStagePerformancePct,stageSkillScore:score,equipmentPerformanceAdjustment:r.startStatus==='starter'?adjustment:0}
 })
 return {version:'043AL_equipment_performance_review_v1',evidenceSha256:expectedEvidenceSha256,rows,adjustments:Object.fromEntries(rows.filter(r=>r.eligible).map(r=>[r.riderId,r.equipmentPerformanceAdjustment])),official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}
}
