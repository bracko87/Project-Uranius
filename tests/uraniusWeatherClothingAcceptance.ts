import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {resolveClothingAllocation,reviewClothingExposure} from '../scripts/uranius-weather-clothing-review.mjs'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
import {bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {finishPhysicalIncidentStage} from '../scripts/uranius-physical-incident-finish-review'
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



const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const baseline=run(tourPacket)
const selected=roster.find(r=>r.teamId===teams[0]&&baseline.stages.every(s=>s.initialRiders.some(x=>x.riderId===r.riderId)))
assert.ok(selected,'persistent starter required')
const units=[{resourceId:'rain-jacket-1',teamId:selected.teamId},{resourceId:'rain-jacket-spare',teamId:teams[1]}]
const unitResources=units.map((u,i)=>({resourceType:'supply',resourceId:u.resourceId,teamId:u.teamId,quantity:null,stageUsesRemaining:i?25:1,maxStageUses:25,condition:null,lastUsedDate:null}))
const medicalCenters=teams.map((teamId,i)=>({teamId,level:i?5:0}))
const clothingPacket={...tourPacket,clothingBinding:{units,medicalCenters},initialResources:[...tourPacket.initialResources,...unitResources],stages:tourPacket.stages.map((s,i)=>({...s,clothingTemperatureC:10,
 clothingPlans:roster.map(r=>({riderId:r.riderId,teamId:r.teamId,requested:r.riderId===selected.riderId,resourceId:r.riderId===selected.riderId?units[0].resourceId:null})),
 clothingHashWitnesses:roster.map((r,j)=>({riderId:r.riderId,key:r.riderId+'-'+s.input.stageId+'-weather-illness',signedHashtext:j%2===0?-38:99})),
 resourceRequests:[...s.resourceRequests,...units.map((u,j)=>({resourceType:'supply',resourceId:u.resourceId,selectedQuantity:0,selectedStageUses:i===0&&j===0?1:0,conditionLossPerRaceDay:0}))]}))}
const out=run(clothingPacket)
let protectedEvents=0,unprotectedEvents=0,eligible=0
for(const [i,s] of out.stages.entries()){
 const x=s.receipt.clothingExposure,r=x.receipt
 assert.equal(x.sha256,carryoverDigest(r));assert.equal(r.physicalClassificationSha256,s.physicalClassificationSha256)
 assert.deepEqual(s.physicalClassification,baseline.stages[i].physicalClassification)
 assert.deepEqual(s.receipt.riders,baseline.stages[i].receipt.riders)
 const a=r.allocation.rows.find(a=>a.riderId===selected.riderId)
 assert.equal(a.jacketUsed,i===0)
 for(const u of r.allocation.units){
  const ledger=s.receipt.resources.find(x=>x.before.resourceId===u.resourceId)
  assert.equal(ledger.after.stageUsesRemaining,u.closingUses)
  if(u.resourceId===units[0].resourceId){assert.equal(ledger.after.stageUsesRemaining,0);assert.equal(ledger.after.lastUsedDate,source.date)}
  else assert.deepEqual(ledger.before,ledger.after)
 }
 assert.equal(r.exposures.length,s.physicalClassification.filter(r=>r.status==='finished').length)
 for(const e of r.exposures){
  assert.equal(e.illnessRiskScore,e.jacketUsed?10:60)
  if(e.jacketUsed)protectedEvents++;else unprotectedEvents++
 }
 const prior=i?out.stages[i-1].receipt.clothingExposure.receipt.history:[]
 assert.equal(r.priorExposuresSha256,carryoverDigest(prior));assert.deepEqual(r.history,[...prior,...r.exposures])
 for(const c of r.candidates){
  assert.equal(c.recentUnprotectedCount,1+prior.filter(e=>e.riderId===c.riderId&&!e.jacketUsed).length)
  assert.equal(c.threshold,c.teamId===teams[0]?45:38.25)
  assert.equal(c.eligible,c.recentUnprotectedCount>=2&&c.roll<c.threshold)
  assert.equal(c.caseCreationVerified,false);assert.equal(c.availabilityChanged,false)
  if(c.eligible)eligible++
  if(i===0)assert.equal(c.eligible,false)
 }
 assert.equal(r.hashtextParityVerified,false);assert.equal(r.healthCaseCreationVerified,false)
}
assert.equal(protectedEvents,1);assert.ok(unprotectedEvents>0&&eligible>0)
console.log('PASS 043AP physical jacket stock allocation, single use, exhaustion and actual finisher exposure; protected='+protectedEvents+' unprotected='+unprotectedEvents)
console.log('PASS 043AP causal repeated exposure, medical center threshold, synthetic hash witnesses and no unverified health changes; candidates='+eligible)
// Controlled completed stage and 14-day boundary. Physical finish is generated,
// not a supplied classification stub; fixture hashtext is deliberately synthetic.
const short={...input,distanceKm:3,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:3,elevationMetres:50}]}
const bound=bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input:short})
const state=createInitialState(bound.input),target=Object.values(state.groups).find(g=>g.active).groupId
const finish=finishPhysicalIncidentStage(state,[],target)
const s=clothingPacket.stages[0],evidence={provenance:P,stageId,date:source.date,resources:clothingPacket.initialResources,requests:s.resourceRequests,units,medicalCenters,plans:s.clothingPlans,hashWitnesses:s.clothingHashWitnesses,weather:{temperatureC:10,rainChancePct:90,precipitationMm:1,condition:'rain'}}
const rider=roster.find(r=>r.riderId!==selected.riderId&&r.teamId===teams[0]&&roster.indexOf(r)%2===0)
const old={stageId:id(900),runId:id(901),date:'1999-12-20',riderId:rider.riderId,teamId:rider.teamId,required:true,jacketUsed:false,illnessRiskScore:60}
const expose=(history,ev=evidence)=>reviewClothingExposure({evidence:ev,expectedEvidenceSha256:carryoverDigest(ev),ready:bound.receipt,finish,priorExposures:history,expectedPriorExposuresSha256:carryoverDigest(history)})
assert.equal(expose([old]).receipt.candidates.find(c=>c.riderId===rider.riderId).eligible,true)
assert.equal(expose([{...old,date:'1999-12-19'}]).receipt.candidates.find(c=>c.riderId===rider.riderId).eligible,false)
const atThreshold=structuredClone(evidence);atThreshold.hashWitnesses.find(h=>h.riderId===rider.riderId).signedHashtext=-45
assert.equal(expose([old],atThreshold).receipt.candidates.find(c=>c.riderId===rider.riderId).eligible,false)
assert.throws(()=>expose([{...old,date:source.date}]),/invalid prior exposure/)
assert.throws(()=>expose([old,old]),/invalid prior exposure/)
const alloc=e=>resolveClothingAllocation({evidence:e,expectedEvidenceSha256:carryoverDigest(e),ready:bound.receipt})
const duplicate=structuredClone(evidence);const p=duplicate.plans.find(p=>p.riderId===rider.riderId);p.requested=true;p.resourceId=units[0].resourceId
assert.throws(()=>alloc(duplicate),/reused jacket/)
const already=structuredClone(evidence);already.resources.find(r=>r.resourceId===units[0].resourceId).lastUsedDate=source.date;already.requests.find(r=>r.resourceId===units[0].resourceId).selectedStageUses=0
assert.equal(alloc(already).rows.find(r=>r.riderId===selected.riderId).jacketUsed,false)
assert.throws(()=>resolveClothingAllocation({evidence,expectedEvidenceSha256:'0'.repeat(64),ready:bound.receipt}),/frozen clothing/)
console.log('PASS 043AP 14-day inclusive boundary, strict roll threshold, duplicate/future evidence and same-date use guards')
assert.deepEqual(run(clothingPacket),out)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AP deterministic replay, unchanged physical outcomes and authority guards')
console.log('PASS 4/4 weather clothing checks; no hosted connection')
