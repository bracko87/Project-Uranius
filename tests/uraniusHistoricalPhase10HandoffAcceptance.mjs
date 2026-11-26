import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {reviewHistoricalPhase10Handoff} from '../scripts/uranius-historical-phase10-handoff-review.mjs'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const md5=x=>createHash('md5').update(x,'utf8').digest('hex')
const evidence=(kind,severity,n,condition=100)=>({provenance:'synthetic_review_fixture',raceId:id(1001),stageId:id(1002),runId:id(1003),riderId:id(n+1),teamId:id(1004),stageFormat:'road_race',incidentKind:kind,incidentSeverity:severity,deterministicHash:md5('043O:'+kind+':'+severity+':'+n),equipmentConditionPercent:condition})
const review=e=>reviewHistoricalPhase10Handoff({evidence:e,expectedEvidenceSha256:carryoverDigest(e)})
const expected={'individual_crash:minor':[11,0],'individual_crash:moderate':[29,0],'individual_crash:serious':[69,48],'group_crash:minor':[16,0],'group_crash:moderate':[34,1],'group_crash:serious':[69,17],'technical_incident:minor':[0,0],'technical_incident:moderate':[0,0],'technical_incident:serious':[0,0],'exhaustion:minor':[0,0],'exhaustion:moderate':[0,0],'exhaustion:serious':[0,0]}
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const outputs=[],rows=[]
for(const kind of ['individual_crash','group_crash','technical_incident','exhaustion'])for(const severity of ['minor','moderate','serious']){
 let injury=0,major=0
 for(let n=0;n<100;n++){
  const e=evidence(kind,severity,n),out=review(e),h=out.healthOutcome
  outputs.push(h);rows.push(out);injury+=Number(h.injuryOccurred);major+=Number(h.severity==='major')
  assert.deepEqual(review(e),out)
 }
 assert.deepEqual([injury,major],expected[kind+':'+severity])
}
assert.equal(outputs.length,1200)
assert.equal(md5(JSON.stringify(outputs)),'92fdbeb450677d20466ab6b2f78dd268')
pass('043O 1200 exact historical health outcomes match original source-derived reference digest and counts')
const injuries=outputs.filter(h=>h.injuryOccurred),cases=new Set(injuries.map(h=>h.caseCode))
assert.deepEqual([...cases].sort(),['ankle_sprain','concussion','fracture','muscle_strain','road_rash','wrist_sprain'])
for(const h of injuries){
 assert.equal(h.selectionBlockedAfterStage,h.severity==='major')
 assert.equal(h.currentStageContinuation,h.severity==='major'?'dnf':'continues_injured')
 assert.equal(h.currentStagePerformancePenaltyPoints,{minor:2.5,moderate:8,major:100}[h.severity])
 assert.equal(h.additionalEnergyLossPoints,{minor:.75,moderate:2.5,major:0}[h.severity])
 assert.equal(h.persistentAction,'create_health_case_after_finalization');assert.ok(h.bodyPart)
}
pass('043O historical injury severity, subtype, body part, energy and continuation preserved')
for(const kind of ['technical_incident','exhaustion'])for(const severity of ['minor','moderate','serious'])for(let n=0;n<100;n++){
 const x=review(evidence(kind,severity,n))
 assert.equal(x.healthOutcome.injuryOccurred,false);assert.equal(x.healthOutcome.persistentAction,'none')
 assert.equal(x.statusImpact,kind==='exhaustion'?'dnf':'finished')
}
let breakdowns=0
for(let n=0;n<100;n++){
 const x=review(evidence('technical_incident','serious',n,24.99))
 const y=review(evidence('technical_incident','serious',n,25))
 const z=review(evidence('technical_incident','moderate',n,0))
 assert.equal(x.healthOutcome.injuryOccurred,false);assert.equal(x.healthDnf,false);assert.equal(x.statusImpact,x.mechanicalDnf?'dnf':'finished')
 assert.equal(y.mechanicalDnf,false);assert.equal(z.mechanicalDnf,false)
 breakdowns+=Number(x.mechanicalDnf)
}
assert.ok(breakdowns>0&&breakdowns<100)
pass('043O medical and nonmedical withdrawal distinct; exhaustion and worn-equipment technical DNF boundary')
const e=evidence('individual_crash','serious',1),out=review(e)
assert.equal(out.evidenceSha256,carryoverDigest(e))
for(const k of ['incidentGenerated','incidentAuthorityVerified','disabledCandidateMappingApplied','healthCaseCreated','runtimeAllowed','official','hostedWriteAllowed','accountingAllowed'])assert.equal(out[k],false)
assert.throws(()=>reviewHistoricalPhase10Handoff({evidence:{...e,equipmentConditionPercent:0},expectedEvidenceSha256:out.evidenceSha256}),/frozen synthetic/)
for(const extra of [{healthOutcome:{}},{approved:true},{candidateProbability:1},{bodyPart:'head'}])assert.throws(()=>review({...e,...extra}),/unexpected incident evidence/)
assert.throws(()=>review({...e,incidentSeverity:'major'}),/unsupported/)
assert.throws(()=>review({...e,stageFormat:'team_time_trial'}),/unsupported/)
assert.throws(()=>review({...e,deterministicHash:'invalid'}),/identity or hash/)
assert.throws(()=>review({...e,equipmentConditionPercent:101}),/condition required/)
pass('043O synthetic provenance, digest, identity and authority tamper guards; disabled candidate contract not applied')
assert.equal(checks,4);console.log('PASS 4/4 historical Phase10 handoff checks; no hosted connection')
