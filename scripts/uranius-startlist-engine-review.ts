// Disposable synthetic startlist -> unchanged engine proof. No database or network IO.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { StageInput } from '../src/race-engine/domain/StageInput'
import { validateStageInput } from '../src/race-engine/validation/validateStageInput'
import { runDeterministicRoadRace } from '../src/race-engine/simulation/runDeterministicRoadRace'

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const raceA='19000000-0000-4000-8000-000000000001'
const validUuid=(x:unknown):x is string=>typeof x==='string'&&uuid.test(x)
const score=(x:unknown):x is number=>typeof x==='number'&&Number.isInteger(x)&&x>=1&&x<=100
const text=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>0
type Row={riderUuid:string;clubId:string;teamId:number;riderName:string;teamName:string;selectionOrder:number;role:'captain'|'domestique';flat:number;climbing:number;stamina:number;resistance:number;provenance:string}
type Packet={raceId:string;stageId:string;stageName:string;distanceKm:number;terrainType:string;stageFormat:string;stageNumber:number;rows:Row[]}
function adapt(p:Packet):StageInput {
 assert.equal(p.raceId,raceA,'Only the isolated flat fixture is supported')
 assert.ok(validUuid(p.stageId)&&text(p.stageName))
 assert.equal(p.distanceKm,120);assert.equal(p.terrainType,'flat');assert.equal(p.stageFormat,'road_race');assert.equal(p.stageNumber,1)
 assert.ok(Array.isArray(p.rows)&&p.rows.length===5)
 const rows=[...p.rows].sort((a,b)=>a.selectionOrder-b.selectionOrder)
 const club=rows[0].clubId
 assert.ok(validUuid(club))
 const ids=new Set<string>()
 for(const [i,row] of rows.entries()){
  assert.ok(validUuid(row.riderUuid)&&!ids.has(row.riderUuid.toLowerCase()))
  ids.add(row.riderUuid.toLowerCase())
  assert.equal(row.clubId,club);assert.equal(row.teamId,1);assert.equal(row.teamName,rows[0].teamName)
  assert.equal(row.provenance,'uranius_synthetic_fixture')
  assert.ok(text(row.riderName)&&text(row.teamName))
  assert.equal(row.selectionOrder,i+1);assert.equal(row.role,i===0?'captain':'domestique')
  for(const value of [row.flat,row.climbing,row.stamina,row.resistance])assert.ok(score(value))
 }
 // Explicit test-only assumptions, never saved as original rider skills.
 // The synthetic catalog Stamina is not mapped to original Endurance.
 const riders=rows.map(r=>({riderId:r.riderUuid,teamId:club,riderName:r.riderName,teamName:r.teamName,role:r.role,
  attributes:{flat:r.flat,climbing:r.climbing,stamina:r.stamina,resistance:r.resistance,
   sprint:75,acceleration:75,timeTrial:75,recovery:75,raceIq:75,teamwork:75}}))
 const stage:StageInput={raceId:p.raceId,stageId:p.stageId,stageName:p.stageName,stageFormat:'road_race',distanceKm:p.distanceKm,
  seed:'uranius-021-disposable-flat-startlist-v1',
  settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},
  teams:[{teamId:club,teamName:rows[0].teamName,captainRiderId:rows[0].riderUuid,riderIds:riders.map(r=>r.riderId)}],
  riders,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:p.distanceKm,elevationMetres:100}],orders:[]}
 validateStageInput(stage)
 return stage
}
const packet:Packet=JSON.parse(readFileSync(0,'utf8'))
const before=JSON.stringify(packet)
const input=adapt(packet)
for(const mutate of [(p:Packet)=>{p.rows[1].riderUuid=p.rows[0].riderUuid},
 (p:Packet)=>{p.rows[1].teamId=2},(p:Packet)=>{p.rows[1].role='captain'},
 (p:Packet)=>{p.rows[1].flat=0},(p:Packet)=>{p.rows.pop()},(p:Packet)=>{p.rows[1].provenance='unknown'}]){
 const bad=structuredClone(packet);mutate(bad);assert.throws(()=>adapt(bad))
}
const first=runDeterministicRoadRace(input,{simulationMode:'existing_v1'})
const second=runDeterministicRoadRace(input,{simulationMode:'existing_v1'})
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
assert.equal(digest(first),digest(second),'Non-deterministic repeated race')
assert.equal(first.raceId,input.raceId);assert.equal(first.stageId,input.stageId)
assert.deepEqual(first.finalRiderStates.map(r=>r.riderId).sort(),input.riders.map(r=>r.riderId).sort())
assert.deepEqual(first.finalRiderStates.map(r=>r.finishPosition).sort((a,b)=>Number(a)-Number(b)),[1,2,3,4,5])
assert.ok(first.finalRiderStates.every(r=>r.finished&&r.stageStatus==='finished'&&typeof r.finishTimeSeconds==='number'&&r.finishTimeSeconds>0))
assert.equal(JSON.stringify(packet),before)
console.log(JSON.stringify({finishers:5,outputSha256:digest(first),frames:first.snapshots.length,events:first.events.length,deterministic:true,negativePacketsRejected:6,fixtureUnchanged:true,mode:'existing_v1',syntheticCourse:true,syntheticEngineDefaults:true}))
