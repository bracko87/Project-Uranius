// Local disposable PostgreSQL 17 only. No hosted URLs, passwords or app writes.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,delimiter} from 'node:path'
import {createServer} from 'node:net'
import {spawnSync,spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {planSyntheticFinalization as plan} from '../scripts/uranius-synthetic-finalization-plan.mjs'
const args=process.argv.slice(2)
assert.ok(args.length===3&&args[0]==='--disposable-native-pg17'&&args[1]==='--postgres-bin')
const root=fileURLToPath(new URL('../',import.meta.url)),bin=resolve(args[2]),ext=process.platform==='win32'?'.exe':''
const exe=Object.fromEntries(['initdb','pg_ctl','psql'].map(n=>[n,join(bin,n+ext)]))
const env={PATH:bin+delimiter+(process.env.PATH||''),SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}
function run(file,argv,opts={}){
 const r=spawnSync(file,argv,{env:opts.env||env,input:opts.input,encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:4e6,stdio:opts.stdio})
 if(r.error)throw r.error
 if(opts.error){assert.notEqual(r.status,0);assert.match(r.stderr,opts.error);return}
 if(r.status!==0)throw Error((r.stderr||r.stdout||'native command failed').slice(0,2000))
 return (r.stdout||'').trim()
}
for(const f of Object.values(exe)){assert.ok(existsSync(f));assert.match(run(f,['--version']),/\b17\.\d+/)}
const scratch=mkdtempSync(join(tmpdir(),'uranius-035-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
const listener=createServer()
await new Promise((yes,no)=>listener.once('error',no).listen(0,'127.0.0.1',yes))
const port=listener.address().port;await new Promise(yes=>listener.close(yes))
const dbEnv={...env,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',PGPORT:String(port),PGDATABASE:'postgres',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',PGOPTIONS:'-c statement_timeout=10000'}
const argv=user=>['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-f','-']
const sql=(input,error,user=admin)=>run(exe.psql,argv(user),{env:dbEnv,input,error})
const concurrent=input=>new Promise((yes,no)=>{
 const c=spawn(exe.psql,argv(admin),{env:dbEnv,windowsHide:true})
 let out='',err='';const timer=setTimeout(()=>{c.kill();no(Error('concurrent command timeout'))},20000)
 c.stdout.on('data',x=>out+=x);c.stderr.on('data',x=>err+=x)
 c.on('error',e=>{clearTimeout(timer);no(e)})
 c.on('close',code=>{clearTimeout(timer);code===0?yes(out.trim()):no(Error(err.slice(0,1500)))})
 c.stdin.end(input)
})
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const raceId=id(100),s1=id(101),s2=id(102),clubA=id(20),clubB=id(21),parent=id(22)
const stages=[{stageId:s1,stageNumber:1,weatherCancelled:false},{stageId:s2,stageNumber:2,weatherCancelled:false}]
const results=stages.flatMap(s=>Array.from({length:6},(_,i)=>({stageId:s.stageId,riderId:id(i+1),teamId:i<3?clubA:clubB,status:'finished',rank:s.stageNumber===1?i+1:6-i,elapsedSeconds:s.stageNumber===1?100:110,bonusSeconds:s.stageNumber===2&&i===5?5:0,penaltySeconds:0,finishPoints:i===5?10:0,sprintPoints:0,mountainPoints:i===5?7:0,fatigueAfterStage:25+i})))
const base={provenance:'synthetic_review_fixture',raceId,format:'stage_race',worldChampionship:false,scheduledStages:stages,results,clubs:[{clubId:clubA,type:'main',parentClubId:null},{clubId:clubB,type:'developing',parentClubId:parent},{clubId:parent,type:'main',parentClubId:null}],youngRiderIds:[id(6)],coverage:{synchronizedResults:true,youth:true,policy:true},lifecycle:{state:'replay_live',hiddenOutputValidated:true,priorStagesAuthoritative:true,dailyRecoveryVerified:true,stageStartGameAt:'2000-01-04T12:00:00Z',gameNow:'2000-01-04T12:30:00Z',realNow:'2000-01-04T12:10:00Z',replayClosesAtReal:'2000-01-04T12:10:00Z'},prizeFundCash:100000,buckets:[{key:'stage_finish',shareMilliPercent:40000,rankMilliPercent:[60000,40000]},{key:'final_gc',shareMilliPercent:30000,rankMilliPercent:[100000]},{key:'final_team',shareMilliPercent:20000,rankMilliPercent:[100000]},{key:'final_points',shareMilliPercent:5000,rankMilliPercent:[100000]},{key:'final_mountain',shareMilliPercent:3000,rankMilliPercent:[100000]},{key:'final_young',shareMilliPercent:2000,rankMilliPercent:[100000]}],rankingRules:[{source:'stage_finish',rank:1,points:10},{source:'leader_day',rank:1,points:5},{source:'final_gc',rank:1,points:100}]}
const p1=plan({...base,stageId:s1,runId:id(201),results:results.filter(x=>x.stageId===s1)})
const p2=plan({...base,stageId:s2,runId:id(202)})
const cash=p=>p.cash.reduce((n,x)=>n+x.grossCash,0)
let checks=0,started=false
const pass=x=>{checks++;console.log('PASS '+x)}
const schema='uranius_035_fixture',t=n=>schema+'.'+n
const call=(s,fault=false)=>"SELECT "+schema+".finalize('"+s+"',"+fault+");"
const cnt=n=>Number(sql('SELECT count(*) FROM '+t(n)+';'))
const enc=p=>"convert_from(decode('"+Buffer.from(JSON.stringify({...p,fixtureTaxRateBps:1500}),'utf8').toString('hex')+"','hex'),'UTF8')::jsonb"
function insert(p,prior=null){
 const v=enc(p)
 sql("INSERT INTO "+t('stage_input')+"(stage_id,race_id,run_id,packet,packet_sha,stage_start,game_now,replay_close,real_now,daily_recovery_verified,prior_stage_id) SELECT '"+p.stageId+"','"+p.raceId+"','"+p.runId+"',v,encode(sha256(convert_to(v::text,'UTF8')),'hex'),'2000-01-04 12:00Z','2000-01-04 12:30Z','2000-01-04 12:10Z','2000-01-04 12:10Z',true,"+(prior?"'"+prior+"'":"NULL")+" FROM (SELECT "+v+" v) q;")
}
const snapshot=()=>sql("SELECT jsonb_build_object('authority',(SELECT jsonb_agg(to_jsonb(x) ORDER BY stage_id) FROM "+t('authority')+" x),'awards',(SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM "+t('prize_awards')+" x),'tx',(SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM "+t('transactions')+" x),'entries',(SELECT jsonb_agg(to_jsonb(x) ORDER BY tx_id,account) FROM "+t('entries')+" x),'rankings',(SELECT jsonb_agg(to_jsonb(x) ORDER BY stage_id,source_key) FROM "+t('ranking_awards')+" x),'classifications',(SELECT jsonb_agg(to_jsonb(x) ORDER BY stage_id) FROM "+t('classifications')+" x),'fatigue',(SELECT jsonb_agg(to_jsonb(x) ORDER BY stage_id,rider_id) FROM "+t('fatigue')+" x),'tours',(SELECT jsonb_agg(to_jsonb(x) ORDER BY race_id) FROM "+t('completed_tours')+" x),'states',(SELECT jsonb_agg(jsonb_build_array(stage_id,state) ORDER BY stage_id) FROM "+t('stage_input')+"));")
try{
 assert.equal(cash(p1),20000);assert.equal(cash(p2),100000)
 assert.equal(p2.classifications.general[0].riderId,id(6));assert.equal(p2.classifications.general[0].totalTimeSeconds,205)
 assert.equal(p2.classifications.team[0].teamId,clubB);assert.equal(p2.classifications.team[0].totalTimeSeconds,625)
 assert.equal(p2.ranking.reduce((n,x)=>n+x.riderPoints,0),115)
 assert.ok(p2.cash.filter(x=>x.teamId===clubB).every(x=>x.paymentClubId===parent))
 assert.equal(p2.cash.filter(x=>x.riderId===null).length,1)
 assert.equal(plan({...base,stageId:s2,runId:id(202),worldChampionship:true}).cash.length,0)
 assert.equal(plan({...base,stageId:s2,runId:id(202),worldChampionship:true}).ranking.length,0)
 const one=plan({...base,stageId:s1,runId:id(203),format:'one_day',scheduledStages:[stages[0]],results:results.filter(x=>x.stageId===s1),buckets:[{key:'oneday_finish',shareMilliPercent:100000,rankMilliPercent:[100000]}],rankingRules:[{source:'oneday_finish',rank:1,points:25}]})
 assert.equal(cash(one),100000);assert.equal(one.ranking[0].riderPoints,25)
 const extreme=plan({...base,stageId:s2,runId:id(202),results:results.map(x=>x.riderId===id(6)&&x.stageId===s1?{...x,bonusSeconds:200}:x)})
 assert.equal(extreme.classifications.general[0].totalTimeSeconds,105)
 pass('035 original V1 per-stage clamp, category award amounts, stage/GC leader ranking, parent club, one-day and WRC exclusion')
 for(const bad of [{...base,scheduledStages:[stages[0],{...stages[1],weatherCancelled:true}]},{...base,lifecycle:{...base.lifecycle,gameNow:'2000-01-04T12:29:59Z'}},{...base,lifecycle:{...base.lifecycle,realNow:'2000-01-04T12:09:59Z'}},{...base,coverage:{...base.coverage,policy:false}},{...base,results:[...results,results[0]]}])assert.throws(()=>plan({...bad,stageId:s2,runId:id(202)}))
 pass('035 incomplete source, cancellation and early reveal refused')
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true;run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 sql(readFileSync(join(root,'database/reconstruction/worker/035_synthetic_finalization_native_REVIEW_ONLY.sql'),'utf8'))
 insert(p1);insert(p2,s1)
 const before=snapshot()
 sql(call(s2),/Prior stage not authoritative/);assert.equal(snapshot(),before)
 sql("UPDATE "+t('stage_input')+" SET game_now=stage_start WHERE stage_id='"+s1+"';")
 sql(call(s1),/Reveal\/recovery gate closed/)
 sql("UPDATE "+t('stage_input')+" SET game_now=stage_start+interval '30 minutes' WHERE stage_id='"+s1+"';")
 assert.equal(snapshot(),before)
 pass('035 database stage order and reveal gate enforced')
 sql(call(s1,true),/Injected failure/);assert.equal(snapshot(),before)
 pass('035 injected failure rolls back classifications, fatigue, prizes, rankings, authority and postings')
 assert.equal(sql(call(s1)),'published_fixture')
 const first=snapshot();assert.equal(cnt('prize_awards'),2);assert.equal(cnt('transactions'),4)
 assert.equal(sql(call(s1)),'already_published');assert.equal(snapshot(),first)
 pass('035 first stage settled once and exact retry idle')
 const original=enc(p2),changed=enc({...p2,cash:p2.cash.map(x=>x.stageId===s1?{...x,grossCash:x.grossCash+1}:x)})
 const setPacket=v=>sql("UPDATE "+t('stage_input')+" SET packet=v,packet_sha=encode(sha256(convert_to(v::text,'UTF8')),'hex') FROM (SELECT "+v+" v) q WHERE stage_id='"+s2+"';")
 setPacket(changed);sql(call(s2),/Changed prior award refused/);setPacket(original);assert.equal(snapshot(),first)
 sql(call(s2,true),/Injected failure/);assert.equal(snapshot(),first)
 pass('035 final stage refuses changed previously paid award and rolls back late failure')
 const pair=await Promise.all([concurrent('BEGIN;'+call(s2)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(call(s2))])
 assert.deepEqual(pair.map(x=>x.trim()).sort(),['already_published','published_fixture'])
 assert.equal(cnt('authority'),2);assert.equal(cnt('prize_awards'),9);assert.equal(cnt('transactions'),18);assert.equal(cnt('entries'),36);assert.equal(cnt('completed_tours'),1);assert.equal(cnt('ranking_awards'),5);assert.equal(cnt('fatigue'),12)
 assert.equal(sql("SELECT sum(gross_cash) FROM "+t('prize_awards')),'100000')
 assert.equal(sql("SELECT sum(amount) FROM "+t('transactions')+" WHERE event_type='tax_withholding'"),'15000')
 assert.equal(sql("SELECT sum(amount) FROM "+t('entries')),'0')
 assert.equal(sql("SELECT count(*) FROM (SELECT tx_id FROM "+t('entries')+" GROUP BY tx_id HAVING sum(amount)<>0 OR count(*)<>2) x"),'0')
 pass('035 concurrent finalization exactly once, gross 100000, tax 15000, balanced ledger')
 sql("INSERT INTO "+t('prize_awards')+"(race_id,stage_id,bucket,rank,team_id,rider_id,payment_club_id,gross_cash) SELECT race_id,stage_id,bucket,rank,team_id,rider_id,payment_club_id,gross_cash FROM "+t('prize_awards')+" WHERE rider_id IS NULL;",/duplicate key/)
 sql('CREATE ROLE fixture_outsider LOGIN NOINHERIT;')
 sql(call(s2),/permission denied/,'fixture_outsider')
 const final=snapshot();assert.equal(sql(call(s2)),'already_published');assert.equal(snapshot(),final)
 pass('035 null-safe team award uniqueness, outsider denied, final retry immutable')
 assert.equal(checks,8);console.log('PASS 8/8 focused local finalization checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster cleaned up')}
