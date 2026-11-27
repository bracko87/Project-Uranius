import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewNaturalTerrainSeparation} from '../scripts/uranius-natural-terrain-separation-review'
import {bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {createDroppedGroup} from '../src/race-engine/simulation/droppedGroup'
import {reconcileBreakawayGroups} from '../src/race-engine/simulation/reconcileBreakawayGroups'
import {calculateRiderSeparationEligibility} from '../src/race-engine/simulation/groupSeparationEligibility'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date:'2000-01-03',stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map(r=>({...scope(r),fatigue_before_stage:70,fatigue:70,start_stamina:68.5,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1.4,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}


const riders=roster.map((r,i)=>({...r,attributes:{...r.attributes,flat:75,climbing:i<6?5:95,stamina:80,resistance:75,recovery:75,raceIq:75,teamwork:75,timeTrial:75}}))
const mountain={...input,riders,seed:'043AT-natural-mountain',distanceKm:40,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:4,elevationMetres:100},{kilometre:14,elevationMetres:1100},{kilometre:24,elevationMetres:100},{kilometre:40,elevationMetres:1380}]}
const packet={provenance:P,input:mountain,source,nativeIncidents:false}
const run=p=>reviewNaturalTerrainSeparation({packet:p,expectedPacketSha256:carryoverDigest(p)})
const out=run(packet),stage=out.stage
assert.ok(stage.completed&&stage.finalState.completed)
assert.equal(stage.results.length,24)
assert.ok(stage.transitions.length>0,'natural stress fixture must produce an actual drop')
let dropped=0,independent=0,contact=0
const weak=new Set(riders.slice(0,6).map(r=>r.riderId))
for(const t of stage.ticks){
 for(const e of t.pressureEvaluations){
  const expected=calculateRiderSeparationEligibility({riderId:e.riderId,holdStatus:e.hold.status,previousConsecutiveCannotHoldSeconds:e.eligibility.previousConsecutiveCannotHoldSeconds,tickSeconds:30,eligibilityWindowsSeconds:[120]})
  assert.deepEqual(e.eligibility,expected)
 }
 for(const x of t.transitions){
  assert.equal(x.transitionKind,'created')
  assert.equal(x.raceSecond,t.state.raceSecond)
  const before=x.application.previousState
  for(const id of x.movedRiderIds){
   const e=t.pressureEvaluations.find(e=>e.riderId===id&&e.groupId===x.sourceGroupId)
   assert.ok(e&&e.hold.status==='cannot_hold'&&e.eligibility.nextConsecutiveCannotHoldSeconds>=120)
   assert.equal(x.application.state.riders[id].distanceKm,x.kilometre)
   assert.equal(t.state.separationPressureSecondsByRiderId[id],0)
   if(weak.has(id))dropped++
  }
 }
 const p=t.movement.movement.proposals.find(p=>p.groupType==='peloton')
 for(const g of t.movement.movement.proposals.filter(p=>p.groupType==='dropped')){
  assert.ok(g.nextDistanceKm>=g.previousDistanceKm)
  if(p&&g.nextDistanceKm<p.nextDistanceKm&&g.nextDistanceKm<mountain.distanceKm)independent++
 }
 for(const gid of t.reconciledBreakaways.reabsorbedBreakawayGroupIds){
  const before=t.reconciledBreakaways.previousState,g=before.groups[gid],p=before.groups.peloton_main
  if(g.groupType==='dropped'){
   assert.ok(g.distanceKm>=p.distanceKm-1e-10&&g.distanceKm<mountain.distanceKm&&p.distanceKm<mountain.distanceKm)
   contact++
  }
 }
}
assert.ok(dropped>0&&independent>0)
const weakTimes=stage.results.filter(r=>weak.has(r.riderId)).map(r=>r.elapsedSeconds)
const strongTimes=stage.results.filter(r=>!weak.has(r.riderId)).map(r=>r.elapsedSeconds)
assert.ok(Math.max(...weakTimes)>Math.min(...strongTimes))
assert.equal(new Set(stage.results.map(r=>r.riderId)).size,24)
assert.ok(Object.values(stage.finalState.riders).every(r=>r.stageStatus==='finished'))
console.log('PASS 043AT actual sustained natural mountain drops and independent physical finish gaps; transitions='+stage.transitions.length+' weakDrops='+dropped+' independentTicks='+independent+' naturalRejoins='+contact)
const initial=createInitialState(bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input:mountain}).input)
const birth=createDroppedGroup({state:initial,sourceGroupId:'peloton_main',riderIds:[riders[0].riderId],speedKmh:40})
const options={experimentalRequirePhysicalDroppedCatch:true,protectedNewDroppedGroupIds:[birth.droppedGroupId]}
assert.ok(reconcileBreakawayGroups(birth.state,options).state.groups[birth.droppedGroupId].active)
const at=(km,pkm=1)=>{
 const groups={...birth.state.groups},rs={...birth.state.riders}
 for(const [gid,g] of Object.entries(groups)){
  const distanceKm=gid===birth.droppedGroupId?km:pkm,speedKmh=gid===birth.droppedGroupId?42:40
  groups[gid]={...g,distanceKm,speedKmh,gapFromLeaderSeconds:Math.max(0,pkm-distanceKm)*90}
  for(const id of g.riderIds)rs[id]={...rs[id],distanceKm,speedKmh}
 }
 return {...birth.state,groups,riders:rs,currentKm:Math.max(km,pkm),raceSecond:30}
}
const near=at(.99)
assert.ok(reconcileBreakawayGroups(near,{experimentalRequirePhysicalDroppedCatch:true}).state.groups[birth.droppedGroupId].active)
assert.ok(!reconcileBreakawayGroups(near).state.groups[birth.droppedGroupId].active)
const touch=reconcileBreakawayGroups(at(1),{experimentalRequirePhysicalDroppedCatch:true})
assert.ok(!touch.state.groups[birth.droppedGroupId].active)
assert.equal(touch.state.riders[riders[0].riderId].currentGroupId,'peloton_main')
const line=reconcileBreakawayGroups(at(40,40),{experimentalRequirePhysicalDroppedCatch:true})
assert.ok(line.state.groups[birth.droppedGroupId].active)
console.log('PASS 043AT birth protection, no near-gap teleportation, exact-contact merge and independent finish-line groups')
const native=run({...packet,nativeIncidents:true})
assert.ok(native.stage.finalState.completed)
let candidates=0,selected=0
for(const t of native.stage.ticks){
 assert.ok(t.raceIncident)
 candidates+=Object.values(t.raceIncident.candidateCountByKind).reduce((a,b)=>a+b,0)
 if(t.raceIncident.selectedIncidentKind)selected++
}
assert.ok(candidates>0&&selected<=3)
assert.equal(new Set(native.stage.results.map(r=>r.riderId)).size,native.stage.results.length)
assert.equal(native.historicalPhase10IntegrationVerified,false)
console.log('PASS 043AT calibrated native incident path coexists with terrain pressure; candidates='+candidates+' selected='+selected+' transitions='+native.stage.transitions.length)
const replay=run(packet)
assert.equal(replay.stage.deterministicHash,stage.deterministicHash)
assert.equal(replay.observationsSha256,out.observationsSha256)
assert.deepEqual(replay.stage.results,stage.results)
assert.throws(()=>reviewNaturalTerrainSeparation({packet,expectedPacketSha256:'0'.repeat(64)}),/frozen natural/)
assert.throws(()=>run({...packet,input:{...mountain,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:40,elevationMetres:100}]}}),/nonflat/)
for(const x of [out,native])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified','historicalPhase10IntegrationVerified'])assert.equal(x[k],false)
console.log('PASS 043AT deterministic terrain replay, default catch preservation and authority guards')
console.log('PASS 4/4 natural terrain separation checks; no hosted connection')
