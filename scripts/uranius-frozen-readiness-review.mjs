// 043N source-shaped offline readiness: strict explicit evidence, not a server extractor.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewOfficialRaceNight} from './uranius-original-fatigue-review.mjs'
const P='synthetic_review_fixture',req=(x,m)=>{if(!x)throw Error('043N: '+m)}
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const bounded=x=>finite(x)&&x>=0&&x<=100
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x))
const fields=(x,ks)=>x&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).sort().join(',')===[...ks].sort().join(',')
const uniq=(xs,k)=>Array.isArray(xs)&&new Set(xs.map(k)).size===xs.length
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x
const sort=(a,b)=>a.riderId<b.riderId?-1:a.riderId>b.riderId?1:0
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false})
const modifierFields=['race_id','stage_id','rider_id','team_id','preparation_applied','equipment_selected','in_stage_energy_cost_multiplier','post_stage_fatigue_multiplier','equipment_fatigue_reduction_pct','post_stage_recovery_bonus_points','non_neutral_command_capability_bonus','equipment_engine_stage_bonus_pct','supply_stage_performance_pct','health_incident_risk_multiplier','mechanical_incident_risk_multiplier','mechanical_time_loss_multiplier','equipment_condition_factor']
export function normalizeFrozenPreparation(m){
 req(fields(m,modifierFields)&&typeof m.preparation_applied==='boolean'&&typeof m.equipment_selected==='boolean','complete preparation row required')
 req(modifierFields.slice(6).every(k=>finite(m[k])),'explicit numeric preparation required')
 const applied=m.preparation_applied,has=applied||m.equipment_selected||Math.abs(m.equipment_engine_stage_bonus_pct)>0
 const n=has?{
  inStageEnergyCostMultiplier:clamp(applied?m.in_stage_energy_cost_multiplier:1,.75,1.35),
  postStageFatigueMultiplier:clamp((applied?m.post_stage_fatigue_multiplier:1)*(1-clamp(m.equipment_fatigue_reduction_pct,0,10)/100),.7,1.4),
  postStageRecoveryBonusPoints:clamp(applied?m.post_stage_recovery_bonus_points:0,0,4),
  performanceBonusPoints:clamp(applied?m.non_neutral_command_capability_bonus:0,0,1.5),
  equipmentStagePerformancePct:clamp(m.equipment_engine_stage_bonus_pct,-20,20),
  supplyStagePerformancePct:clamp(m.supply_stage_performance_pct,-20,20),
  incidentRiskMultiplier:clamp(applied?m.health_incident_risk_multiplier:1,.7,1.4),
  healthIncidentRiskMultiplier:clamp(applied?m.health_incident_risk_multiplier:1,.25,1.5),
  mechanicalIncidentRiskMultiplier:clamp(m.mechanical_incident_risk_multiplier,.78,1.5),
  mechanicalTimeLossMultiplier:clamp(m.mechanical_time_loss_multiplier,.82,1),
  equipmentConditionPercent:clamp(m.equipment_condition_factor*100,0,100)
 }:null
 // Fail closed for 043K: legacy runner does not model these in-stage effects.
 // Do not silently discard a real sporting/energy modifier.
 const legacyCompatible=n===null||(n.inStageEnergyCostMultiplier===1&&n.performanceBonusPoints===0&&n.equipmentStagePerformancePct===0&&n.supplyStagePerformancePct===0&&n.mechanicalIncidentRiskMultiplier===1&&n.mechanicalTimeLossMultiplier===1&&n.equipmentConditionPercent===100)
 const workloadCompatible=n===null||(n.postStageFatigueMultiplier>=.75&&n.postStageFatigueMultiplier<=1.35)
 return {modifiers:n,legacyCompatible,workloadCompatible}
}
export function buildFrozenReadinessReview({source,expectedSourceSha256}){
 req(source?.provenance===P&&source.completeSyntheticEvidence===true&&carryoverDigest(source)===expectedSourceSha256,'frozen source digest mismatch')
 req(fields(source,['provenance','completeSyntheticEvidence','raceId','stageId','runId','date','stageNumber','difficultyCategory','participants','riderRows','modifierRows','prior','expectedPriorSha256','recoveryReceipts']),'unexpected source fields')
 const {raceId,stageId,runId,date,stageNumber,participants,riderRows,modifierRows,prior,recoveryReceipts}=source
 req([raceId,stageId,runId].every(uuid)&&day(date)&&[1,2].includes(stageNumber)&&Number.isInteger(source.difficultyCategory)&&source.difficultyCategory>=1&&source.difficultyCategory<=5,'stage scope')
 req([participants,riderRows,modifierRows,recoveryReceipts].every(x=>uniq(x,r=>r.rider_id??r.riderId))&&participants.length>=2&&riderRows.length===participants.length&&modifierRows.length===participants.length,'complete unique roster required')
 const scope=r=>r.race_id===raceId&&r.stage_id===stageId&&uuid(r.rider_id)&&uuid(r.team_id)
 req([...participants,...riderRows,...modifierRows].every(scope),'foreign stage or rider scope')
 let gap=0
 if(stageNumber===1)req(prior===null&&source.expectedPriorSha256===null&&recoveryReceipts.length===0,'unexpected prior evidence')
 else{
  req(prior&&carryoverDigest(prior)===source.expectedPriorSha256&&prior.version==='043C_stage_carryover_v1'&&prior.provenance===P&&prior.official===false&&prior.hostedWriteAllowed===false&&prior.accountingAllowed===false&&prior.raceId===raceId&&prior.stageId!==stageId&&prior.runId!==runId&&prior.stageNumber===1&&day(prior.date),'prior receipt mismatch')
  gap=(Date.parse(date)-Date.parse(prior.date))/86400000
  req([0,1].includes(gap)&&uniq(prior.riders,r=>r.riderId)&&prior.riders.length===participants.length,'prior roster or date mismatch')
  req(recoveryReceipts.length===(gap===1?participants.length:0),'recovery coverage')
 }
 const rows=participants.map(p=>{
  req(fields(p,['race_id','stage_id','rider_id','team_id','accepted','selected','selection_blocked'])&&p.accepted===true&&typeof p.selected==='boolean'&&typeof p.selection_blocked==='boolean','explicit accepted selection required')
  const r=riderRows.find(x=>x.rider_id===p.rider_id),m=modifierRows.find(x=>x.rider_id===p.rider_id)
  req(r&&m&&r.team_id===p.team_id&&m.team_id===p.team_id,'rider/team coverage')
  req(fields(r,['race_id','stage_id','rider_id','team_id','fatigue_before_stage','fatigue','start_stamina','morale','recovery','availability_status'])&&bounded(r.morale)&&bounded(r.recovery),'explicit condition row required')
  const fatigue=r.fatigue_before_stage??r.fatigue
  req(bounded(fatigue)&&(r.fatigue===null||bounded(r.fatigue))&&(r.fatigue_before_stage===null||bounded(r.fatigue_before_stage)),'missing or invalid fatigue')
  // Missing stamina is a normalized null marker. Original JS Number(null)=0;
  // explicitly choose documented fallback only for missing, never for real zero.
  req(r.start_stamina===null||bounded(r.start_stamina),'invalid stamina')
  const stamina=r.start_stamina===null?clamp(100-fatigue*.45,1,100):r.start_stamina
  const availability=typeof r.availability_status==='string'?r.availability_status.trim().toLowerCase():''
  req(['fit','not_fully_fit','injured','sick'].includes(availability),'unsupported or missing availability')
  let carried=null,priorStatus=null
  if(prior){
   const old=prior.riders.find(x=>x.riderId===p.rider_id)
   req(old&&old.teamId===p.team_id&&bounded(old.persistedFatigue)&&['finished','dnf','otl','dns'].includes(old.status),'prior rider mismatch')
   priorStatus=old.status;carried=old.persistedFatigue
   if(gap===1){
    const rec=recoveryReceipts.find(x=>x.riderId===p.rider_id)
    req(rec&&rec.raceId===raceId&&rec.previousStageId===prior.stageId&&rec.stageId===stageId&&rec.date===date&&rec.fatigueAfterStage===carried,'daily recovery mismatch')
    carried=reviewOfficialRaceNight(rec).fatigue
   }
   req(fatigue===carried,'incorrect carried fatigue')
  }
  const startStatus=!p.selected||p.selection_blocked||['injured','sick'].includes(availability)||(priorStatus!==null&&priorStatus!=='finished')?'dns':'starter'
  const prep=normalizeFrozenPreparation(m)
  return {riderId:p.rider_id,teamId:p.team_id,startStatus,priorStatus,condition:{startingEnergy:stamina,fatigueBeforeStage:fatigue,morale:r.morale,availabilityStatus:availability},staminaSource:r.start_stamina===null?'explicit_missing_fatigue_fallback':'frozen_start_stamina',recoverySkill:r.recovery,preparation:prep,...flags()}
 }).sort(sort)
 const receipt={version:'043N_frozen_readiness_review_v1',provenance:P,raceId,stageId,runId,date,stageNumber,difficultyCategory:source.difficultyCategory,sourceSha256:expectedSourceSha256,priorSha256:source.expectedPriorSha256,rows,...flags()}
 return {receipt,sha256:carryoverDigest(receipt)}
}
export function bindLegacyReadiness({source,expectedSourceSha256,input}){
 const {receipt,sha256}=buildFrozenReadinessReview({source,expectedSourceSha256})
 req(input?.raceId===receipt.raceId&&input.stageId===receipt.stageId&&input.stageFormat==='road_race'&&Array.isArray(input.orders)&&input.orders.length===0&&uniq(input.riders,r=>r.riderId)&&input.riders.length===receipt.rows.length,'legacy input scope mismatch')
 req(receipt.rows.every(r=>r.startStatus==='starter'&&r.condition.availabilityStatus==='fit'&&r.preparation.legacyCompatible&&r.preparation.workloadCompatible),'unsupported legacy eligibility or preparation; no simulation permitted')
 const riders=input.riders.map(r=>{
  const x=receipt.rows.find(x=>x.riderId===r.riderId)
  req(x&&x.teamId===r.teamId&&!Object.hasOwn(r,'condition')&&!Object.hasOwn(r,'equipment')&&r.attributes?.recovery===x.recoverySkill,'legacy roster or caller readiness mismatch')
  return {...r,condition:x.condition}
 })
 const readiness=receipt.rows.map(r=>({riderId:r.riderId,teamId:r.teamId,difficultyCategory:receipt.difficultyCategory,postStageFatigueMultiplier:r.preparation.modifiers?.postStageFatigueMultiplier??1,postStageRecoveryBonusPoints:r.preparation.modifiers?.postStageRecoveryBonusPoints??0,preparationIncidentRiskMultiplier:r.preparation.modifiers?.incidentRiskMultiplier??1}))
 return {input:{...input,riders},readiness,receipt,readinessSha256:sha256,...flags()}
}

// 043AG opt-in: keep full receipt, admit only eligible stage-two riders.
export function bindMixedStageReadiness({source,expectedSourceSha256,input}){
 const {receipt,sha256}=buildFrozenReadinessReview({source,expectedSourceSha256})
 req(receipt.stageNumber===2&&input?.raceId===receipt.raceId&&input.stageId===receipt.stageId&&input.stageFormat==='road_race'&&Array.isArray(input.orders)&&input.orders.length===0&&uniq(input.riders,r=>r.riderId)&&input.riders.length===receipt.rows.length,'mixed stage input scope mismatch')
 req(uniq(input.teams,t=>t.teamId),'unique teams required')
 const starters=receipt.rows.filter(r=>r.startStatus==='starter')
 req(starters.length>=2&&starters.every(r=>['fit','not_fully_fit'].includes(r.condition.availabilityStatus)&&r.preparation.legacyCompatible&&r.preparation.workloadCompatible),'unsupported mixed starter readiness')
 const ids=new Set(starters.map(r=>r.riderId))
 for(const r of input.riders){
  const x=receipt.rows.find(x=>x.riderId===r.riderId)
  req(x&&x.teamId===r.teamId&&!Object.hasOwn(r,'condition')&&!Object.hasOwn(r,'equipment')&&r.attributes?.recovery===x.recoverySkill,'mixed roster or caller readiness mismatch')
  const t=input.teams.find(t=>t.teamId===r.teamId)
  req(t&&t.riderIds.includes(r.riderId),'missing original team membership')
 }
 for(const t of input.teams)req(uniq(t.riderIds,x=>x)&&t.riderIds.every(id=>input.riders.some(r=>r.riderId===id&&r.teamId===t.teamId))&&t.riderIds.includes(t.captainRiderId),'invalid original team')
 const teams=input.teams.map(t=>{
  const riderIds=t.riderIds.filter(id=>ids.has(id)).sort()
  return {...t,riderIds,captainRiderId:riderIds.includes(t.captainRiderId)?t.captainRiderId:riderIds[0]}
 }).filter(t=>t.riderIds.length>0)
 const riders=input.riders.filter(r=>ids.has(r.riderId)).map(r=>({...r,condition:starters.find(x=>x.riderId===r.riderId).condition}))
 return {input:{...input,riders,teams},receipt,readinessSha256:sha256,excluded:receipt.rows.filter(r=>r.startStatus==='dns').map(r=>r.riderId),...flags()}
}
