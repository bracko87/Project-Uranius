// Source-aligned scoring rehearsal only. Requires an exact job and explicitly
// synthetic complete point scheme/crossing receipt. No official score authority.
import assert from 'node:assert/strict'
import {reviewEngineResult} from './uranius-engine-result-review.mjs'
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const integer=x=>Number.isSafeInteger(x)&&x>=0&&x<=2147483647
const sprint=['INTERMEDIATE_SPRINT','BONUS_SPRINT','SPRINT']
const mountain=['KOM','MOUNTAIN','MOUNTAIN_SPRINT','CLIMB']
const nonScore=['START','TIME_CHECK','TIME_SPLIT','TIMING_GATE','TIMING_CHECK','TIME_CHECKPOINT']
export function projectStageScoring({job,receipt}){
 const review=reviewEngineResult(job),input=JSON.parse(job.inputText)
 assert.equal(receipt?.provenance,'synthetic_review_fixture')
 assert.equal(receipt.completePointDefinitions,true)
 assert.equal(receipt.stageId,review.source.stageId);assert.equal(receipt.inputSha256,review.source.inputSha256);assert.equal(receipt.outputSha256,review.source.outputSha256)
 assert.ok(['one_day','stage_race'].includes(receipt.raceFormat))
 assert.ok(review.resultRows.every(x=>x.status==='finished'),'Only complete finisher fields in this review')
 const finish=review.resultRows.map(x=>x.riderId),roster=new Map(review.resultRows.map(x=>[x.riderId,x]))
 const points=receipt.points
 assert.ok(Array.isArray(points)&&points.length>0&&new Set(points.map(x=>x.pointId)).size===points.length)
 assert.equal(points.filter(x=>x.type==='FINISH').length,1)
 assert.ok(Array.isArray(receipt.crossings)&&new Set(receipt.crossings.map(x=>x.pointId)).size===receipt.crossings.length)
 const crossingMap=new Map(receipt.crossings.map(x=>[x.pointId,x.riderIds]))
 const sums=new Map(finish.map(id=>[id,{finishPoints:0,sprintPoints:0,mountainPoints:0,bonusSeconds:0}]))
 const pointResults=[]
 for(const p of [...points].sort((a,b)=>a.km-b.km||(a.pointId<b.pointId?-1:1))){
  assert.ok(uuid(p.pointId)&&Number.isFinite(p.km)&&p.km>=0&&p.km<=input.distanceKm)
  assert.ok(['FINISH',...sprint,...mountain,...nonScore].includes(p.type),'Unknown point type')
  assert.ok(Array.isArray(p.pointsScheme)&&Array.isArray(p.timeBonusSeconds)&&[...p.pointsScheme,...p.timeBonusSeconds].every(integer))
  if(nonScore.includes(p.type)){
   assert.equal(p.pointsScheme.length,0);assert.equal(p.timeBonusSeconds.length,0)
   assert.ok(!crossingMap.has(p.pointId),'Non-scoring checkpoint must not have scoring receipt')
   if(p.type==='START')assert.equal(p.km,0)
   continue
  }
  let order
  if(p.type==='FINISH'){
   assert.equal(p.km,input.distanceKm);assert.ok(!crossingMap.has(p.pointId),'Finish order comes only from verified engine results');order=finish
  }else{
   assert.ok(p.km>0&&p.km<input.distanceKm)
   order=crossingMap.get(p.pointId);assert.ok(Array.isArray(order),'Explicit intermediate crossing order required')
   assert.deepEqual([...order].sort(),[...finish].sort(),'Crossing roster must be complete and unique')
   crossingMap.delete(p.pointId)
  }
  for(let i=0;i<order.length;i++){
   const riderId=order[i],r=roster.get(riderId),pointsAwarded=p.pointsScheme[i]??0
   const bonusSecondsAwarded=receipt.raceFormat==='one_day'?0:(p.timeBonusSeconds[i]??0)
   const v=sums.get(riderId),key=p.type==='FINISH'?'finishPoints':sprint.includes(p.type)?'sprintPoints':'mountainPoints'
   v[key]+=pointsAwarded;v.bonusSeconds+=bonusSecondsAwarded;assert.ok(integer(v[key])&&integer(v.bonusSeconds))
   if(pointsAwarded||bonusSecondsAwarded)pointResults.push({pointId:p.pointId,pointType:p.type,riderId,teamId:r.teamId,rank:i+1,pointsAwarded,bonusSecondsAwarded})
  }
 }
 assert.equal(crossingMap.size,0,'Unknown or extra crossing receipt')
 return {version:'038_stage_scoring_fixture_review_v1',source:review.source,pointResults,resultRows:review.resultRows.map(x=>({...x,...sums.get(x.riderId)})),coverage:{...review.coverage,syntheticPointScoring:true},official:false,writeAllowed:false,accountingAllowed:false,blockers:review.blockers}
}
