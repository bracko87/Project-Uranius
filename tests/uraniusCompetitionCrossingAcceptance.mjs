// 043A: only the two outstanding 039 full-engine groups. No database or credentials.
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
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
const dir=mkdtempSync(join(tmpdir(),'uranius-043a-crossing-'))
let checks=0
const pass=x=>{checks++;console.log('PASS '+x)}
const run=(label,entry,text)=>new Promise((resolve,reject)=>{
 console.log('INFO 043A '+label+' started')
 const start=Date.now(),child=spawn(process.execPath,[entry],{env,windowsHide:true,stdio:['pipe','pipe','pipe']})
 let size=0,err='',failure=null,done=false
 const chunks=[]
 const stop=reason=>{failure??=reason;child.kill()}
 const heartbeat=setInterval(()=>console.log('INFO 043A '+label+' still running; '+Math.floor((Date.now()-start)/1000)+'s elapsed'),10000)
 const deadline=setTimeout(()=>stop('180-second child deadline exceeded'),180000)
 const finish=(error,result)=>{if(done)return;done=true;clearInterval(heartbeat);clearTimeout(deadline);error?reject(error):resolve(result)}
 child.stdout.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024)stop('stdout size limit exceeded');else chunks.push(chunk)})
 child.stderr.on('data',chunk=>{const s=chunk.toString('utf8');err=(err+s).slice(-4000);process.stderr.write(s)})
 child.on('error',e=>finish(Error('043A '+label+': '+e.message)))
 child.stdin.on('error',e=>{if(e.code!=='EPIPE')stop('stdin: '+e.message)})
 child.on('close',(code,signal)=>{
  if(failure||code!==0){finish(Error('043A '+label+' failed: '+(failure??'exit '+code+' signal '+signal)+'\n'+err));return}
  console.log('INFO 043A '+label+' completed in '+((Date.now()-start)/1000).toFixed(2)+'s')
  finish(null,Buffer.concat(chunks).toString('utf8'))
 })
 child.stdin.end(text,'utf8')
})
try{
 const crossing=join(dir,'crossing.mjs'),legacy=join(dir,'legacy.mjs')
 for(const [entry,outfile] of [['scripts/uranius-competition-crossing-acceptance.ts',crossing],['scripts/uranius-race-job-engine.ts',legacy]]){
  console.log('INFO 043A bundling '+entry)
  await build({entryPoints:[join(root,entry)],outfile,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 }
 const inputText=JSON.stringify(input),packet=JSON.stringify({provenance:'synthetic_review_fixture',jobId:id(201),input,points})
 const raw=await run('crossing review #1',crossing,packet),result=JSON.parse(raw)
 const original=await run('independent frozen default engine',legacy,inputText)
 assert.equal(result.outputText,original,'Legacy bytes changed')
 assert.equal(result.source.inputSha256,sha(inputText));assert.equal(result.source.outputSha256,sha(original));assert.equal(result.source.schemeSha256,sha(JSON.stringify(points)))
 const repeat=await run('crossing review #2',crossing,packet)
 assert.equal(repeat,raw,'Crossing envelope not reproducible')
 assert.equal(result.official,false);assert.equal(result.hostedWriteAllowed,false)
 const roster=input.riders.map(r=>r.riderId).sort()
 const markers=points.filter(p=>['INTERMEDIATE_SPRINT','BONUS_SPRINT','KOM'].includes(p.type))
 assert.equal(result.competitions.length,4)
 assert.deepEqual(result.competitions.map(p=>[p.pointId,p.type,p.km]),markers.map(p=>[p.pointId,p.type,p.km]))
 for(const p of result.competitions){
  assert.deepEqual(p.crossings.map(c=>c.riderId).sort(),roster)
  assert.deepEqual(p.crossings.map(c=>c.rank),Array.from({length:10},(_,i)=>i+1))
  for(const c of p.crossings){
   assert.equal(c.teamId,input.riders.find(r=>r.riderId===c.riderId).teamId)
   assert.ok(c.priorKm<p.km&&c.movedKm>=p.km&&c.speedKmh>0)
   assert.ok(Math.abs(c.crossingTimeSeconds-(c.tickStartSeconds+(p.km-c.priorKm)*3600/c.speedKmh))<=.00000051)
   assert.ok(c.crossingTimeSeconds>=c.tickStartSeconds&&c.crossingTimeSeconds<=c.tickStartSeconds+input.settings.tickSeconds+.000001)
  }
  for(let i=1;i<p.crossings.length;i++)assert.ok(p.crossings[i].crossingTimeSeconds>=p.crossings[i-1].crossingTimeSeconds)
 }
 const sums=new Map(roster.map(r=>[r,{finishPoints:0,sprintPoints:0,mountainPoints:0,bonusSeconds:0}]))
 const finish=JSON.parse(original).finalRiderStates.slice().sort((a,b)=>a.finishPosition-b.finishPosition)
 for(const point of points){
  if(point.type==='TIME_CHECK')continue
  const order=point.type==='FINISH'?finish.map(r=>r.riderId):result.competitions.find(c=>c.pointId===point.pointId).crossings.map(c=>c.riderId)
  for(const [i,riderId] of order.entries()){
   const s=sums.get(riderId),field=point.type==='FINISH'?'finishPoints':point.type==='KOM'?'mountainPoints':'sprintPoints'
   s[field]+=point.pointsScheme[i]??0;s.bonusSeconds+=point.timeBonusSeconds[i]??0
  }
 }
 for(const row of result.stageRace.resultRows)for(const [k,v] of Object.entries(sums.get(row.riderId)))assert.equal(row[k],v)
 assert.deepEqual(result.stageRace.resultRows.map(x=>x.riderId).sort(),roster)
 assert.ok(result.stageRace.resultRows.some(x=>x.sprintPoints>0));assert.ok(result.stageRace.resultRows.some(x=>x.mountainPoints>0));assert.ok(result.stageRace.resultRows.some(x=>x.bonusSeconds>0))
 assert.ok(result.stageRace.resultRows.every(x=>x.penaltySeconds===null&&x.fatigueAfterStage===null&&x.youngEligible===null))
 assert.equal(result.stageRace.accountingAllowed,false);assert.equal(result.stageRace.official,false)
 pass('039 actual engine 40 intermediate crossings, repeatable envelope, byte-identical independent legacy output, generated scoring receipt')
 // Both scoring formats were computed from exactly the same engine job and
 // physical crossing receipt in each child; no second one-day simulation needed.
 assert.deepEqual(result.oneDay.source,result.stageRace.source)
 assert.deepEqual(result.oneDay.resultRows,result.stageRace.resultRows.map(x=>({...x,bonusSeconds:0})))
 assert.deepEqual(result.oneDay.pointResults,result.stageRace.pointResults.filter(x=>x.pointsAwarded>0).map(x=>({...x,bonusSecondsAwarded:0})))
 assert.equal(result.oneDay.accountingAllowed,false);assert.equal(result.oneDay.official,false)
 pass('039 one-day bonus suppression from identical physical crossing receipt')
 assert.equal(checks,2)
 console.log('INFO 043A output SHA-256 '+result.source.outputSha256)
 console.log('PASS 2/2 outstanding 039 full-engine checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
