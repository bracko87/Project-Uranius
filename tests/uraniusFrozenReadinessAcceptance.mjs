// 043N offline native Node, actual engine stage plus frozen source checks.
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {build} from 'esbuild'
import {buildFrozenReadinessReview,bindLegacyReadiness,normalizeFrozenPreparation} from '../scripts/uranius-frozen-readiness-review.mjs'
import {carryoverDigest,buildStageCarryover} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewOfficialRaceNight} from '../scripts/uranius-original-fatigue-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],date='2000-01-03',distanceKm=30
const roster=Array.from({length:10},(_,n)=>({riderId:id(1000+n),teamId:teams[n<5?0:1],riderName:'Review rider '+n,teamName:n<5?'A':'B',role:n%5===0?'captain':'domestique',attributes:{flat:65+n,climbing:65,sprint:70+n,acceleration:72,stamina:80,resistance:80,recovery:75,teamwork:75,timeTrial:75,raceIq:75}}))
const schedule=[{stageId,stageNumber:1,date,weatherCancelled:false},{stageId:id(102),stageNumber:2,date:'2000-01-04',weatherCancelled:false}]
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const neutral=r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date,stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map((r,n)=>({...scope(r),fatigue_before_stage:20+n,fatigue:20+n,start_stamina:n%2===0?null:81+n/10,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(neutral),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
source.modifierRows[0].post_stage_fatigue_multiplier=.95
source.modifierRows[0].equipment_fatigue_reduction_pct=5
source.modifierRows[0].post_stage_recovery_bonus_points=2
const packet=s=>({source:s,expectedSourceSha256:carryoverDigest(s)})
const review=s=>buildFrozenReadinessReview(packet(s))
const baseInput={raceId,stageId,stageName:'043N readiness actual engine',stageFormat:'road_race',distanceKm,seed:'043N-readiness',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}
const bind=(s,input=baseInput)=>bindLegacyReadiness({...packet(s),input})
let checks=0;const pass=s=>{checks++;console.log('PASS '+s)}
const first=review(source);assert.equal(first.receipt.rows.length,10);assert.deepEqual(review(source),first)
assert.equal(first.receipt.rows[0].condition.startingEnergy,91);assert.equal(first.receipt.rows[1].condition.startingEnergy,81.1)
assert.equal(first.receipt.rows[0].staminaSource,'explicit_missing_fatigue_fallback')
const zero=structuredClone(source);zero.riderRows[0].start_stamina=0;assert.equal(review(zero).receipt.rows[0].condition.startingEnergy,0)
zero.riderRows[0].fatigue_before_stage=null;assert.equal(review(zero).receipt.rows[0].condition.fatigueBeforeStage,20)
zero.riderRows[0].fatigue=null;assert.throws(()=>review(zero),/fatigue/)
pass('043N explicit stamina, fatigue fallback and real zero preserved; absent fatigue refused')
const n=normalizeFrozenPreparation({...neutral(roster[0]),post_stage_fatigue_multiplier:.9,equipment_fatigue_reduction_pct:10,post_stage_recovery_bonus_points:8,health_incident_risk_multiplier:.5})
assert.equal(n.modifiers.postStageFatigueMultiplier,.81);assert.equal(n.modifiers.postStageRecoveryBonusPoints,4);assert.equal(n.modifiers.incidentRiskMultiplier,.7);assert.equal(n.modifiers.healthIncidentRiskMultiplier,.5)
assert.equal(normalizeFrozenPreparation({...neutral(roster[0]),preparation_applied:false}).modifiers,null)
const unsupported=structuredClone(source);unsupported.modifierRows[0].in_stage_energy_cost_multiplier=.85;assert.throws(()=>bind(unsupported),/unsupported legacy/)
unsupported.modifierRows[0].in_stage_energy_cost_multiplier=1;unsupported.modifierRows[0].post_stage_fatigue_multiplier=.6;assert.equal(review(unsupported).receipt.rows[0].preparation.modifiers.postStageFatigueMultiplier,.7);assert.throws(()=>bind(unsupported),/unsupported legacy/)
pass('043N original preparation clamp sequence; unsupported in-stage and workload effects refused')
for(const status of ['injured','sick','not_fully_fit']){
 const bad=structuredClone(source);bad.riderRows[0].availability_status=status
 assert.equal(review(bad).receipt.rows[0].startStatus,status==='not_fully_fit'?'starter':'dns');assert.throws(()=>bind(bad),/unsupported legacy/)
}
for(const [field,value] of [['selected',false],['selection_blocked',true]]){
 const bad=structuredClone(source);bad.participants[0][field]=value;assert.equal(review(bad).receipt.rows[0].startStatus,'dns');assert.throws(()=>bind(bad),/unsupported legacy/)
}
const bad=structuredClone(source);bad.riderRows[0].availability_status='unknown';assert.throws(()=>review(bad),/availability/)
pass('043N explicit availability and selection eligibility; legacy refuses DNS and unsupported non-fit starts')
const altered=structuredClone(source);altered.riderRows[0].start_stamina=99;assert.throws(()=>buildFrozenReadinessReview({source:altered,expectedSourceSha256:first.receipt.sourceSha256}),/digest mismatch/)
const duplicate=structuredClone(source);duplicate.modifierRows[1]=duplicate.modifierRows[0];assert.throws(()=>review(duplicate),/unique roster/)
const foreign=structuredClone(source);foreign.riderRows[0].team_id=teams[1];assert.throws(()=>review(foreign),/team coverage/)
const injected=structuredClone(baseInput);injected.riders[0].condition={};assert.throws(()=>bind(source,injected),/caller readiness/)
assert.equal(first.receipt.authoritativeSourceVerified,false);assert.equal(first.receipt.official,false)
pass('043N frozen digest, exact rider/team coverage and caller-provided condition rejection')
const dir=mkdtempSync(join(tmpdir(),'uranius-043n-'))
try{
 const root=fileURLToPath(new URL('../',import.meta.url)),entry=join(dir,'engine.mjs')
 await build({entryPoints:[join(root,'scripts/uranius-race-job-engine.ts')],outfile:entry,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 const bound=bind(source)
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))
 console.log('INFO 043N actual engine stage started')
 const child=spawnSync(process.execPath,[entry],{env,input:JSON.stringify(bound.input),encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024,windowsHide:true})
 if(child.error)throw child.error
 assert.equal(child.status,0,child.stderr)
 const output=JSON.parse(child.stdout)
 assert.equal(output.stageId,stageId);assert.equal(output.finalRiderStates.length,10)
 for(const row of output.finalRiderStates){
  const expected=bound.receipt.rows.find(r=>r.riderId===row.riderId)
  assert.deepEqual(row.startingCondition,expected.condition);assert.equal(row.stageStatus,'finished');assert.ok(row.energy<=expected.condition.startingEnergy)
 }
 pass('043N actual legacy engine uses exact frozen starting energy and condition for all ten riders')
 const workloads=output.finalRiderStates.map(row=>{
  const r=bound.receipt.rows.find(x=>x.riderId===row.riderId),p=bound.readiness.find(x=>x.riderId===row.riderId)
  return {provenance:P,completeWorkloadEvidence:true,riderId:r.riderId,teamId:r.teamId,status:'finished',eligibleToStart:true,effectiveFatigueBeforeStage:r.condition.fatigueBeforeStage,startEnergy:r.condition.startingEnergy,rawFinishEnergy:row.energy,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm,difficultyCategory:p.difficultyCategory,postStageFatigueMultiplier:p.postStageFatigueMultiplier,postStageRecoveryBonusPoints:p.postStageRecoveryBonusPoints,recoverySkill:r.recoverySkill,morale:r.condition.morale,preparationIncidentRiskMultiplier:p.preparationIncidentRiskMultiplier,incidents:[],breakawaySegments:[]}
 })
 const prior=buildStageCarryover({provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,schedule,distanceKm,previousReceipt:null,expectedPreviousDigest:null,workloads,recoveryReceipts:[],resources:teams.map((teamId,i)=>({resourceType:'equipment',resourceId:'bike-'+i,teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:90,lastUsedDate:null}))})
 const next=structuredClone(source);next.stageId=schedule[1].stageId;next.runId=id(202);next.stageNumber=2;next.date=schedule[1].date;next.prior=prior.receipt;next.expectedPriorSha256=prior.sha256
 for(const arr of [next.participants,next.riderRows,next.modifierRows])for(const r of arr)r.stage_id=next.stageId
 next.recoveryReceipts=prior.receipt.riders.map(r=>({provenance:P,raceId,stageId:next.stageId,previousStageId:stageId,date:next.date,riderId:r.riderId,previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:r.persistedFatigue,travelDelta:1,activityLoad:13,consecutiveHeavyDays:0,recovery:75,morale:50,activityBonus:0,doctorBonus:0,clubType:'main',residentialCampusActive:false}))
 for(const r of next.riderRows){r.fatigue_before_stage=reviewOfficialRaceNight(next.recoveryReceipts.find(x=>x.riderId===r.rider_id)).fatigue;r.fatigue=r.fatigue_before_stage;r.start_stamina=null}
 const second=bind(next,{...baseInput,stageId:next.stageId})
 for(const r of second.receipt.rows){assert.equal(r.condition.fatigueBeforeStage,reviewOfficialRaceNight(next.recoveryReceipts.find(x=>x.riderId===r.riderId)).fatigue);assert.equal(r.condition.startingEnergy,100-r.condition.fatigueBeforeStage*.45)}
 const stale=structuredClone(next);stale.riderRows[0].fatigue_before_stage+=1;assert.throws(()=>review(stale),/incorrect carried fatigue/)
 const missing=structuredClone(next);missing.recoveryReceipts.pop();assert.throws(()=>review(missing),/recovery coverage/)
 const retired=structuredClone(next);retired.prior.riders[0].status='dnf';retired.expectedPriorSha256=carryoverDigest(retired.prior)
 assert.equal(review(retired).receipt.rows[0].startStatus,'dns');assert.throws(()=>bind(retired,{...baseInput,stageId:next.stageId}),/unsupported legacy/)
 const same=structuredClone(next);same.date=date;same.recoveryReceipts=[];for(const r of same.riderRows)r.fatigue_before_stage=same.prior.riders.find(x=>x.riderId===r.rider_id).persistedFatigue
 assert.equal(review(same).receipt.rows[0].condition.fatigueBeforeStage,same.prior.riders[0].persistedFatigue)
 pass('043N prior actual-engine fatigue carried into next-stage readiness, same-day and overnight rules, stale/DNF refusal')
 assert.equal(checks,6);console.log('PASS 6/6 frozen readiness checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundle cleaned up')}
