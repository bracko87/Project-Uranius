// Original source blob 606e698eebe12f935b6e28923e41ea7389315fe8:
// roadStageSkillWeights (flat) and calculateRiderSuitabilityScores.
// Normalized stage percentage supplied explicitly, NOT derived from catalogue.
import {calculateStageProfileCategory} from '../src/race-engine/simulation/stageProfileCategory'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
const req=(ok:unknown,m:string)=>{if(!ok)throw Error('043AL: '+m)}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
const round4=(x:number)=>Math.round((x+Number.EPSILON)*10000)/10000
export type EquipmentCapabilityAdjustments=Readonly<Record<string,number>>
// Recovered universal road skill weights (archive lines 6340–6390).
export function historicalRoadSkillScore(a:any,profile:string){
 const weights:Record<string,Record<string,number>>={flat:{sprint:.3,flat:.25,stamina:.2,resistance:.1,raceIq:.1,teamwork:.05},hilly:{sprint:.1,climbing:.25,flat:.2,stamina:.2,resistance:.15,raceIq:.1},mountain:{climbing:.45,stamina:.2,recovery:.15,resistance:.1,raceIq:.1},cobbled:{sprint:.1,flat:.3,stamina:.2,resistance:.25,raceIq:.15}}
 const w=weights[profile]
 req(w&&Object.keys(w).every(k=>Number.isFinite(a[k])&&a[k]>=0&&a[k]<=100),'invalid historical road skill evidence')
 return Object.entries(w).reduce((n,[k,v])=>n+a[k]*v,0)
}
export function resolveEquipmentPerformanceReview({evidence,expectedEvidenceSha256,ready,input,mechanical}:any){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256&&evidence.stageId===ready.stageId&&input.stageId===ready.stageId,'frozen performance evidence required')
 const profile=evidence.terrainProfile??'flat'
 req(input.stageFormat==='road_race'&&input.orders.length===0,'road no-command scope required')
 if(evidence.terrainProfile===undefined)req(input.profilePoints.every(p=>p.elevationMetres===input.profilePoints[0].elevationMetres),'flat no-command scope required')
 else {
  req(['flat','hilly','mountain','cobbled'].includes(profile),'unsupported road suitability profile')
  const category=calculateStageProfileCategory(input).category
  req(category===(profile==='cobbled'?'flat':profile),'terrain suitability profile mismatch')
 }
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
  const score=historicalRoadSkillScore(a,profile)
  const adjustment=round4(score*clamp(x.equipmentStagePerformancePct,-20,20)/100)
  return {riderId:r.riderId,teamId:r.teamId,eligible:r.startStatus==='starter',equipmentConditionPercent:m.equipmentConditionPercent,equipmentStagePerformancePct:x.equipmentStagePerformancePct,stageSkillScore:score,equipmentPerformanceAdjustment:r.startStatus==='starter'?adjustment:0}
 })
 return {version:'043AL_equipment_performance_review_v1',...(evidence.terrainProfile===undefined?{}:{terrainProfile:profile}),evidenceSha256:expectedEvidenceSha256,rows,adjustments:Object.fromEntries(rows.filter(r=>r.eligible).map(r=>[r.riderId,r.equipmentPerformanceAdjustment])),official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}
}
