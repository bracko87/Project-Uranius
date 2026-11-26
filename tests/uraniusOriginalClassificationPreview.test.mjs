import test from 'node:test'
import assert from 'node:assert/strict'
import {projectOriginalClassifications as project} from '../scripts/uranius-original-classification-preview.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const raceId=id(100)
function fixture(){
 const stages=[{raceId,stageId:id(101),stageNumber:1,weatherCancelled:false},{raceId,stageId:id(102),stageNumber:2,weatherCancelled:false}]
 const results=stages.flatMap(s=>Array.from({length:6},(_,i)=>({raceId,stageId:s.stageId,riderId:id(i+1),teamId:id(i<3?20:21),riderName:'R'+(i+1),teamName:i<3?'A':'B',status:'finished',elapsedSeconds:100,penaltySeconds:0,rank:s.stageNumber===1?i+1:6-i})))
 return {raceId,stages,results,pointRows:[],youngRiderIds:[],coverage:{points:'complete',penalties:'complete',young:'complete'}}
}
const bonus={raceId,stageId:id(101),pointId:id(201),riderId:id(6),pointsAwarded:10,bonusSecondsAwarded:5,pointType:'FINISH'}
test('source GC tie uses rank sum then UUID, and three riders per team per stage',()=>{
 const x=project(fixture());assert.equal(x.general[0].riderId,id(1))
 assert.ok(x.general.every(y=>y.totalTimeSeconds===200));assert.ok(x.team.every(y=>y.totalTimeSeconds===600))
 assert.equal(x.official,false);assert.equal(x.writeAllowed,false);assert.equal(x.accountingAllowed,false)
})
test('bonuses and penalties affect general/team; sprint, mountain and youth are distinct',()=>{
 const f=fixture();f.results=f.results.map(v=>v.riderId===id(6)&&v.stageId===id(102)?{...v,penaltySeconds:2}:v)
 f.pointRows=[bonus,{...bonus,pointId:id(202),pointType:'KOM',pointsAwarded:7,bonusSecondsAwarded:0}]
 f.youngRiderIds=[id(6),id(1)];const y=project(f)
 assert.equal(y.general[0].riderId,id(6));assert.equal(y.general[0].totalTimeSeconds,197)
 assert.equal(y.points[0].points,10);assert.equal(y.mountain[0].points,7);assert.equal(y.young[0].riderId,id(6))
 assert.equal(y.team[0].totalTimeSeconds,597)
})
test('withdrawal excludes rider from GC and team with fewer than three finishers; missing data blocks official effects',()=>{
 const f=fixture();f.results=f.results.map(v=>v.stageId===id(102)&&v.riderId===id(1)?{...v,status:'dnf',elapsedSeconds:null,rank:null}:v)
 f.coverage={points:'missing',penalties:'missing',young:'missing'}
 const x=project(f);assert.equal(x.general.length,5);assert.equal(x.team.length,1)
 assert.equal(x.points,null);assert.equal(x.mountain,null);assert.equal(x.young,null)
 assert.equal(x.writeAllowed,false);assert.equal(x.accountingAllowed,false);assert.equal(x.blockers.length,4)
})
test('duplicate stage result rejected',()=>{const f=fixture();f.results.push(f.results[0]);assert.throws(()=>project(f))})
test('non-contiguous stage prefix rejected',()=>{const f=fixture();f.stages.shift();assert.throws(()=>project(f))})
test('duplicate points rejected',()=>{const f=fixture();f.pointRows=[bonus,bonus];assert.throws(()=>project(f))})
test('partial points coverage rejected',()=>{const f=fixture();f.pointRows=[bonus];f.coverage.points='missing';assert.throws(()=>project(f))})
test('order independent',()=>{const f=fixture();assert.deepEqual(project({...f,results:[...f.results].reverse(),stages:[...f.stages].reverse()}),project(f))})
test('weather cancellation and unknown cancellation authority refused',()=>{
 for(const value of [true,undefined,null]){const f=fixture();f.stages[0].weatherCancelled=value;assert.throws(()=>project(f),/Weather cancellation/)}
})
