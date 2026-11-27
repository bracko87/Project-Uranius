// Offline synthetic two-stage continuity. No official state or health writer.
import {carryoverDigest,buildStageCarryover} from './uranius-multistage-carryover-review.mjs'
import {buildFrozenReadinessReview} from './uranius-frozen-readiness-review.mjs'
import {reviewOfficialRaceNight} from './uranius-original-fatigue-review.mjs'
import {reviewAutomaticPhysicalFinish} from './uranius-physical-incident-finish-review'
import {reviewSportingClassification} from './uranius-sporting-classification-review'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
const P='synthetic_review_fixture'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AF: '+m)}
const bounded=(x:number)=>Number.isFinite(x)&&x>=0&&x<=100
export function reviewPhysicalStageContinuity({args,policy,continuity,expectedContinuitySha256}:any){
 req(continuity?.provenance===P&&carryoverDigest(continuity)===expectedContinuitySha256,'frozen continuity evidence required')
 const {source,expectedSourceSha256}=args
 const ready=buildFrozenReadinessReview({source,expectedSourceSha256}).receipt
 const {schedule,nextRunId,resources,recovery}=continuity
 req(source.stageNumber===1&&Array.isArray(schedule)&&schedule.length===2&&schedule[0].stageId===source.stageId&&schedule[0].date===source.date&&schedule[1].stageId!==source.stageId&&schedule[1].date===new Date(Date.parse(source.date)+86400000).toISOString().slice(0,10),'consecutive two-stage scope required')
 req(typeof nextRunId==='string'&&nextRunId!==source.runId&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(nextRunId),'distinct next run required')
 req(Array.isArray(recovery)&&recovery.length===ready.rows.length&&new Set(recovery.map(r=>r.riderId)).size===recovery.length&&ready.rows.every(r=>recovery.some(n=>n.riderId===r.riderId)),'explicit complete recovery inputs required')
 const auto=reviewAutomaticPhysicalFinish(args)
 const evidence=auto.prefix.trace.incidents.flatMap(e=>{
  const obs=auto.prefix.observations.find(o=>o.raceSecond===e.raceSecond),group=obs?.tick.groups.find(g=>g.displayCode==='P')
  req(group,'incident source group missing')
  return e.incident.affectedRiderIds.map(riderId=>({incidentId:e.incident.incidentId,riderId,kind:e.incident.kind,km:e.kmFromStart,sourceGroupRiderIds:group.riderIds,affectedRiderIds:e.incident.affectedRiderIds}))
 })
 const sporting=reviewSportingClassification({finish:auto.finish,policy,incidents:evidence,expectedPolicySha256:carryoverDigest(policy),expectedIncidentsSha256:carryoverDigest(evidence)})
 const terminal=auto.finish.state
 const riders={...terminal.riders}
 const workloads=[],health=[],energyAudit=[]
 for(const r of ready.rows){
  const row=sporting.rows.find(x=>x.riderId===r.riderId),actual=terminal.riders[r.riderId]
  req(row&&actual&&r.startStatus==='starter'&&actual.teamId===r.teamId&&r.preparation.workloadCompatible,'readiness mismatch')
  const corrected=row.energy?.partialTickEnergy??actual.energy
  req(bounded(corrected)&&corrected>=actual.energy-1e-8&&corrected<=r.condition.startingEnergy+1e-8,'invalid corrected energy')
  riders[r.riderId]={...actual,energy:corrected}
  const apps=auto.prefix.applications.filter(a=>a.riderId===r.riderId)
  const history=apps.map(a=>{
   const event=auto.prefix.trace.incidents.find(e=>e.incident.incidentId===a.incidentId)
   const h=event?.incident.handoffs.find(h=>h.riderId===r.riderId)
   req(h&&h.teamId===r.teamId&&h.statusImpact===a.statusImpact,'incident handoff mismatch')
   return {incidentId:a.incidentId,kind:a.kind,healthOutcome:h.healthOutcome,appliedLoss:a.beforeEnergy-a.afterEnergy}
  })
  health.push({riderId:r.riderId,outcomes:history.filter(h=>h.healthOutcome.injuryOccurred).map(h=>({incidentId:h.incidentId,...h.healthOutcome})),selectionBlocked:history.some(h=>h.healthOutcome.selectionBlockedAfterStage)})
  energyAudit.push({riderId:r.riderId,fullTickEnergy:actual.energy,correctedEnergy:corrected,alreadyAppliedIncidentLoss:history.reduce((n,h)=>n+h.appliedLoss,0),additionalIncidentDeduction:0})
  const mods=r.preparation.modifiers
  // Incident loss is already embedded in physical energy. Never subtract it twice.
  workloads.push({provenance:P,completeWorkloadEvidence:true,riderId:r.riderId,teamId:r.teamId,status:row.status,eligibleToStart:true,effectiveFatigueBeforeStage:r.condition.fatigueBeforeStage,startEnergy:r.condition.startingEnergy,rawFinishEnergy:corrected,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm:terminal.stageDistanceKm,difficultyCategory:ready.difficultyCategory,postStageFatigueMultiplier:mods?.postStageFatigueMultiplier??1,postStageRecoveryBonusPoints:mods?.postStageRecoveryBonusPoints??0,recoverySkill:r.recoverySkill,morale:r.condition.morale,preparationIncidentRiskMultiplier:mods?.incidentRiskMultiplier??1,incidents:history.map(h=>({incidentId:h.incidentId,incidentType:h.kind})),breakawaySegments:[]})
 }
 const correctedState={...terminal,riders}
 validateSimulationState(correctedState)
 const carry=buildStageCarryover({provenance:P,completeSyntheticEvidence:true,raceId:source.raceId,stageId:source.stageId,runId:source.runId,distanceKm:terminal.stageDistanceKm,schedule,previousReceipt:null,expectedPreviousDigest:null,recoveryReceipts:[],workloads,resources})
 const next=schedule[1],scope={race_id:source.raceId,stage_id:next.stageId}
 const nights=carry.receipt.riders.map(r=>{
  const config=recovery.find(n=>n.riderId===r.riderId),prev=ready.rows.find(x=>x.riderId===r.riderId)
  return {...config,provenance:P,raceId:source.raceId,previousStageId:source.stageId,stageId:next.stageId,date:next.date,previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:r.persistedFatigue,recovery:prev.recoverySkill,morale:prev.condition.morale}
 })
 const nextSource={...source,stageId:next.stageId,runId:nextRunId,date:next.date,stageNumber:2,prior:carry.receipt,expectedPriorSha256:carry.sha256,recoveryReceipts:nights,
  participants:source.participants.map(p=>({...p,...scope,selection_blocked:p.selection_blocked||health.find(h=>h.riderId===p.rider_id).selectionBlocked})),
  riderRows:source.riderRows.map(r=>{
   const n=reviewOfficialRaceNight(nights.find(n=>n.riderId===r.rider_id)),h=health.find(h=>h.riderId===r.rider_id)
   // Conservative review-only availability mapping; no invented injury duration.
   return {...r,...scope,fatigue_before_stage:n.fatigue,fatigue:n.fatigue,start_stamina:null,availability_status:h.selectionBlocked?'injured':h.outcomes.length?'not_fully_fit':r.availability_status}
  }),
  modifierRows:source.modifierRows.map(m=>({...m,...scope,preparation_applied:false,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1}))
 }
 const nextReadiness=buildFrozenReadinessReview({source:nextSource,expectedSourceSha256:carryoverDigest(nextSource)})
 return {version:'043AF_physical_stage_continuity_v1',auto,sporting,correctedState,energyAudit,workloads,health,carry,nextSource,nextReadiness,continuitySha256:expectedContinuitySha256,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false}
}
