import test from 'node:test'
import assert from 'node:assert/strict'
import {buildStageCarryover,carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const P='synthetic_review_fixture',raceId=id(1),teamId=id(2)
const schedule=[{stageId:id(11),stageNumber:1,date:'2026-03-01',weatherCancelled:false},{stageId:id(12),stageNumber:2,date:'2026-03-02',weatherCancelled:false}]
const workload=(riderId,fatigue,status='finished')=>({provenance:P,completeWorkloadEvidence:true,riderId,teamId,status,eligibleToStart:true,effectiveFatigueBeforeStage:fatigue,startEnergy:100,rawFinishEnergy:60,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm:100,difficultyCategory:2,postStageFatigueMultiplier:1,postStageRecoveryBonusPoints:0,recoverySkill:50,morale:50,preparationIncidentRiskMultiplier:1,incidents:[],breakawaySegments:[]})
const resources=()=>[
 {resourceType:'supply',resourceId:'gel',teamId,quantity:10,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null,selectedQuantity:3},
 {resourceType:'equipment',resourceId:'bike',teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:90,lastUsedDate:null},
 {resourceType:'supply',resourceId:'jersey',teamId,quantity:null,stageUsesRemaining:5,maxStageUses:10,condition:null,lastUsedDate:null,selectedStageUses:1}
]
function first(s=schedule,ws=[workload(id(21),20),workload(id(22),30)]){
 return {provenance:P,completeSyntheticEvidence:true,raceId,stageId:s[0].stageId,runId:id(31),schedule:structuredClone(s),distanceKm:100,previousReceipt:null,expectedPreviousDigest:null,recoveryReceipts:[],workloads:ws,resources:resources()}
}
function second(a){
 const {receipt,sha256}=buildStageCarryover(a)
 const date=a.schedule[1].date,overnight=date!==receipt.date
 const riders=receipt.riders.filter(r=>r.status==='finished')
 return {provenance:P,completeSyntheticEvidence:true,raceId,stageId:a.schedule[1].stageId,runId:id(32),schedule:structuredClone(a.schedule),distanceKm:100,previousReceipt:receipt,expectedPreviousDigest:sha256,
 recoveryReceipts:overnight?riders.map(r=>({provenance:P,raceId,stageId:a.schedule[1].stageId,previousStageId:a.stageId,date,riderId:r.riderId,previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:r.persistedFatigue,travelDelta:1,activityLoad:13,consecutiveHeavyDays:0,recovery:50,morale:50,activityBonus:0,doctorBonus:0,clubType:'main',residentialCampusActive:false})):[],
 workloads:riders.map(r=>workload(r.riderId,r.persistedFatigue-(overnight?7:0))),
 resources:receipt.resources.map(r=>({...r.after,...(r.after.resourceId==='gel'?{selectedQuantity:3}:r.after.resourceId==='jersey'?{selectedStageUses:overnight?1:0}:{})}))}
}
test('stage 1 exact original fatigue and Phase9 resource receipt',()=>{
 const a=first(),{receipt:r,sha256}=buildStageCarryover(a)
 assert.equal(r.riders[0].effect.fatigueAfterStage,30.3)
 assert.equal(r.riders[0].persistedFatigue,30)
 assert.equal(r.resources.find(x=>x.after.resourceId==='bike').after.condition,89.65)
 assert.equal(r.resources.find(x=>x.after.resourceId==='gel').after.quantity,7)
 assert.equal(r.resources.find(x=>x.after.resourceId==='jersey').after.stageUsesRemaining,4)
 assert.equal(r.official,false);assert.equal(r.accountingAllowed,false);assert.equal(sha256,carryoverDigest(r))
 assert.deepEqual(buildStageCarryover(a),buildStageCarryover({...a,resources:[...a.resources].reverse(),workloads:[...a.workloads].reverse()}))
})
test('stage 2 exact overnight, continued wear, stock and durable uses, prior unchanged',()=>{
 const b=second(first()),before=structuredClone(b.previousReceipt),{receipt:r}=buildStageCarryover(b)
 assert.equal(r.riders[0].night.recovery,8)
 assert.equal(r.riders[0].seedFatigue,23)
 assert.equal(r.riders[0].persistedFatigue,33)
 assert.equal(r.resources.find(x=>x.after.resourceId==='bike').after.condition,89.3)
 assert.equal(r.resources.find(x=>x.after.resourceId==='gel').after.quantity,4)
 assert.equal(r.resources.find(x=>x.after.resourceId==='jersey').after.stageUsesRemaining,3)
 assert.equal(r.priorDigest,b.expectedPreviousDigest);assert.deepEqual(b.previousReceipt,before)
 assert.deepEqual(buildStageCarryover(b),buildStageCarryover(b))
})
test('stale or mutated receipt, stage or run identity refused',()=>{
 let b=second(first());b.previousReceipt.riders[0].persistedFatigue++
 assert.throws(()=>buildStageCarryover(b),/digest mismatch/)
 b=second(first());b.runId=b.previousReceipt.runId;assert.throws(()=>buildStageCarryover(b),/repeated/)
 b=second(first());b.schedule[1].date='2026-03-03';assert.throws(()=>buildStageCarryover(b),/prior scope/)
 b=second(first());b.expectedPreviousDigest=null;assert.throws(()=>buildStageCarryover(b),/digest mismatch/)
})
test('stale stock, swapped owner, missing resource and duplicate resource refused',()=>{
 for(const change of [b=>{b.resources.find(x=>x.resourceId==='gel').quantity++},b=>{b.resources[0].teamId=id(99)},b=>{b.resources.pop()},b=>{b.resources.push(b.resources[0])}]){
  const b=second(first());change(b);assert.throws(()=>buildStageCarryover(b),/resource|duplicate/)
 }
})
test('same day has no recovery and durable reuse refused',()=>{
 const s=structuredClone(schedule);s[1].date=s[0].date
 const b=second(first(s));assert.equal(buildStageCarryover(b).receipt.riders[0].seedFatigue,30)
 b.resources.find(x=>x.resourceId==='jersey').selectedStageUses=1
 assert.throws(()=>buildStageCarryover(b),/same-day durable reuse/)
})
test('missing, duplicated or altered recovery and fatigue evidence refused',()=>{
 let b=second(first());b.recoveryReceipts.pop();assert.throws(()=>buildStageCarryover(b),/coverage/)
 b=second(first());b.recoveryReceipts[1]=b.recoveryReceipts[0];assert.throws(()=>buildStageCarryover(b),/duplicate/)
 b=second(first());b.workloads[0].effectiveFatigueBeforeStage++;assert.throws(()=>buildStageCarryover(b),/carried fatigue/)
 b=second(first());b.recoveryReceipts[0].stageId=id(99);assert.throws(()=>buildStageCarryover(b),/receipt mismatch/)
})
test('withdrawn riders cannot restart and multi-day gap fails closed',()=>{
 const a=first(schedule,[workload(id(21),20),workload(id(22),30,'dnf')]),b=second(a)
 assert.equal(buildStageCarryover(b).receipt.riders.length,1)
 b.workloads.push(workload(id(22),30));assert.throws(()=>buildStageCarryover(b),/roster/)
 const s=structuredClone(schedule);s[1].date='2026-03-04'
 assert.throws(()=>buildStageCarryover(second(first(s))),/multi-day/)
})
