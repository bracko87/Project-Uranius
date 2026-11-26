// 043F: canonical marker to engine scoring integration. Offline only.
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reconcileCanonicalMarkerReview} from '../scripts/uranius-canonical-marker-review.mjs'
import {buildCalendarInput} from '../scripts/uranius-calendar-dispatch.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const root=fileURLToPath(new URL('../',import.meta.url))
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const a=id(11),b=id(12)
const stage={raceId:id(100),stageId:id(101),stageName:'Offline scoring stage',stageDate:'2000-01-03',stageNumber:1,distanceKm:120,terrainType:'hilly',stageFormat:'road_race',raceStatus:'scheduled',acceptedClubs:[a,b],preparedClubs:[a,b],hasJob:false,hasArchive:false,rows:Array.from({length:10},(_,i)=>({riderUuid:id(1000+i),clubId:i<5?a:b,teamId:i<5?1:2,riderName:'Review Rider '+(i+1),teamName:i<5?'A':'B',selectionOrder:i%5+1,role:i%5===0?'captain':'domestique',flat:60+i,climbing:50+3*i,stamina:70,resistance:75,provenance:'uranius_synthetic_fixture'}))}
const input=buildCalendarInput(stage)
const marker=(n,type,km,pointsScheme=[20,17],timeBonusSeconds=[])=>({pointId:id(n),type,km,pointsScheme,timeBonusSeconds})
const points=[marker(301,'INTERMEDIATE_SPRINT',.05),marker(302,'BONUS_SPRINT',.1,[5,3],[3,2]),marker(303,'KOM',80,[5,3,2,1]),marker(304,'KOM',119.95,[5,3,2,1]),marker(305,'FINISH',120,[25,20,16,14,12,10,8,6,4,2],[10,6,4]),marker(306,'TIME_CHECK',90,[],[])]

const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))
const sha=text=>createHash('sha256').update(text,'utf8').digest('hex')
const dir=mkdtempSync(join(tmpdir(),'uranius-043f-scoring-'))
let checks=0
const pass=x=>{checks++;console.log('PASS '+x)}
const run=(label,entry,text)=>new Promise((resolve,reject)=>{
 console.log('INFO 043F '+label+' started')
 const start=Date.now(),child=spawn(process.execPath,[entry],{env,windowsHide:true,stdio:['pipe','pipe','pipe']})
 let size=0,err='',failure=null,done=false
 const chunks=[]
 const stop=reason=>{failure??=reason;child.kill()}
 const heartbeat=setInterval(()=>console.log('INFO 043F '+label+' still running; '+Math.floor((Date.now()-start)/1000)+'s elapsed'),10000)
 const deadline=setTimeout(()=>stop('180-second child deadline exceeded'),180000)
 const finish=(error,result)=>{if(done)return;done=true;clearInterval(heartbeat);clearTimeout(deadline);error?reject(error):resolve(result)}
 child.stdout.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024)stop('stdout size limit exceeded');else chunks.push(chunk)})
 child.stderr.on('data',chunk=>{const s=chunk.toString('utf8');err=(err+s).slice(-4000);process.stderr.write(s)})
 child.on('error',e=>finish(Error('043F '+label+': '+e.message)))
 child.stdin.on('error',e=>{if(e.code!=='EPIPE')stop('stdin: '+e.message)})
 child.on('close',(code,signal)=>{
  if(failure||code!==0){finish(Error('043F '+label+' failed: '+(failure??'exit '+code+' signal '+signal)+'\n'+err));return}
  console.log('INFO 043F '+label+' completed in '+((Date.now()-start)/1000).toFixed(2)+'s')
  finish(null,Buffer.concat(chunks).toString('utf8'))
 })
 child.stdin.end(text,'utf8')
})

const canonicalRows=points.map((p,i)=>({id:p.pointId,stage_id:input.stageId,point_type:p.type,km_from_start:p.type==='INTERMEDIATE_SPRINT'?.04:p.type==='BONUS_SPRINT'?.08:p.type==='KOM'?p.km-.01:p.km,name:p.type,kom_category:p.type==='KOM'?'3':null,points_scheme:p.pointsScheme,time_bonus_seconds:p.timeBonusSeconds,is_finish_point:p.type==='FINISH',sort_order:i}))
const markerEvidence={provenance:'synthetic_review_fixture',completeCanonicalEvidence:true,stageId:input.stageId,distanceKm:input.distanceKm,stageFormat:input.stageFormat,canonicalRows,profile:{intermediate_sprints:[],mountain_climbs:[],route_markers:[{type:'sprint',km:.05,label:'Town sprint'},{type:'sprint',km:.1,label:'Bonus sprint'},{type:'kom',km:80,category:'2'},{type:'kom',km:119.95,category:'HC'},{type:'sprint',km:90,label:'Time check'}]}}
const inputText=JSON.stringify(input)
function packet(e){return {provenance:'synthetic_review_fixture',jobId:id(201),input,markerEvidence:e,expectedInputSha256:sha(inputText),expectedMarkerEvidenceSha256:carryoverDigest(e)}}
try{
 const crossing=join(dir,'canonical.mjs'),legacy=join(dir,'legacy.mjs')
 for(const [entry,outfile] of [['scripts/uranius-canonical-scoring-engine-review.ts',crossing],['scripts/uranius-race-job-engine.ts',legacy]])await build({entryPoints:[join(root,entry)],outfile,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 const p=packet(markerEvidence),raw=await run('canonical crossing and scoring',crossing,JSON.stringify(p)),result=JSON.parse(raw)
 const original=await run('independent default engine',legacy,inputText)
 assert.equal(result.outputText,original)
 assert.equal(result.evidence.inputSha256,sha(inputText));assert.equal(result.evidence.outputSha256,sha(original))
 assert.equal(result.evidence.markerEvidenceSha256,p.expectedMarkerEvidenceSha256)
 const expected=reconcileCanonicalMarkerReview(markerEvidence)
 assert.deepEqual(result.markers,expected.receipt);assert.equal(result.evidence.markerReceiptSha256,expected.sha256)
 assert.deepEqual(result.competitions.map(x=>({pointId:x.pointId,type:x.type,km:x.km})),expected.receipt.traceMarkers)
 assert.equal(result.competitions.length,4)
 assert.equal(result.competitions.reduce((n,c)=>n+c.crossings.length,0),40)
 assert.equal(result.markers.excludedTimingMarkers.length,1);assert.equal(result.markers.points.find(x=>x.pointId===id(303)).canonicalKm,79.99)
 assert.equal(result.evidence.mode,'physical_crossing_review')
 pass('043F canonical profile geometry and immutable schemes drive 40 actual crossings; default engine bytes unchanged')
 const roster=input.riders.map(r=>r.riderId).sort(),finish=JSON.parse(original).finalRiderStates.slice().sort((a,b)=>a.finishPosition-b.finishPosition)
 const sums=new Map(roster.map(r=>[r,{finishPoints:0,sprintPoints:0,mountainPoints:0,bonusSeconds:0}]))
 for(const point of expected.receipt.scoringPoints){
  if(point.type==='TIME_CHECK')continue
  const order=point.type==='FINISH'?finish.map(r=>r.riderId):result.competitions.find(c=>c.pointId===point.pointId).crossings.map(c=>c.riderId)
  assert.deepEqual([...order].sort(),roster)
  for(const [i,riderId] of order.entries()){
   const s=sums.get(riderId),key=point.type==='FINISH'?'finishPoints':point.type==='KOM'?'mountainPoints':'sprintPoints'
   s[key]+=point.pointsScheme[i]??0;s.bonusSeconds+=point.timeBonusSeconds[i]??0
  }
 }
 for(const row of result.stageRace.resultRows)for(const [k,v] of Object.entries(sums.get(row.riderId)))assert.equal(row[k],v)
 assert.ok(result.stageRace.pointResults.every(x=>x.pointId!==id(306)))
 assert.deepEqual(result.oneDay.resultRows,result.stageRace.resultRows.map(x=>({...x,bonusSeconds:0})))
 assert.deepEqual(result.oneDay.pointResults,result.stageRace.pointResults.filter(x=>x.pointsAwarded>0).map(x=>({...x,bonusSecondsAwarded:0})))
 assert.equal(result.evidence.crossingsSha256,carryoverDigest(result.competitions));assert.equal(result.evidence.stageRaceSha256,carryoverDigest(result.stageRace));assert.equal(result.evidence.oneDaySha256,carryoverDigest(result.oneDay));assert.equal(result.evidenceSha256,carryoverDigest(result.evidence))
 assert.equal(result.official,false);assert.equal(result.hostedWriteAllowed,false);assert.equal(result.accountingAllowed,false);assert.equal(result.authoritativeSourceVerified,false)
 pass('043F independent score sums, no timing awards, one-day bonus suppression and exact evidence hashes')
 const again=await run('deterministic repeat',crossing,JSON.stringify(p));assert.equal(again,raw)
 pass('043F reproducible complete evidence and scoring envelope')
 const finishEvidence={...markerEvidence,canonicalRows:canonicalRows.filter(x=>['FINISH','TIME_CHECK'].includes(x.point_type)),profile:{intermediate_sprints:[],mountain_climbs:[],route_markers:[{type:'time_check',km:90}]}}
 const only=JSON.parse(await run('finish-only canonical scoring',crossing,JSON.stringify(packet(finishEvidence))))
 assert.equal(only.outputText,original);assert.equal(only.evidence.mode,'finish_only');assert.equal(only.evidence.tieRule,null);assert.deepEqual(only.competitions,[])
 assert.ok(only.stageRace.resultRows.every(x=>x.sprintPoints===0&&x.mountainPoints===0))
 assert.deepEqual(only.stageRace.resultRows.map(x=>x.finishPoints),result.stageRace.resultRows.map(x=>x.finishPoints))
 assert.equal(only.stageRace.resultRows.reduce((n,x)=>n+x.bonusSeconds,0),20)
 assert.ok(only.oneDay.resultRows.every(x=>x.bonusSeconds===0))
 pass('043F finish-only race preserves engine output and correct finish awards without invented crossings')
 const bad=structuredClone(p);bad.markerEvidence.canonicalRows[0].points_scheme=[999]
 await assert.rejects(run('tampered marker evidence',crossing,JSON.stringify(bad)),/marker evidence digest mismatch/)
 await assert.rejects(run('tampered input digest',crossing,JSON.stringify({...p,expectedInputSha256:'0'.repeat(64)})),/input digest mismatch/)
 const foreign=structuredClone(markerEvidence);foreign.stageId=id(999)
 await assert.rejects(run('foreign stage evidence',crossing,JSON.stringify(packet(foreign))),/marker stage scope mismatch/)
 const missing=structuredClone(markerEvidence);missing.profile.route_markers.shift()
 await assert.rejects(run('mismatched geometry',crossing,JSON.stringify(packet(missing))),/count mismatch/)
 await assert.rejects(run('caller-supplied crossings',crossing,JSON.stringify({...p,crossings:[]})),/unexpected packet fields/)
 pass('043F modified input/marker digest, foreign source, missing geometry and caller-supplied crossings refused')
 assert.equal(checks,5)
 console.log('PASS 5/5 canonical engine scoring integration checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
