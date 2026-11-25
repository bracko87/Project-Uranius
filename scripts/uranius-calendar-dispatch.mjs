// Pure calendar planner. No DB, network, clock mutation or simulation.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
const isUuid=x=>typeof x==='string'&&uuid.test(x)
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x
const score=x=>Number.isInteger(x)&&x>=1&&x<=100
const label=x=>typeof x==='string'&&x.trim().length>0
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort())
export const digest=x=>createHash('sha256').update(x,'utf8').digest('hex')
const profile={
 flat:[[0,100],[1,100]],
 hilly:[[0,150],[.1,150],[.2,450],[.3,150],[.4,600],[.5,200],[.6,200],[.7,650],[.8,200],[.9,500],[1,150]],
 mountain:[[0,200],[.15,200],[.35,1000],[.45,400],[.65,1800],[.8,800],[1,2200]]
}
export function buildCalendarInput(s){
 assert.ok(isUuid(s.raceId)&&isUuid(s.stageId)&&label(s.stageName)&&day(s.stageDate))
 assert.equal(s.stageFormat,'road_race')
 assert.ok(Number.isFinite(s.distanceKm)&&s.distanceKm>=20&&s.distanceKm<=300)
 assert.ok(Object.hasOwn(profile,s.terrainType))
 assert.equal(s.stageNumber,1,'Stage carryover not yet supported')
 assert.ok(Array.isArray(s.acceptedClubs)&&Array.isArray(s.preparedClubs)&&Array.isArray(s.rows))
 assert.equal(s.acceptedClubs.length,2)
 assert.ok(s.acceptedClubs.every(isUuid)&&new Set(s.acceptedClubs).size===2&&same(s.acceptedClubs,s.preparedClubs))
 assert.equal(s.rows.length,10)
 const ids=new Set(),teamIds=new Set()
 const teams=[],riders=[]
 for(const club of [...s.acceptedClubs].sort()){
  const roster=s.rows.filter(x=>x.clubId===club).sort((a,b)=>a.selectionOrder-b.selectionOrder)
  assert.equal(roster.length,5)
  assert.ok(Number.isInteger(roster[0].teamId)&&roster[0].teamId>0&&!teamIds.has(roster[0].teamId))
  teamIds.add(roster[0].teamId)
  const teamName=roster[0].teamName
  for(const [i,row] of roster.entries()){
   assert.ok(isUuid(row.riderUuid)&&!ids.has(row.riderUuid)&&label(row.riderName)&&label(row.teamName))
   ids.add(row.riderUuid)
   assert.equal(row.teamName,teamName);assert.equal(row.teamId,roster[0].teamId)
   assert.equal(row.selectionOrder,i+1);assert.equal(row.role,i===0?'captain':'domestique')
   assert.equal(row.provenance,'uranius_synthetic_fixture')
   for(const n of [row.flat,row.climbing,row.stamina,row.resistance])assert.ok(score(n))
   // Existing fixture-only skill defaults; not original production attributes.
   riders.push({riderId:row.riderUuid,teamId:club,riderName:row.riderName,teamName,role:row.role,
    attributes:{flat:row.flat,climbing:row.climbing,stamina:row.stamina,resistance:row.resistance,
     sprint:75,acceleration:75,timeTrial:75,recovery:75,raceIq:75,teamwork:75}})
  }
  teams.push({teamId:club,teamName,captainRiderId:roster[0].riderUuid,riderIds:roster.map(x=>x.riderUuid)})
 }
 return {raceId:s.raceId,stageId:s.stageId,stageName:s.stageName,stageFormat:s.stageFormat,distanceKm:s.distanceKm,
  seed:'uranius-calendar-v1:'+s.stageId+':'+s.stageDate,
  settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},
  teams,riders,profilePoints:profile[s.terrainType].map(([fraction,elevationMetres])=>({kilometre:fraction*s.distanceKm,elevationMetres})),orders:[]}
}
export function planCalendarDispatch(snapshot,{previewDate}={}){
 assert.ok(snapshot&&day(snapshot.clock?.date)&&typeof snapshot.clock.paused==='boolean'&&Array.isArray(snapshot.stages))
 if(previewDate!==undefined)assert.ok(day(previewDate)&&previewDate>=snapshot.clock.date)
 const date=previewDate??snapshot.clock.date
 const preview=previewDate!==undefined
 const decisions=[],jobs=[],seen=new Set()
 for(const s of [...snapshot.stages].sort((a,b)=>a.stageDate.localeCompare(b.stageDate)||a.stageNumber-b.stageNumber||a.stageId.localeCompare(b.stageId))){
  assert.ok(isUuid(s.stageId)&&day(s.stageDate)&&!seen.has(s.stageId));seen.add(s.stageId)
  assert.ok(typeof s.hasJob==='boolean'&&typeof s.hasArchive==='boolean')
  let reason
  if(s.hasJob||s.hasArchive)reason='already-dispatched'
  else if(s.raceStatus!=='scheduled')reason='not-scheduled'
  else if(s.stageDate>date)reason='not-due'
  else if(s.stageNumber!==1)reason='stage-carryover-required'
  else if(!Array.isArray(s.acceptedClubs)||s.acceptedClubs.length!==2)reason='requires-two-accepted-teams'
  else if(snapshot.clock.paused&&!preview)reason='clock-paused'
  else {
   try{
    const input=buildCalendarInput(s),inputText=JSON.stringify(input)
    jobs.push({stageId:s.stageId,calendarDate:s.stageDate,inputText,inputSha256:digest(inputText),expectedOutputSha256:null,kind:'calendar_review'})
    reason=preview?'preview-eligible':'eligible'
   }catch{reason='invalid-preparation-or-input'}
  }
  decisions.push({stageId:s.stageId,stageDate:s.stageDate,reason})
 }
 return {date,preview,dispatchAllowed:!preview&&!snapshot.clock.paused,decisions,jobs}
}
