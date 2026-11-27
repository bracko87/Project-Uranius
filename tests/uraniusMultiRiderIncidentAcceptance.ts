import assert from 'node:assert/strict'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {simulateMultiGroupTick} from '../src/race-engine/simulation/simulateMultiGroupTick'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {startMultiRiderIncident,multiRiderIncidentTick} from '../scripts/uranius-multi-rider-incident-motion-review'
import {reviewAutomaticMultiRiderIncident} from '../scripts/uranius-automatic-multi-rider-incident-review'
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

const initial=simulateMultiGroupTick(createInitialState(input as Parameters<typeof createInitialState>[0])).state
const [a,h,b,d]=roster.slice(0,4).map(r=>r.riderId)
const rows=[
 {riderId:a,helper:h,statusImpact:'finished' as const,repairSeconds:30,energyLossPoints:2},
 {riderId:b,helper:null,statusImpact:'finished' as const,repairSeconds:90,energyLossPoints:5},
 {riderId:d,helper:null,statusImpact:'dnf' as const,repairSeconds:0,energyLossPoints:7},
]
assert.throws(()=>startMultiRiderIncident(initial,[rows[0],{...rows[1],helper:h}]),/reserved helper/)
assert.throws(()=>startMultiRiderIncident(initial,[{...rows[0],helper:b},rows[1]]),/reserved helper/)
const before=structuredClone(initial)
const run=()=>{
 let {state,episodes,targetId}=startMultiRiderIncident(initial,rows)
 assert.deepEqual(initial,before)
 for(const row of rows)assert.equal(state.riders[row.riderId].energy,initial.riders[row.riderId].energy-row.energyLossPoints)
 const withdrawn=state.riders[d],history=[]
 const joins=new Map();let pickup=false
 for(let i=0;i<160&&episodes.some(e=>e.phase!=='joined');i++){
  const prior=state
  const tick=multiRiderIncidentTick(state,episodes,targetId)
  state=tick.state;episodes=tick.episodes;history.push(tick)
  assert.deepEqual(state.riders[d],withdrawn)
  assert.ok(!tick.energy.some(e=>e.riderId===d))
  for(const id of [a,h,b]){
   assert.ok(state.riders[id].distanceKm>=prior.riders[id].distanceKm-1e-8)
   assert.ok(state.riders[id].energy<=prior.riders[id].energy+1e-8)
  }
  if(i===0){assert.equal(state.riders[a].distanceKm,prior.riders[a].distanceKm);assert.equal(state.riders[b].distanceKm,prior.riders[b].distanceKm)}
  if(i===1){assert.ok(state.riders[a].distanceKm>prior.riders[a].distanceKm);assert.equal(state.riders[b].distanceKm,prior.riders[b].distanceKm)}
  if(tick.pickups.includes(a)){pickup=true;assert.equal(state.riders[h].currentGroupId,state.riders[a].currentGroupId)}
  for(const id of tick.rejoins){assert.ok(!joins.has(id));joins.set(id,state.raceSecond);assert.equal(state.riders[id].distanceKm,state.groups[targetId].distanceKm)}
 }
 assert.ok(pickup&&joins.has(a)&&joins.has(b)&&joins.get(a)<joins.get(b),'distinct recovery witnesses required')
 assert.equal(state.riders[d].stageStatus,'dnf')
 return {state,history,episodes}
}
const controlled=run()
console.log('PASS 043AB atomic multi-rider loss, distinct repair durations, helper pickup and permanent DNF')
assert.deepEqual(run(),controlled)
console.log('PASS 043AB deterministic independent recovery and physical rejoin')
let witness=null
for(const seed of [4,6,38,0,1,2,5,8,12,14,16,25,26,27,30,33]){
 const args=argsFor('043Y-engine-'+seed),out=reviewAutomaticMultiRiderIncident(args)
 const event=out.trace.incidents.find(e=>e.incident.kind==='group_crash'&&out.applications.filter(a=>a.incidentId===e.incident.incidentId).length===e.incident.affectedRiderIds.length)
 const apps=event?out.applications.filter(a=>a.incidentId===event.incident.incidentId):[]
 const later=event&&out.observations.find(o=>o.raceSecond===event.raceSecond+30)
 console.log('INFO 043AB '+args.input.seed+' selected='+out.trace.incidents.length+' riderApplications='+out.applications.length+' group='+Boolean(event)+' stop='+out.trace.stopReason)
 if(event&&later&&apps.length>=2){witness={args,out,event,apps,later};break}
}
assert.ok(witness,'no automatically selected applied group crash')
const {args,out,event,apps,later}=witness
assert.deepEqual(apps.map(a=>a.riderId).sort(),event.incident.affectedRiderIds.slice().sort())
assert.equal(new Set(apps.map(a=>a.checkpointSha256)).size,1)
assert.equal(new Set(apps.map(a=>a.raceSecond)).size,1)
const previous=out.observations.find(o=>o.raceSecond===event.raceSecond)
for(const app of apps){
 assert.equal(app.afterEnergy,Math.max(0,app.beforeEnergy-app.initialEnergyLoss))
 const p=later.positions.find(r=>r.riderId===app.riderId)
 assert.equal(p.distanceKm,previous.positions.find(r=>r.riderId===app.riderId).distanceKm)
 if(app.statusImpact==='dnf')assert.equal(p.status,'dnf')
 else {assert.ok(later.excludedRiderIds.includes(app.riderId));assert.ok(p.distanceKm<later.measuredKm)}
}
for(const o of out.observations){
 const gate=out.trace.audit.find(a=>a.raceSecond===o.raceSecond)
 for(const id of o.excludedRiderIds)assert.ok(!(gate.eligibleRiderIds??[]).includes(id))
}
console.log('PASS 043AB automatic selected group crash and physical candidate exclusion')
assert.deepEqual(reviewAutomaticMultiRiderIncident(args),out)
assert.equal(out.observationSha256,carryoverDigest(out.observations))
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AB deterministic automatic batch and authority boundary')
console.log('PASS 4/4 multi-rider incident checks; no hosted connection')
