import assert from 'node:assert/strict'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {simulateMultiGroupTick} from '../src/race-engine/simulation/simulateMultiGroupTick'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {startMultiRiderIncident,extendMultiRiderIncident,multiRiderIncidentTick} from '../scripts/uranius-multi-rider-incident-motion-review'
import {reviewAutomaticOverlappingIncident} from '../scripts/uranius-automatic-overlapping-incident-review'
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
const [a,h,b,j,d]=roster.slice(0,5).map(r=>r.riderId)
const row=(riderId,helper,repairSeconds,energyLossPoints)=>({riderId,helper,repairSeconds,energyLossPoints,statusImpact:'finished' as const})
const run=()=>{
 let {state,episodes,targetId}=startMultiRiderIncident(initial,[row(a,h,180,3)])
 const history=[]
 for(let i=0;i<4;i++){
  const t=multiRiderIncidentTick(state,episodes,targetId);state=t.state;episodes=t.episodes;history.push(t)
 }
 assert.equal(episodes[0].phase,'repair')
 const prior=structuredClone(state),priorEpisodes=structuredClone(episodes)
 assert.throws(()=>startMultiRiderIncident(state,[row(b,j,30,4)]),/single peloton/)
 assert.throws(()=>extendMultiRiderIncident(state,[row(b,h,30,4)],episodes),/reserved helper/)
 assert.throws(()=>extendMultiRiderIncident(state,[row(a,null,30,4)],episodes),/affected rider not in source/)
 assert.throws(()=>extendMultiRiderIncident(state,[row(b,j,30,4)],[]),/untracked active group/)
 assert.deepEqual(state,prior)
 const added=extendMultiRiderIncident(state,[row(b,j,30,4),{riderId:d,helper:null,repairSeconds:0,energyLossPoints:6,statusImpact:'dnf'}],episodes)
 assert.deepEqual(added.episodes[0],priorEpisodes[0])
 assert.deepEqual(added.state.riders[a],prior.riders[a])
 assert.deepEqual(added.state.riders[h],prior.riders[h])
 assert.equal(added.state.riders[b].energy,prior.riders[b].energy-4)
 state=added.state;episodes=added.episodes
 const withdrawn=state.riders[d],joins=new Map()
 for(let i=0;i<200&&episodes.some(e=>e.phase!=='joined');i++){
  const old=state,t=multiRiderIncidentTick(state,episodes,targetId)
  state=t.state;episodes=t.episodes;history.push(t)
  assert.deepEqual(state.riders[d],withdrawn)
  assert.ok(!t.energy.some(x=>x.riderId===d))
  for(const id of [a,h,b,j]){
   assert.ok(state.riders[id].distanceKm>=old.riders[id].distanceKm-1e-8)
   assert.ok(state.riders[id].energy<=old.riders[id].energy+1e-8)
   assert.equal(t.energy.filter(x=>x.riderId===id).length,1)
  }
  for(const id of t.rejoins){assert.ok(!joins.has(id));joins.set(id,state.raceSecond);assert.equal(state.riders[id].distanceKm,state.groups[targetId].distanceKm)}
 }
 assert.ok(joins.has(a)&&joins.has(b)&&joins.get(b)<joins.get(a),'independent rejoin order required')
 assert.ok(episodes.every(e=>e.phase==='joined'))
 assert.equal(state.riders[h].currentGroupId,targetId);assert.equal(state.riders[j].currentGroupId,targetId)
 return {state,episodes,history}
}
const controlled=run()
console.log('PASS 043AC atomic overlapping admission, active helper reservations and unchanged prior episode')
assert.deepEqual(run(),controlled)
console.log('PASS 043AC single clock, individual energy, out-of-order recovery and permanent DNF')
let witness=null
const seeds=[6,38,4,...Array.from({length:48},(_,i)=>i).filter(i=>![6,38,4].includes(i))]
for(const i of seeds){
 const args=argsFor('043Y-engine-'+i),out=reviewAutomaticOverlappingIncident(args)
 const admission=out.admissions.find(a=>a.priorActive.length&&a.newGroups.length&&out.observations.some(o=>o.activeEpisodes.some(e=>e.incidentId===a.incidentId)&&o.activeEpisodes.some(e=>a.priorActive.some(p=>p.incidentId===e.incidentId))))
 console.log('INFO 043AC '+args.input.seed+' selected='+out.trace.incidents.length+' admitted='+out.admissions.length+' overlap='+Boolean(admission)+' stop='+out.trace.stopReason)
 if(admission){witness={args,out,admission};break}
}
assert.ok(witness,'no automatic overlapping active incident witness')
const {args,out,admission}=witness
const previous=out.observations.find(o=>o.raceSecond===admission.raceSecond)
const newApps=out.applications.filter(a=>a.incidentId===admission.incidentId)
const reserved=new Set(admission.priorActive.flatMap(e=>[e.affected,e.helper]).filter(Boolean))
for(const app of newApps){
 assert.ok(!reserved.has(app.riderId)&&!reserved.has(app.helper))
 assert.equal(app.beforeEnergy,previous.positions.find(p=>p.riderId===app.riderId).energy)
 assert.equal(app.afterEnergy,Math.max(0,app.beforeEnergy-app.initialEnergyLoss))
}
const applied=new Map(out.applications.map(a=>[a.incidentId+'|'+a.riderId,a]))
const joined=new Set()
for(const o of out.observations){
 const gate=out.trace.audit.find(g=>g.raceSecond===o.raceSecond)
 for(const id of o.excludedRiderIds)assert.ok(!(gate.eligibleRiderIds??[]).includes(id))
 const activeRiders=o.activeEpisodes.flatMap(e=>[e.affected,e.helper].filter(Boolean))
 assert.equal(new Set(activeRiders).size,activeRiders.length)
 for(const w of o.tick.rejoins){
  const key=w.incidentId+'|'+w.riderId,app=applied.get(key)
  assert.ok(app&&app.raceSecond<o.raceSecond&&!joined.has(key))
  joined.add(key)
  assert.equal(o.positions.find(r=>r.riderId===w.riderId).distanceKm,o.measuredKm)
 }
}
console.log('PASS 043AC automatic overlapping selection, candidate exclusion and separate rejoin identities')
assert.deepEqual(reviewAutomaticOverlappingIncident(args),out)
assert.equal(out.observationSha256,carryoverDigest(out.observations))
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AC deterministic automatic overlap and authority boundary')
console.log('PASS 4/4 overlapping incident checks; no hosted connection')
