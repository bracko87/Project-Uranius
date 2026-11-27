import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {originalPostStageFatigueReview} from '../scripts/uranius-original-engine-effects-review.mjs'
import {reviewOfficialRaceNight} from '../scripts/uranius-original-fatigue-review.mjs'
import {buildFrozenReadinessReview} from '../scripts/uranius-frozen-readiness-review.mjs'
import {reviewPhysicalStageContinuity} from '../scripts/uranius-physical-stage-continuity-review'
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
const out=reviewPhysicalStageContinuity(packet)
assert.equal(out.auto.prefix.admissions.length,6)
let corrected=false,incidentLoss=false
for(const a of out.energyAudit){
 const old=out.auto.finish.state.riders[a.riderId],next=out.correctedState.riders[a.riderId],w=out.workloads.find(w=>w.riderId===a.riderId),s=out.sporting.rows.find(r=>r.riderId===a.riderId)
 assert.deepEqual(next,{...old,energy:a.correctedEnergy})
 assert.equal(a.fullTickEnergy,old.energy);assert.equal(w.rawFinishEnergy,next.energy)
 assert.equal(next.energy,s.energy?.partialTickEnergy??old.energy)
 assert.equal(w.incidentEnergyLoss,0);assert.equal(a.additionalIncidentDeduction,0)
 const apps=out.auto.prefix.applications.filter(x=>x.riderId===a.riderId)
 assert.ok(Math.abs(a.alreadyAppliedIncidentLoss-apps.reduce((n,x)=>n+x.beforeEnergy-x.afterEnergy,0))<1e-8)
 if(a.alreadyAppliedIncidentLoss>0)incidentLoss=true
 if(next.energy>old.energy+1e-8)corrected=true
}
assert.ok(incidentLoss,'actual incident loss witness required')
console.log('PASS 043AF corrected terminal energy and no duplicate incident deduction; positive fractional refund='+corrected)
for(const w of out.workloads){
 const r=out.carry.receipt.riders.find(x=>x.riderId===w.riderId),s=out.sporting.rows.find(x=>x.riderId===w.riderId)
 assert.equal(w.status,s.status)
 assert.deepEqual(r.effect,originalPostStageFatigueReview(w))
 assert.equal(r.persistedFatigue,Math.round(r.effect.fatigueAfterStage))
 assert.equal(r.effect.finishEnergy,Math.round((w.rawFinishEnergy+Number.EPSILON)*1e6)/1e6)
 assert.equal(r.effect.finishStatusLoad,({finished:0,otl:1.5,dnf:2.5})[w.status])
}
console.log('PASS 043AF historical workload fatigue and sporting status carryover')
for(const r of out.nextReadiness.receipt.rows){
 const old=out.carry.receipt.riders.find(x=>x.riderId===r.riderId),night=out.nextSource.recoveryReceipts.find(x=>x.riderId===r.riderId),h=out.health.find(x=>x.riderId===r.riderId)
 const expected=reviewOfficialRaceNight(night)
 assert.equal(r.condition.fatigueBeforeStage,expected.fatigue)
 assert.equal(r.condition.startingEnergy,Math.max(1,100-expected.fatigue*.45))
 assert.equal(r.priorStatus,old.status)
 assert.equal(r.startStatus,old.status!=='finished'||h.selectionBlocked?'dns':'starter')
 const hands=out.auto.prefix.trace.incidents.flatMap(e=>e.incident.handoffs.filter(x=>x.riderId===r.riderId).map(x=>({incidentId:e.incident.incidentId,...x.healthOutcome}))).filter(x=>x.injuryOccurred)
 assert.deepEqual(h.outcomes,hands)
 assert.equal(r.condition.availabilityStatus,h.selectionBlocked?'injured':h.outcomes.length?'not_fully_fit':'fit')
}
assert.deepEqual(buildFrozenReadinessReview({source:out.nextSource,expectedSourceSha256:carryoverDigest(out.nextSource)}),out.nextReadiness)
const bad=structuredClone(out.nextSource);bad.riderRows[0].fatigue_before_stage=bad.riderRows[0].fatigue_before_stage===0?1:0
assert.throws(()=>buildFrozenReadinessReview({source:bad,expectedSourceSha256:carryoverDigest(bad)}),/incorrect carried fatigue/)
console.log('PASS 043AF overnight recovery, health handoff and next-stage eligibility')
assert.deepEqual(reviewPhysicalStageContinuity(packet),out)
assert.throws(()=>reviewPhysicalStageContinuity({...packet,expectedContinuitySha256:'0'.repeat(64)}),/frozen continuity/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AF deterministic receipt chain and authority guards')
console.log('PASS 4/4 physical stage continuity checks; no hosted connection')
