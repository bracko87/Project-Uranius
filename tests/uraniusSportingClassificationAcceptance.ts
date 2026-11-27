import assert from 'node:assert/strict'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {simulateMultiGroupTick} from '../src/race-engine/simulation/simulateMultiGroupTick'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {startMultiRiderIncident} from '../scripts/uranius-multi-rider-incident-motion-review'
import {finishPhysicalIncidentStage,reviewAutomaticPhysicalFinish} from '../scripts/uranius-physical-incident-finish-review'
import {reviewSportingClassification} from '../scripts/uranius-sporting-classification-review'
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

const finish=finishPhysicalIncidentStage(batch.state,batch.episodes,batch.targetId)
const snapshot=structuredClone(finish)
const policy={provenance:'synthetic_review_fixture' as const,groupGapSeconds:1,timeLimitPercent:10,sprintZoneKm:3,flatFinish:true}
const affected=[a,b,d],sourceGroupRiderIds=start.groups[batch.targetId].riderIds.slice()
const incidents=affected.map(riderId=>({incidentId:'controlled-late-crash',riderId,kind:'group_crash' as const,km:start.currentKm,sourceGroupRiderIds,affectedRiderIds:affected}))
const project=(f=finish,p=policy,e=incidents)=>reviewSportingClassification({finish:f,policy:p,incidents:e,expectedPolicySha256:carryoverDigest(p),expectedIncidentsSha256:carryoverDigest(e)})
// Protect only the rider with an eligible late-incident witness; the second
// witness is exhaustion, not a crash/mechanical incident. DNF stays terminal.
const mixed=incidents.map(e=>e.riderId===b?{...e,incidentId:'controlled-exhaustion',kind:'exhaustion' as const,affectedRiderIds:[b]}:{...e,affectedRiderIds:[a,d]})
const out=project(finish,policy,mixed),get=id=>out.rows.find(r=>r.riderId===id)
assert.equal(get(a).status,'finished')
assert.equal(get(a).sportingElapsedSeconds,out.winnerSportingSeconds)
assert.equal(get(a).protectionIncidentId,'controlled-late-crash')
assert.ok(get(a).physicalElapsedSeconds>out.timeLimitSeconds)
assert.equal(get(b).status,'otl');assert.equal(get(b).sportingRank,null)
assert.equal(get(b).protectionIncidentId,null)
assert.equal(get(d).status,'dnf');assert.equal(get(d).physicalRank,null)
assert.equal(get(h).protectionIncidentId,null)
assert.equal(project(finish,{...policy,flatFinish:false},mixed).rows.find(r=>r.riderId===a).status,'otl')
assert.equal(project(finish,{...policy,sprintZoneKm:0},mixed).rows.find(r=>r.riderId===a).status,'otl')
assert.equal(project(finish,{...policy,sprintZoneKm:.001},mixed).rows.find(r=>r.riderId===a).status,'otl')
assert.equal(project(finish,policy,[]).rows.find(r=>r.riderId===a).status,'otl')
assert.equal(project(finish,policy,mixed.map(e=>({...e,sourceGroupRiderIds:e.affectedRiderIds}))).rows.find(r=>r.riderId===a).status,'otl')
console.log('PASS 043AE explicit sprint-zone protection, exclusion boundaries and OTL without changing physical ranks')
const classified=out.rows.filter(r=>r.status==='finished')
assert.deepEqual(classified.map(r=>r.sportingRank),classified.map((_,i)=>i+1))
assert.equal(new Set(out.rows.map(r=>r.riderId)).size,roster.length)
const leading=finish.classification.filter(r=>r.elapsedSeconds===finish.classification[0].elapsedSeconds)
assert.ok(leading.length>1)
assert.ok(leading.every(r=>get(r.riderId).sportingElapsedSeconds===out.winnerSportingSeconds))
assert.ok(out.rows.filter(r=>r.status==='finished').every(r=>Number.isInteger(r.sportingElapsedSeconds)&&r.sportingGapSeconds===r.sportingElapsedSeconds-out.winnerSportingSeconds))
assert.deepEqual(finish,snapshot)
console.log('PASS 043AE shared group times, contiguous sporting ranks and immutable physical classification')
let fractional=false
for(const r of out.rows){
 if(r.status==='dnf'){assert.equal(r.energy,null);continue}
 const t=finish.ticks.find(t=>t.crossings.some(c=>c.riderId===r.riderId)),c=t.crossings.find(c=>c.riderId===r.riderId),e=t.energy.find(e=>e.riderId===r.riderId)
 assert.equal(r.energy.crossingFraction,c.crossingFraction)
 assert.ok(Math.abs(r.energy.partialTickEnergy-Math.max(0,e.previousEnergy-e.result.grossEnergyCost*e.result.efficiencyMultiplier*c.crossingFraction))<1e-8)
 assert.ok(r.energy.partialTickEnergy>=r.energy.fullTickEnergy-1e-8&&r.energy.partialTickEnergy<=r.energy.previousEnergy+1e-8)
 if(r.energy.crossingFraction<1&&r.energy.partialTickEnergy>r.energy.fullTickEnergy+1e-8)fractional=true
}
assert.ok(fractional,'fractional energy witness required')
console.log('PASS 043AE fractional crossing energy projection and terminal energy exclusion')
const base=argsFor('043Y-engine-4')
const args={...base,input:{...base.input,stageName:'043AC long-wet',distanceKm:200,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:200,elevationMetres:50}],settings:{...base.input.settings,minimumSpeedKmh:40,maximumSpeedKmh:44}}}
const auto=reviewAutomaticPhysicalFinish(args)
const evidence=auto.prefix.trace.incidents.flatMap(e=>{
 const obs=auto.prefix.observations.find(o=>o.raceSecond===e.raceSecond)
 const group=obs.tick.groups.find(g=>g.displayCode==='P')
 return e.incident.affectedRiderIds.map(riderId=>({incidentId:e.incident.incidentId,riderId,kind:e.incident.kind,km:e.kmFromStart,sourceGroupRiderIds:group.riderIds,affectedRiderIds:e.incident.affectedRiderIds}))
})
assert.equal(auto.prefix.admissions.length,6)
const projected=project(auto.finish,policy,evidence)
assert.equal(projected.rows.length,roster.length)
assert.deepEqual(project(auto.finish,policy,evidence),projected)
assert.equal(projected.rowsSha256,carryoverDigest(projected.rows))
assert.throws(()=>reviewSportingClassification({finish,policy,incidents:mixed,expectedPolicySha256:'0'.repeat(64),expectedIncidentsSha256:carryoverDigest(mixed)}),/frozen explicit/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(projected[k],false)
console.log('PASS 043AE automatic physical result sporting projection, determinism and authority guards')
console.log('PASS 4/4 sporting classification checks; no hosted connection')
