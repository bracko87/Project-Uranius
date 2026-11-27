import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {resolveResourceMechanicalReview} from '../scripts/uranius-resource-mechanical-review.mjs'
import {reviewHistoricalCheckpoint,reviewHistoricalIncidentProbability} from '../scripts/uranius-historical-incident-probability-review.mjs'
import {reviewHistoricalInitialLoss} from '../scripts/uranius-historical-incident-consequences-review.mjs'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date:'2000-01-03',stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map(r=>({...scope(r),fatigue_before_stage:70,fatigue:70,start_stamina:68.5,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1.4,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}
const context={terrainType:'flat',weatherCondition:'rain',precipitationMm:1,rainProbabilityPct:90,weatherMultiplier:2.5,severeWeather:true,flatSprint:true,plans:roster.map(r=>({riderId:r.riderId,stageRole:'domestique',commands:{phase1:'hold',phase2:'hold',phase3:'hold',phase4:'hold'}})),gcStandings:[]}

for(const p of context.plans){
 const n=roster.findIndex(r=>r.riderId===p.riderId)
 p.stageRole=n%12===0?'team_leader_gc':'domestique'
 p.commands=Object.fromEntries(['phase1','phase2','phase3','phase4'].map(k=>[k,n%12===0?'hold':'protect_leader']))
}
const argsFor=seed=>({input:{...input,seed},source,context,expectedSourceSha256:carryoverDigest(source),expectedContextSha256:carryoverDigest(context)})




const base=argsFor('043Y-engine-4')
const args={...base,input:{...base.input,stageName:'043AC long-wet',distanceKm:200,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:200,elevationMetres:50}],settings:{...base.input.settings,minimumSpeedKmh:40,maximumSpeedKmh:40}}}
const nextStage=id(102)
const continuity={provenance:P,schedule:[{stageId,stageNumber:1,date:source.date,weatherCancelled:false},{stageId:nextStage,stageNumber:2,date:'2000-01-04',weatherCancelled:false}],nextRunId:id(202),
 resources:[{resourceType:'equipment',resourceId:'review-equipment',teamId:teams[0],quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:100,lastUsedDate:null}],
 recovery:roster.map((r,i)=>({riderId:r.riderId,travelDelta:i%2,activityLoad:0,consecutiveHeavyDays:0,activityBonus:i%3,doctorBonus:1,clubType:'main',residentialCampusActive:false})),
 nextModifierRows:source.modifierRows.map(m=>({...m,stage_id:nextStage,preparation_applied:false,health_incident_risk_multiplier:1}))}
const policy={provenance:P,groupGapSeconds:0.001,timeLimitPercent:0,sprintZoneKm:0,flatFinish:true}
const packet={args,policy,continuity,expectedContinuitySha256:carryoverDigest(continuity)}


const thirdStage=id(103)
const resourceRequests=[
 {resourceType:'equipment',resourceId:'review-equipment',selectedQuantity:0,selectedStageUses:1,conditionLossPerRaceDay:.35},
 {resourceType:'supply',resourceId:'review-supply',selectedQuantity:2,selectedStageUses:0,conditionLossPerRaceDay:0}
]
const initialResources=[
 {resourceType:'equipment',resourceId:'review-equipment',teamId:teams[0],quantity:null,stageUsesRemaining:5,maxStageUses:5,condition:100,lastUsedDate:null},
 {resourceType:'supply',resourceId:'review-supply',teamId:teams[0],quantity:10,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null}
]
const days=ds=>ds.flatMap(date=>continuity.recovery.map(r=>({...r,date})))
const prep=stage=>continuity.nextModifierRows.map(m=>({...m,stage_id:stage}))
const tourPacket={provenance:P,firstSource:source,initialResources,stages:[
 {input:args.input,runId,date:source.date,difficultyCategory:1,weatherCancelled:false,context,policy,recovery:[],modifierRows:source.modifierRows,resourceRequests},
 {input:{...input,stageId:nextStage,stageName:'043AG stage two',seed:'043AG-stage-two-4'},runId:id(202),date:'2000-01-04',difficultyCategory:1,weatherCancelled:false,context,policy:{...policy,timeLimitPercent:100},recovery:days(['2000-01-04']),modifierRows:prep(nextStage),resourceRequests},
 {input:{...input,stageId:thirdStage,stageName:'043AH stage three',seed:'043AH-stage-three-4',distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:20,elevationMetres:50}]},runId:id(203),date:'2000-01-06',difficultyCategory:1,weatherCancelled:false,context,policy:{...policy,timeLimitPercent:100},recovery:days(['2000-01-05','2000-01-06']),modifierRows:prep(thirdStage),resourceRequests}
]}

const categories=['frame','wheelset','tires','groupset','helmet','shoes']
const setups=roster.map(r=>({riderId:r.riderId,teamId:r.teamId,components:categories.map(category=>({category,resourceId:r.riderId+'-'+category}))}))
const components=setups.flatMap(s=>s.components.map(c=>({resourceType:'equipment',resourceId:c.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:c.category==='tires'?90.1:100,lastUsedDate:null})))
const supports=teams.map(t=>({teamId:t,resourceId:t+'-support',mechanicalRisk:.95,mechanicalTimeLoss:.9}))
const supportAssets=supports.map(s=>({resourceType:'asset',resourceId:s.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:1,maxStageUses:1,condition:100,lastUsedDate:null}))
const expanded={...tourPacket,mechanicalBinding:{setups,supports},initialResources:[...components,...supportAssets],stages:tourPacket.stages.map((s,i)=>({...s,resourceRequests:[...components.map(c=>({resourceType:c.resourceType,resourceId:c.resourceId,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:.35})),...supportAssets.map(a=>({resourceType:a.resourceType,resourceId:a.resourceId,selectedQuantity:0,selectedStageUses:i?1:0,conditionLossPerRaceDay:0}))]}))}
const req={packet:expanded,expectedPacketSha256:carryoverDigest(expanded)}
const out=reviewMultistagePhysicalTour(req)
assert.equal(out.stages.length,3)
for(const [i,s] of out.stages.entries()){
 const resources=s.receipt.resources.map(r=>r.before)
 const evidence={provenance:P,stageId:s.stageId,date:s.receipt.date,resources,requests:expanded.stages[i].resourceRequests,setups,supports}
 const reviewed=resolveResourceMechanicalReview({evidence,expectedEvidenceSha256:carryoverDigest(evidence),ready:s.ready})
 assert.deepEqual(s.resourceMechanical,reviewed)
 for(const r of reviewed.rows){
  assert.equal(r.equipmentConditionPercent,Math.min(...r.components.map(c=>resources.find(x=>x.resourceId===c.resourceId).condition)))
  assert.ok(i===0?r.equipmentConditionPercent===90.1:r.equipmentConditionPercent<90)
 }
 if(i)for(const r of s.receipt.resources)assert.deepEqual(r.before,out.stages[i-1].receipt.resources.find(x=>x.after.resourceId===r.before.resourceId).after)
}
assert.equal(out.stages[0].sportingRows.filter(r=>r.status==='otl').length,8)
console.log('PASS 043AJ six physical components and weakest-condition wear carried into actual stages')
let candidateCount=0,lowerBandCount=0,technicalApplications=0
for(const s of out.stages)for(const cp of s.mechanicalCheckpoints){
 for(const c of cp.evidence.candidates.filter(c=>c.probabilityInput.incidentKind==='technical_incident')){
  const r=s.resourceMechanical.rows.find(r=>r.riderId===c.entityId)
  assert.equal(c.probabilityInput.equipmentConditionPercent,r.equipmentConditionPercent)
  assert.equal(c.probabilityInput.mechanicalIncidentRiskMultiplier,r.mechanicalRisk)
  const p=reviewHistoricalIncidentProbability(c.probabilityInput)
  assert.equal(p.equipmentConditionMultiplier,r.equipmentConditionPercent>=90?1:1.05)
  if(r.equipmentConditionPercent<90)lowerBandCount++
  candidateCount++
 }
 const selected=reviewHistoricalCheckpoint({evidence:cp.evidence,expectedEvidenceSha256:cp.expectedEvidenceSha256}).incident
 if(selected?.kind==='technical_incident'){
  const r=s.resourceMechanical.rows.find(r=>r.riderId===selected.affectedRiderIds[0])
  const loss=reviewHistoricalInitialLoss({kind:selected.kind,severity:selected.severity,hash:selected.hash,equipmentConditionPercent:r.equipmentConditionPercent,mechanicalTimeLossMultiplier:r.mechanicalTimeLoss})
  const apps=s.applications.filter(a=>a.incidentId===selected.incidentId)
  assert.ok(apps.length>0)
  assert.ok(apps.every(a=>a.timeLossSeconds===loss.timeLossSeconds))
  technicalApplications+=apps.length
 }
}
assert.ok(candidateCount>0&&lowerBandCount>0,'actual worn equipment candidate witness required')
console.log('PASS 043AJ historical mechanical risk reaches actual candidates; candidates='+candidateCount+' worn='+lowerBandCount+' technicalApplications='+technicalApplications)
for(const [i,s] of out.stages.entries())for(const r of s.resourceMechanical.supportRows){
 const a=s.receipt.resources.find(x=>x.before.resourceId===r.resourceId)
 assert.equal(r.available,i===1)
 assert.equal(r.mechanicalRisk,i===1?.95:1)
 assert.equal(r.mechanicalTimeLoss,i===1?.9:1)
 assert.equal(a.after.stageUsesRemaining,i===0?1:0)
 if(i===2){assert.equal(a.effect.shortageApplied,true);assert.equal(a.effect.stageUsesUsed,0)}
}
console.log('PASS 043AJ support benefit enabled only with available use, exhausted stock removes benefit')
const s=out.stages[1],evidence={provenance:P,stageId:s.stageId,date:s.receipt.date,resources:s.receipt.resources.map(r=>r.before),requests:expanded.stages[1].resourceRequests,setups,supports}
const resolve=e=>resolveResourceMechanicalReview({evidence:e,expectedEvidenceSha256:carryoverDigest(e),ready:s.ready})
const bad=structuredClone(evidence);bad.setups[1].components[0].resourceId=bad.setups[0].components[0].resourceId
assert.throws(()=>resolve(bad),/reused physical component/)
const missing=structuredClone(evidence);missing.setups[0].components.pop()
assert.throws(()=>resolve(missing),/six component setup/)
assert.throws(()=>resolveResourceMechanicalReview({evidence,expectedEvidenceSha256:'0'.repeat(64),ready:s.ready}),/frozen stage/)
assert.deepEqual(reviewMultistagePhysicalTour(req),out)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AJ deterministic resource-bound replay, invalid setup rejection and authority guards')
console.log('PASS 4/4 resource mechanical checks; no hosted connection')
