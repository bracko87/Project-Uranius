import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewOfficialRaceNight} from '../scripts/uranius-original-fatigue-review.mjs'
import {originalPostStageFatigueReview,originalPhase9ResourceReview} from '../scripts/uranius-original-engine-effects-review.mjs'
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

const expanded=structuredClone(tourPacket)
// Retain accepted first three stages verbatim. Subsequent flat stages use a
// dry, lower-risk explicit context and short distances to exercise lifecycle
// length, not realistic Grand Tour terrain/distance calibration.
const dry={...context,weatherCondition:'clear',precipitationMm:0,rainProbabilityPct:0,weatherMultiplier:.7,severeWeather:false}
for(let n=4;n<=21;n++){
 const prev=expanded.stages[n-2],nextId=id(100+n)
 const gap=n===15?2:1
 const dates=Array.from({length:gap},(_,j)=>new Date(Date.parse(prev.date)+(j+1)*86400000).toISOString().slice(0,10))
 const km=[20,30,40][n%3]
 expanded.stages.push({input:{...input,stageId:nextId,stageName:'043AI endurance stage '+n,seed:'043AI-endurance-'+n,distanceKm:km,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:km,elevationMetres:50}]},runId:id(200+n),date:dates[dates.length-1],difficultyCategory:1,weatherCancelled:false,context:dry,policy:{...policy,timeLimitPercent:100},recovery:days(dates),modifierRows:prep(nextId),resourceRequests})
}
const results=[]
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
for(const count of [7,14,21]){
 const p={...expanded,stages:expanded.stages.slice(0,count)}
 const start=performance.now(),out=run(p),elapsed=performance.now()-start
 assert.equal(out.stages.length,count)
 assert.ok(out.stages.every(s=>s.physicalCompleted))
 assert.equal(out.stages[0].sportingRows.filter(r=>r.status==='otl').length,8)
 assert.equal(out.stages[1].initialRiders.length,16)
 assert.ok(out.stages[1].applications.length>0)
 assert.ok(out.gc.length>0)
 assert.equal(out.stages.at(-1).receipt.runHistory.length,count)
 assert.equal(out.finalReceiptSha256,out.stages.at(-1).receiptSha256)
 console.log('INFO 043AI stages='+count+' km='+p.stages.reduce((n,s)=>n+s.input.distanceKm,0)+' finalGC='+out.gc.length+' incidents='+out.stages.reduce((n,s)=>n+s.incidentIds.length,0)+' elapsedMs='+Math.round(elapsed)+' heapMiB='+Math.round(process.memoryUsage().heapUsed/1048576))
 results.push({p,out})
}
console.log('PASS 043AI complete 7, 14 and 21 stage physical endurance runs')
for(const {p,out} of results){
 const withdrawals=new Map(),incidentIds=new Set()
 let cumulative=new Map()
 for(const [i,s] of out.stages.entries()){
  assert.equal(s.sportingRows.length,roster.length)
  assert.equal(new Set(s.sportingRows.map(r=>r.riderId)).size,roster.length)
  assert.equal(s.receipt.riders.length,roster.length)
  assert.equal(s.physicalClassification.length,s.initialRiders.length)
  assert.equal(s.physicalClassificationSha256,carryoverDigest(s.physicalClassification))
  const prior=i?out.stages[i-1]:null
  const gap=i?(Date.parse(p.stages[i].date)-Date.parse(p.stages[i-1].date))/86400000:0
  assert.equal(s.recoveryReceipts.length,gap*roster.length)
  for(const r of s.receipt.riders){
   const row=s.sportingRows.find(x=>x.riderId===r.riderId),start=s.initialRiders.find(x=>x.riderId===r.riderId)
   const old=prior?.receipt.riders.find(x=>x.riderId===r.riderId)
   if(withdrawals.has(r.riderId)){
    assert.equal(row.status,'dns');assert.equal(start,undefined)
    assert.deepEqual(r.withdrawal,withdrawals.get(r.riderId))
    assert.equal(r.effect.totalEnergySpent,0);assert.equal(r.effect.adjustedFatigueGain,0)
    assert.ok(!s.applications.some(x=>x.riderId===r.riderId))
   }else if(row.status!=='finished'){
    const w={stageId:s.stageId,status:row.status};withdrawals.set(r.riderId,w);assert.deepEqual(r.withdrawal,w)
   }
   assert.deepEqual(r.effect,originalPostStageFatigueReview(r.workload))
   assert.equal(r.workload.incidentEnergyLoss,0)
   assert.equal(r.energyAudit.additionalIncidentDeduction,0)
   assert.ok(r.persistedFatigue>=0&&r.persistedFatigue<=100)
   if(old){
    let fatigue=old.persistedFatigue
    const nights=s.recoveryReceipts.filter(x=>x.riderId===r.riderId)
    assert.equal(nights.length,gap)
    for(const [j,n] of nights.entries()){
     assert.equal(n.date,new Date(Date.parse(prior.receipt.date)+(j+1)*86400000).toISOString().slice(0,10))
     assert.equal(n.fatigueAfterStage,fatigue);fatigue=reviewOfficialRaceNight(n).fatigue
    }
    assert.equal(r.workload.effectiveFatigueBeforeStage,fatigue)
    if(start)assert.equal(start.energy,Math.max(1,100-fatigue*.45))
    assert.deepEqual(r.injuries.slice(0,old.injuries.length),old.injuries)
   }
   assert.equal(r.persistedFatigue,start?Math.round(r.effect.fatigueAfterStage):r.workload.effectiveFatigueBeforeStage)
  }
  for(const x of s.incidentIds){assert.ok(!incidentIds.has(x));incidentIds.add(x)}
  assert.ok(s.applications.every(a=>s.initialRiders.some(r=>r.riderId===a.riderId)&&s.incidentIds.includes(a.incidentId)))
  const next=new Map()
  for(const r of s.sportingRows.filter(r=>r.status==='finished'&&(!i||cumulative.has(r.riderId)))){
   const old=cumulative.get(r.riderId)
   next.set(r.riderId,{riderId:r.riderId,teamId:r.teamId,totalTimeSeconds:(old?.totalTimeSeconds??0)+r.sportingElapsedSeconds,rankSum:(old?.rankSum??0)+r.sportingRank})
  }
  cumulative=next
  const sorted=[...next.values()].sort((a,b)=>a.totalTimeSeconds-b.totalTimeSeconds||a.rankSum-b.rankSum||a.riderId.localeCompare(b.riderId))
  assert.deepEqual(s.receipt.gc,sorted.map((r,j)=>({...r,rank:j+1,gapSeconds:r.totalTimeSeconds-sorted[0].totalTimeSeconds})))
 }
 assert.deepEqual(out.gc,out.stages.at(-1).receipt.gc)
}
console.log('PASS 043AI permanent withdrawals, dated rest-day recovery, fatigue and cumulative classification at every stage')
for(const {p,out} of results){
 for(const [i,s] of out.stages.entries()){
  for(const row of s.receipt.resources){
   if(i)assert.deepEqual(row.before,out.stages[i-1].receipt.resources.find(x=>x.after.resourceId===row.before.resourceId).after)
   const active=s.initialTeams.some(t=>t.teamId===row.before.teamId)
   if(!active){assert.equal(row.effect,null);assert.deepEqual(row.before,row.after);continue}
   const req=p.stages[i].resourceRequests.find(x=>x.resourceId===row.before.resourceId)
   const engine={resourceType:row.before.resourceType,resourceId:row.before.resourceId,teamId:row.before.teamId,selectedQuantity:req.selectedQuantity,selectedStageUses:req.selectedStageUses,conditionLossPerRaceDay:req.conditionLossPerRaceDay}
   for(const k of ['quantity','stageUsesRemaining','maxStageUses','condition'])if(row.before[k]!==null)engine[k]=row.before[k]
   assert.deepEqual(row.effect,originalPhase9ResourceReview({provenance:P,completeResourceEvidence:true,distanceKm:p.stages[i].input.distanceKm,resources:[engine]}).rows[0])
   if(row.before.resourceType==='equipment'){
    assert.equal(row.after.stageUsesRemaining,Math.max(0,4-i))
    assert.equal(row.after.lastUsedDate,p.stages[Math.min(i,4)].date)
    assert.ok(row.after.condition<=row.before.condition)
   }else assert.equal(row.after.quantity,Math.max(0,8-i*2))
   if(i>=5){assert.equal(row.effect.shortageApplied,true);assert.equal(row.before.resourceType==='equipment'?row.effect.stageUsesUsed:row.effect.quantityUsed,0)}
  }
 }
}
console.log('PASS 043AI equipment and supply exhaustion, shortage receipts and no stock resurrection')
for(const {p,out} of results){
 for(const [i,s] of out.stages.entries()){
  assert.equal(s.receiptSha256,carryoverDigest(s.receipt))
  assert.equal(s.receipt.priorSha256,i?out.stages[i-1].receiptSha256:null)
  assert.equal(s.receipt.scheduleSha256,out.scheduleSha256)
  assert.deepEqual(s.receipt.runHistory,p.stages.slice(0,i+1).map(x=>x.runId))
 }
 assert.equal(out.gcSha256,carryoverDigest(out.gc))
 for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
}
// Schedule digests differ across lengths, but actual common-prefix sporting
// and physical outcomes must be identical.
for(const {out} of results.slice(0,-1))for(const [i,s] of out.stages.entries()){
 const longer=results.at(-1).out.stages[i]
 assert.deepEqual(s.physicalClassification,longer.physicalClassification)
 assert.deepEqual(s.sportingRows,longer.sportingRows)
 assert.deepEqual(s.receipt.gc,longer.receipt.gc)
 assert.equal(s.observationSha256,longer.observationSha256)
}
assert.deepEqual(run(expanded),results.at(-1).out)
assert.throws(()=>reviewMultistagePhysicalTour({packet:expanded,expectedPacketSha256:'0'.repeat(64)}),/frozen tour/)
const bad=structuredClone(expanded);bad.stages[20].runId=bad.stages[19].runId
assert.throws(()=>run(bad),/distinct 3/)
console.log('PASS 043AI deterministic 21-stage replay, cross-length prefix invariance and authority guards')
console.log('PASS 4/4 Grand Tour endurance checks; no hosted connection')
