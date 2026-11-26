import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {reviewEngineResult as review} from '../scripts/uranius-engine-result-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const hash=x=>createHash('sha256').update(x,'utf8').digest('hex')
function fixture(){
 const condition={startingEnergy:88,fatigueBeforeStage:12,morale:75,availabilityStatus:'available'}
 const riders=[{riderId:id(1),teamId:id(11),riderName:'A',teamName:'Club A',condition},{riderId:id(2),teamId:id(12),riderName:'B',teamName:'Club B'}]
 const input={stageId:id(101),raceId:id(100),seed:'fixture',stageFormat:'road_race',distanceKm:120,riders}
 const output={stageId:input.stageId,raceId:input.raceId,seed:input.seed,engineVersion:'race_engine_ts_v1',simulationMode:'deterministic_road_race_v1',snapshots:[{},{}],events:[],finalRiderStates:riders.map((x,i)=>({riderId:x.riderId,teamId:x.teamId,riderName:x.riderName,teamName:x.teamName,...(x.condition?{startingCondition:x.condition}:{}),stageStatus:'finished',finished:true,finishPosition:i+1,finishTimeSeconds:10000+i*5,distanceKm:120,energy:55-i}))}
 return {input,output}
}
function packet(f=fixture()){
 const inputText=JSON.stringify(f.input),outputText=JSON.stringify(f.output)
 return {jobId:id(201),stageId:f.input.stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:hash(inputText),outputSha256:hash(outputText)}
}
test('exact source, rank/time/gap, energy and condition mapped; absent policy never defaulted',()=>{
 const p=packet(),x=review(p)
 assert.equal(x.source.outputSha256,p.outputSha256)
 assert.deepEqual(x.resultRows.map(r=>[r.rank,r.elapsedSeconds,r.gapSeconds,r.remainingEnergy]),[[1,10000,0,55],[2,10005,5,54]])
 assert.equal(x.resultRows[0].startingCondition.startingEnergy,88)
 for(const row of x.resultRows)for(const k of ['bonusSeconds','penaltySeconds','finishPoints','sprintPoints','mountainPoints','fatigueAfterStage','youngEligible'])assert.equal(row[k],null)
 assert.equal(x.official,false);assert.equal(x.writeAllowed,false);assert.equal(x.accountingAllowed,false)
 assert.equal(x.coverage.synchronizedResults,false)
})
test('tampered input/output or queued job rejected',()=>{
 for(const p of [{...packet(),inputText:packet().inputText+' '},{...packet(),outputText:packet().outputText+' '},{...packet(),status:'queued'}])assert.throws(()=>review(p))
})
test('roster/seed/stage mismatches and duplicate riders refused',()=>{
 for(const mutate of [f=>f.output.seed='bad',f=>f.output.stageId=id(102),f=>f.output.finalRiderStates[0].teamId=id(99),f=>{f.input.riders[1]={...f.input.riders[0]};f.output.finalRiderStates[1]={...f.output.finalRiderStates[0]}}]){
  const f=fixture();mutate(f);assert.throws(()=>review(packet(f)))
 }
})
test('subsecond, nonmonotonic, duplicate rank or incomplete finish refused',()=>{
 for(const mutate of [x=>x[1].finishTimeSeconds=10004.5,x=>x[1].finishTimeSeconds=9999,x=>x[1].finishPosition=1,x=>x[1].distanceKm=119]){
  const f=fixture();mutate(f.output.finalRiderStates);assert.throws(()=>review(packet(f)))
 }
})
test('withdrawal preserved without a time/rank; invalid classified withdrawal refused',()=>{
 const f=fixture(),s=f.output.finalRiderStates[1];Object.assign(s,{stageStatus:'dnf',finished:false,finishPosition:null,finishTimeSeconds:null,distanceKm:90})
 const row=review(packet(f)).resultRows[1];assert.equal(row.status,'dnf');assert.equal(row.rank,null);assert.equal(row.gapSeconds,null)
 s.finishPosition=2;assert.throws(()=>review(packet(f)))
})
test('condition mismatch, invalid energy and unsupported state rejected',()=>{
 for(const mutate of [x=>x[0].startingCondition={...x[0].startingCondition,startingEnergy:100},x=>x[0].energy=101,x=>x[0].stageStatus='racing']){
  const f=fixture();mutate(f.output.finalRiderStates);assert.throws(()=>review(packet(f)))
 }
})
