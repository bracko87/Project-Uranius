// Isolated two-stage review. No database, scheduler, finance or official results.
import assert from 'node:assert/strict'
import {buildCalendarInput,digest} from './uranius-calendar-dispatch.mjs'
import {validateNovelOutput} from './uranius-calendar-job-worker.mjs'
const bounds=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const clamp=x=>Math.max(0,Math.min(100,x))
const round=x=>Math.round(x*1e6)/1e6
const dateMs=x=>{assert.match(x,/^\d{4}-\d{2}-\d{2}$/);const t=Date.parse(x+'T00:00:00Z');assert.equal(new Date(t).toISOString().slice(0,10),x);return t}
const seedFor=(stage,date)=>'uranius-calendar-v1:'+stage+':'+date
const key=x=>x.riderId+':'+x.teamId
const sortedKeys=xs=>xs.map(key).sort()
function checkedResult(input,text){
 const result=validateNovelOutput(input,text),states=result.finalRiderStates
 const finishers=states.filter(s=>s.stageStatus==='finished')
 assert.ok(finishers.length>0,'No classified riders')
 assert.deepEqual(finishers.map(s=>s.finishPosition).sort((a,b)=>a-b),Array.from({length:finishers.length},(_,i)=>i+1))
 for(const s of states){
  assert.ok(bounds(s.energy),'Invalid final energy')
  if(s.stageStatus==='finished'){
   assert.equal(s.finished,true)
   assert.ok(Number.isFinite(s.finishTimeSeconds)&&s.finishTimeSeconds>0)
   assert.ok(Math.abs(s.distanceKm-input.distanceKm)<1e-6)
  }else{
   assert.ok(s.stageStatus==='dnf'||s.stageStatus==='dns','Nonterminal previous stage')
   // Do not silently treat withdrawn riders as classified.
   assert.equal(s.finished,false);assert.equal(s.finishTimeSeconds,null);assert.equal(s.finishPosition,null)
  }
 }
 const byRank=[...finishers].sort((a,b)=>a.finishPosition-b.finishPosition)
 for(let i=1;i<byRank.length;i++)assert.ok(byRank[i].finishTimeSeconds>=byRank[i-1].finishTimeSeconds)
 return {result,states}
}
export function projectStage2({previous,nextStage}){
 assert.equal(previous.status,'completed')
 assert.equal(previous.jobKind,'calendar_review')
 assert.equal(previous.stageNumber,1);assert.equal(nextStage.stageNumber,2)
 assert.equal(nextStage.hasJob,false);assert.equal(nextStage.hasArchive,false)
 assert.equal(nextStage.raceStatus,'scheduled')
 assert.ok(sha(previous.inputSha256)&&sha(previous.outputSha256))
 assert.equal(digest(previous.inputText),previous.inputSha256)
 assert.equal(digest(previous.outputText),previous.outputSha256)
 assert.equal(dateMs(nextStage.stageDate)-dateMs(previous.calendarDate),86400000,'Only one-night carryover reviewed')
 const first=JSON.parse(previous.inputText)
 assert.equal(first.stageId,previous.stageId)
 assert.equal(first.seed,seedFor(first.stageId,previous.calendarDate))
 assert.equal(first.raceId,nextStage.raceId);assert.notEqual(first.stageId,nextStage.stageId)
 assert.equal(first.stageFormat,'road_race');assert.deepEqual(first.orders,[])
 // Reuse frozen canonical stage-1 roster and mountain course construction;
 // explicit stage-2 checks above are mandatory. Never dispatch via this helper.
 const second=buildCalendarInput({...nextStage,stageNumber:1})
 assert.deepEqual(sortedKeys(first.riders),sortedKeys(second.riders),'Roster changed between stages')
 const {states}=checkedResult(first,previous.outputText)
 const byId=new Map(states.map(x=>[x.riderId,x]))
 const firstById=new Map(first.riders.map(x=>[x.riderId,x]))
 const withdrawn=[],carryover=[]
 second.riders=second.riders.flatMap(r=>{
  const start=firstById.get(r.riderId),end=byId.get(r.riderId)
  assert.deepEqual(r.attributes,start.attributes,'Stage roster attributes changed')
  assert.equal(r.teamId,start.teamId);assert.equal(r.role,start.role)
  if(end.stageStatus!=='finished'){
   withdrawn.push({riderId:r.riderId,teamId:r.teamId,status:end.stageStatus});return []
  }
  const initial=start.condition?.startingEnergy??100
  const initialFatigue=start.condition?.fatigueBeforeStage??0
  const morale=start.condition?.morale??75
  assert.ok(bounds(initial)&&bounds(initialFatigue)&&bounds(morale)&&bounds(r.attributes.recovery))
  // Synthetic review policy: recover 20–70% of depleted energy/accumulated
  // fatigue overnight, proportional to recovery skill. NOT original game formula.
  // Legacy output has no runtimeFatigue; energy deficit is an explicit proxy.
  const fraction=.2+r.attributes.recovery/200
  const loss=Math.max(0,initial-end.energy)
  const fatigue=round(clamp(clamp(initialFatigue+loss)*(1-fraction)))
  const startingEnergy=round(clamp(end.energy+(100-end.energy)*fraction))
  const condition={startingEnergy,fatigueBeforeStage:fatigue,morale,availabilityStatus:'available'}
  carryover.push({riderId:r.riderId,teamId:r.teamId,stage1Rank:end.finishPosition,stage1Seconds:end.finishTimeSeconds,
   stage1Energy:end.energy,recoveryFraction:round(fraction),energyLoss:round(loss),condition})
  return [{...r,condition}]
 })
 const remaining=new Map(second.riders.map(x=>[x.riderId,x]))
 second.teams=second.teams.flatMap(t=>{
  const riderIds=t.riderIds.filter(id=>remaining.has(id))
  if(!riderIds.length)return []
  const captainRiderId=riderIds.includes(t.captainRiderId)?t.captainRiderId:riderIds[0]
  if(captainRiderId!==t.captainRiderId)remaining.get(captainRiderId).role='captain'
  return [{...t,riderIds,captainRiderId}]
 })
 assert.ok(second.teams.length>=2,'Review requires two remaining teams')
 assert.equal(second.riders.length+withdrawn.length,first.riders.length)
 const inputText=JSON.stringify(second)
 return {version:'uranius_stage_carryover_review_v1',dispatchAllowed:false,
  source:{jobId:previous.jobId,stageId:first.stageId,inputSha256:previous.inputSha256,outputSha256:previous.outputSha256},
  stageId:second.stageId,calendarDate:nextStage.stageDate,inputText,inputSha256:digest(inputText),carryover,withdrawn,
  // Existing hosted 027 SQL requires exactly 10 riders; withdrawn-roster
  // projections must not be enqueued under that contract.
  compatibleWithCurrentQueue:second.riders.length===10&&second.teams.length===2}
}
export function projectTourClassification(projection,secondOutputText){
 assert.equal(projection.version,'uranius_stage_carryover_review_v1')
 assert.equal(digest(projection.inputText),projection.inputSha256)
 const second=JSON.parse(projection.inputText)
 const {states}=checkedResult(second,secondOutputText)
 const first=new Map(projection.carryover.map(x=>[x.riderId,x]))
 assert.deepEqual(sortedKeys(projection.carryover),sortedKeys(second.riders))
 const withdrawn=[...projection.withdrawn.map(x=>({...x,stageNumber:1}))]
 const ranked=[]
 for(const s of states){
  const p=first.get(s.riderId)
  if(s.stageStatus!=='finished'){
   withdrawn.push({riderId:s.riderId,teamId:s.teamId,status:s.stageStatus,stageNumber:2});continue
  }
  ranked.push({riderId:s.riderId,teamId:s.teamId,stage1Seconds:p.stage1Seconds,stage2Seconds:s.finishTimeSeconds,
   totalSeconds:round(p.stage1Seconds+s.finishTimeSeconds),stage1Rank:p.stage1Rank,stage2Rank:s.finishPosition,
   rankSum:p.stage1Rank+s.finishPosition})
 }
 // Review-only deterministic tie-break: sum of ranks, then latest stage rank,
 // then rider ID. No fabricated time gaps, bonus seconds, or official points.
 ranked.sort((a,b)=>a.totalSeconds-b.totalSeconds||a.rankSum-b.rankSum||a.stage2Rank-b.stage2Rank||a.riderId.localeCompare(b.riderId))
 const best=ranked[0]?.totalSeconds
 return {official:false,source:projection.source,stage2InputSha256:projection.inputSha256,stage2OutputSha256:digest(secondOutputText),
  classification:ranked.map((x,i)=>({...x,rank:i+1,gapSeconds:round(x.totalSeconds-best)})),withdrawn}
}
