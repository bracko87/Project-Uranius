// Offline review; no official result or persistence authority.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {bindLegacyReadiness,bindTourStageReadiness} from './uranius-frozen-readiness-review.mjs'
import {reviewOfficialRaceNight} from './uranius-original-fatigue-review.mjs'
import {originalPostStageFatigueReview,originalPhase9ResourceReview} from './uranius-original-engine-effects-review.mjs'
import {captureAutomaticOverlappingFinishPrefix,captureTourStageFinishPrefix} from './uranius-automatic-overlapping-incident-review'
import {finishPhysicalIncidentStage} from './uranius-physical-incident-finish-review'
import {reviewSportingClassification} from './uranius-sporting-classification-review'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
const P='synthetic_review_fixture',req=(x:unknown,m:string)=>{if(!x)throw Error('043AH: '+m)}
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false})
const day=(s:string)=>{req(typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(Date.parse(s)).toISOString().slice(0,10)===s,'invalid date');return Date.parse(s)/86400000}
const uuid=(s:string)=>typeof s==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(s)
const key=(x:any)=>x.resourceType+':'+x.resourceId
const uniq=(a:any[],f:(x:any)=>string)=>Array.isArray(a)&&new Set(a.map(f)).size===a.length
const bounded=(v:number)=>Number.isFinite(v)&&v>=0&&v<=100
const resourceState=(x:any)=>{
 req(['equipment','asset','supply'].includes(x.resourceType)&&typeof x.resourceId==='string'&&x.resourceId.length>0&&uuid(x.teamId),'invalid resource identity')
 req(['quantity','stageUsesRemaining','maxStageUses','condition','lastUsedDate'].every(k=>Object.hasOwn(x,k)),'missing resource state')
 req([x.quantity,x.stageUsesRemaining,x.maxStageUses].every(v=>v===null||Number.isFinite(v)&&v>=0)&&(x.condition===null||bounded(x.condition)),'invalid resource counters')
 req((x.stageUsesRemaining===null)===(x.maxStageUses===null)&&(x.stageUsesRemaining===null||x.stageUsesRemaining<=x.maxStageUses),'invalid durable counter')
 if(x.lastUsedDate!==null){day(x.lastUsedDate);req(x.stageUsesRemaining!==null,'non-durable use date')}
 return {resourceType:x.resourceType,resourceId:x.resourceId,teamId:x.teamId,quantity:x.quantity,stageUsesRemaining:x.stageUsesRemaining,maxStageUses:x.maxStageUses,condition:x.condition,lastUsedDate:x.lastUsedDate}
}
export function reviewMultistagePhysicalTour({packet,expectedPacketSha256}:any){
 req(packet?.provenance===P&&carryoverDigest(packet)===expectedPacketSha256,'frozen tour packet required')
 const {firstSource,stages,initialResources}=packet
 req(Array.isArray(stages)&&stages.length>=3&&stages.length<=21&&uniq(stages,s=>s.input.stageId)&&uniq(stages,s=>s.runId)&&uniq(stages,s=>s.input.seed),'distinct 3–21 stages required')
 req(firstSource.stageNumber===1&&firstSource.stageId===stages[0].input.stageId&&firstSource.runId===stages[0].runId&&firstSource.date===stages[0].date&&firstSource.difficultyCategory===stages[0].difficultyCategory,'first stage mismatch')
 const original=stages[0].input,raceId=original.raceId
 req(stages.every((s,i)=>uuid(s.runId)&&uuid(s.input.stageId)&&s.input.raceId===raceId&&s.weatherCancelled===false&&s.input.orders.length===0&&s.input.stageFormat==='road_race'&&Number.isInteger(s.difficultyCategory)&&s.difficultyCategory>=1&&s.difficultyCategory<=5&&carryoverDigest(s.input.riders)===carryoverDigest(original.riders)&&carryoverDigest(s.input.teams)===carryoverDigest(original.teams)&&(!i||day(s.date)-day(stages[i-1].date)>=1&&day(s.date)-day(stages[i-1].date)<=7)),'tour scope or schedule mismatch')
 const schedule=stages.map((s,i)=>({stageId:s.input.stageId,stageNumber:i+1,runId:s.runId,date:s.date,weatherCancelled:false}))
 const scheduleSha256=carryoverDigest(schedule)
 req(uniq(initialResources,key)&&initialResources.length>0,'explicit resources required')
 let resources=initialResources.map(resourceState).sort((a,b)=>key(a).localeCompare(key(b)))
 req(resources.every(r=>original.teams.some(t=>t.teamId===r.teamId)),'unknown resource team')
 let prior:any=null,gc:any[]=[],reports:any[]=[]
 const seenIncidents=new Set<string>()
 for(const [index,stage] of stages.entries()){
  const {input,context,policy,runId,date,difficultyCategory}=stage
  const stageId=input.stageId,scope={race_id:raceId,stage_id:stageId}
  let source=firstSource
  const nights:any[]=[]
  if(index){
   const gap=day(date)-day(prior.date)
   req(uniq(stage.recovery,r=>r.riderId+'|'+r.date)&&stage.recovery.length===gap*prior.riders.length,'complete daily recovery schedule required')
   const riderRows=firstSource.riderRows.map(r=>{
    const old=prior.riders.find(x=>x.riderId===r.rider_id)
    let fatigue=old.persistedFatigue
    for(let j=1;j<=gap;j++){
     const d=new Date(Date.parse(prior.date)+j*86400000).toISOString().slice(0,10)
     const config=stage.recovery.find(n=>n.riderId===r.rider_id&&n.date===d)
     req(config,'missing dated recovery input')
     const rec={...config,provenance:P,raceId,previousStageId:prior.stageId,stageId,date:d,previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:fatigue,recovery:r.recovery,morale:r.morale}
     const effect=reviewOfficialRaceNight(rec)
     nights.push({...rec});fatigue=effect.fatigue
    }
    return {...r,...scope,fatigue_before_stage:fatigue,fatigue,start_stamina:null,availability_status:old.availabilityStatus}
   })
   source={...firstSource,stageId,runId,date,stageNumber:index+1,difficultyCategory,prior,expectedPriorSha256:carryoverDigest(prior),recoveryReceipts:nights,riderRows,
    participants:firstSource.participants.map(p=>({...p,...scope,selection_blocked:prior.riders.find(r=>r.riderId===p.rider_id).selectionBlocked})),modifierRows:stage.modifierRows}
  }else req(Array.isArray(stage.recovery)&&stage.recovery.length===0&&carryoverDigest(stage.modifierRows)===carryoverDigest(firstSource.modifierRows),'unexpected first stage recovery or preparation')
  const expectedSourceSha256=carryoverDigest(source)
  const bound=(index?bindTourStageReadiness:bindLegacyReadiness)({source,expectedSourceSha256,input})
  const ready=bound.receipt,starters=ready.rows.filter(r=>r.startStatus==='starter'),ids=new Set(starters.map(r=>r.riderId))
  req(starters.length>=2,'fewer than two starters outside review scope')
  const initial=createInitialState(bound.input)
  req(Object.keys(initial.riders).length===ids.size&&starters.every(r=>initial.riders[r.riderId].energy===r.condition.startingEnergy&&carryoverDigest(initial.riders[r.riderId].startingCondition)===carryoverDigest(r.condition)),'initial physical readiness mismatch')
  req(uniq(context.plans,p=>p.riderId)&&context.plans.length===ready.rows.length&&ready.rows.every(r=>context.plans.some(p=>p.riderId===r.riderId)),'complete original plans required')
  const effectiveContext={...context,plans:context.plans.filter(p=>ids.has(p.riderId)),gcStandings:gc.filter(r=>ids.has(r.riderId)).map(r=>({riderId:r.riderId,rank:r.rank}))}
  const mechanicalEvidence=packet.mechanicalBinding?{provenance:P,stageId,date,resources,requests:stage.resourceRequests,setups:packet.mechanicalBinding.setups,supports:packet.mechanicalBinding.supports}:null
  const energyEvidence=packet.energyBinding?{provenance:P,stageId,resources,requests:stage.resourceRequests,supplies:packet.energyBinding.supplies}:null
  const prefix=(index?captureTourStageFinishPrefix:captureAutomaticOverlappingFinishPrefix)({input,source,expectedSourceSha256,context:effectiveContext,expectedContextSha256:carryoverDigest(effectiveContext),...(mechanicalEvidence?{resourceMechanicalEvidence:mechanicalEvidence,expectedResourceMechanicalSha256:carryoverDigest(mechanicalEvidence)}:{}),...(energyEvidence?{resourceEnergyEvidence:energyEvidence,expectedResourceEnergySha256:carryoverDigest(energyEvidence)}:{})})
  const p=prefix.finishPrefix!
  req(prefix.trace.stopReason==='pre_finish_boundary'&&p.handled===prefix.trace.incidents.length,'stage must reach fully applied finish prefix: '+(index+1)+' '+prefix.trace.stopReason)
  const targetId=p.targetId??Object.values(prefix.finalState.groups).find((g:any)=>g.active&&g.groupType==='peloton')?.groupId
  req(targetId,'missing physical target')
  const energyMultipliers=prefix.resourceEnergy?Object.fromEntries(prefix.resourceEnergy.rows.map(r=>[r.riderId,r.roadEnergyMultiplier])):undefined
  const finish=finishPhysicalIncidentStage(prefix.finalState,p.episodes,targetId,1440,energyMultipliers)
  const evidence=prefix.trace.incidents.flatMap(e=>{
   const obs=prefix.observations.find(o=>o.raceSecond===e.raceSecond),group=obs?.tick.groups.find(g=>g.displayCode==='P')
   req(group&&!seenIncidents.has(e.incident.incidentId),'missing incident source or previous-stage replay')
   seenIncidents.add(e.incident.incidentId)
   return e.incident.affectedRiderIds.map(riderId=>({incidentId:e.incident.incidentId,riderId,kind:e.incident.kind,km:e.kmFromStart,sourceGroupRiderIds:group.riderIds,affectedRiderIds:e.incident.affectedRiderIds}))
  })
  const sporting=reviewSportingClassification({finish,policy,incidents:evidence,expectedPolicySha256:carryoverDigest(policy),expectedIncidentsSha256:carryoverDigest(evidence)})
  const rows=[...sporting.rows,...ready.rows.filter(r=>!ids.has(r.riderId)).map(r=>({riderId:r.riderId,teamId:r.teamId,status:'dns',physicalRank:null,physicalElapsedSeconds:null,sportingRank:null,sportingElapsedSeconds:null,sportingGapSeconds:null,protectionIncidentId:null,energy:null}))]
  req(uniq(rows,r=>r.riderId)&&rows.length===ready.rows.length&&Object.keys(finish.state.riders).length===ids.size&&prefix.applications.every(a=>ids.has(a.riderId)),'physical roster coverage mismatch')
  const riders=ready.rows.map(r=>{
   const row=rows.find(x=>x.riderId===r.riderId)!,old=prior?.riders.find(x=>x.riderId===r.riderId)
   const started=ids.has(r.riderId),actual=finish.state.riders[r.riderId]
   req(started===Boolean(actual)&&(!old||old.status==='finished'||!started),'permanent withdrawal violated')
   const history=prefix.applications.filter(a=>a.riderId===r.riderId).map(a=>{
    const h=prefix.trace.incidents.find(e=>e.incident.incidentId===a.incidentId)?.incident.handoffs.find(h=>h.riderId===r.riderId)
    req(h&&h.teamId===r.teamId&&h.statusImpact===a.statusImpact,'incident handoff mismatch')
    return {incidentId:a.incidentId,kind:a.kind,healthOutcome:h.healthOutcome,appliedLoss:a.beforeEnergy-a.afterEnergy}
   })
   const energy=started?(row.energy?.partialTickEnergy??actual.energy):0
   req(bounded(energy)&&(!started||energy>=actual.energy-1e-8&&energy<=r.condition.startingEnergy+1e-8),'invalid corrected energy')
   const mods=r.preparation.modifiers
   const supply=prefix.resourceEnergy?.rows.find(x=>x.riderId===r.riderId)
   const workload={provenance:P,completeWorkloadEvidence:true,riderId:r.riderId,teamId:r.teamId,status:row.status,eligibleToStart:started,effectiveFatigueBeforeStage:r.condition.fatigueBeforeStage,startEnergy:started?r.condition.startingEnergy:0,rawFinishEnergy:energy,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm:input.distanceKm,difficultyCategory,postStageFatigueMultiplier:supply?.postStageFatigueMultiplier??mods?.postStageFatigueMultiplier??1,postStageRecoveryBonusPoints:supply?.postStageRecoveryBonusPoints??mods?.postStageRecoveryBonusPoints??0,recoverySkill:r.recoverySkill,morale:r.condition.morale,preparationIncidentRiskMultiplier:mods?.incidentRiskMultiplier??1,incidents:history.map(h=>({incidentId:h.incidentId,incidentType:h.kind})),breakawaySegments:[]}
   const effect=originalPostStageFatigueReview(workload)
   const injuries=history.filter(h=>h.healthOutcome.injuryOccurred).map(h=>({incidentId:h.incidentId,...h.healthOutcome}))
   const selectionBlocked=(old?.selectionBlocked??source.participants.find(p=>p.rider_id===r.riderId).selection_blocked)||history.some(h=>h.healthOutcome.selectionBlockedAfterStage)
   const availabilityStatus=selectionBlocked?'injured':injuries.length?'not_fully_fit':r.condition.availabilityStatus
   return {riderId:r.riderId,teamId:r.teamId,status:row.status,persistedFatigue:started?Math.round(effect.fatigueAfterStage):r.condition.fatigueBeforeStage,availabilityStatus,selectionBlocked,withdrawal:old?.withdrawal??(row.status!=='finished'?{stageId,status:row.status}:null),injuries:[...(old?.injuries??[]),...injuries],workload,effect,energyAudit:{fullTickEnergy:actual?.energy??0,correctedEnergy:energy,alreadyAppliedIncidentLoss:history.reduce((n,h)=>n+h.appliedLoss,0),additionalIncidentDeduction:0}}
  })
  req(uniq(stage.resourceRequests,key)&&stage.resourceRequests.length===resources.length,'complete resource requests required')
  const activeTeams=new Set(starters.map(r=>r.teamId))
  const resourceRows=resources.map(before=>{
   const request=stage.resourceRequests.find(r=>key(r)===key(before))
   req(request&&Object.keys(request).every(k=>['resourceType','resourceId','selectedQuantity','selectedStageUses','conditionLossPerRaceDay'].includes(k)),'invalid resource request')
   for(const k of ['selectedQuantity','selectedStageUses','conditionLossPerRaceDay'])req(typeof request[k]==='number'&&Number.isFinite(request[k])&&request[k]>=0,'explicit resource request values required')
   req(before.quantity!==null||request.selectedQuantity===0,'quantity request without stock')
   req(before.stageUsesRemaining!==null||request.selectedStageUses===0,'durable request without stock')
   req(before.lastUsedDate===null||day(before.lastUsedDate)<=day(date),'future durable use date')
   req(before.lastUsedDate!==date||request.selectedStageUses===0,'duplicate daily durable use')
   if(!activeTeams.has(before.teamId)){req(request.selectedQuantity===0&&request.selectedStageUses===0,'inactive team cannot consume resources');return {before,after:before,effect:null}}
   const engine={resourceType:before.resourceType,resourceId:before.resourceId,teamId:before.teamId,selectedQuantity:request.selectedQuantity,selectedStageUses:request.selectedStageUses,conditionLossPerRaceDay:request.conditionLossPerRaceDay}
   for(const k of ['quantity','stageUsesRemaining','maxStageUses','condition'])if(before[k]!==null)engine[k]=before[k]
   const effect=originalPhase9ResourceReview({provenance:P,completeResourceEvidence:true,distanceKm:input.distanceKm,resources:[engine]}).rows[0]
   const after=resourceState({...before,quantity:effect.quantityAfter??before.quantity,stageUsesRemaining:effect.stageUsesAfter??before.stageUsesRemaining,condition:effect.conditionAfter??before.condition,lastUsedDate:(effect.stageUsesUsed??0)>0?date:before.lastUsedDate})
   return {before,after,effect}
  })
  resources=resourceRows.map(r=>r.after)
  const previousGc=new Map(gc.map(r=>[r.riderId,r]))
  gc=rows.filter(r=>r.status==='finished'&&(!index||previousGc.has(r.riderId))).map(r=>{
   const old=previousGc.get(r.riderId)
   return {riderId:r.riderId,teamId:r.teamId,totalTimeSeconds:(old?.totalTimeSeconds??0)+r.sportingElapsedSeconds!,rankSum:(old?.rankSum??0)+r.sportingRank!}
  }).sort((a,b)=>a.totalTimeSeconds-b.totalTimeSeconds||a.rankSum-b.rankSum||a.riderId.localeCompare(b.riderId)).map((r,i,all)=>({...r,rank:i+1,gapSeconds:r.totalTimeSeconds-all[0].totalTimeSeconds}))
  req(gc.length>0,'no cumulative finishers')
  const receipt={version:'043AH_tour_stage_receipt_v1',provenance:P,raceId,stageId,stageNumber:index+1,runId,date,scheduleSha256,priorSha256:prior?carryoverDigest(prior):null,runHistory:[...(prior?.runHistory??[]),runId],riders,resources:resourceRows,gc,...flags()}
  reports.push({stageId,stageNumber:index+1,ready,readinessSha256:bound.readinessSha256,recoveryReceipts:nights,initialRiders:starters.map(r=>({riderId:r.riderId,energy:initial.riders[r.riderId].energy,condition:initial.riders[r.riderId].startingCondition})),initialTeams:initial.input.teams,physicalCompleted:finish.state.completed,physicalClassification:finish.classification,physicalClassificationSha256:finish.classificationSha256,sportingRows:rows,incidentIds:prefix.trace.incidents.map(e=>e.incident.incidentId),applications:prefix.applications,observationSha256:prefix.observationSha256,...(mechanicalEvidence?{resourceMechanical:prefix.resourceMechanical,mechanicalCheckpoints:prefix.selectedCheckpoints}:{}),...(energyEvidence?{resourceEnergy:prefix.resourceEnergy,physicalEnergyAudit:[...prefix.energyAudit,...finish.ticks.flatMap(t=>t.energy.map(a=>({raceSecond:t.state.raceSecond,riderId:a.riderId,previousEnergy:a.previousEnergy,nextEnergy:a.nextEnergy,neutralCost:a.result.grossEnergyCost*a.result.efficiencyMultiplier,multiplier:energyMultipliers[a.riderId]})))],finishEnergyWitness:finish.ticks.flatMap(t=>t.crossings.map(c=>({riderId:c.riderId,crossingFraction:c.crossingFraction,energy:t.energy.find(a=>a.riderId===c.riderId)})))}:{}),receipt,receiptSha256:carryoverDigest(receipt)})
  prior=receipt
 }
 return {version:'043AH_multistage_physical_tour_v1',schedule,scheduleSha256,packetSha256:expectedPacketSha256,stages:reports,gc,gcSha256:carryoverDigest(gc),finalReceiptSha256:carryoverDigest(prior),...flags()}
}
