// Offline only. Native engine bundle and pure tick boundary cases.
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {spawnSync} from 'node:child_process'
import {buildCalendarInput} from '../scripts/uranius-calendar-dispatch.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const root=fileURLToPath(new URL('../',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'uranius-039-review-'))
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const a=id(11),b=id(12)
const stage={raceId:id(100),stageId:id(101),stageName:'Offline scoring stage',stageDate:'2000-01-03',stageNumber:1,distanceKm:120,terrainType:'hilly',stageFormat:'road_race',raceStatus:'scheduled',acceptedClubs:[a,b],preparedClubs:[a,b],hasJob:false,hasArchive:false,rows:Array.from({length:10},(_,i)=>({riderUuid:id(1000+i),clubId:i<5?a:b,teamId:i<5?1:2,riderName:'Review Rider '+(i+1),teamName:i<5?'A':'B',selectionOrder:i%5+1,role:i%5===0?'captain':'domestique',flat:60+i,climbing:50+3*i,stamina:70,resistance:75,provenance:'uranius_synthetic_fixture'}))}
const input=buildCalendarInput(stage)
const marker=(n,type,km,pointsScheme=[20,17],timeBonusSeconds=[])=>({pointId:id(n),type,km,pointsScheme,timeBonusSeconds})
const points=[marker(301,'INTERMEDIATE_SPRINT',.05),marker(302,'BONUS_SPRINT',.1,[5,3],[3,2]),marker(303,'KOM',80,[5,3,2,1]),marker(304,'KOM',119.95,[5,3,2,1]),marker(305,'FINISH',120,[25,20,16,14,12,10,8,6,4,2],[10,6,4]),marker(306,'TIME_CHECK',90,[],[])]
let checks=0
const pass=x=>{checks++;console.log('PASS '+x)}
try{
 const helper=join(dir,'helper.mjs'),driver=join(dir,'driver.mjs')
 for(const [entry,outfile] of [['src/race-engine/simulation/competitionCrossingReview.ts',helper],['scripts/uranius-competition-crossing-engine-review.ts',driver]])await build({entryPoints:[join(root,entry)],outfile,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 const {collectCompetitionCrossings:collect,validateCompetitionMarkers:validate}=await import(pathToFileURL(helper).href)
 const riders=input.riders.slice(0,2),micro={...input,riders,distanceKm:1,settings:{...input.settings,tickSeconds:30}}
 const [r1,r2]=riders
 const state=(sec,positions,groups)=>({stageId:micro.stageId,raceSecond:sec,riders:Object.fromEntries(riders.map((r,i)=>[r.riderId,{...r,stageStatus:'racing',currentGroupId:groups[i],distanceKm:positions[i],energy:90,attributes:{...r.attributes,sprint:i?90:60,climbing:i?50:90,acceleration:75}}]))})
 const makeTick=(sec,starts,speeds,groups=['g1','g2'])=>{
  const ends=starts.map((x,i)=>Math.min(1,x+speeds[i]*30/3600))
  const proposals=groups.map((g,i)=>({groupId:g,riderIds:[riders[i].riderId],previousDistanceKm:starts[i],nextDistanceKm:ends[i],appliedSpeedKmh:speeds[i]}))
  return {previousState:state(sec,starts,groups),movement:{tickSeconds:30,proposals},appliedMovement:{state:state(sec+30,ends,groups)}}
 }
 const m=[marker(301,'INTERMEDIATE_SPRINT',.2),marker(303,'KOM',.2)]
 const first=collect(micro,m,[makeTick(0,[0,0],[36,24])])
 assert.equal(first[0].crossings[0].riderId,r1.riderId);assert.equal(first[0].crossings[0].crossingTimeSeconds,20);assert.equal(first[0].crossings[1].crossingTimeSeconds,30)
 pass('039 earlier physical crossing outranks skill, two distinct markers in one tick')
 const tied=collect(micro,m,[makeTick(0,[0,0],[36,36])])
 assert.equal(tied[0].crossings[0].riderId,r2.riderId);assert.equal(tied[1].crossings[0].riderId,r1.riderId);assert.ok(tied.every(p=>p.crossings.every(c=>c.simultaneous&&c.crossingTimeSeconds===20)))
 pass('039 identical times preserved, sprint and KOM distinct tie policy')
 const clipped=collect(micro,[marker(307,'KOM',.95)],[makeTick(0,[.8,.8],[60,60])])
 assert.equal(clipped[0].crossings[0].crossingTimeSeconds,9)
 pass('039 unclamped movement speed used near finish')
 const again=collect(micro,m,[makeTick(0,[0,0],[36,36]),makeTick(30,[0,0],[36,36])])
 assert.deepEqual(again,tied)
 for(const bad of [[marker(1,'KOM',0)],[marker(1,'KOM',1)],[marker(1,'TIME_CHECK',.3)],[m[0],m[0]]])assert.throws(()=>validate(bad,1))
 assert.throws(()=>collect(micro,m,[makeTick(0,[.3,.3],[36,36])]),/unobserved/)
 assert.throws(()=>collect(micro,m,[makeTick(0,[0,0],[12,12])]),/incomplete/)
 const duplicate=makeTick(0,[0,0],[36,36]);duplicate.movement.proposals[1].riderIds=[r1.riderId];assert.throws(()=>collect(micro,m,[duplicate]))
 pass('039 repeated crossings deduplicated; invalid markers, jumps, missing and duplicate riders refused')
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))
 const run=(packet)=>{
  const x=spawnSync(process.execPath,[driver],{input:JSON.stringify(packet),env,encoding:'utf8',timeout:120000,maxBuffer:5*1024*1024,windowsHide:true})
  if(x.error||x.status!==0)throw Error('Offline crossing engine failed: '+String(x.error?.message??x.stderr).slice(0,1500))
  return x.stdout
 }
 const packet={provenance:'synthetic_review_fixture',jobId:id(201),input,points,raceFormat:'stage_race'}
 const raw=run(packet),result=JSON.parse(raw)
 assert.equal(raw,run(packet));assert.equal(result.legacyParity,true);assert.equal(result.official,false);assert.equal(result.hostedWriteAllowed,false)
 assert.equal(result.competitions.length,4)
 for(const p of result.competitions){
  assert.equal(p.crossings.length,10);assert.equal(new Set(p.crossings.map(c=>c.riderId)).size,10)
  assert.deepEqual(p.crossings.map(c=>c.rank),Array.from({length:10},(_,i)=>i+1))
  for(let i=1;i<p.crossings.length;i++)assert.ok(p.crossings[i].crossingTimeSeconds>=p.crossings[i-1].crossingTimeSeconds)
 }
 assert.ok(result.scoring.resultRows.some(x=>x.sprintPoints>0));assert.ok(result.scoring.resultRows.some(x=>x.mountainPoints>0));assert.ok(result.scoring.resultRows.some(x=>x.bonusSeconds>0))
 assert.ok(result.scoring.resultRows.every(x=>x.penaltySeconds===null&&x.fatigueAfterStage===null&&x.youngEligible===null))
 assert.equal(result.scoring.accountingAllowed,false)
 pass('039 actual engine 40 intermediate crossings, repeatable byte-identical legacy output, generated scoring receipt')
 const one=JSON.parse(run({...packet,raceFormat:'one_day'}));assert.deepEqual(one.competitions,result.competitions);assert.ok(one.scoring.resultRows.every(x=>x.bonusSeconds===0));assert.equal(one.source.outputSha256,result.source.outputSha256)
 pass('039 one-day bonus suppression without changing physical crossings')
 assert.equal(checks,6);console.log('PASS 6/6 offline competition crossing checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
