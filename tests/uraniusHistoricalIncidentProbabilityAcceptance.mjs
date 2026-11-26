import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewHistoricalIncidentProbability,reviewHistoricalCheckpoint} from '../scripts/uranius-historical-incident-probability-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const md5=x=>createHash('md5').update(x,'utf8').digest('hex')
const kinds=['individual_crash','group_crash','technical_incident','exhaustion']
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const outputs=[]
for(const kind of kinds)for(let i=0;i<100;i++){
 const p={incidentKind:kind,tickSeconds:[0,15,30,60,120,180][i%6],weatherMultiplier:.5+i%21/10,currentSpeedKmh:20+i%65,gradientPercent:(i%25)-12,groupSize:1+i%70,runtimeFatigue:i%101,resistance:i%101,raceIq:100-i%101,preparationSupportMultiplier:.5+i%12/10,commandIntensityMultiplier:.6+i%12/10,raceSituationMultiplier:.4+i%70/10,equipmentConditionPercent:i%101,mechanicalIncidentRiskMultiplier:.5+i%12/10}
 outputs.push(reviewHistoricalIncidentProbability(p))
}
assert.equal(md5(JSON.stringify(outputs)),'bdf9c1269f0a1561ce8440a63b5187c8')
pass('043P 400 probability breakdowns match pinned historical source digest')
const p=(incidentKind,over={})=>({incidentKind,tickSeconds:30,weatherMultiplier:1,currentSpeedKmh:30,gradientPercent:0,groupSize:1,runtimeFatigue:20,resistance:50,raceIq:50,preparationSupportMultiplier:1,commandIntensityMultiplier:1,raceSituationMultiplier:1,equipmentConditionPercent:100,mechanicalIncidentRiskMultiplier:1,...over})
for(const kind of kinds){
 const a=reviewHistoricalIncidentProbability(p(kind))
 assert.equal(a.finalProbability,{individual_crash:.00008,group_crash:.00008,technical_incident:.00012,exhaustion:.003}[kind])
 assert.equal(reviewHistoricalIncidentProbability(p(kind,{tickSeconds:0})).finalProbability,0)
 const z=reviewHistoricalIncidentProbability(p(kind,{tickSeconds:180,weatherMultiplier:9,currentSpeedKmh:90,gradientPercent:-30,groupSize:100,runtimeFatigue:100,resistance:0,raceIq:0,preparationSupportMultiplier:3,commandIntensityMultiplier:3,raceSituationMultiplier:9,equipmentConditionPercent:0,mechanicalIncidentRiskMultiplier:3}))
 assert.equal(z.finalProbability,z.maximumProbability)
}
for(const [condition,risk] of [[90,1],[89.99,1.05],[75,1.05],[74.99,1.15],[50,1.15],[49.99,1.3],[25,1.3],[24.99,1.5]])assert.equal(reviewHistoricalIncidentProbability(p('technical_incident',{equipmentConditionPercent:condition})).equipmentConditionMultiplier,risk)
pass('043P base risks, cap, zero tick and equipment condition boundaries')
const riders=Array.from({length:8},(_,i)=>({riderId:id(100+i),teamId:id(10+i%2),equipmentConditionPercent:20}))
const high={weatherMultiplier:2.5,currentSpeedKmh:80,gradientPercent:-12,runtimeFatigue:100,resistance:0,raceIq:0,preparationSupportMultiplier:1.4,commandIntensityMultiplier:1.45,raceSituationMultiplier:6,equipmentConditionPercent:20,mechanicalIncidentRiskMultiplier:1.5}
const c=(kind,rr,displayCode='P')=>({entityId:kind==='group_crash'?displayCode+':'+rr.map(r=>r.riderId).sort().join(','):rr[0].riderId,displayCode,riders:rr,probabilityInput:p(kind,{...high,groupSize:kind==='group_crash'?rr.length:8}),causes:['descending','runtime_fatigue','high_speed','wet_road'],exposureEligibility:'explicit_synthetic_eligible'})
const e={provenance:'synthetic_review_fixture',raceId:id(1),stageId:id(2),runId:id(3),seed:'043P-0',raceSecond:300,priorIncidentCount:0,candidates:[c('group_crash',riders),c('individual_crash',[riders[0]]),c('technical_incident',[riders[1]]),c('exhaustion',[riders[2]])]}
const review=e=>reviewHistoricalCheckpoint({evidence:e,expectedEvidenceSha256:carryoverDigest(e)})
const roll=h=>Math.round((parseInt(h.slice(0,13),16)/0x10000000000000+Number.EPSILON)*1e12)/1e12
const found=new Set();let multiple=0,none=0
for(let i=0;i<2000;i++){
 const v={...e,seed:'043P-'+i},out=review(v)
 const expected=v.candidates.map(x=>{const k=x.probabilityInput.incidentKind,h=md5([v.seed,v.raceId,v.stageId,'phase10',k,v.priorIncidentCount,v.raceSecond,x.entityId].join('|'));return {kind:k,entityId:x.entityId,hash:h,roll:roll(h),probability:reviewHistoricalIncidentProbability(x.probabilityInput)}}).filter(x=>x.roll<x.probability.finalProbability).sort((a,b)=>a.roll/Math.max(a.probability.finalProbability,1e-12)-b.roll/Math.max(b.probability.finalProbability,1e-12)||a.kind.localeCompare(b.kind)||a.entityId.localeCompare(b.entityId))
 assert.equal(out.qualifiedCount,expected.length)
 if(expected.length===0){assert.equal(out.incident,null);none++;continue}
 if(expected.length>1)multiple++
 const a=out.incident,b=expected[0]
 assert.equal(a.kind,b.kind);assert.equal(a.hash,b.hash);assert.equal(a.roll,b.roll);assert.equal(a.incidentId,v.stageId+':phase10:1:'+b.hash.slice(0,12))
 found.add(a.kind)
 if(a.kind==='group_crash'){
  const n=2+Math.floor(roll(md5(a.hash+'|affected_count'))*5)
  const members=riders.slice().sort((a1,b1)=>md5(a.hash+'|member|'+a1.riderId).localeCompare(md5(a.hash+'|member|'+b1.riderId))||a1.riderId.localeCompare(b1.riderId)).slice(0,n).map(r=>r.riderId).sort()
  assert.deepEqual(a.affectedRiderIds,members)
 }else assert.equal(a.affectedRiderIds.length,1)
 assert.deepEqual(a.handoffs.map(x=>x.riderId),a.affectedRiderIds)
 for(const x of a.handoffs){assert.equal(x.incidentAuthorityVerified,false);assert.equal(x.healthCaseCreated,false);if(a.kind==='exhaustion')assert.equal(x.statusImpact,'dnf')}
}
assert.equal(found.size,4);assert.ok(multiple>0&&none>0)
pass('043P 2000 deterministic checkpoint draws, competing candidates, group members and historical handoff')
const changed={...e,seed:'tamper'}
assert.throws(()=>reviewHistoricalCheckpoint({evidence:changed,expectedEvidenceSha256:carryoverDigest(e)}),/frozen synthetic/)
assert.throws(()=>review({...e,candidates:[e.candidates[0],e.candidates[0]]}),/duplicate candidate/)
assert.throws(()=>review({...e,raceSecond:60}),/scope/)
assert.throws(()=>review({...e,priorIncidentCount:7}),/scope/)
assert.throws(()=>review({...e,candidates:[{...e.candidates[0],riders:riders.slice(0,5)}]}),/group entity/)
assert.throws(()=>review({...e,candidates:[{...e.candidates[0],exposureEligibility:'authoritative'}]}),/explicit candidate/)
assert.throws(()=>reviewHistoricalIncidentProbability({...p('technical_incident'),weatherMultiplier:NaN}),/numeric/)
for(const k of ['incidentAuthorityVerified','physicalCheckpointVerified','completeOccurrenceVerified','official','hostedWriteAllowed','accountingAllowed'])assert.equal(review(e)[k],false)
pass('043P checkpoint tamper, unsupported scope and fabricated authority denied')
assert.equal(checks,4);console.log('PASS 4/4 historical incident probability checks; no hosted connection')
