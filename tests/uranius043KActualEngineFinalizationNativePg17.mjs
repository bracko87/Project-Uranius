// Local disposable PostgreSQL 17 only. No hosted URLs, passwords or app writes.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,delimiter} from 'node:path'
import {createServer} from 'node:net'
import {spawnSync,spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {buildEngineTourSettlement} from '../scripts/uranius-engine-tour-settlement-review.mjs'
import {matchTourWorkloadEnergy} from '../scripts/uranius-tour-settlement-review.mjs'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewOfficialRaceNight} from '../scripts/uranius-original-fatigue-review.mjs'
import {build} from 'esbuild'
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
const scratch=mkdtempSync(join(tmpdir(),'uranius-043k-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
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

const distance=30
const engineFile=join(scratch,'engine.mjs')
const engineEnv=Object.fromEntries(Object.entries(env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k)))
function simulate(p){
 const x=spawnSync(process.execPath,[engineFile],{env:engineEnv,input:JSON.stringify(p),encoding:'utf8',timeout:180000,windowsHide:true,maxBuffer:12e6})
 if(x.error)throw x.error
 if(x.status!==0)throw Error('043K engine failed: '+x.stderr.slice(-3000))
 return JSON.parse(x.stdout)
}
function fixture(index,previous=null){
 const {stageId,date}=schedule[index],runId=id(201+index),prior=previous?.packet??null
 const recoveryReceipts=prior?prior.carryover.riders.map(r=>({provenance:P,raceId,stageId,previousStageId:prior.stageId,date,riderId:r.riderId,previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:r.persistedFatigue,travelDelta:1,activityLoad:13,consecutiveHeavyDays:0,recovery:75,morale:50,activityBonus:0,doctorBonus:0,clubType:clubs.find(x=>x.clubId===r.teamId).type,residentialCampusActive:false})): []
 const riders=roster.map((r,n)=>({...r,role:n%count===0?'captain':'domestique',attributes:{flat:70+n%12,climbing:65+n%12,sprint:65+n%13,acceleration:70+n%10,stamina:80,resistance:80,recovery:75,teamwork:75,timeTrial:75,raceIq:75},condition:{startingEnergy:100,fatigueBeforeStage:prior?reviewOfficialRaceNight(recoveryReceipts.find(x=>x.riderId===r.riderId)).fatigue:20,morale:50,availabilityStatus:'fit'}}))
 const input={raceId,stageId,stageName:'043K actual road stage '+(index+1),stageFormat:'road_race',distanceKm:distance,seed:'043K-stage-'+index,settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=riders.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distance,elevationMetres:50}],orders:[]}
 const markerEvidence={provenance:P,completeCanonicalEvidence:true,stageId,distanceKm:distance,stageFormat:'road_race',canonicalRows:[['INTERMEDIATE_SPRINT',10,[5,3],[3,2]],['FINISH',distance,[25,20,16],[10,6,4]]].map(([type,km,points,bonus],n)=>({id:id(301+index*3+n),stage_id:stageId,point_type:type,km_from_start:km,name:type,kom_category:null,points_scheme:points,time_bonus_seconds:bonus,is_finish_point:type==='FINISH',sort_order:n})),profile:{intermediate_sprints:[],mountain_climbs:[],route_markers:[{type:'sprint',km:10,label:'Town sprint'}]}}
 const carryover={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,schedule,distanceKm:distance,previousReceipt:prior?.carryover??null,expectedPreviousDigest:prior?.carryoverSha256??null,workloads:[],recoveryReceipts,resources:prior?prior.carryover.resources.map(r=>({...r.after,...(r.after.resourceId.startsWith('gel-')?{selectedQuantity:3}:r.after.resourceId.startsWith('jersey-')?{selectedStageUses:1}:{})})):initial}
 const lifecycle={state:'replay_live',hiddenOutputValidated:true,priorStagesAuthoritative:true,dailyRecoveryVerified:true,stageStartGameAt:date+'T12:00:00Z',gameNow:date+'T14:00:00Z',realNow:date+'T14:00:00Z',replayClosesAtReal:date+'T14:00:00Z'}
 const supplemental={provenance:P,completeSyntheticEvidence:true,policyText,category,carryover,clubs,youngRiderIds,penalties:riders.map(r=>({riderId:r.riderId,seconds:0})),prizeFundCash:c.minCash,lifecycle,previousPacket:prior,expectedPreviousPacketDigest:previous?.sha256??null,readiness:riders.map(r=>({riderId:r.riderId,teamId:r.teamId,difficultyCategory:1,postStageFatigueMultiplier:1,postStageRecoveryBonusPoints:0,preparationIncidentRiskMultiplier:1}))}
 return {input,markerEvidence,supplemental,enginePacket:{provenance:P,jobId:runId,input,markerEvidence,expectedInputSha256:hash(JSON.stringify(input)),expectedMarkerEvidenceSha256:carryoverDigest(markerEvidence)}}
}
function execute(f){
 console.log('INFO 043K running actual engine stage '+f.input.stageId+' with '+f.input.riders.length+' riders')
 const engine=simulate(f.enginePacket),p={fixture:f.supplemental,input:f.input,markerEvidence:f.markerEvidence,engine,expectedEvidenceSha256:engine.evidenceSha256}
 return {engine,p,result:buildEngineTourSettlement(p)}
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
 const health=[] // No medical incidents observed in this narrow legacy scenario.
 sql('INSERT INTO '+h+'.jobs SELECT '+[r,stage,raceId,date].map(lit).join(',') +','+distance+',false,v,'+dig('v')+' FROM (SELECT '+enc(resources(packet))+' v) q;')
 sql('INSERT INTO '+i+'.jobs SELECT '+[r,stage,raceId,date].map(lit).join(',')+',v,'+dig('v')+' FROM (SELECT '+enc(health)+' v) q;')
 sql('INSERT INTO '+j+'.bundles SELECT '+lit(r)+',v,'+dig('v')+' FROM (SELECT '+enc(packet)+' v) q;')
 sql('INSERT INTO '+d+'.expected SELECT '+lit(r)+',key,'+dig('value')+' FROM jsonb_each('+j+'.evidence('+lit(r)+'));')
}
function attest(run,omit=null){
 const rows=JSON.parse(sql('SELECT jsonb_agg(to_jsonb(x)) FROM '+d+'.expected x WHERE job_id='+lit(run)+';'))
 for(const row of rows.filter(x=>x.evidence_kind!==omit))assert.ok(['attested','already_attested'].includes(sql('SET ROLE uranius_043d_verifier; SELECT '+d+'.attest('+[run,row.evidence_kind,row.evidence_sha].map(lit).join(',')+');')))
}

try{
 await build({entryPoints:[join(root,'scripts/uranius-canonical-scoring-engine-review.ts')],outfile:engineFile,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 const a=fixture(0),first=execute(a),b=fixture(1,first.result),second=execute(b)
 const p=first.result.packet,q=second.result.packet,r1=p.runId,r2=q.runId
 for(const z of [first,second]){
  const {result,engine}=z,output=JSON.parse(result.job.outputText)
  assert.equal(result.job.outputSha256,hash(result.job.outputText));assert.equal(result.receipt.actualEngineOutputUsed,true);assert.equal(result.receipt.authoritativePreparationVerified,false)
  assert.equal(result.packet.stageResults.length,roster.length);assert.equal(engine.competitions.length,1);assert.equal(engine.competitions[0].crossings.length,roster.length)
  assert.ok(output.snapshots.length>2);assert.ok(output.events.length>0)
  for(const row of result.packet.stageResults){const state=output.finalRiderStates.find(x=>x.riderId===row.riderId);assert.equal(row.elapsedSeconds,state.finishTimeSeconds);assert.equal(row.remainingEnergy,state.energy);assert.equal(row.rank,state.finishPosition)}
  assert.deepEqual(buildEngineTourSettlement(z.p),result)
 }
 // Legacy output remains exact; original arithmetic alone is normalized.
 const fractional=87.654321234567
 const w={startEnergy:100,rawFinishEnergy:fractional,incidentEnergyLoss:0,additionalPointEnergyCost:0}
 const ef={startEnergy:100,finishEnergy:87.654321}
 assert.equal(matchTourWorkloadEnergy(w,ef,100,fractional),true)
 assert.equal(matchTourWorkloadEnergy({...w,rawFinishEnergy:fractional+1e-9},ef,100,fractional),false)
 assert.equal(matchTourWorkloadEnergy(w,{...ef,finishEnergy:87.654322},100,fractional),false)
 assert.equal(matchTourWorkloadEnergy({...w,incidentEnergyLoss:1},ef,100,fractional),false)
 assert.equal(matchTourWorkloadEnergy(w,ef,99,fractional),false)
 for(const z of [first,second])for(const row of z.result.packet.stageResults){
  const effect=z.result.packet.carryover.riders.find(x=>x.riderId===row.riderId).effect
  assert.equal(effect.finishEnergy,Math.round((row.remainingEnergy+Number.EPSILON)*1e6)/1e6)
 }
 assert.ok(q.carryover.riders.every(r=>r.night&&r.seedFatigue===r.night.fatigue))
 assert.deepEqual(q.settlements.filter(x=>x.stageId===p.stageId),p.settlements)
 pass('043K two actual engine stages, measured crossing order, exact finish time/energy, original fatigue and prior awards')
 assert.throws(()=>buildEngineTourSettlement({...first.p,expectedEvidenceSha256:'0'.repeat(64)}),/digest mismatch/)
 assert.throws(()=>buildEngineTourSettlement({...first.p,fixture:{...first.p.fixture,job:{}}}),/caller supplied/)
 const tampered=structuredClone(first.p);tampered.engine.stageRace.resultRows[0].bonusSeconds++;assert.throws(()=>buildEngineTourSettlement(tampered),/scoring envelope mismatch/)
 const wrong=structuredClone(first.p);wrong.fixture.carryover.workloads=[{}];assert.throws(()=>buildEngineTourSettlement(wrong),/caller supplied workload/)
 const invalid=structuredClone(first.p),out=JSON.parse(invalid.engine.outputText);out.events.push({eventType:'RIDER_CRASHED'});invalid.engine.outputText=JSON.stringify(out);invalid.engine.evidence.outputSha256=hash(invalid.engine.outputText);invalid.engine.evidenceSha256=carryoverDigest(invalid.engine.evidence);invalid.expectedEvidenceSha256=invalid.engine.evidenceSha256;assert.throws(()=>buildEngineTourSettlement(invalid),/incident, breakaway/)
 pass('043K altered evidence and caller-invented workload/results rejected; unsupported incident fails closed')
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
 seed(p,{...a.supplemental,job:first.result.job},null,0);seed(q,{...b.supplemental,job:second.result.job},p,1);attest(r1);attest(r2)
 const pristine=snapshot();sql(call(r2),/Prior integrated receipt/);assert.equal(snapshot(),pristine)
 sql(call(r1,true),/Injected integrated late failure/);assert.equal(snapshot(),pristine)
 assert.equal(sql(call(r1)),'finalized_fixture');const prior=closed(r1),one=snapshot()
 sql(call(r2,true),/Injected integrated late failure/);assert.equal(snapshot(),one)
 pass('043K actual-output settlement through unchanged 043J transaction, prior-stage gate and full rollback')
 const pair=await Promise.all([concurrent('BEGIN;'+call(r2)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(call(r2))])
 assert.deepEqual(pair.sort(),['already_finalized_fixture','finalized_fixture'])
 assert.equal(cnt(base,'authority'),2);assert.equal(cnt(base,'completed_tours'),1);assert.equal(cnt(j,'receipts'),2)
 assert.equal(cnt(base,'fatigue'),2*roster.length);assert.equal(cnt(h,'effects'),6*teams.length);assert.equal(cnt(i,'events'),0);assert.equal(cnt(i,'receipts'),2)
 assert.equal(sql('SELECT sum(quantity) FROM '+h+".stock WHERE supply_key='energy_gels';"),String(4*teams.length))
 assert.equal(sql('SELECT sum(gross_cash) FROM '+base+'.prize_awards;'),String(q.allGenerated.grossCash))
 assert.equal(sql('SELECT coalesce(sum(amount),0) FROM '+base+".transactions WHERE event_type='tax_withholding';"),String(q.allGenerated.taxCash))
 assert.equal(sql('SELECT sum(amount) FROM '+base+'.entries;'),'0');assert.equal(closed(r1),prior)
 const final=snapshot();for(const r of [r1,r2])assert.equal(sql(call(r)),'already_finalized_fixture');assert.equal(snapshot(),final)
 pass('043K actual engine two-stage finalization exactly once, original policy ledger balanced, no fabricated injury')
 assert.equal(checks,4);console.log('PASS 4/4 actual-engine integrated finalization checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster and bundles cleaned up')}
