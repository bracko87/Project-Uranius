import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {resolveResourceEnergyReview} from '../scripts/uranius-resource-energy-review'
import {originalPostStageFatigueReview} from '../scripts/uranius-original-engine-effects-review.mjs'
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

const standardized={supplyEnergySavingPct:8,supplyEnergyPenaltyPct:0,supplyFatigueReductionPct:5,supplyFatiguePenaltyPct:0,supplyRecoveryBonusPoints:2}
const supplies=[{resourceId:'review-supply',teamId:teams[0],supplyKey:'nutrition_packs',requiredQuantity:2,standardized}]
const expanded={...tourPacket,energyBinding:{supplies},initialResources:tourPacket.initialResources.map(r=>r.resourceType==='supply'?{...r,quantity:2}:r),stages:tourPacket.stages.map((s,i)=>({...s,resourceRequests:s.resourceRequests.map(r=>r.resourceType==='supply'?{...r,selectedQuantity:i===0?0:2}:r)}))}
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const out=run(expanded),[one,two,three]=out.stages
assert.equal(out.stages.length,3);assert.ok(out.stages.every(s=>s.physicalCompleted))
assert.equal(one.sportingRows.filter(r=>r.status==='otl').length,8)
assert.equal(two.initialRiders.length,16)
for(const [i,s] of out.stages.entries()){
 const alloc=s.resourceEnergy.allocations[0],stock=s.receipt.resources.find(r=>r.before.resourceType==='supply')
 assert.equal(alloc.available,i===1)
 assert.equal(stock.before.quantity,i===2?0:2);assert.equal(stock.after.quantity,i===0?2:0)
 assert.equal(stock.effect.shortageApplied,i===2)
 for(const r of s.resourceEnergy.rows){
  const active=i===1&&r.teamId===teams[0]
  assert.equal(r.energyCostMultiplier,active?.92:1);assert.equal(r.roadEnergyMultiplier,active?.92:1)
  assert.equal(r.postStageFatigueMultiplier,active?.95:1);assert.equal(r.postStageRecoveryBonusPoints,active?2:0)
 }
}
console.log('PASS 043AK explicit nutrition stock binds historical Phase9 multipliers and removes benefit after exhaustion')
let savedTicks=0,finishWitness=0
for(const s of out.stages){
 const byId=new Map(s.resourceEnergy.rows.map(r=>[r.riderId,r]))
 const audit=s.physicalEnergyAudit
 assert.ok(audit.length>0)
 for(const a of audit){
  const m=byId.get(a.riderId).roadEnergyMultiplier
  assert.equal(a.multiplier,m)
  assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.neutralCost*m))<1e-9)
  if(m<1&&a.nextEnergy>Math.max(0,a.previousEnergy-a.neutralCost)+1e-9)savedTicks++
 }
 for(const f of s.finishEnergyWitness){
  const a=f.energy,m=byId.get(f.riderId).roadEnergyMultiplier
  const r=s.sportingRows.find(r=>r.riderId===f.riderId)
  assert.ok(a&&r.energy)
  const expected=Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*m*f.crossingFraction)
  assert.ok(Math.abs(r.energy.partialTickEnergy-expected)<1e-8)
  assert.equal(r.energy.fullTickEnergy,a.nextEnergy)
  if(m<1)finishWitness++
 }
 for(const r of s.receipt.riders){
  assert.equal(r.workload.incidentEnergyLoss,0)
  assert.equal(r.workload.postStageFatigueMultiplier,byId.get(r.riderId).postStageFatigueMultiplier)
  assert.equal(r.workload.postStageRecoveryBonusPoints,byId.get(r.riderId).postStageRecoveryBonusPoints)
  assert.deepEqual(r.effect,originalPostStageFatigueReview(r.workload))
  if(r.status==='dns')assert.equal(r.effect.adjustedFatigueGain,0)
 }
}
assert.ok(savedTicks>0&&finishWitness>0,'actual active energy and finishing witnesses required')
console.log('PASS 043AK physical tick savings, fractional finishing and historical post-stage fatigue; savedTicks='+savedTicks+' finishWitness='+finishWitness)
const evidence={provenance:P,stageId:two.stageId,resources:two.receipt.resources.map(r=>r.before),requests:expanded.stages[1].resourceRequests,supplies}
const resolve=e=>resolveResourceEnergyReview({evidence:e,expectedEvidenceSha256:carryoverDigest(e),ready:two.ready})
assert.deepEqual(resolve(evidence),two.resourceEnergy)
const cap=structuredClone(evidence);cap.supplies[0].standardized={...standardized,supplyEnergySavingPct:100,supplyFatigueReductionPct:100,supplyRecoveryBonusPoints:100}
const capped=resolve(cap).rows.find(r=>r.teamId===teams[0]);assert.equal(capped.energyCostMultiplier,.88);assert.equal(capped.roadEnergyMultiplier,.9);assert.equal(capped.postStageFatigueMultiplier,.9);assert.equal(capped.postStageRecoveryBonusPoints,4)
const penalty=structuredClone(evidence);penalty.supplies[0].standardized={...standardized,supplyEnergySavingPct:0,supplyEnergyPenaltyPct:100,supplyFatigueReductionPct:0,supplyFatiguePenaltyPct:100}
const cappedPenalty=resolve(penalty).rows.find(r=>r.teamId===teams[0]);assert.equal(cappedPenalty.energyCostMultiplier,1.18);assert.equal(cappedPenalty.roadEnergyMultiplier,1);assert.equal(cappedPenalty.postStageFatigueMultiplier,1.15)
const short=structuredClone(evidence);short.resources.find(r=>r.resourceType==='supply').quantity=1
assert.ok(resolve(short).rows.every(r=>r.roadEnergyMultiplier===1))
const invalid=structuredClone(evidence);invalid.supplies[0].teamId=teams[1]
assert.throws(()=>resolve(invalid),/invalid consumable binding/)
assert.throws(()=>resolveResourceEnergyReview({evidence,expectedEvidenceSha256:'0'.repeat(64),ready:two.ready}),/frozen supply/)
console.log('PASS 043AK historical multiplier caps, shortage neutrality and invalid evidence rejection')
const legacy=run(tourPacket)
assert.deepEqual(one.physicalClassification,legacy.stages[0].physicalClassification)
assert.deepEqual(one.sportingRows,legacy.stages[0].sportingRows)
assert.deepEqual(run(expanded),out)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AK deterministic replay, neutral first-stage parity and authority guards')
console.log('PASS 4/4 resource energy checks; no hosted connection')
