import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewHistoricalNaturalTerrain,applyHistoricalTerrainIncident,historicalRepairMovement} from '../scripts/uranius-historical-natural-terrain-review'
import {reviewHistoricalCheckpoint,reviewHistoricalIncidentProbability} from '../scripts/uranius-historical-incident-probability-review.mjs'
import {getStageTerrainSample} from '../src/race-engine/simulation/stageProfile'
import {bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {createDroppedGroup} from '../src/race-engine/simulation/droppedGroup'
import {calculateTerrainAwareMultiGroupMovement} from '../src/race-engine/simulation/terrainAwareMultiGroupMovement'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date:'2000-01-03',stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map(r=>({...scope(r),fatigue_before_stage:70,fatigue:70,start_stamina:68.5,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1.4,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}


const riders=roster.map((r,i)=>({...r,attributes:{...r.attributes,flat:75,climbing:i<6?5:95,stamina:80,resistance:75,recovery:75,raceIq:75,teamwork:75,timeTrial:75}}))
const mountain={...input,riders,seed:'043AT-natural-mountain',distanceKm:40,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:4,elevationMetres:100},{kilometre:14,elevationMetres:1100},{kilometre:24,elevationMetres:100},{kilometre:40,elevationMetres:1380}]}

const context={terrainType:'mountain',weatherCondition:'rain',precipitationMm:1,rainProbabilityPct:90,weatherMultiplier:2.5,severeWeather:true,flatSprint:false}
const route={...mountain,distanceKm:120,profilePoints:[...mountain.profilePoints,{kilometre:50,elevationMetres:580},{kilometre:60,elevationMetres:1380},{kilometre:70,elevationMetres:580},{kilometre:80,elevationMetres:1380},{kilometre:90,elevationMetres:580},{kilometre:100,elevationMetres:1380},{kilometre:110,elevationMetres:580},{kilometre:120,elevationMetres:1380}]}
const packet={provenance:P,input:{...route,seed:'043AU-natural-history-0'},source,context}
const run=p=>reviewHistoricalNaturalTerrain({packet:p,expectedPacketSha256:carryoverDigest(p)})
let drops=0,measured=0,droppedCandidates=0,droppedIncidents=0,applications=0,repairTicks=0,contacts=0
const scenarios=[]
for(const seed of ['043AU-natural-history-0','043AU-natural-history-1']){
 const p={...packet,input:{...route,seed}},x=run(p)
 assert.ok(x.finalState.completed&&x.classification.length===24)
 assert.equal(x.trace.stopReason,'pre_finish_boundary')
 assert.equal(x.classificationSha256,carryoverDigest(x.classification))
 assert.equal(x.observationsSha256,carryoverDigest(x.observations))
 assert.ok(x.trace.incidents.length>0)
 assert.equal(new Set(x.applications.map(a=>a.incidentId)).size,x.trace.incidents.length)
 const seen=new Set()
 for(const o of x.observations){
  for(const t of o.transitions){
   for(const id of t.movedRiderIds){
    assert.ok(o.pressure.some(e=>e.riderId===id&&e.groupId===t.sourceGroupId&&e.status==='cannot_hold'&&e.seconds>=120))
    drops++
   }
   seen.add(t.targetGroupId)
  }
  for(const m of o.movement){
   assert.equal(m.gradientPercent,getStageTerrainSample(p.input,m.previousDistanceKm).gradientPercent)
   assert.ok(m.nextDistanceKm>=m.previousDistanceKm&&m.nextDistanceKm<=120)
   const e=o.episodes.find(e=>e.groupId===m.groupId)
   if(e&&o.raceSecond-30<e.repairUntil){assert.equal(m.distanceAdvancedKm,0);repairTicks++}
  }
  for(const c of o.contacts){
   assert.ok(Math.abs(c.distanceKm-c.targetDistanceKm)<1e-8)
   assert.ok(c.distanceKm<120)
   contacts++
  }
 }
 for(const cp of x.selectedCheckpoints){
  const o=x.observations.find(o=>o.raceSecond===cp.evidence.raceSecond)
  const selected=reviewHistoricalCheckpoint({evidence:cp.evidence,expectedEvidenceSha256:cp.expectedEvidenceSha256}).incident
  assert.equal(selected.incidentId,x.trace.incidents.find(i=>i.raceSecond===cp.evidence.raceSecond).incident.incidentId)
  for(const c of cp.evidence.candidates){
   const g=o.measuredGroups.find(g=>g.displayCode===c.displayCode)
   assert.equal(c.probabilityInput.currentSpeedKmh,g.speedKmh)
   assert.equal(c.probabilityInput.gradientPercent,g.gradientPercent)
   assert.ok(c.riders.every(r=>!o.excludedRiderIds.includes(r.riderId)))
   if(g.groupType==='dropped'){assert.ok(!g.groupId.startsWith('historical_'));droppedCandidates++}
   if(g.gradientPercent<0&&c.probabilityInput.incidentKind!=='exhaustion')assert.ok(reviewHistoricalIncidentProbability(c.probabilityInput).descentMultiplier>1)
   measured++
  }
 }
 for(const a of x.applications){
  const before=x.observations.find(o=>o.raceSecond===a.raceSecond)
  const g=before.measuredGroups.find(g=>g.groupId===a.sourceGroupId)
  assert.equal(a.distanceKm,g.distanceKm)
  assert.ok(a.afterEnergy<=a.beforeEnergy)
  if(a.sourceGroupType==='dropped'){assert.ok(seen.has(a.sourceGroupId));droppedIncidents++}
  if(a.statusImpact==='dnf')assert.equal(x.finalState.riders[a.riderId].stageStatus,'dnf')
 }
 applications+=x.applications.length
 assert.equal(new Set(x.classification.map(r=>r.riderId)).size,24)
 const f=x.classification.filter(r=>r.status==='finished')
 assert.ok(f.length>0&&f.every((r,i)=>r.rank===i+1&&(!i||r.elapsedSeconds>=f[i-1].elapsedSeconds)))
 console.log('INFO 043AU '+seed+' incidents='+x.trace.incidents.length+' finishers='+f.length+' naturalDrops='+x.observations.reduce((n,o)=>n+o.transitions.reduce((m,t)=>m+t.movedRiderIds.length,0),0))
 scenarios.push({p,x})
}
assert.ok(drops>0&&measured>0&&droppedCandidates>0)
console.log('PASS 043AU actual natural drops and measured historical candidates across physical groups; drops='+drops+' measured='+measured+' droppedCandidates='+droppedCandidates+' droppedIncidents='+droppedIncidents)
assert.ok(applications>0&&repairTicks>0)
console.log('PASS 043AU historical consequences, physical repair and terminal classifications; applications='+applications+' repairTicks='+repairTicks+' contacts='+contacts)
// Controlled boundary: incident on a naturally-shaped dropped group, not a
// claim of an automatically selected incident in this particular fixture.
const initial=createInitialState(bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input:mountain}).input)
const natural=createDroppedGroup({state:initial,sourceGroupId:'peloton_main',riderIds:riders.slice(0,6).map(r=>r.riderId),speedKmh:36})
const affected=riders[0].riderId
const boundary=applyHistoricalTerrainIncident(natural.state,{incidentId:'controlled-boundary',timeLossSeconds:35,riderConsequences:[{riderId:affected,statusImpact:'finished',energyLossPoints:2,movedToLaterGroup:true}]},[])
assert.equal(boundary.applications[0].sourceGroupId,natural.droppedGroupId)
assert.equal(boundary.episodes[0].targetId,natural.droppedGroupId)
assert.equal(boundary.episodes[0].repairUntil,60)
assert.equal(boundary.state.groups[natural.droppedGroupId].riderIds.length,5)
const base=calculateTerrainAwareMultiGroupMovement(boundary.state,.5)
const motion=historicalRepairMovement(boundary.state,base,boundary.episodes)
const repair=motion.movement.proposals.find(p=>p.groupId===boundary.episodes[0].groupId)
assert.equal(repair.distanceAdvancedKm,0)
assert.deepEqual(motion.movement.proposals.find(p=>p.groupId===natural.droppedGroupId).nextDistanceKm,base.movement.proposals.find(p=>p.groupId===natural.droppedGroupId).nextDistanceKm)
assert.throws(()=>applyHistoricalTerrainIncident(boundary.state,{incidentId:'duplicate',timeLossSeconds:35,riderConsequences:[{riderId:affected,statusImpact:'finished',energyLossPoints:2,movedToLaterGroup:true}]},boundary.episodes),/invalid incident source/)
console.log('PASS 043AU controlled dropped-group repair target, no movement during repair and duplicate admission guard')
const first=scenarios[0],replay=run(first.p)
assert.equal(replay.observationsSha256,first.x.observationsSha256)
assert.deepEqual(replay.classification,first.x.classification)
assert.deepEqual(replay.applications,first.x.applications)
assert.throws(()=>run({...packet,context:{...context,terrainType:'hilly'}}),/terrain context mismatch/)
assert.throws(()=>reviewHistoricalNaturalTerrain({packet,expectedPacketSha256:'0'.repeat(64)}),/frozen combined/)
for(const {x} of scenarios)for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(x[k],false)
console.log('PASS 043AU deterministic replay, mismatch, frozen evidence and authority guards')
console.log('PASS 4/4 historical natural terrain checks; no hosted connection')
