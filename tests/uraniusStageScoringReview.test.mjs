import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {projectStageScoring as score} from '../scripts/uranius-stage-scoring-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const hash=x=>createHash('sha256').update(x,'utf8').digest('hex')
function fixture(){
 const riders=[{riderId:id(1),teamId:id(11),riderName:'A',teamName:'Club A'},{riderId:id(2),teamId:id(12),riderName:'B',teamName:'Club B'}]
 const input={stageId:id(101),raceId:id(100),seed:'fixture',stageFormat:'road_race',distanceKm:120,riders}
 const output={stageId:input.stageId,raceId:input.raceId,seed:input.seed,engineVersion:'race_engine_ts_v1',simulationMode:'deterministic_road_race_v1',snapshots:[{},{}],events:[],finalRiderStates:riders.map((x,i)=>({...x,stageStatus:'finished',finished:true,finishPosition:i+1,finishTimeSeconds:10000+i*5,distanceKm:120,energy:55-i}))}
 const inputText=JSON.stringify(input),outputText=JSON.stringify(output)
 const job={jobId:id(201),stageId:input.stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:hash(inputText),outputSha256:hash(outputText)}
 const receipt={provenance:'synthetic_review_fixture',completePointDefinitions:true,stageId:job.stageId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,raceFormat:'stage_race',points:[{pointId:id(301),type:'FINISH',km:120,pointsScheme:[25,20,16,14,12,10,8,6,4,2],timeBonusSeconds:[10,6,4]},{pointId:id(302),type:'INTERMEDIATE_SPRINT',km:40,pointsScheme:[20,17],timeBonusSeconds:[3,2]},{pointId:id(303),type:'KOM',km:80,pointsScheme:[5,3],timeBonusSeconds:[]},{pointId:id(304),type:'TIME_CHECK',km:90,pointsScheme:[],timeBonusSeconds:[]}],crossings:[{pointId:id(302),riderIds:[id(2),id(1)]},{pointId:id(303),riderIds:[id(1),id(2)]}]}
 return {job,receipt}
}
test('finish rank, explicit sprint and KOM order, bonus sums and raw time preserved',()=>{
 const x=score(fixture());assert.deepEqual(x.resultRows.map(r=>[r.rank,r.elapsedSeconds,r.finishPoints,r.sprintPoints,r.mountainPoints,r.bonusSeconds]),[[1,10000,25,17,5,12],[2,10005,20,20,3,9]])
 assert.equal(x.pointResults.length,6);assert.ok(x.pointResults.every(r=>r.pointType!=='TIME_CHECK'))
 assert.ok(x.resultRows.every(r=>r.penaltySeconds===null&&r.fatigueAfterStage===null&&r.youngEligible===null))
 assert.equal(x.official,false);assert.equal(x.accountingAllowed,false);assert.equal(x.coverage.synchronizedResults,false)
})
test('one-day results receive zero time bonuses',()=>{const f=fixture();f.receipt.raceFormat='one_day';const x=score(f);assert.ok(x.resultRows.every(r=>r.bonusSeconds===0));assert.ok(x.pointResults.every(r=>r.bonusSecondsAwarded===0))})
test('unknown, missing, duplicate or incomplete intermediate crossing refused',()=>{
 for(const change of [r=>r.crossings.pop(),r=>r.crossings[0].riderIds=[id(1),id(1)],r=>r.crossings.push({...r.crossings[0]}),r=>r.crossings.push({pointId:id(399),riderIds:[id(1),id(2)]})]){const f=fixture();change(f.receipt);assert.throws(()=>score(f))}
})
test('checkpoint scoring and caller-supplied finish order refused',()=>{
 for(const change of [r=>r.points[3].pointsScheme=[5],r=>r.crossings.push({pointId:id(304),riderIds:[id(1),id(2)]}),r=>r.crossings.push({pointId:id(301),riderIds:[id(2),id(1)]})]){const f=fixture();change(f.receipt);assert.throws(()=>score(f))}
})
test('missing definition coverage, source mismatch and non-synthetic receipt refused',()=>{
 for(const change of [r=>r.completePointDefinitions=false,r=>r.outputSha256='0'.repeat(64),r=>r.stageId=id(999),r=>r.provenance='official',r=>r.points.shift()]){const f=fixture();change(f.receipt);assert.throws(()=>score(f))}
})
