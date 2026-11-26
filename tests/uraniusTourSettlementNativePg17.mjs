// Local disposable PostgreSQL 17 only. No hosted URLs, passwords or app writes.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,delimiter} from 'node:path'
import {createServer} from 'node:net'
import {spawnSync,spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {buildTourSettlement} from '../scripts/uranius-tour-settlement-review.mjs'
import {loadOriginalPolicy} from '../scripts/uranius-original-policy-review.mjs'
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
const scratch=mkdtempSync(join(tmpdir(),'uranius-043c-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
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

const P='synthetic_review_fixture',raceId=id(100),category='2.2'
const c=loadOriginalPolicy(policyText).categories.find(x=>x.code===category)
const count=Math.max(3,c.minRiders);assert.ok(count<=c.maxRiders)
const teams=Array.from({length:c.minTeams},(_,i)=>id(20+i))
const clubs=teams.map((clubId,i)=>({clubId,type:i===teams.length-1?'developing':'main',parentClubId:i===teams.length-1?id(900):null})).concat({clubId:id(900),type:'main',parentClubId:null})
const roster=teams.flatMap((teamId,i)=>Array.from({length:count},(_,j)=>({riderId:id(1000+i*count+j),teamId,riderName:'Fixture rider '+(i*count+j),teamName:'Fixture team '+i})))
const schedule=[{stageId:id(101),stageNumber:1,date:'2000-01-04',weatherCancelled:false},{stageId:id(102),stageNumber:2,date:'2000-01-05',weatherCancelled:false}]
const youngRiderIds=roster.filter((_,i)=>i%count===0).map(r=>r.riderId)
const initial=teams.flatMap((teamId,i)=>[
 {resourceType:'supply',resourceId:'gel-'+i,teamId,quantity:10,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null,selectedQuantity:3},
 {resourceType:'equipment',resourceId:'bike-'+i,teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:90,lastUsedDate:null},
 {resourceType:'supply',resourceId:'jersey-'+i,teamId,quantity:null,stageUsesRemaining:5,maxStageUses:10,condition:null,lastUsedDate:null,selectedStageUses:1}
])
function fixture(index,previous=null){
 const {stageId,date}=schedule[index],runId=id(201+index),prior=previous?.packet??null
 const riders=roster.map(r=>({...r,condition:{startingEnergy:100,fatigueBeforeStage:prior?prior.carryover.riders.find(x=>x.riderId===r.riderId).persistedFatigue-7:20,morale:50,availabilityStatus:'fit'}}))
 const input={raceId,stageId,stageFormat:'road_race',distanceKm:100,seed:'043C-stage-'+index,riders}
 const order=index===0?riders:[...riders].reverse()
 const output={raceId,stageId,seed:input.seed,engineVersion:'race_engine_ts_v1',simulationMode:'deterministic_road_race_v1',snapshots:[{},{}],events:[],finalRiderStates:order.map((r,i)=>({riderId:r.riderId,teamId:r.teamId,riderName:r.riderName,teamName:r.teamName,startingCondition:r.condition,stageStatus:'finished',finished:true,finishPosition:i+1,finishTimeSeconds:10000+i*(index===0?5:10),distanceKm:100,energy:60}))}
 const inputText=JSON.stringify(input),outputText=JSON.stringify(output),job={jobId:runId,stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:hash(inputText),outputSha256:hash(outputText)}
 const scoringReceipt={provenance:P,completePointDefinitions:true,stageId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,raceFormat:'stage_race',points:[{pointId:id(301+index*3),type:'FINISH',km:100,pointsScheme:[25,20,16],timeBonusSeconds:[10,6,4]},{pointId:id(302+index*3),type:'INTERMEDIATE_SPRINT',km:40,pointsScheme:[5,3],timeBonusSeconds:[3,2]},{pointId:id(303+index*3),type:'KOM',km:80,pointsScheme:[5,3],timeBonusSeconds:[]}],crossings:[{pointId:id(302+index*3),riderIds:order.map(r=>r.riderId)},{pointId:id(303+index*3),riderIds:order.map(r=>r.riderId)}]}
 const carryover={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,schedule,distanceKm:100,previousReceipt:prior?.carryover??null,expectedPreviousDigest:prior?.carryoverSha256??null,
 workloads:riders.map(r=>({provenance:P,completeWorkloadEvidence:true,riderId:r.riderId,teamId:r.teamId,status:'finished',eligibleToStart:true,effectiveFatigueBeforeStage:r.condition.fatigueBeforeStage,startEnergy:100,rawFinishEnergy:60,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm:100,difficultyCategory:2,postStageFatigueMultiplier:1,postStageRecoveryBonusPoints:0,recoverySkill:50,morale:50,preparationIncidentRiskMultiplier:1,incidents:[],breakawaySegments:[]})),
 recoveryReceipts:prior?prior.carryover.riders.map(r=>({provenance:P,raceId,stageId,previousStageId:prior.stageId,date,riderId:r.riderId,previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:r.persistedFatigue,travelDelta:1,activityLoad:13,consecutiveHeavyDays:0,recovery:50,morale:50,activityBonus:0,doctorBonus:0,clubType:'main',residentialCampusActive:false})):[],
 resources:prior?prior.carryover.resources.map(r=>({...r.after,...(r.after.resourceId.startsWith('gel-')?{selectedQuantity:3}:r.after.resourceId.startsWith('jersey-')?{selectedStageUses:1}:{})})):initial}
 const lifecycle={state:'replay_live',hiddenOutputValidated:true,priorStagesAuthoritative:true,dailyRecoveryVerified:true,stageStartGameAt:date+'T12:00:00Z',gameNow:date+'T12:30:00Z',realNow:date+'T12:10:00Z',replayClosesAtReal:date+'T12:10:00Z'}
 return {provenance:P,completeSyntheticEvidence:true,policyText,category,carryover,job,scoringReceipt,clubs,youngRiderIds,penalties:riders.map(r=>({riderId:r.riderId,seconds:0})),prizeFundCash:c.minCash,lifecycle,previousPacket:prior,expectedPreviousPacketDigest:previous?.sha256??null}
}
let checks=0,started=false
const pass=x=>{checks++;console.log('PASS '+x)}
const base='uranius_035_fixture',extSchema='uranius_043c_fixture'
const literal=s=>"'"+String(s).replaceAll("'","''")+"'"
const enc=p=>"convert_from(decode('"+Buffer.from(JSON.stringify(p),'utf8').toString('hex')+"','hex'),'UTF8')::jsonb"
const call=(id,fault=false)=>"SELECT "+extSchema+".finalize("+literal(id)+","+fault+");"
const cnt=(schema,table)=>Number(sql('SELECT count(*) FROM '+schema+'.'+table+';'))
const snapshots=[...['stage_input','authority','classifications','fatigue','prize_awards','ranking_awards','transactions','entries','completed_tours'].map(n=>[base,n]),...['packets','resources','effects','receipts'].map(n=>[extSchema,n])]
const snapshot=()=>sql("SELECT jsonb_build_array("+snapshots.map(([s,t])=>"(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM "+s+"."+t+" x)").join(',')+");")
const ledger=id=>sql("SELECT "+extSchema+".ledger_snapshot("+literal(id)+");")
try{
 const a=fixture(0),first=buildTourSettlement(a),b=fixture(1,first),second=buildTourSettlement(b),p=first.packet,q=second.packet
 const s1=p.stageId,s2=q.stageId,n=p.carryover.resources.length
 assert.deepEqual(buildTourSettlement(a),first);assert.deepEqual(buildTourSettlement(b),second)
 assert.equal(p.core.final,false);assert.equal(q.core.final,true)
 assert.equal(p.stageResults[0].bonusSeconds,13)
 assert.equal(q.core.classifications.general.length,roster.length)
 assert.equal(q.core.classifications.general[0].riderId,roster.at(-1).riderId)
 assert.equal(q.carryover.riders[0].persistedFatigue,33)
 assert.equal(q.carryover.resources.find(x=>x.after.resourceId==='gel-0').after.quantity,4)
 assert.deepEqual(q.settlements.filter(x=>x.stageId===s1),p.settlements)
 assert.ok(q.settlements.some(x=>x.bucket==='final_gc'));assert.ok(q.currentStageOnly.grossCash>0)
 assert.equal(q.allGenerated.grossCash,q.allGenerated.taxCash+q.allGenerated.netCash)
 pass('043C exact private policy, two-stage engine scoring, cumulative GC, carried fatigue and resources, immutable prior awards')
 for(const bad of [{...b,expectedPreviousPacketDigest:'0'.repeat(64)},{...b,policyText:policyText+' '},{...b,prizeFundCash:b.prizeFundCash+1},{...b,penalties:b.penalties.slice(1)},{...b,youngRiderIds:[]},{...b,lifecycle:{...b.lifecycle,gameNow:b.lifecycle.stageStartGameAt}}])assert.throws(()=>buildTourSettlement(bad))
 const wrong=structuredClone(b);wrong.carryover.workloads[0].rawFinishEnergy=61;assert.throws(()=>buildTourSettlement(wrong),/scoring and workload/)
 pass('043C altered prior, policy, eligibility, energy and early reveal refused')
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true;run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 for(const f of ['035_synthetic_finalization_native_REVIEW_ONLY.sql','043C_tour_settlement_native_REVIEW_ONLY.sql'])sql(readFileSync(join(root,'database/reconstruction/worker',f),'utf8'))
 for(const [packet,fx,prior] of [[p,a,null],[q,b,s1]]){
  const l=fx.lifecycle
  sql("INSERT INTO "+base+".stage_input(stage_id,race_id,run_id,packet,packet_sha,stage_start,game_now,replay_close,real_now,daily_recovery_verified,prior_stage_id) SELECT "+[packet.stageId,raceId,packet.runId].map(literal).join(',')+",v,encode(sha256(convert_to(v::text,'UTF8')),'hex'),"+[l.stageStartGameAt,l.gameNow,l.replayClosesAtReal,l.realNow].map(literal).join(',')+",true,"+(prior?literal(prior):'NULL')+" FROM (SELECT "+enc(packet.core)+" v) q;")
  sql("INSERT INTO "+extSchema+".packets SELECT "+literal(packet.stageId)+",v,encode(sha256(convert_to(v::text,'UTF8')),'hex') FROM (SELECT "+enc(packet)+" v) q;")
 }
 for(const x of p.carryover.resources){const r=x.before;sql("INSERT INTO "+extSchema+".resources VALUES("+literal(r.resourceType+':'+r.resourceId)+","+enc(r)+");")}
 const empty=snapshot();sql(call(s2),/Prior integrated receipt/);assert.equal(snapshot(),empty)
 assert.equal(sql(call(s1)),'published_fixture');const one=snapshot(),priorLedger=ledger(s1)
 assert.equal(sql(call(s1)),'already_published_fixture');assert.equal(snapshot(),one)
 assert.equal(cnt(base,'completed_tours'),0);assert.equal(cnt(extSchema,'effects'),n)
 pass('043C prior stage gate and exactly-once first-stage settlement')
 const stale=q.carryover.resources.at(-1).before,k=stale.resourceType+':'+stale.resourceId
 const changed={...stale,teamId:id(999)}
 sql("UPDATE "+extSchema+".resources SET state="+enc(changed)+" WHERE resource_key="+literal(k)+";")
 const badStock=snapshot();sql(call(s2),/Stale resource/);assert.equal(snapshot(),badStock)
 sql("UPDATE "+extSchema+".resources SET state="+enc(stale)+" WHERE resource_key="+literal(k)+";");assert.equal(snapshot(),one)
 sql(call(s2,true),/Injected tour failure/);assert.equal(snapshot(),one);assert.equal(ledger(s1),priorLedger)
 pass('043C stage 2 stale stock and late failure roll back all postings and effects')
 const award=JSON.parse(priorLedger).awards.find(x=>x.gross_cash>0);assert.ok(award)
 sql("UPDATE "+base+".prize_awards SET gross_cash=gross_cash+1 WHERE id="+literal(award.id)+";")
 const tampered=snapshot();sql(call(s2),/Prior integrated receipt or ledger changed/);assert.equal(snapshot(),tampered)
 sql("UPDATE "+base+".prize_awards SET gross_cash=gross_cash-1 WHERE id="+literal(award.id)+";");assert.equal(snapshot(),one)
 pass('043C tampered paid prior award refused with no additional effects')
 const pair=await Promise.all([concurrent('BEGIN;'+call(s2)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(call(s2))])
 assert.deepEqual(pair.map(x=>x.trim()).sort(),['already_published_fixture','published_fixture'])
 assert.equal(ledger(s1),priorLedger);assert.equal(cnt(base,'authority'),2);assert.equal(cnt(base,'completed_tours'),1);assert.equal(cnt(extSchema,'effects'),2*n);assert.equal(cnt(extSchema,'receipts'),2)
 assert.equal(cnt(base,'prize_awards'),q.settlements.length)
 assert.equal(sql("SELECT sum(gross_cash) FROM "+base+".prize_awards"),String(q.allGenerated.grossCash))
 assert.equal(sql("SELECT coalesce(sum(amount),0) FROM "+base+".transactions WHERE event_type='tax_withholding'"),String(q.allGenerated.taxCash))
 assert.equal(sql("SELECT sum(amount) FROM "+base+".entries"),'0')
 assert.equal(sql("SELECT count(*) FROM "+extSchema+".resources r JOIN "+extSchema+".effects e USING(resource_key) WHERE e.stage_id="+literal(s2)+" AND r.state=e.after_state"),String(n))
 pass('043C concurrent final stage exactly once, balanced tax and cash, prior ledger unchanged, final resource state')
 const final=snapshot();assert.equal(sql(call(s1)),'already_published_fixture');assert.equal(sql(call(s2)),'already_published_fixture');assert.equal(snapshot(),final)
 sql('CREATE ROLE fixture_outsider LOGIN NOINHERIT;');sql(call(s2),/permission denied/,'fixture_outsider')
 pass('043C immutable retries of both stages and outsider denial')
 assert.equal(checks,7);console.log('PASS 7/7 integrated two-stage settlement checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster cleaned up')}
