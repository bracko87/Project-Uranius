// Local disposable PostgreSQL 17 only. No hosted URLs, passwords or app writes.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,delimiter} from 'node:path'
import {createServer} from 'node:net'
import {spawnSync,spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {buildIntegratedFixture} from '../scripts/uranius-integrated-finalization-review.mjs'
import {createHash} from 'node:crypto'
const args=process.argv.slice(2)
assert.ok(args.length===5&&args[0]==='--disposable-native-pg17'&&args[1]==='--postgres-bin'&&args[3]==='--policy-file')
const root=fileURLToPath(new URL('../',import.meta.url)),bin=resolve(args[2]),ext=process.platform==='win32'?'.exe':''
const exe=Object.fromEntries(['initdb','pg_ctl','psql'].map(n=>[n,join(bin,n+ext)]))
const env={PATH:bin+delimiter+(process.env.PATH||''),SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}
function run(file,argv,opts={}){
 const r=spawnSync(file,argv,{env:opts.env||env,input:opts.input,encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:12e6,stdio:opts.stdio})
 if(r.error)throw r.error
 if(opts.error){assert.notEqual(r.status,0);assert.match(r.stderr,opts.error);return}
 if(r.status!==0)throw Error((r.stderr||r.stdout||'native command failed').slice(0,2000))
 return (r.stdout||'').trim()
}
for(const f of Object.values(exe)){assert.ok(existsSync(f));assert.match(run(f,['--version']),/\b17\.\d+/)}
const scratch=mkdtempSync(join(tmpdir(),'uranius-042-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
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
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex')
const policyText=readFileSync(resolve(args[4]),'utf8')
const raceId=id(100),stageId=id(101),runId=id(201),provenance='synthetic_review_fixture'
const teams=Array.from({length:8},(_,i)=>id(20+i))
const clubs=teams.map((clubId,i)=>({clubId,type:i===7?'developing':'main',parentClubId:i===7?id(99):null})).concat({clubId:id(99),type:'main',parentClubId:null})
const riders=Array.from({length:32},(_,i)=>({riderId:id(1000+i),teamId:teams[Math.floor(i/4)],riderName:'Fixture rider '+i,teamName:'Fixture team '+Math.floor(i/4),condition:{startingEnergy:90,fatigueBeforeStage:20,morale:75,availabilityStatus:'fit'}}))
const input={raceId,stageId,stageFormat:'road_race',distanceKm:120,seed:'042-integrated-fixture',riders}
const output={raceId,stageId,seed:input.seed,engineVersion:'race_engine_ts_v1',simulationMode:'deterministic_road_race_v1',snapshots:[{},{}],events:[],finalRiderStates:riders.map((r,i)=>({riderId:r.riderId,teamId:r.teamId,riderName:r.riderName,teamName:r.teamName,startingCondition:r.condition,stageStatus:'finished',finished:true,finishPosition:i+1,finishTimeSeconds:10000+i*5,distanceKm:120,energy:55-i}))}
const inputText=JSON.stringify(input),outputText=JSON.stringify(output)
const job={jobId:runId,stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:hash(inputText),outputSha256:hash(outputText)}
const scoringReceipt={provenance,completePointDefinitions:true,stageId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,raceFormat:'one_day',points:[{pointId:id(301),type:'FINISH',km:120,pointsScheme:[25,20,16,14,12,10,8,6,4,2],timeBonusSeconds:[10,6,4]},{pointId:id(302),type:'INTERMEDIATE_SPRINT',km:40,pointsScheme:[20,17],timeBonusSeconds:[3,2]},{pointId:id(303),type:'KOM',km:80,pointsScheme:[5,3],timeBonusSeconds:[]}],crossings:[{pointId:id(302),riderIds:riders.map(r=>r.riderId).reverse()},{pointId:id(303),riderIds:riders.map(r=>r.riderId)}]}
const lifecycle={state:'replay_live',hiddenOutputValidated:true,priorStagesAuthoritative:true,dailyRecoveryVerified:true,stageStartGameAt:'2000-01-04T12:00:00Z',gameNow:'2000-01-04T12:30:00Z',realNow:'2000-01-04T12:10:00Z',replayClosesAtReal:'2000-01-04T12:10:00Z'}
const fixture={provenance,completeSyntheticEffects:true,policyText,category:'1.2',job,scoringReceipt,clubs,youngRiderIds:[riders[0].riderId],penalties:riders.map(r=>({riderId:r.riderId,seconds:0})),fatigueInputs:riders.map((r,i)=>({provenance,baseFatigueEvidence:'explicit_synthetic_baseline',riderId:r.riderId,status:'finished',fatigueBefore:20,grossFatigueGain:10,existingBreakawayDebt:0,multiplier:1,recoveryBonus:2,intrinsicDailyRecovery:9,distanceKm:120,segments:i===0?[{fromKm:0,toKm:100,physicalEscapeVerified:true}]:[]})),supplyInputs:teams.map((teamId,i)=>({provenance,stageId,teamId,completeUsageEvidence:true,plan:{explicitRows:[{supplyKey:'energy_gels',quantity:4},{supplyKey:'race_jersey_complete',quantity:1}],riderRows:[]},stock:[{teamId,supplyKey:'energy_gels',quantity:9}],units:[{teamId,unitId:id(400+i),supplyKey:'race_jersey_complete',usesRemaining:1,status:'assigned'}],usage:[{eventId:id(500+i*2),stageId,teamId,supplyKey:'energy_gels',quantity:3},{eventId:id(501+i*2),stageId,teamId,supplyKey:'race_jersey_complete',quantity:1,unitId:id(400+i)}]})),equipmentInputs:{provenance,runId,stageId,distanceKm:120,completeManifest:true,canonicalEquipmentWearPresent:false,items:teams.map((teamId,i)=>({teamId,itemId:id(600+i),isAI:false,conditionBefore:90,totalDistanceKm:200,totalRaceDays:2}))},healthInputs:[{provenance,runId,stageId,candidate:{riderId:riders[0].riderId,teamId:teams[0],incidentId:'fixture-crash',caseCode:'minor_strain',severity:'minor',riskMultiplier:1},priorCase:null,appliedKeys:[]}],prizeFundCash:30000,lifecycle}
const packet=buildIntegratedFixture(fixture)
let checks=0,started=false
const pass=x=>{checks++;console.log('PASS '+x)}
const base='uranius_035_fixture',extSchema='uranius_042_fixture',call=(fault=false)=>"SELECT "+extSchema+".finalize('"+stageId+"',"+fault+");"
const literal=s=>"'"+String(s).replaceAll("'","''")+"'"
const enc=p=>"convert_from(decode('"+Buffer.from(JSON.stringify(p),'utf8').toString('hex')+"','hex'),'UTF8')::jsonb"
const cnt=(schema,table)=>Number(sql('SELECT count(*) FROM '+schema+'.'+table+';'))
const snapshots=[...[ 'stage_input','authority','classifications','fatigue','prize_awards','ranking_awards','transactions','entries','completed_tours'].map(n=>[base,n]),...['packets','resources','effect_log','receipts'].map(n=>[extSchema,n])]
const snapshot=()=>sql("SELECT jsonb_build_array("+snapshots.map(([s,t])=>"(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM "+s+"."+t+" x)").join(',')+");")
const gross=packet.core.cash.reduce((n,x)=>n+x.grossCash,0),tax=packet.evidence.settlements.reduce((n,x)=>n+x.taxCash,0)
try{
 assert.deepEqual(buildIntegratedFixture(fixture),packet);assert.equal(packet.resources.length,24);assert.equal(packet.core.fatigue.length,32)
 assert.equal(packet.core.fatigue.find(r=>r.riderId===riders[0].riderId).fatigue,47)
 assert.equal(packet.evidence.results[0].bonusSeconds,0);assert.equal(packet.evidence.health[0].disposition.availabilityReview,'not_fully_fit')
 assert.equal(packet.evidence.health[0].disposition.recoveryUntil,null);assert.equal(packet.official,false);assert.equal(packet.hostedWriteAllowed,false)
 assert.equal(packet.core.cash.find(x=>x.bucket==='oneday_finish'&&x.rank===1).grossCash,8100);assert.equal(gross,30000);assert.equal(tax,4500)
 pass('042 integrated original-policy scoring, explicit fatigue, stock, wear and health review packet')
 for(const bad of [{...fixture,completeSyntheticEffects:false},{...fixture,policyText:policyText+' '},{...fixture,penalties:fixture.penalties.slice(1)},{...fixture,fatigueInputs:fixture.fatigueInputs.slice(1)},{...fixture,supplyInputs:fixture.supplyInputs.slice(1)},{...fixture,healthInputs:[{...fixture.healthInputs[0],stageId:id(999)}]},{...fixture,equipmentInputs:{...fixture.equipmentInputs,canonicalEquipmentWearPresent:true}},{...fixture,lifecycle:{...lifecycle,gameNow:lifecycle.stageStartGameAt}}])assert.throws(()=>buildIntegratedFixture(bad))
 pass('042 incomplete or mismatched receipts, tampered policy, early reveal refused')
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true;run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 for(const f of ['035_synthetic_finalization_native_REVIEW_ONLY.sql','042_integrated_finalization_native_REVIEW_ONLY.sql'])sql(readFileSync(join(root,'database/reconstruction/worker',f),'utf8'))
 sql("INSERT INTO "+base+".stage_input(stage_id,race_id,run_id,packet,packet_sha,stage_start,game_now,replay_close,real_now,daily_recovery_verified) SELECT "+[stageId,raceId,runId].map(literal).join(',')+",v,encode(sha256(convert_to(v::text,'UTF8')),'hex'),'2000-01-04 12:00Z','2000-01-04 12:30Z','2000-01-04 12:10Z','2000-01-04 12:10Z',true FROM (SELECT "+enc(packet.core)+" v) q;")
 sql("INSERT INTO "+extSchema+".packets SELECT "+literal(stageId)+",v,encode(sha256(convert_to(v::text,'UTF8')),'hex') FROM (SELECT "+enc(packet)+" v) q;")
 for(const r of packet.resources)sql("INSERT INTO "+extSchema+".resources VALUES("+[r.key,r.kind,r.teamId,r.target].map(literal).join(',')+","+enc(r.before)+");")
 const before=snapshot()
 sql("UPDATE "+base+".stage_input SET game_now=stage_start;");sql(call(),/Reveal\/recovery gate closed/);sql("UPDATE "+base+".stage_input SET game_now=stage_start+interval '30 minutes';");assert.equal(snapshot(),before)
 pass('042 database reveal gate prevents both financial and resource effects')
 const target=packet.resources.at(-1)
 sql("UPDATE "+extSchema+".resources SET state='{}'::jsonb WHERE resource_key="+literal(target.key)+";")
 const stale=snapshot();sql(call(),/Stale or missing resource/);assert.equal(snapshot(),stale)
 sql("UPDATE "+extSchema+".resources SET state="+enc(target.before)+" WHERE resource_key="+literal(target.key)+";");assert.equal(snapshot(),before)
 pass('042 stale resource after core postings rolls back all other effects')
 sql(call(true),/Injected integrated failure/);assert.equal(snapshot(),before)
 pass('042 late injected failure rolls back results, fatigue, supplies, wear, health receipt, prizes and publication')
 const pair=await Promise.all([concurrent('BEGIN;'+call()+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(call())])
 assert.deepEqual(pair.map(x=>x.trim()).sort(),['already_published_fixture','published_fixture'])
 assert.equal(cnt(base,'authority'),1);assert.equal(cnt(base,'fatigue'),32);assert.equal(cnt(extSchema,'effect_log'),24);assert.equal(cnt(extSchema,'receipts'),1);assert.equal(cnt(base,'completed_tours'),1)
 assert.equal(sql("SELECT sum(gross_cash) FROM "+base+".prize_awards"),String(gross));assert.equal(sql("SELECT sum(amount) FROM "+base+".transactions WHERE event_type='tax_withholding'"),String(tax));assert.equal(sql("SELECT sum(amount) FROM "+base+".entries"),'0')
 assert.equal(sql("SELECT count(*) FROM "+extSchema+".resources r JOIN "+extSchema+".effect_log l USING(resource_key) WHERE r.state=l.after_state"),'24')
 pass('042 concurrent exactly-once integrated settlement; balanced accounting and all resource changes')
 const final=snapshot();assert.equal(sql(call()),'already_published_fixture');assert.equal(snapshot(),final)
 sql("UPDATE "+extSchema+".packets SET packet=packet||'{\"changed\":true}'::jsonb,packet_sha=encode(sha256(convert_to((packet||'{\"changed\":true}'::jsonb)::text,'UTF8')),'hex');")
 sql(call(),/Partial integrated publication or changed packet/)
 sql("UPDATE "+extSchema+".packets SET packet=packet-'changed',packet_sha=encode(sha256(convert_to((packet-'changed')::text,'UTF8')),'hex');");assert.equal(snapshot(),final)
 sql('CREATE ROLE fixture_outsider LOGIN NOINHERIT;');sql(call(),/permission denied/,'fixture_outsider')
 pass('042 immutable exact retry, changed packet and outsider denied')
 assert.equal(checks,7);console.log('PASS 7/7 integrated synthetic finalization checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster cleaned up')}
