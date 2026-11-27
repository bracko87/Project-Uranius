import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {bindMixedStageReadiness,bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {reviewTwoStagePhysical} from '../scripts/uranius-two-stage-physical-review'
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
const args={...base,input:{...base.input,stageName:'043AC long-wet',distanceKm:200,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:200,elevationMetres:50}],settings:{...base.input.settings,minimumSpeedKmh:40,maximumSpeedKmh:44}}}
const nextStage=id(102)
const continuity={provenance:P,schedule:[{stageId,stageNumber:1,date:source.date,weatherCancelled:false},{stageId:nextStage,stageNumber:2,date:'2000-01-04',weatherCancelled:false}],nextRunId:id(202),
 resources:[{resourceType:'equipment',resourceId:'review-equipment',teamId:teams[0],quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:100,lastUsedDate:null}],
 recovery:roster.map((r,i)=>({riderId:r.riderId,travelDelta:i%2,activityLoad:0,consecutiveHeavyDays:0,activityBonus:i%3,doctorBonus:1,clubType:'main',residentialCampusActive:false})),
 nextModifierRows:source.modifierRows.map(m=>({...m,stage_id:nextStage,preparation_applied:false,health_incident_risk_multiplier:1}))}
const policy={provenance:P,groupGapSeconds:1,timeLimitPercent:0,sprintZoneKm:3,flatFinish:true}
const packet={args,policy,continuity,expectedContinuitySha256:carryoverDigest(continuity)}

const second={provenance:P,input:{...input,stageId:nextStage,stageName:'043AG stage two',seed:'043AG-stage-two-4'},context,policy:{...policy,timeLimitPercent:100}}
const request={firstPacket:packet,second,expectedSecondSha256:carryoverDigest(second)}
const out=reviewTwoStagePhysical(request),s=out.second
const readiness=out.first.nextReadiness.receipt.rows,starts=readiness.filter(r=>r.startStatus==='starter'),dns=readiness.filter(r=>r.startStatus==='dns')
assert.ok(dns.length>0&&starts.length>=2,'mixed roster witness required')
assert.deepEqual(Object.keys(s.initial.riders).sort(),starts.map(r=>r.riderId).sort())
assert.deepEqual(s.excluded.map(r=>r.riderId).sort(),dns.map(r=>r.riderId).sort())
assert.equal(s.readinessSha256,out.first.nextReadiness.sha256)
for(const r of starts){
 assert.equal(s.initial.riders[r.riderId].energy,r.condition.startingEnergy)
 assert.deepEqual(s.initial.riders[r.riderId].startingCondition,r.condition)
}
for(const t of s.initial.input.teams){
 const original=input.teams.find(x=>x.teamId===t.teamId),ids=original.riderIds.filter(id=>s.initial.riders[id]).sort()
 assert.deepEqual(t.riderIds,ids)
 assert.equal(t.captainRiderId,ids.includes(original.captainRiderId)?original.captainRiderId:ids[0])
}
assert.throws(()=>bindLegacyReadiness({source:out.first.nextSource,expectedSourceSha256:carryoverDigest(out.first.nextSource),input:second.input}),/unsupported legacy/)
const carried={source:out.first.nextSource,expectedSourceSha256:carryoverDigest(out.first.nextSource),input:second.input}
assert.throws(()=>bindMixedStageReadiness({...carried,input:{...second.input,riders:second.input.riders.map((r,i)=>i? r:{...r,condition:starts[0].condition})}}),/caller readiness/)
console.log('PASS 043AG actual mixed starting roster, carried stamina/fatigue and team continuity; starters='+starts.length+' excluded='+dns.length+' notFullyFit='+starts.filter(r=>r.condition.availabilityStatus==='not_fully_fit').length)
assert.equal(s.finish.state.completed,true)
assert.ok(s.prefix.observations.length>0&&s.prefix.applications.length>0,'second-stage automatic incident witness required')
assert.equal(s.prefix.mixedStageBinding.readinessSha256,s.readinessSha256)
for(const r of s.prefix.mixedStageBinding.roster){
 const expected=starts.find(x=>x.riderId===r.riderId)
 assert.equal(r.startingEnergy,expected.condition.startingEnergy);assert.equal(r.effectiveFatigue,expected.condition.fatigueBeforeStage)
}
for(const cp of s.prefix.selectedCheckpoints){
 const obs=s.prefix.observations.find(o=>o.raceSecond===cp.evidence.raceSecond)
 assert.ok(obs)
 for(const c of cp.evidence.candidates){
  const sum=c.riders.reduce((n,r)=>{
   const start=starts.find(x=>x.riderId===r.riderId),current=obs.positions.find(x=>x.riderId===r.riderId)
   const energy=Math.max(1,start.condition.startingEnergy)
   return n+Math.round(Math.min(100,Math.max(0,start.condition.fatigueBeforeStage+Math.max(0,energy-current.energy)/energy*45))*1e6)/1e6
  },0)
  assert.ok(Math.abs(c.probabilityInput.runtimeFatigue-sum/c.riders.length)<2e-6)
 }
}
const oldIds=new Set(out.first.auto.prefix.applications.map(a=>a.incidentId))
assert.ok(s.prefix.applications.every(a=>!oldIds.has(a.incidentId)&&s.initial.riders[a.riderId]))
for(const r of dns){
 assert.ok(s.prefix.observations.every(o=>!o.positions.some(p=>p.riderId===r.riderId)))
 assert.ok(!s.finish.state.riders[r.riderId])
 assert.equal(s.rows.find(x=>x.riderId===r.riderId).status,'dns')
}
console.log('PASS 043AG completed second physical stage with carried fatigue in incident probability and no old incident replay')
assert.equal(s.rows.length,roster.length)
assert.equal(new Set(s.rows.map(r=>r.riderId)).size,roster.length)
const expected=out.first.sporting.rows.filter(a=>a.status==='finished'&&s.sporting.rows.some(b=>b.riderId===a.riderId&&b.status==='finished'))
assert.deepEqual(out.gc.map(r=>r.riderId).sort(),expected.map(r=>r.riderId).sort())
for(const [i,r] of out.gc.entries()){
 const a=out.first.sporting.rows.find(x=>x.riderId===r.riderId),b=s.sporting.rows.find(x=>x.riderId===r.riderId)
 assert.equal(r.rank,i+1);assert.equal(r.totalTimeSeconds,a.sportingElapsedSeconds+b.sportingElapsedSeconds)
 assert.equal(r.gapSeconds,r.totalTimeSeconds-out.gc[0].totalTimeSeconds)
 assert.ok(i===0||r.totalTimeSeconds>=out.gc[i-1].totalTimeSeconds)
}
console.log('PASS 043AG complete DNS coverage, two-stage cumulative times and ranks')
assert.deepEqual(reviewTwoStagePhysical(request),out)
assert.equal(out.gcSha256,carryoverDigest(out.gc))
assert.throws(()=>reviewTwoStagePhysical({...request,expectedSecondSha256:'0'.repeat(64)}),/frozen second stage/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AG deterministic two-stage replay and authority guards')
console.log('PASS 4/4 two-stage physical checks; no hosted connection')
