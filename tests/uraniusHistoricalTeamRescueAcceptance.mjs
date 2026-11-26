import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewHistoricalCheckpointConsequences} from '../scripts/uranius-historical-incident-consequences-review.mjs'
import {reviewHistoricalRescuePickup,reviewHistoricalTeamRescue} from '../scripts/uranius-historical-team-rescue-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const a={raceSecond:900,kmFromStart:10,timeLossSeconds:60}
assert.equal(reviewHistoricalRescuePickup(a,0,100),10.888889)
assert.equal(reviewHistoricalRescuePickup(a,4,100),11.212121)
assert.equal(reviewHistoricalRescuePickup({...a,timeLossSeconds:0},0,100),10.05)
assert.equal(reviewHistoricalRescuePickup({...a,kmFromStart:99.9},0,100),100)
pass('043T exact historical rescue pickup, steep-climb and finish boundaries')
const roster=Array.from({length:8},(_,i)=>({riderId:id(100+i),teamId:id(10+i%2),equipmentConditionPercent:95}))
const candidate=r=>({entityId:r.riderId,displayCode:'P',riders:[r],probabilityInput:{incidentKind:'technical_incident',tickSeconds:30,weatherMultiplier:2.5,currentSpeedKmh:80,gradientPercent:-12,groupSize:8,runtimeFatigue:100,resistance:0,raceIq:0,preparationSupportMultiplier:1.4,commandIntensityMultiplier:1.45,raceSituationMultiplier:6,equipmentConditionPercent:95,mechanicalIncidentRiskMultiplier:1},causes:['descending','runtime_fatigue','wet_road','high_speed'],exposureEligibility:'explicit_synthetic_eligible'})
const cp={provenance:'synthetic_review_fixture',raceId:id(1),stageId:id(2),runId:id(3),seed:'043T-0',raceSecond:900,priorIncidentCount:0,candidates:[candidate(roster[0])]}
const wrap=(checkpoint,kmFromStart)=>{
 const evidence={provenance:'synthetic_review_fixture',checkpoint,expectedCheckpointSha256:carryoverDigest(checkpoint),repairModifiers:checkpoint.candidates.map(c=>({riderId:c.riders[0].riderId,teamId:c.riders[0].teamId,mechanicalTimeLossMultiplier:1})),stage:{stageFormat:'road_race',distanceKm:100,kmFromStart,flatFinish:true,summitFinish:false,sprintZoneKm:null}}
 return {evidence,expectedEvidenceSha256:carryoverDigest(evidence)}
}
// Fixed deterministic seed recovered from the original checkpoint draw; no test-time search.
const first={...cp,seed:'043T-19314'},second={...first,raceSecond:1020,priorIncidentCount:1,candidates:[candidate(roster[1])]}
const chosen={f:wrap(first,10),s:wrap(second,11.333333)}
chosen.x=reviewHistoricalCheckpointConsequences(chosen.f).incident
chosen.y=reviewHistoricalCheckpointConsequences(chosen.s).incident
assert.equal(chosen.x.timeLossSeconds,45);assert.equal(chosen.y.timeLossSeconds,43)
const make=(consequences=[chosen.f],strong=true)=>{
 const riders=roster.map(r=>({riderId:r.riderId,teamId:r.teamId,flat:strong?95:25,climbing:strong?95:25,endurance:strong?95:25,resistance:strong?95:25,teamwork:strong?95:25,raceIQ:strong?95:25,fatigueBeforeStage:strong?10:90,startEnergy:80}))
 const plans=riders.map(r=>({riderId:r.riderId,stageRole:'domestique',commands:{phase1:'hold',phase2:'hold',phase3:'hold',phase4:'hold'}}))
 return {provenance:'synthetic_review_fixture',consequences,riders,plans,gcStandings:[],profilePoints:[{km:0,elevationM:100},{km:100,elevationM:100}],terrainType:'flat',timeline:[{km:0,gaps:[{displayCode:'P',gapSeconds:0}],states:riders.map(r=>({riderId:r.riderId,status:'racing',displayCode:'P',energy:strong?80:10}))},{km:100,gaps:[{displayCode:'P',gapSeconds:0}],states:riders.map(r=>({riderId:r.riderId,status:'finished',displayCode:'P',energy:strong?75:5}))}],flatSprintFinish:true}
}
const review=e=>reviewHistoricalTeamRescue({evidence:e,expectedEvidenceSha256:carryoverDigest(e)})
const plain=make(),solo=review(plain)
assert.equal(solo.episodes.length,1);assert.equal(solo.summary.teamRescueEventCount,0)
const rescue=structuredClone(plain)
rescue.plans[0].stageRole='team_leader_gc';rescue.plans[2].commands.phase1='protect_leader';rescue.plans[3].commands.phase1='protect_leader'
const helped=review(rescue)
assert.equal(helped.teamRescueEvents.length,1);assert.deepEqual(helped.teamRescueEvents[0].helperRiderIds,[roster[2].riderId])
assert.equal(helped.summary.teamRescueHelperCount,1)
const leader=helped.episodes.find(e=>e.riderId===roster[0].riderId),helper=helped.episodes.find(e=>e.riderId===roster[2].riderId)
assert.equal(helper.episodeKind,'team_rescue_helper');assert.equal(helper.protectedRiderId,leader.riderId)
assert.equal(helper.activationKm,helped.teamRescueEvents[0].pickupKm);assert.equal(helper.actualRejoinKm,leader.actualRejoinKm)
assert.ok(leader.actualRejoinKm<=solo.episodes[0].actualRejoinKm&&helper.chaseEnergyCostPoints>0)
pass('043T same-team explicit protection, helper pickup, shared chase and independent energy')
const leaderOnly=structuredClone(plain);leaderOnly.gcStandings=[{riderId:roster[0].riderId,rank:1}];leaderOnly.plans[2].stageRole='free_role'
assert.deepEqual(review(leaderOnly).teamRescueEvents[0].helperRiderIds,[roster[2].riderId])
const steep=structuredClone(leaderOnly);steep.profilePoints=[{km:0,elevationM:0},{km:100,elevationM:4000}];steep.terrainType='mountain'
assert.equal(review(steep).teamRescueEvents.length,0)
steep.plans[2].commands.phase1='protect_leader';assert.equal(review(steep).teamRescueEvents.length,1)
const unavailable=structuredClone(rescue);unavailable.timeline[0].states[2].displayCode='B1';assert.equal(review(unavailable).teamRescueEvents.length,0)
pass('043T GC race leader/free-role exception, steep-climb explicit protection and source-group restriction')
const merged=review(make([chosen.f,chosen.s],false))
assert.equal(merged.episodes.length,2);assert.ok(merged.mergeEvents.length>=1)
assert.deepEqual(merged.mergeEvents[0].riderIds,[roster[0].riderId,roster[1].riderId])
assert.equal(merged.mergeEvents[0].displayCode,'I1')
assert.equal(merged.episodes[0].finalGapToTargetSeconds,merged.episodes[1].finalGapToTargetSeconds)
assert.deepEqual(review(make([chosen.f,chosen.s],false)),merged)
pass('043T separate incident groups merge within historical tolerance and retain stable group identity')
const tampered=structuredClone(rescue);tampered.plans.pop();assert.throws(()=>review(tampered),/frozen plans/)
assert.throws(()=>reviewHistoricalTeamRescue({evidence:rescue,expectedEvidenceSha256:carryoverDigest(plain)}),/frozen synthetic/)
assert.throws(()=>review(make([chosen.s,chosen.f])),/scope mismatch/)
const bad=structuredClone(rescue);bad.consequences[0].evidence.stage.kmFromStart=30;assert.throws(()=>review(bad),/frozen synthetic consequence/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','physicalCheckpointVerified','incidentAuthorityVerified','finishTimeVerified','completeChaseModelVerified'])assert.equal(helped[k],false)
pass('043T frozen stage plans and incident scope, no fabricated authority')
assert.equal(checks,5);console.log('PASS 5/5 historical team rescue checks; no hosted connection')
