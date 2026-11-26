// Run offline with an exact private Operation 037 snapshot path. Never commit the snapshot.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {loadOriginalPolicy,planWithOriginalPolicy,POLICY_SHA256} from '../scripts/uranius-original-policy-review.mjs'
assert.equal(process.argv.length,3,'Supply private policy JSON path only')
const policyText=readFileSync(process.argv[2],'utf8')
const policy=loadOriginalPolicy(policyText)
let checks=0
const pass=x=>{checks++;console.log('PASS '+x)}
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
function fixture(c,stageNumber,prizeFundCash=c.minCash){
 const count=c.format==='stage_race'?2:1
 const scheduledStages=Array.from({length:count},(_,i)=>({stageId:id(101+i),stageNumber:i+1,weatherCancelled:false}))
 const clubs=Array.from({length:c.minTeams},(_,i)=>({clubId:id(1000+i),type:'main',parentClubId:null}))
 const results=scheduledStages.slice(0,stageNumber).flatMap(s=>Array.from({length:c.minTeams*c.minRiders},(_,i)=>({stageId:s.stageId,riderId:id(10000+i),teamId:clubs[Math.floor(i/c.minRiders)].clubId,status:'finished',rank:i+1,elapsedSeconds:10000+i,bonusSeconds:0,penaltySeconds:0,finishPoints:1000-i,sprintPoints:0,mountainPoints:1000-i,fatigueAfterStage:30})))
 return {provenance:'synthetic_review_fixture',raceId:id(100),stageId:scheduledStages[stageNumber-1].stageId,runId:id(200+stageNumber),format:c.format,scheduledStages,clubs,results,youngRiderIds:results.filter(x=>x.stageId===scheduledStages[0].stageId).map(x=>x.riderId),prizeFundCash,worldChampionship:false,coverage:{synchronizedResults:true,youth:true},lifecycle:{state:'replay_live',hiddenOutputValidated:true,priorStagesAuthoritative:true,dailyRecoveryVerified:true,stageStartGameAt:'2000-01-04T12:00:00Z',gameNow:'2000-01-04T12:30:00Z',realNow:'2000-01-04T12:10:00Z',replayClosesAtReal:'2000-01-04T12:10:00Z'}}
}
assert.equal(policy.sha256,POLICY_SHA256);assert.equal(policy.categories.length,10);assert.equal(policy.taxRateBps,1500)
assert.equal(policy.categories.reduce((n,c)=>n+c.buckets.length,0),40);assert.equal(policy.categories.reduce((n,c)=>n+c.rankingRules.length,0),281)
pass('038 exact snapshot, all category and award schedules, tax policy')
for(const c of policy.categories){
 const n=c.format==='stage_race'?2:1, f=fixture(c,n)
 const x=planWithOriginalPolicy({policyText,category:c.code,fixture:f})
 assert.equal(x.official,false);assert.equal(x.hostedWriteAllowed,false);assert.equal(x.accountingAllowed,false)
 assert.equal(x.plan.ranking.length,c.rankingRules.length)
 assert.ok(Math.abs(x.unallocatedOrRoundingCash)<=x.plan.cash.length/2)
 assert.equal(x.allGenerated.grossCash,x.allGenerated.netCash+x.allGenerated.taxCash)
 for(const a of x.settlements)assert.equal(a.taxCash,Math.round(a.grossCash*0.15))
 const winner=x.plan.cash.find(a=>a.rank===1&&a.bucket===(n===2?'final_gc':'oneday_finish'))
 assert.equal(winner.grossCash,Math.round(f.prizeFundCash*(n===2?.45:.9)*.3))
 if(n===2){
  const first=planWithOriginalPolicy({policyText,category:c.code,fixture:fixture(c,1)})
  assert.equal(first.plan.final,false);assert.equal(first.unallocatedOrRoundingCash,null)
  assert.deepEqual(x.settlements.filter(a=>a.stageId===first.plan.stageId),first.settlements)
  assert.equal(x.allGenerated.grossCash,first.currentStageOnly.grossCash+x.currentStageOnly.grossCash)
 }
 pass('038 '+c.code+' full synthetic field, original prize/ranking scale and withholding')
}
const c=policy.categories.find(x=>x.code==='2.2'),f=fixture(c,2,100000)
const x=planWithOriginalPolicy({policyText,category:c.code,fixture:f})
assert.equal(x.plan.cash.find(a=>a.bucket==='final_gc'&&a.rank===1).grossCash,13500)
assert.equal(x.plan.cash.find(a=>a.bucket==='stage_finish'&&a.rank===1).grossCash,3750)
assert.equal(x.plan.ranking.find(a=>a.source==='final_gc'&&a.rank===1).riderPoints,40)
assert.equal(x.plan.ranking.find(a=>a.source==='leader_day').riderPoints,1)
assert.equal(x.plan.ranking.find(a=>a.source==='stage_finish'&&a.rank===1).riderPoints,7)
pass('038 explicit class 2.2 synthetic 100000 fund and known winner amounts')
const call=(fixture,category=c.code,source=policyText)=>planWithOriginalPolicy({policyText:source,category,fixture})
for(const bad of [{...f,buckets:[]},{...f,rankingRules:[]},{...f,fixtureTaxRateBps:0},{...f,prizeFundCash:c.maxCash+1},{...f,provenance:'private_completed_job'},{...f,worldChampionship:true},{...f,results:f.results.map(r=>({...r,fatigueAfterStage:null}))},{...f,results:f.results.map(r=>({...r,bonusSeconds:null}))},{...f,coverage:{...f.coverage,youth:false}}])assert.throws(()=>call(bad))
assert.throws(()=>call(f,'unknown'));assert.throws(()=>call(f,c.code,policyText+' '));assert.throws(()=>call(f,'1.2'))
pass('038 tampered snapshot, overrides, wrong category and missing official inputs fail closed')
assert.equal(checks,13);console.log('PASS 13/13 offline policy integration checks')
