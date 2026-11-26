// 036 read-only adapter: completed private job -> incomplete sporting result review.
// No promotion to official state, no synthetic defaults for absent accounting inputs.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {validateNovelOutput} from './uranius-calendar-job-worker.mjs'
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const bounded=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100
const pair=x=>x.riderId+':'+x.teamId
export function reviewEngineResult(job){
 assert.ok(job&&uuid(job.jobId)&&uuid(job.stageId)&&job.status==='completed'&&Number.isInteger(job.attempt)&&job.attempt>0)
 assert.ok(typeof job.inputText==='string'&&typeof job.outputText==='string')
 assert.equal(sha(job.inputText),job.inputSha256,'Input digest mismatch')
 assert.equal(sha(job.outputText),job.outputSha256,'Output digest mismatch')
 const input=JSON.parse(job.inputText),output=validateNovelOutput(input,job.outputText)
 assert.equal(input.stageId,job.stageId);assert.ok(uuid(input.raceId))
 assert.equal(input.stageFormat,'road_race')
 assert.ok(Number.isFinite(input.distanceKm)&&input.distanceKm>0)
 assert.ok(input.riders.length>0&&input.riders.every(x=>uuid(x.riderId)&&uuid(x.teamId)))
 assert.equal(new Set(input.riders.map(x=>x.riderId)).size,input.riders.length)
 const states=output.finalRiderStates
 assert.equal(new Set(states.map(x=>x.riderId)).size,states.length)
 const finish=states.filter(x=>x.stageStatus==='finished').sort((a,b)=>a.finishPosition-b.finishPosition)
 assert.ok(finish.length>0,'No classified finisher')
 assert.deepEqual(finish.map(x=>x.finishPosition),Array.from({length:finish.length},(_,i)=>i+1))
 const winner=finish[0].finishTimeSeconds
 const byPair=new Map(input.riders.map(x=>[pair(x),x]))
 for(const [i,x] of finish.entries()){
  assert.ok(x.finished===true&&Number.isSafeInteger(x.finishTimeSeconds)&&x.finishTimeSeconds>0,'Unsupported subsecond or invalid finish time')
  assert.ok(Math.abs(x.distanceKm-input.distanceKm)<1e-6,'Incomplete finisher distance')
  if(i>0)assert.ok(x.finishTimeSeconds>=finish[i-1].finishTimeSeconds,'Nonmonotonic finishing times')
 }
 const rows=states.map(x=>{
  const rider=byPair.get(pair(x));assert.ok(rider)
  assert.ok(['finished','dnf','dns'].includes(x.stageStatus),'Unsupported terminal status')
  assert.ok(bounded(x.energy)&&Number.isFinite(x.distanceKm)&&x.distanceKm>=0&&x.distanceKm<=input.distanceKm+1e-6)
  if(x.stageStatus!=='finished')assert.ok(x.finished===false&&x.finishPosition===null&&x.finishTimeSeconds===null,'Withdrawn rider classified')
  if(rider.condition!==undefined)assert.deepEqual(x.startingCondition,rider.condition,'Starting condition mismatch')
  else assert.equal(x.startingCondition,undefined,'Unexpected starting condition')
  assert.equal(x.riderName,rider.riderName);assert.equal(x.teamName,rider.teamName)
  return {raceId:input.raceId,stageId:input.stageId,riderId:x.riderId,teamId:x.teamId,riderName:x.riderName,teamName:x.teamName,
   status:x.stageStatus,rank:x.finishPosition,elapsedSeconds:x.finishTimeSeconds,
   gapSeconds:x.stageStatus==='finished'?x.finishTimeSeconds-winner:null,
   bonusSeconds:null,penaltySeconds:null,finishPoints:null,sprintPoints:null,mountainPoints:null,
   fatigueAfterStage:null,youngEligible:null,remainingEnergy:x.energy,
   startingCondition:rider.condition??null}
 }).sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||(a.riderId<b.riderId?-1:a.riderId>b.riderId?1:0))
 return {version:'036_engine_result_review_v1',official:false,writeAllowed:false,accountingAllowed:false,
  source:{jobId:job.jobId,raceId:input.raceId,stageId:input.stageId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,engineVersion:output.engineVersion},
  resultRows:rows,coverage:{identity:true,terminalStatus:true,rank:true,elapsedSeconds:true,gapSeconds:true,energy:true,
   synchronizedResults:false,points:false,penalties:false,fatigue:false,youth:false,policy:false,authority:false,lifecycle:false,equipment:false,supplies:false,health:false},
  blockers:['private_job_not_official_authority','missing_synchronized_bonus_penalty_and_points','missing_authoritative_post_stage_fatigue','missing_youth_eligibility','missing_exact_category_award_policy','missing_publication_and_recovery_receipts','missing_supply_wear_health_effects']}
}
