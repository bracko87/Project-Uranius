import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewAutomaticPhysicalIncident} from '../scripts/uranius-automatic-physical-incident-review'
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
let witness=null
for(const i of [4,6,38,0,1,2,5,8,12,14,16,25,26,27,30,33]){
 const args=argsFor('043Y-engine-'+i),out=reviewAutomaticPhysicalIncident(args)
 const app=out.applications.find(a=>a.statusImpact==='finished'&&out.observations.some(o=>o.raceSecond>a.raceSecond&&o.excludedRiderIds.includes(a.riderId))&&out.observations.some(o=>o.tick.rejoins.some(r=>r.incidentId===a.incidentId)))
 const later=app&&out.selectedCheckpoints.find(c=>c.evidence.raceSecond>app.raceSecond&&c.evidence.candidates.some(x=>x.probabilityInput.incidentKind==='technical_incident'))
 console.log('INFO 043AA '+args.input.seed+' selected='+out.trace.incidents.length+' applied='+out.applications.length+' stop='+out.trace.stopReason+' rejoin='+Boolean(app)+' later='+Boolean(later))
 if(app&&later){witness={args,out,app,later};break}
}
assert.ok(witness,'no selected physical rejoin and later checkpoint witness')
const {args,out,app,later}=witness
const selected=out.trace.incidents.find(x=>x.incident.incidentId===app.incidentId)
assert.equal(app.raceSecond,selected.raceSecond)
assert.equal(app.afterEnergy,Math.max(0,app.beforeEnergy-app.initialEnergyLoss))
assert.equal(app.repairSeconds,Math.ceil(app.timeLossSeconds/30)*30)
const before=out.observations.find(o=>o.raceSecond===app.raceSecond),after=out.observations.find(o=>o.raceSecond===app.raceSecond+30)
assert.equal(before.positions.find(r=>r.riderId===app.riderId).distanceKm,after.positions.find(r=>r.riderId===app.riderId).distanceKm)
assert.ok(after.excludedRiderIds.includes(app.riderId))
assert.ok(after.positions.find(r=>r.riderId===app.riderId).distanceKm<after.measuredKm)
const rejoin=out.observations.find(o=>o.tick.rejoins.some(r=>r.incidentId===app.incidentId))
assert.ok(rejoin.raceSecond>app.raceSecond)
assert.equal(rejoin.positions.find(r=>r.riderId===app.riderId).distanceKm,rejoin.measuredKm)
assert.ok(!rejoin.excludedRiderIds.includes(app.riderId))
console.log('PASS 043AA automatic selection, historical consequence, physical separation and contact rejoin')
for(const o of out.observations){
 const gate=out.trace.audit.find(a=>a.raceSecond===o.raceSecond)
 assert.equal(gate.kmFromStart,Math.round((o.measuredKm+Number.EPSILON)*1e6)/1e6)
 for(const id of o.excludedRiderIds)assert.ok(!(gate.eligibleRiderIds??[]).includes(id))
}
const obs=out.observations.find(o=>o.raceSecond===later.evidence.raceSecond)
for(const c of later.evidence.candidates.filter(c=>c.probabilityInput.incidentKind==='technical_incident')){
 const id=c.riders[0].riderId,r=obs.positions.find(r=>r.riderId===id),initial=args.source.riderRows.find(r=>r.rider_id===id)
 const start=out.observations[0].positions.find(r=>r.riderId===id)
 // Readiness effective fatigue and starting energy are bound in the simulation input.
 const cond=out.finalState.input.riders.find(r=>r.riderId===id).condition
 const expected=Math.round((Math.min(100,Math.max(0,cond.fatigueBeforeStage+Math.max(0,cond.startingEnergy-r.energy)/Math.max(1,cond.startingEnergy)*45))+Number.EPSILON)*1e6)/1e6
 assert.equal(c.probabilityInput.runtimeFatigue,expected)
 assert.ok(!obs.excludedRiderIds.includes(id))
}
console.log('PASS 043AA later selection uses physical progress, energy and group eligibility')
assert.deepEqual(reviewAutomaticPhysicalIncident(args),out)
assert.equal(out.observationSha256,carryoverDigest(out.observations))
assert.throws(()=>reviewAutomaticPhysicalIncident({...args,expectedContextSha256:'0'.repeat(64)}),/context digest mismatch/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AA deterministic bounded review and authority guards')
console.log('PASS 3/3 automatic physical incident checks; no hosted connection')
