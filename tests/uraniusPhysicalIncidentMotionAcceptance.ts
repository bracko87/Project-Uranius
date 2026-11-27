import assert from 'node:assert/strict'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {simulateMultiGroupTick} from '../src/race-engine/simulation/simulateMultiGroupTick'
import {startPhysicalIncident,physicalIncidentTick,withdrawPhysicalRider} from '../scripts/uranius-physical-incident-motion-review'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}
const start=simulateMultiGroupTick(createInitialState(input as Parameters<typeof createInitialState>[0])).state
const affected=roster[0].riderId,helper=roster[1].riderId,other=roster[12].riderId
assert.throws(()=>startPhysicalIncident(start,affected,other,60,4),/invalid helper/)
const run=()=>{
 const initial=startPhysicalIncident(start,affected,helper,60,4)
 assert.equal(initial.state.riders[affected].energy,start.riders[affected].energy-4)
 let {state,episode}=initial
 let pickup=false,rejoin=false
 const history=[]
 for(let n=0;n<120&&!rejoin;n++){
  const before=state
  const result=physicalIncidentTick(state,episode)
  state=result.state;episode=result.episode;pickup ||=result.pickup;rejoin ||=result.rejoin
  for(const id of [affected,helper,other]){
   assert.ok(state.riders[id].distanceKm>=before.riders[id].distanceKm-1e-8)
   assert.ok(state.riders[id].energy<=before.riders[id].energy+1e-8)
  }
  if(n===0){
   assert.equal(state.riders[affected].distanceKm,before.riders[affected].distanceKm)
   assert.ok(state.riders[helper].distanceKm>state.riders[affected].distanceKm)
   assert.ok(state.riders[helper].distanceKm<state.riders[other].distanceKm)
  }
  if(result.pickup)assert.equal(state.riders[affected].currentGroupId,state.riders[helper].currentGroupId)
  if(result.rejoin)assert.equal(state.riders[affected].currentGroupId,state.riders[other].currentGroupId)
  assert.equal(result.official,false);assert.equal(result.hostedWriteAllowed,false)
  history.push(result)
 }
 assert.ok(pickup&&rejoin,'physical pickup and rejoin required')
 return {state,episode,history}
}
const first=run()
console.log('PASS 043Z repair, physical separation, helper waiting and pickup, chase and contact rejoin')
assert.deepEqual(run(),first)
console.log('PASS 043Z deterministic physical motion and separate energy')
const withdrawn=withdrawPhysicalRider(first.state,affected)
const next=physicalIncidentTick(withdrawn,first.episode).state
assert.equal(next.riders[affected].stageStatus,'dnf')
assert.equal(next.riders[affected].distanceKm,withdrawn.riders[affected].distanceKm)
assert.equal(next.riders[affected].energy,withdrawn.riders[affected].energy)
assert.throws(()=>startPhysicalIncident(next,affected,null,60,4),/racing peloton/)
console.log('PASS 043Z permanent withdrawal and no further movement or energy charge')
console.log('PASS 3/3 physical incident motion checks; no hosted connection')
