// Focused offline multi-stage validation. No DB connection or credentials.
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {buildCalendarInput,digest,planCalendarDispatch} from '../scripts/uranius-calendar-dispatch.mjs'
import {projectStage2,projectTourClassification} from '../scripts/uranius-stage-carryover.mjs'
const args=process.argv.slice(2)
assert.deepEqual(args,['--offline-only'])
const root=fileURLToPath(new URL('../',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'uranius-029-review-'))
const clubA='00000000-0000-4000-8000-000000000011',clubB='00000000-0000-4000-8000-000000000012'
const firstStage={raceId:'19000000-0000-4000-8000-000000000002',stageId:'882801c4-ea99-4aaf-8ae5-d2a11cd26fd8',
 stageName:'Offline rolling stage',stageDate:'2000-01-03',stageNumber:1,distanceKm:120,terrainType:'hilly',stageFormat:'road_race',raceStatus:'scheduled',
 acceptedClubs:[clubA,clubB],preparedClubs:[clubA,clubB],hasJob:false,hasArchive:false,
 rows:Array.from({length:10},(_,i)=>({riderUuid:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),
 clubId:i<5?clubA:clubB,teamId:i<5?1:2,riderName:'Review Rider '+(i+1),teamName:i<5?'Club A':'Club B',
 selectionOrder:i%5+1,role:i%5===0?'captain':'domestique',flat:60+i,climbing:[90,35,80,45,60,85,40,75,50,65][i],stamina:60+i,resistance:65+i,provenance:'uranius_synthetic_fixture'}))}
const nextStage={...firstStage,stageId:'263edaea-28a2-438a-81b8-f7ca1fcd6d9f',stageName:'Offline mountain stage',stageDate:'2000-01-04',stageNumber:2,terrainType:'mountain'}
const inputText=JSON.stringify(buildCalendarInput(firstStage))
let checks=0
const pass=message=>{checks++;console.log('PASS '+message)}
const summary=out=>{const x=JSON.parse(out),f=x.finalRiderStates.filter(r=>r.stageStatus==='finished');return {finishers:f.length,timeSpreadSeconds:Math.max(...f.map(r=>r.finishTimeSeconds))-Math.min(...f.map(r=>r.finishTimeSeconds)),distinctFinishTimes:new Set(f.map(r=>r.finishTimeSeconds)).size,groupIds:new Set(x.snapshots.flatMap(s=>s.groups.map(g=>g.groupId))).size,meanEnergy:f.reduce((a,r)=>a+r.energy,0)/f.length,frames:x.snapshots.length,events:x.events.length,rankOrder:f.map(r=>r.riderName)}}
try{
 const bundle=join(dir,'engine.mjs')
 await build({entryPoints:[join(root,'scripts/uranius-stage-carryover-engine-review.ts')],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))
 const simulate=(text,mode='existing_v1')=>{
  const x=spawnSync(process.execPath,[bundle,mode],{input:text,env,encoding:'utf8',timeout:60000,maxBuffer:5*1024*1024,windowsHide:true})
  if(x.error||x.status!==0)throw Error('Offline engine failed: '+String(x.error?.message??x.stderr).slice(0,1500))
  return x.stdout
 }
 const stage1Output=simulate(inputText)
 const previous={jobId:'30000000-0000-4000-8000-000000000001',stageId:firstStage.stageId,stageNumber:1,calendarDate:firstStage.stageDate,
  jobKind:'calendar_review',status:'completed',inputText,inputSha256:digest(inputText),outputText:stage1Output,outputSha256:digest(stage1Output)}
 const before=JSON.stringify({previous,nextStage})
 const result=projectStage2({previous,nextStage}),second=JSON.parse(result.inputText)
 assert.equal(result.dispatchAllowed,false);assert.equal(result.compatibleWithCurrentQueue,true)
 assert.equal(second.riders.length,10);assert.equal(result.carryover.length,10);assert.equal(result.withdrawn.length,0)
 assert.equal(result.source.outputSha256,previous.outputSha256)
 assert.equal(JSON.stringify({previous,nextStage}),before)
 assert.deepEqual(projectStage2({previous,nextStage:{...nextStage,rows:[...nextStage.rows].reverse()}}),result)
 assert.equal(planCalendarDispatch({clock:{date:'2000-01-04',paused:false},stages:[nextStage]}).decisions[0].reason,'stage-carryover-required')
 pass('029 immutable completed stage input/output, deterministic carryover, existing automatic dispatch still blocked')
 for(const c of result.carryover){
  const next=second.riders.find(r=>r.riderId===c.riderId)
  assert.deepEqual(next.condition,c.condition)
  assert.ok(next.condition.startingEnergy>=c.stage1Energy&&next.condition.startingEnergy<=100)
  assert.ok(Math.abs(next.condition.startingEnergy-(c.stage1Energy+(100-c.stage1Energy)*.575))<1e-6)
  assert.ok(Math.abs(next.condition.fatigueBeforeStage-(100-c.stage1Energy)*.425)<1e-6)
 }
 assert.ok(result.carryover.some(c=>c.condition.startingEnergy<100&&c.condition.fatigueBeforeStage>0))
 pass('029 individual recovered energy and fatigue proxy verified against explicit formula')
 for(const bad of [{...previous,status:'queued'},{...previous,inputSha256:'0'.repeat(64)},{...previous,outputText:previous.outputText+' '}])assert.throws(()=>projectStage2({previous:bad,nextStage}))
 for(const bad of [{...nextStage,stageNumber:3},{...nextStage,stageDate:'2000-01-05'},{...nextStage,hasJob:true},{...nextStage,hasArchive:true},{...nextStage,rows:nextStage.rows.slice(1)}])assert.throws(()=>projectStage2({previous,nextStage:bad}))
 pass('029 missing or corrupt source, wrong dates, duplicate and roster changes rejected')
 const withdrawnOutput=JSON.parse(stage1Output)
 const captain=firstStage.rows[0].riderUuid,domestique=firstStage.rows[6].riderUuid
 for(const [id,status] of [[captain,'dnf'],[domestique,'dns']]){
  const s=withdrawnOutput.finalRiderStates.find(r=>r.riderId===id)
  Object.assign(s,{stageStatus:status,finished:false,finishPosition:null,finishTimeSeconds:null})
 }
 withdrawnOutput.finalRiderStates.filter(s=>s.stageStatus==='finished').sort((a,b)=>a.finishPosition-b.finishPosition).forEach((s,i)=>s.finishPosition=i+1)
 const withdrawnText=JSON.stringify(withdrawnOutput)
 const reduced=projectStage2({previous:{...previous,outputText:withdrawnText,outputSha256:digest(withdrawnText)},nextStage})
 const reducedInput=JSON.parse(reduced.inputText)
 assert.equal(reducedInput.riders.length,8);assert.equal(reduced.withdrawn.length,2);assert.equal(reduced.compatibleWithCurrentQueue,false)
 assert.ok(!reducedInput.riders.some(r=>[captain,domestique].includes(r.riderId)))
 const a=reducedInput.teams.find(t=>t.teamId===clubA)
 assert.notEqual(a.captainRiderId,captain);assert.equal(reducedInput.riders.find(r=>r.riderId===a.captainRiderId).role,'captain')
 pass('029 DNF/DNS excluded and captain replaced; reduced field cannot use existing hosted queue contract')
 const output=simulate(result.inputText)
 assert.equal(output,simulate(result.inputText))
 const gc=projectTourClassification(result,output)
 assert.equal(gc.official,false);assert.equal(gc.classification.length,10)
 for(const row of gc.classification){
  assert.ok(Math.abs(row.totalSeconds-row.stage1Seconds-row.stage2Seconds)<1e-6)
  assert.ok(row.gapSeconds>=0)
 }
 assert.equal(gc.classification[0].gapSeconds,0)
 pass('029 actual two-stage legacy engine run uses carried energy and produces reproducible cumulative classification')
 const reducedOutput=simulate(reduced.inputText)
 const reducedGc=projectTourClassification(reduced,reducedOutput)
 assert.equal(reducedGc.classification.length,8);assert.equal(reducedGc.withdrawn.length,2)
 assert.ok(!reducedGc.classification.some(x=>[captain,domestique].includes(x.riderId)))
 pass('029 actual reduced-field second stage and provisional GC preserve withdrawals')
 const reset={...second,riders:second.riders.map(({condition,...r})=>r)}
 const resetResult=simulate(JSON.stringify(reset))
 const calibrated=simulate(result.inputText,'terrain_separation_calibrated_v1')
 assert.equal(calibrated,simulate(result.inputText,'terrain_separation_calibrated_v1'))
 const review={stage1Legacy:summary(stage1Output),stage2LegacyCarried:summary(output),stage2LegacyReset:summary(resetResult),stage2CalibratedCarried:summary(calibrated),conditionChangesOutput:output!==resetResult,energyChangesFinal:summary(output).meanEnergy!==summary(resetResult).meanEnergy}
 assert.ok(review.energyChangesFinal,'Carried condition must affect actual final energy')
 console.log('TERRAIN_DIAGNOSTIC '+JSON.stringify(review))
 pass('029 compare calibrated terrain mode and reset-versus-carried energy; no default promotion')
 assert.equal(checks,7)
 console.log('PASS 7/7 focused multi-stage checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundle cleaned up')}
