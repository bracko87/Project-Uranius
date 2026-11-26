import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewHistoricalCheckpoint} from '../scripts/uranius-historical-incident-probability-review.mjs'
import {reviewHistoricalInitialLoss,reviewHistoricalCheckpointConsequences} from '../scripts/uranius-historical-incident-consequences-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const md5=x=>createHash('md5').update(x,'utf8').digest('hex')
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const kinds=['individual_crash','group_crash','technical_incident','exhaustion'],severities=['minor','moderate','serious']
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const out=[]
for(const kind of kinds)for(const severity of severities)for(let i=0;i<100;i++)out.push(reviewHistoricalInitialLoss({kind,severity,hash:md5('043R:'+kind+':'+severity+':'+i),equipmentConditionPercent:i,mechanicalTimeLossMultiplier:[.82,.91,1][i%3]}))
assert.equal(out.length,1200);assert.equal(md5(JSON.stringify(out)),'b8601ae20aa868d001527dda50769833')
pass('043R 1200 exact historical subtype, time-loss and base-energy outputs match original source checksum')
const types=new Set(),ranges={dropped_chain:[[8,18],[19,35],[36,60]],puncture:[[20,35],[36,60],[61,95]],wheel_damage:[[35,55],[56,90],[91,140]],drivetrain_failure:[[25,50],[51,95],[96,160]],bike_change:[[60,90],[91,140],[141,220]]}
for(let i=0;i<300;i++)for(const severity of severities){
 const p={kind:'technical_incident',severity,hash:md5('repair-'+i),equipmentConditionPercent:i%101,mechanicalTimeLossMultiplier:1}
 const a=reviewHistoricalInitialLoss(p),b=reviewHistoricalInitialLoss({...p,mechanicalTimeLossMultiplier:.82})
 types.add(a.technicalType);assert.deepEqual(a.timeLossRange,ranges[a.technicalType][severities.indexOf(severity)])
 assert.equal(b.technicalType,a.technicalType);assert.equal(b.rawTimeLossSeconds,a.rawTimeLossSeconds);assert.equal(b.timeLossSeconds,Math.max(1,Math.round(a.timeLossSeconds*.82)))
 assert.ok(b.timeLossSeconds>5);assert.ok(b.baseEnergyLossPoints<=a.baseEnergyLossPoints)
}
assert.equal(types.size,5)
for(const kind of ['individual_crash','group_crash','exhaustion']){
 const p={kind,severity:'serious',hash:md5('nontechnical'),equipmentConditionPercent:10,mechanicalTimeLossMultiplier:1}
 assert.deepEqual(reviewHistoricalInitialLoss(p),reviewHistoricalInitialLoss({...p,mechanicalTimeLossMultiplier:.82}))
}
pass('043R all five technical subtypes and original repair modifier boundaries')
const roster=Array.from({length:8},(_,i)=>({riderId:id(100+i),teamId:id(10+i%2),equipmentConditionPercent:20}))
const candidate=(kind,riders)=>({entityId:kind==='group_crash'?'P:'+riders.map(r=>r.riderId).sort().join(','):riders[0].riderId,displayCode:'P',riders,probabilityInput:{incidentKind:kind,tickSeconds:30,weatherMultiplier:2.5,currentSpeedKmh:80,gradientPercent:-12,groupSize:8,runtimeFatigue:100,resistance:0,raceIq:0,preparationSupportMultiplier:1.4,commandIntensityMultiplier:1.45,raceSituationMultiplier:6,equipmentConditionPercent:kind==='group_crash'?100:20,mechanicalIncidentRiskMultiplier:kind==='technical_incident'?1.5:1},causes:['descending','runtime_fatigue','wet_road','high_speed'],exposureEligibility:'explicit_synthetic_eligible'})
const cp={provenance:'synthetic_review_fixture',raceId:id(1),stageId:id(2),runId:id(3),seed:'043R-0',raceSecond:300,priorIncidentCount:0,candidates:[candidate('group_crash',roster),candidate('individual_crash',[roster[0]]),candidate('technical_incident',[roster[1]]),candidate('exhaustion',[roster[2]])]}
const make=checkpoint=>({provenance:'synthetic_review_fixture',checkpoint,expectedCheckpointSha256:carryoverDigest(checkpoint),repairModifiers:roster.map(r=>({riderId:r.riderId,teamId:r.teamId,mechanicalTimeLossMultiplier:.82})),stage:{stageFormat:'road_race',distanceKm:100,kmFromStart:98,flatFinish:true,summitFinish:false,sprintZoneKm:null}})
const review=e=>reviewHistoricalCheckpointConsequences({evidence:e,expectedEvidenceSha256:carryoverDigest(e)})
const found=new Set();let none=0,finished=0,dnf=0,fixture=null
for(let i=0;i<800;i++){
 const checkpoint={...cp,seed:'043R-'+i},e=make(checkpoint),result=review(e)
 const expected=reviewHistoricalCheckpoint({evidence:checkpoint,expectedEvidenceSha256:e.expectedCheckpointSha256}).incident
 if(!expected){assert.equal(result.incident,null);none++;continue}
 const a=result.incident;fixture??=e;found.add(a.kind)
 assert.equal(a.incidentId,expected.incidentId);assert.deepEqual(a.affectedRiderIds,expected.affectedRiderIds)
 for(const row of a.riderConsequences){
  const h=expected.handoffs.find(x=>x.riderId===row.riderId);assert.deepEqual(row.healthOutcome,h.healthOutcome);assert.equal(row.statusImpact,h.statusImpact)
  const moved=h.statusImpact==='finished'&&a.timeLossSeconds>5
  assert.equal(row.movedToLaterGroup,moved);assert.equal(row.provisionalTimePenaltySeconds,moved?a.timeLossSeconds:0);assert.equal(row.initialGapSeconds,moved?a.timeLossSeconds:0)
  assert.equal(row.energyLossPoints,Math.round((a.baseEnergyLossPoints+h.healthOutcome.additionalEnergyLossPoints+Number.EPSILON)*1e6)/1e6)
  assert.equal(row.sprintZoneEligible,true);assert.equal(row.sprintZoneProtectionApplied,null);assert.equal(row.finalTimePenaltySeconds,null);assert.equal(row.finalGapSeconds,null);assert.equal(row.actualRejoinKm,null)
  if(h.statusImpact==='finished')finished++;else dnf++
 }
}
assert.equal(found.size,4);assert.ok(none&&finished&&dnf)
pass('043R checkpoint selection binds initial loss, health and separation; DNF has no provisional time penalty')
assert.ok(fixture)
for(const [patch,expected] of [[{kmFromStart:96.99},false],[{kmFromStart:97},true],[{flatFinish:false},false],[{summitFinish:true},false],[{sprintZoneKm:0},false],[{sprintZoneKm:2},true]]){
 const x=review({...fixture,stage:{...fixture.stage,...patch}});assert.ok(x.incident.riderConsequences.every(r=>r.sprintZoneEligible===expected&&r.sprintZoneProtectionApplied===null))
}
pass('043R sprint-zone eligibility boundary without fabricated official protection or finish time')
assert.throws(()=>reviewHistoricalCheckpointConsequences({evidence:{...fixture,stage:{...fixture.stage,kmFromStart:50}},expectedEvidenceSha256:carryoverDigest(fixture)}),/frozen synthetic/)
assert.throws(()=>review({...fixture,checkpoint:{...fixture.checkpoint,seed:'tampered'}}),/frozen synthetic checkpoint/)
assert.throws(()=>review({...fixture,repairModifiers:fixture.repairModifiers.slice(1)}),/coverage/)
assert.throws(()=>review({...fixture,repairModifiers:fixture.repairModifiers.map((r,i)=>i===0?{...r,mechanicalTimeLossMultiplier:.5}:r)}),/repair modifiers/)
assert.throws(()=>review({...fixture,stage:{...fixture.stage,stageFormat:'team_time_trial'}}),/road stage/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','physicalCheckpointVerified','incidentAuthorityVerified','finishTimeVerified','chaseResolved'])assert.equal(review(fixture)[k],false)
pass('043R frozen evidence, exact modifier roster, unsupported scope and authority guards')
assert.equal(checks,5);console.log('PASS 5/5 historical incident consequence checks; no hosted connection')
