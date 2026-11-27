import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewOfficialRaceNight} from '../scripts/uranius-original-fatigue-review.mjs'
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
const request={packet:tourPacket,expectedPacketSha256:carryoverDigest(tourPacket)}
const out=reviewMultistagePhysicalTour(request)
assert.equal(out.stages.length,3)
const [one,two,three]=out.stages
assert.equal(one.physicalClassification.length,24)
assert.equal(one.sportingRows.filter(r=>r.status==='otl').length,8)
assert.equal(two.initialRiders.length,16)
assert.ok(two.applications.length>0)
const withdrawn=one.sportingRows.filter(r=>r.status==='otl').map(r=>r.riderId)
for(const s of [two,three]){
 assert.ok(s.physicalCompleted)
 assert.equal(s.sportingRows.length,roster.length)
 assert.equal(new Set(s.sportingRows.map(r=>r.riderId)).size,roster.length)
 for(const id of withdrawn){
  assert.ok(!s.initialRiders.some(r=>r.riderId===id)&&!s.physicalClassification.some(r=>r.riderId===id)&&!s.applications.some(r=>r.riderId===id))
  assert.equal(s.sportingRows.find(r=>r.riderId===id).status,'dns')
  assert.deepEqual(s.receipt.riders.find(r=>r.riderId===id).withdrawal,{stageId,status:'otl'})
  assert.equal(s.receipt.riders.find(r=>r.riderId===id).effect.totalEnergySpent,0)
 }
}
console.log('PASS 043AH three actual physical stages and permanent withdrawal history')
assert.equal(two.recoveryReceipts.length,24)
assert.equal(three.recoveryReceipts.length,48)
for(const [i,s] of out.stages.entries()){
 for(const row of s.receipt.riders){
  assert.deepEqual(row.effect,originalPostStageFatigueReview(row.workload))
  assert.equal(row.workload.incidentEnergyLoss,0)
  assert.equal(row.energyAudit.additionalIncidentDeduction,0)
  if(i){
   const prev=out.stages[i-1].receipt.riders.find(r=>r.riderId===row.riderId)
   let fatigue=prev.persistedFatigue
   for(const n of s.recoveryReceipts.filter(n=>n.riderId===row.riderId)){
    assert.equal(n.fatigueAfterStage,fatigue);fatigue=reviewOfficialRaceNight(n).fatigue
   }
   assert.equal(row.workload.effectiveFatigueBeforeStage,fatigue)
   const started=s.initialRiders.find(r=>r.riderId===row.riderId)
   if(started)assert.equal(started.energy,Math.max(1,100-fatigue*.45))
  }
 }
}
console.log('PASS 043AH sequential overnight and rest-day recovery, actual starting energy and no duplicate incident loss')
for(const [i,s] of out.stages.entries()){
 const eq=s.receipt.resources.find(r=>r.before.resourceType==='equipment'),supply=s.receipt.resources.find(r=>r.before.resourceType==='supply')
 assert.equal(eq.after.stageUsesRemaining,4-i)
 assert.equal(eq.after.lastUsedDate,tourPacket.stages[i].date)
 assert.equal(supply.after.quantity,8-i*2)
 assert.ok(eq.after.condition<eq.before.condition)
 if(i)for(const row of s.receipt.resources)assert.deepEqual(row.before,out.stages[i-1].receipt.resources.find(r=>r.after.resourceId===row.before.resourceId).after)
 const expected=roster.filter(r=>out.stages.slice(0,i+1).every(t=>t.sportingRows.find(x=>x.riderId===r.riderId).status==='finished')).map(r=>r.riderId).sort()
 assert.deepEqual(s.receipt.gc.map(r=>r.riderId).sort(),expected)
 for(const [j,r] of s.receipt.gc.entries()){
  const rows=out.stages.slice(0,i+1).map(t=>t.sportingRows.find(x=>x.riderId===r.riderId))
  assert.equal(r.totalTimeSeconds,rows.reduce((n,x)=>n+x.sportingElapsedSeconds,0));assert.equal(r.rankSum,rows.reduce((n,x)=>n+x.sportingRank,0))
  assert.equal(r.rank,j+1);assert.equal(r.gapSeconds,r.totalTimeSeconds-s.receipt.gc[0].totalTimeSeconds)
 }
}
console.log('PASS 043AH equipment/supply continuity and cumulative general classification after every stage')
for(const [i,s] of out.stages.entries()){
 assert.equal(s.receiptSha256,carryoverDigest(s.receipt));assert.equal(s.receipt.priorSha256,i?out.stages[i-1].receiptSha256:null)
 assert.equal(s.receipt.scheduleSha256,out.scheduleSha256)
}
const incidents=out.stages.flatMap(s=>s.incidentIds)
assert.equal(new Set(incidents).size,incidents.length)
assert.equal(out.finalReceiptSha256,three.receiptSha256)
assert.equal(out.gcSha256,carryoverDigest(out.gc))
assert.deepEqual(reviewMultistagePhysicalTour(request),out)
assert.throws(()=>reviewMultistagePhysicalTour({...request,expectedPacketSha256:'0'.repeat(64)}),/frozen tour/)
const bad=structuredClone(tourPacket);bad.stages[2].recovery.pop()
assert.throws(()=>reviewMultistagePhysicalTour({packet:bad,expectedPacketSha256:carryoverDigest(bad)}),/complete daily recovery/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AH deterministic tour receipt chain, missing recovery rejection and authority guards')
console.log('PASS 4/4 multi-stage physical tour checks; no hosted connection')
