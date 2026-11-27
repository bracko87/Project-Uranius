import assert from 'node:assert/strict'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {simulateMultiGroupTick} from '../src/race-engine/simulation/simulateMultiGroupTick'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {startMultiRiderIncident,multiRiderIncidentTick} from '../scripts/uranius-multi-rider-incident-motion-review'
import {finishPhysicalIncidentStage,reviewAutomaticPhysicalFinish} from '../scripts/uranius-physical-incident-finish-review'
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



const short={...input,distanceKm:3,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:3,elevationMetres:50}]}
let start=createInitialState(short as Parameters<typeof createInitialState>[0])
while(start.currentKm<2.35)start=simulateMultiGroupTick(start).state
assert.ok(!start.completed&&start.currentKm<3)
const [a,h,b,d]=roster.slice(0,4).map(r=>r.riderId)
const batch=startMultiRiderIncident(start,[
 {riderId:a,helper:h,statusImpact:'finished',repairSeconds:120,energyLossPoints:4},
 {riderId:b,helper:null,statusImpact:'finished',repairSeconds:60,energyLossPoints:2},
 {riderId:d,helper:null,statusImpact:'dnf',repairSeconds:0,energyLossPoints:7}
])
const check=(out,initial)=>{
 assert.equal(out.state.completed,true)
 const finished=out.classification.filter(r=>r.status==='finished'),dnf=out.classification.filter(r=>r.status==='dnf')
 assert.equal(out.classification.length,Object.keys(initial.riders).length)
 assert.equal(new Set(out.classification.map(r=>r.riderId)).size,out.classification.length)
 for(const [i,r] of finished.entries()){
  assert.equal(r.rank,i+1)
  assert.ok(i===0||r.elapsedSeconds>=finished[i-1].elapsedSeconds)
  assert.ok(Math.abs(r.gapSeconds-(r.elapsedSeconds-finished[0].elapsedSeconds))<1e-8)
  const t=out.ticks.find(t=>t.crossings.some(c=>c.riderId===r.riderId)),c=t.crossings.find(c=>c.riderId===r.riderId),p=t.movement.proposals.find(p=>p.groupId===c.groupId)
  assert.ok(p.previousDistanceKm<initial.stageDistanceKm&&p.appliedSpeedKmh>0)
  const crossing=c.previousRaceSecond+(initial.stageDistanceKm-p.previousDistanceKm)*3600/p.appliedSpeedKmh
  assert.ok(Math.abs(r.elapsedSeconds-crossing)<1e-7)
  assert.equal(out.state.riders[r.riderId].finishTimeSeconds,r.elapsedSeconds)
 }
 for(const r of dnf){assert.equal(r.rank,null);assert.equal(r.elapsedSeconds,null);assert.equal(r.gapSeconds,null);assert.equal(out.state.riders[r.riderId].stageStatus,'dnf')}
 let prior=initial
 for(const t of out.ticks){
  assert.equal(t.state.raceSecond,prior.raceSecond+30)
  for(const id of Object.keys(prior.riders)){
   const old=prior.riders[id],next=t.state.riders[id]
   if(old.stageStatus!=='racing'){assert.deepEqual(next,old);assert.ok(!t.energy.some(e=>e.riderId===id))}
   else {assert.ok(next.distanceKm>=old.distanceKm-1e-8);assert.equal(t.energy.filter(e=>e.riderId===id).length,1)}
  }
  prior=t.state
 }
 assert.equal(out.classificationSha256,carryoverDigest(out.classification))
 for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
}
const out=finishPhysicalIncidentStage(batch.state,batch.episodes,batch.targetId)
check(out,batch.state)
const winner=out.classification[0].elapsedSeconds
const first=out.ticks.find(t=>t.results.length)
assert.ok(first&&first.state.riders[a].stageStatus==='racing'&&first.state.riders[b].stageStatus==='racing')
assert.ok(first.state.raceSecond<batch.episodes[0].repairUntil)
assert.ok(!first.state.completed)
assert.ok(out.classification.find(r=>r.riderId===a).elapsedSeconds>winner)
assert.ok(out.classification.find(r=>r.riderId===b).elapsedSeconds>winner)
assert.ok(out.classification.find(r=>r.riderId===h).elapsedSeconds>winner)
assert.equal(out.classification.find(r=>r.riderId===d).status,'dnf')
assert.ok(out.ticks.some(t=>t.pickups.includes(a)&&t.state.raceSecond>first.state.raceSecond))
assert.ok(!out.ticks.some(t=>t.rejoins.includes(a)||t.rejoins.includes(b)))
console.log('PASS 043AD continued repair, helper pickup and independent crossing after winner')
assert.deepEqual(finishPhysicalIncidentStage(batch.state,batch.episodes,batch.targetId),out)
assert.throws(()=>finishPhysicalIncidentStage(batch.state,batch.episodes,batch.targetId,1),/finish horizon exceeded/)
console.log('PASS 043AD exact sub-tick classification, unique ranks, terminal DNF and deterministic continuation')
const base=argsFor('043Y-engine-4')
const args={...base,input:{...base.input,stageName:'043AC long-wet',distanceKm:200,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:200,elevationMetres:50}],settings:{...base.input.settings,minimumSpeedKmh:40,maximumSpeedKmh:44}}}
const auto=reviewAutomaticPhysicalFinish(args)
assert.equal(auto.prefix.trace.stopReason,'pre_finish_boundary')
assert.equal(auto.prefix.trace.incidents.length,6)
assert.equal(auto.prefix.admissions.length,6)
assert.ok(auto.prefix.admissions.some(a=>a.priorActive.length&&a.newGroups.length))
check(auto.finish,auto.prefix.finalState)
assert.equal(auto.finish.ticks[0].state.raceSecond,auto.prefix.finalState.raceSecond+30)
console.log('PASS 043AD automatically selected overlapping incident prefix reaches complete physical classification')
assert.deepEqual(reviewAutomaticPhysicalFinish(args),auto)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(auto[k],false)
console.log('PASS 043AD deterministic automatic classification and authority guards')
console.log('PASS 4/4 physical incident finish checks; no hosted connection')
