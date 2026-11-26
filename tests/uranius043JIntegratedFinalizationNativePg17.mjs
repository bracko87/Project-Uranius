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
import {loadOriginalHealthCatalogue} from '../scripts/uranius-original-health-catalogue-review.mjs'
const args=process.argv.slice(2)
assert.ok(args.length===7&&args[0]==='--disposable-native-pg17'&&args[1]==='--postgres-bin'&&args[3]==='--policy-file'&&args[5]==='--catalogue-file')
const cataloguePath=resolve(args[6]);loadOriginalHealthCatalogue(cataloguePath)
const catalogueText=readFileSync(cataloguePath,'utf8')
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
const scratch=mkdtempSync(join(tmpdir(),'uranius-043j-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
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

let checks=0,started=false;const pass=x=>{checks++;console.log('PASS '+x)}
const base='uranius_035_fixture',d='uranius_043d_fixture',h='uranius_043h_fixture',i='uranius_043i_fixture',j='uranius_043j_fixture'
const lit=s=>"'"+String(s).replaceAll("'","''")+"'"
const raw=s=>"convert_from(decode('"+Buffer.from(s,'utf8').toString('hex')+"','hex'),'UTF8')"
const enc=p=>raw(JSON.stringify(p))+'::jsonb'
const dig=v=>"encode(sha256(convert_to(("+v+")::text,'UTF8')),'hex')"
const call=(run,fault=false)=>'SELECT '+j+'.finalize('+lit(run)+','+fault+');'
const cnt=(schema,t)=>Number(sql('SELECT count(*) FROM '+schema+'.'+t+';'))
const tables=[[base,['stage_input','authority','classifications','fatigue','prize_awards','ranking_awards','transactions','entries','completed_tours']],[d,['source','expected','attestations','receipts']],[h,['jobs','owners','stock','units','wear','effects','receipts']],[i,['jobs','riders','cases','contexts','events','receipts']],[j,['bundles','receipts']]]
const snapshot=()=>sql("SELECT "+dig("jsonb_build_array("+tables.flatMap(([s,ts])=>ts.map(t=>"(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM "+s+"."+t+" x)")).join(',')+")")+";")
const closed=run=>sql('SELECT '+dig(j+'.closed_snapshot('+lit(run)+')')+';')
const owner=t=>clubs.find(c=>c.clubId===t).parentClubId??t
function resources(packet){
 return packet.carryover.resources.map(({before,effect})=>{
  const [kind,n]=before.resourceId.split('-'),index=Number(n),o=owner(before.teamId)
  assert.equal(teams[index],before.teamId)
  if(kind==='gel')return {key:'supply:'+o+':energy_gels',ownerId:o,kind:'consumable',supplyKey:'energy_gels',quantityUsed:effect.quantityUsed}
  if(kind==='bike'){const u=id(5000+index);return {key:'wear:'+u,ownerId:o,kind:'wear',resourceId:u,assetKind:'equipment',conditionUsed:effect.conditionUsed}}
  assert.equal(kind,'jersey');const u=id(6000+index);return {key:'durable:'+u,ownerId:o,kind:'durable',unitId:u,supplyKey:'race_jersey_complete',stageUsesUsed:effect.stageUsesUsed}
 })
}
function seed(packet,fx,prior,index){
 const l=fx.lifecycle,r=packet.runId,stage=packet.stageId,date=schedule[index].date
 sql('INSERT INTO '+d+'.source VALUES('+[r,raceId,stage].map(lit).join(',')+','+(index+1)+','+(prior?lit(prior.runId):'NULL')+",'authority_rehearsal','completed',"+[fx.job.inputText,fx.job.outputText,fx.job.inputSha256,fx.job.outputSha256].map(lit).join(',')+','+lit(date+'T12:05:00Z')+',NULL,NULL,'+[l.stageStartGameAt,l.gameNow,l.replayClosesAtReal,l.realNow].map(lit).join(',')+');')
 sql('INSERT INTO '+base+'.stage_input(stage_id,race_id,run_id,packet,packet_sha,stage_start,game_now,replay_close,real_now,daily_recovery_verified,prior_stage_id) SELECT '+[stage,raceId,r].map(lit).join(',')+',v,'+dig('v')+','+[l.stageStartGameAt,l.gameNow,l.replayClosesAtReal,l.realNow].map(lit).join(',')+',true,'+(prior?lit(prior.stageId):'NULL')+' FROM (SELECT '+enc(packet.core)+' v) q;')
 const health=[{riderId:roster[0].riderId,clubId:roster[0].teamId,incidentId:'fixture-'+index,caseCode:index===0?'road_rash':'fracture',severity:index===0?'minor':'major',bodyPart:index===0?'elbow':'collarbone',riskMultiplier:1,staffReductionPct:0,medicalCenterLevel:0}]
 sql('INSERT INTO '+h+'.jobs SELECT '+[r,stage,raceId,date].map(lit).join(',')+',100,false,v,'+dig('v')+' FROM (SELECT '+enc(resources(packet))+' v) q;')
 sql('INSERT INTO '+i+'.jobs SELECT '+[r,stage,raceId,date].map(lit).join(',')+',v,'+dig('v')+' FROM (SELECT '+enc(health)+' v) q;')
 sql('INSERT INTO '+j+'.bundles SELECT '+lit(r)+',v,'+dig('v')+' FROM (SELECT '+enc(packet)+' v) q;')
 sql('INSERT INTO '+d+'.expected SELECT '+lit(r)+',key,'+dig('value')+' FROM jsonb_each('+j+'.evidence('+lit(r)+'));')
}
function attest(run,omit=null){
 const rows=JSON.parse(sql('SELECT jsonb_agg(to_jsonb(x)) FROM '+d+'.expected x WHERE job_id='+lit(run)+';'))
 for(const row of rows.filter(x=>x.evidence_kind!==omit))assert.ok(['attested','already_attested'].includes(sql('SET ROLE uranius_043d_verifier; SELECT '+d+'.attest('+[run,row.evidence_kind,row.evidence_sha].map(lit).join(',')+');')))
}
try{
 const a=fixture(0),first=buildTourSettlement(a),b=fixture(1,first),second=buildTourSettlement(b),p=first.packet,q=second.packet,r1=p.runId,r2=q.runId
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true;run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 for(const name of ['035_synthetic_finalization_native_REVIEW_ONLY.sql','043D_authority_boundary_native_REVIEW_ONLY.sql','043H_resource_persistence_native_REVIEW_ONLY.sql','043I_health_persistence_native_REVIEW_ONLY.sql','043J_integrated_finalization_native_REVIEW_ONLY.sql'])sql(readFileSync(join(root,'database/reconstruction/worker',name),'utf8'))
 sql('INSERT INTO '+i+'.catalogue VALUES(true,'+raw(catalogueText)+');')
 for(const [index,t] of teams.entries()){
  const o=owner(t)
  sql('INSERT INTO '+h+'.owners VALUES('+lit(o)+');')
  sql('INSERT INTO '+h+'.stock(owner_id,supply_key,quantity) VALUES ('+lit(o)+",'energy_gels',10),("+lit(o)+",'race_jersey_complete',1);")
  sql('INSERT INTO '+h+'.wear(resource_id,owner_id,kind,condition) VALUES('+[id(5000+index),o,'equipment'].map(lit).join(',')+',90);')
  sql('INSERT INTO '+h+'.units(unit_id,owner_id,supply_key,remaining,max_uses,status,created_order) VALUES('+[id(6000+index),o,'race_jersey_complete'].map(lit).join(',')+",5,10,'ready',"+index+');')
 }
 sql('INSERT INTO '+i+'.riders(rider_id,club_id) VALUES '+roster.map(x=>'('+[x.riderId,x.teamId].map(lit).join(',')+')').join(',')+';')
 seed(p,a,null,0);seed(q,b,p,1);attest(r1);attest(r2,'health')
 const pristine=snapshot();sql(call(r2),/Prior integrated receipt/);assert.equal(snapshot(),pristine)
 sql(call(r1,true),/Injected integrated late failure/);assert.equal(snapshot(),pristine)
 assert.equal(cnt(d,'receipts'),0);assert.equal(cnt(h,'receipts'),0);assert.equal(cnt(i,'receipts'),0);assert.equal(cnt(base,'authority'),0)
 pass('043J prior-stage gate and late failure roll back admission, stock, health, fatigue, results and finance together')
 assert.equal(sql(call(r1)),'finalized_fixture');const prior=closed(r1),one=snapshot()
 assert.equal(sql(call(r1)),'already_finalized_fixture');assert.equal(snapshot(),one)
 assert.equal(cnt(base,'authority'),1);assert.equal(cnt(h,'effects'),3*teams.length);assert.equal(cnt(i,'events'),1)
 assert.equal(sql('SELECT availability FROM '+i+'.riders WHERE rider_id='+lit(roster[0].riderId)+';'),'not_fully_fit')
 assert.equal(sql('SELECT sum(quantity) FROM '+h+".stock WHERE supply_key='energy_gels';"),String(7*teams.length));assert.equal(cnt(base,'fatigue'),roster.length)
 pass('043J first stage commits every writer exactly once')
 sql(call(r2),/Incomplete or changed independent evidence/);assert.equal(snapshot(),one);attest(r2)
 const ready=snapshot(),o=owner(teams[0])
 const qty=n=>'UPDATE '+h+'.stock SET quantity='+n+' WHERE owner_id='+lit(o)+" AND supply_key='energy_gels';"
 sql(qty(1));const short=snapshot();sql(call(r2),/Consumable shortage/);assert.equal(snapshot(),short);assert.equal(closed(r1),prior)
 sql(qty(7));assert.equal(snapshot(),ready)
 const club=t=>'UPDATE '+i+'.riders SET club_id='+lit(t)+' WHERE rider_id='+lit(roster[0].riderId)+';'
 sql(club(id(99999)));const wrong=snapshot();sql(call(r2),/Health club mismatch/);assert.equal(snapshot(),wrong)
 sql(club(roster[0].teamId));assert.equal(snapshot(),ready)
 pass('043J missing attestation, stock shortage and health failure roll back all writers')
 const award=n=>'UPDATE '+base+'.prize_awards SET gross_cash=gross_cash'+n+' WHERE id=(SELECT id FROM '+base+'.prize_awards WHERE stage_id='+lit(p.stageId)+' ORDER BY id LIMIT 1);'
 sql(award('+1'));const changed=snapshot();sql(call(r2),/Prior integrated receipt missing or changed/);assert.equal(snapshot(),changed)
 sql(award('-1'));assert.equal(snapshot(),ready)
 sql('UPDATE '+h+'.jobs SET exact_only=true WHERE run_id='+lit(r2)+';')
 const foreign=snapshot();sql(call(r2),/Integrated scope mismatch/);assert.equal(snapshot(),foreign)
 sql('UPDATE '+h+'.jobs SET exact_only=false WHERE run_id='+lit(r2)+';');assert.equal(snapshot(),ready)
 pass('043J changed prior award and mismatched component scope rejected')
 sql('UPDATE '+h+'.wear SET condition=condition-1 WHERE resource_id='+lit(id(5000))+';')
 const before=snapshot();sql(call(r2,true),/Injected integrated late failure/);assert.equal(snapshot(),before)
 const pair=await Promise.all([concurrent('BEGIN;'+call(r2)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(call(r2))])
 assert.deepEqual(pair.sort(),['already_finalized_fixture','finalized_fixture'])
 assert.equal(cnt(base,'authority'),2);assert.equal(cnt(base,'completed_tours'),1);assert.equal(cnt(j,'receipts'),2);assert.equal(cnt(d,'receipts'),2)
 assert.equal(cnt(h,'effects'),6*teams.length);assert.equal(cnt(i,'events'),2)
 assert.equal(sql('SELECT sum(quantity) FROM '+h+".stock WHERE supply_key='energy_gels';"),String(4*teams.length))
 assert.equal(Number(sql('SELECT condition FROM '+h+'.wear WHERE resource_id='+lit(id(5000))+';')),88.3)
 assert.equal(sql('SELECT availability FROM '+i+'.riders WHERE rider_id='+lit(roster[0].riderId)+';'),'injured')
 assert.equal(cnt(base,'fatigue'),2*roster.length);assert.equal(cnt(base,'prize_awards'),q.settlements.length)
 assert.equal(sql('SELECT sum(gross_cash) FROM '+base+'.prize_awards;'),String(q.allGenerated.grossCash))
 assert.equal(sql('SELECT coalesce(sum(amount),0) FROM '+base+".transactions WHERE event_type='tax_withholding';"),String(q.allGenerated.taxCash))
 assert.equal(sql('SELECT sum(amount) FROM '+base+'.entries;'),'0');assert.equal(closed(r1),prior)
 pass('043J concurrent final stage once, cumulative GC/awards, carried fatigue, current wear, health and balanced tax ledger')
 const final=snapshot();for(const r of [r1,r2])assert.equal(sql(call(r)),'already_finalized_fixture');assert.equal(snapshot(),final)
 sql('CREATE ROLE fixture_outsider LOGIN NOINHERIT;');sql(call(r2),/permission denied/,'fixture_outsider')
 assert.equal(sql('SELECT count(*) FROM '+j+'.receipts WHERE official OR hosted_write_allowed OR accounting_allowed;'),'0')
 sql('UPDATE '+j+'.receipts SET official=true;',/violates check constraint/);assert.equal(snapshot(),final)
 sql('UPDATE '+i+'.events SET detail=detail||'+lit('{"tampered":true}')+'::jsonb WHERE run_id='+lit(r2)+';')
 const damaged=snapshot();sql(call(r2),/Closed integrated receipt changed/);assert.equal(snapshot(),damaged)
 pass('043J immutable retry, child receipt tamper detection, outsider denied and hard false authority')
 assert.equal(checks,6);console.log('PASS 6/6 integrated finalization checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster cleaned up')}
