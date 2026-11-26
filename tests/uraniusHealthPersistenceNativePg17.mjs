// Local disposable PostgreSQL 17 only. No hosted URLs, passwords or app writes.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,delimiter} from 'node:path'
import {createServer} from 'node:net'
import {spawnSync,spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {loadOriginalHealthCatalogue,reviewOriginalCatalogueHealth} from '../scripts/uranius-original-health-catalogue-review.mjs'
const args=process.argv.slice(2)
assert.ok(args.length===5&&args[0]==='--disposable-native-pg17'&&args[1]==='--postgres-bin'&&args[3]==='--catalogue-file')
const cataloguePath=resolve(args[4]);loadOriginalHealthCatalogue(cataloguePath)
const rawCatalogue=readFileSync(cataloguePath,'utf8')
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
const scratch=mkdtempSync(join(tmpdir(),'uranius-043i-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
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
const sch='uranius_043i_fixture',lit=s=>"'"+String(s).replaceAll("'","''")+"'"
const club=id(1),other=id(2),r1=id(101),r2=id(102),r3=id(103),r4=id(104)
const rider=r=>JSON.parse(sql('SELECT to_jsonb(z) FROM '+sch+'.riders z WHERE rider_id='+lit(r)+';'))
const open=r=>JSON.parse(sql('SELECT coalesce(jsonb_agg(to_jsonb(z)),\'[]\') FROM '+sch+'.cases z WHERE rider_id='+lit(r)+" AND status IN ('active','recovering');"))
const events=r=>JSON.parse(sql("SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY rider_id,incident_id),'[]') FROM "+sch+".events e WHERE run_id="+lit(r)+";"))
const snapshot=()=>sql("SELECT jsonb_build_array("+['riders','cases','contexts','events','receipts'].map(t=>"(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM "+sch+"."+t+" x)").join(',')+");")
const apply=(r,f=false)=>'SELECT '+sch+'.apply_health('+lit(r)+','+f+');'
const candidate=(r,incidentId,caseCode,severity,bodyPart=null,over={})=>({riderId:r,clubId:club,incidentId,caseCode,severity,bodyPart,riskMultiplier:1,staffReductionPct:0,medicalCenterLevel:0,...over})
function seed(n,date,packet){
 const run=id(n),json=lit(JSON.stringify(packet))+'::jsonb'
 sql('INSERT INTO '+sch+'.jobs SELECT '+[run,id(n+1000),id(n+2000),date].map(lit).join(',')+','+json+",encode(sha256(convert_to(("+json+")::text,'UTF8')),'hex');")
 return run
}
function expected(c,date){
 return reviewOriginalCatalogueHealth({cataloguePath,mode:'recovery',priorCase:null,recoveryInput:{provenance:'synthetic_review_fixture',clubId:club,caseCode:c.caseCode,severity:c.severity,bodyPart:c.bodyPart,startedOn:date,medicalCenterLevel:c.medicalCenterLevel,staffEvidence:{provenance:'synthetic_review_fixture',completeStaffEvidence:true,clubs:[{clubId:club,type:'main',parentClubId:null}],clubId:club,staff:c.staffReductionPct===12?[{staffId:id(90),clubId:club,active:true,roleType:'doctor',specialization:'medical',expertise:100,experience:100,efficiency:100}]:[]}}}).result
}
let checks=0,started=false;const pass=x=>{checks++;console.log('PASS '+x)}
try{
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true;run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 sql(readFileSync(join(root,'database/reconstruction/worker/043I_health_persistence_native_REVIEW_ONLY.sql'),'utf8'))
 sql('INSERT INTO '+sch+'.catalogue VALUES(true,'+lit(rawCatalogue)+');')
 assert.equal(sql('SELECT jsonb_array_length(raw::jsonb) FROM '+sch+'.catalogue;'),'15')
 sql('UPDATE '+sch+".catalogue SET raw=raw||' ';",/violates check constraint/)
 sql('INSERT INTO '+sch+'.riders(rider_id,club_id) VALUES '+[r1,r2,r3,r4].map(r=>'('+lit(r)+','+lit(club)+')').join(',')+';')
 const c=candidate(r1,'first','minor_strain','minor','hamstring',{medicalCenterLevel:5,staffReductionPct:12})
 const first=seed(11,'2000-01-02',[c]),pristine=snapshot()
 sql(apply(first,true),/Injected health failure/);assert.equal(snapshot(),pristine)
 assert.equal(sql(apply(first)),'applied_fixture')
 const one=open(r1)[0],expect=expected(c,'2000-01-02')
 assert.equal(one.case_code,'muscle_strain');assert.equal(one.recovery_until,expect.recoveryUntil)
 assert.equal(events(first)[0].detail.recoveryDays,expect.finalRecoveryDays);assert.equal(events(first)[0].detail.reductionPct,32)
 assert.equal(rider(r1).availability,'not_fully_fit');assert.equal(rider(r1).unavailable_until,null)
 assert.equal(one.selection_blocked,false);assert.equal(one.training_blocked,false);assert.equal(one.development_blocked,false)
 pass('043I exact catalogue, atomic rollback, original staff/centre recovery parity and selectable minor case')
 const later=seed(12,'2000-01-03',[candidate(r1,'later','road_rash','moderate','elbow')])
 assert.equal(sql(apply(later)),'applied_fixture');assert.equal(events(later)[0].outcome,'superseded')
 const moderate=open(r1)[0];assert.equal(moderate.severity,'moderate');assert.equal(moderate.selection_blocked,false);assert.equal(moderate.training_blocked,true)
 assert.equal(sql('SELECT status FROM '+sch+'.cases WHERE case_id='+lit(one.case_id)+';'),'resolved')
 const major=seed(13,'2000-01-04',[candidate(r1,'major','fracture','major','collarbone')])
 assert.equal(sql(apply(major)),'applied_fixture');const serious=open(r1)[0]
 assert.equal(serious.severity,'major');assert.equal(rider(r1).availability,'injured');assert.equal(rider(r1).unavailable_until,serious.recovery_until)
 assert.ok(serious.recovery_until>=moderate.recovery_until)
 const merge=seed(14,'2000-01-05',[candidate(r1,'merge','road_rash','minor','elbow')])
 assert.equal(sql(apply(merge)),'applied_fixture');assert.equal(events(merge)[0].outcome,'merged');assert.equal(open(r1)[0].case_id,serious.case_id)
 assert.equal(rider(r1).unavailable_until,serious.recovery_until)
 assert.equal(sql('SELECT jsonb_array_length(merged_incidents) FROM '+sch+'.contexts WHERE case_id='+lit(serious.case_id)+';'),'1')
 pass('043I prior case superseded, major injury blocks availability, weaker incident merges without shortening recovery')
 const preventedRun=id(21);let incident
 for(let i=0;i<10000;i++){const s='prevent-'+i,roll=Math.round(parseInt(createHash('md5').update(preventedRun+':'+r2+':'+s+':health_consequence').digest('hex').slice(0,12),16)/281474976710655*1e6)/1e6;if(roll>=.78){incident=s;break}}
 assert.ok(incident)
 const prevention=seed(21,'2000-01-02',[candidate(r2,incident,'road_rash','minor','elbow',{riskMultiplier:.1})])
 assert.equal(sql(apply(prevention)),'applied_fixture');assert.equal(events(prevention)[0].outcome,'prevented');assert.equal(events(prevention)[0].detail.riskMultiplier,.78)
 assert.deepEqual(open(r2),[]);assert.equal(rider(r2).availability,'fit')
 pass('043I deterministic preparation risk roll prevents case; immutable prevention receipt retained')
 const invalid=[[[candidate(r2,'foreign','road_rash','minor','elbow',{clubId:other})],/Health club mismatch/],[[candidate(r2,'bad','cold','minor')],/Invalid race catalogue/],[[candidate(r2,'body','fracture','major')],/Body part required/],[[candidate(r2,'risk','road_rash','minor','elbow',{riskMultiplier:'1'})],/Invalid medical evidence/],[[candidate(r2,'dup','road_rash','minor','elbow'),candidate(r2,'dup','fracture','major','collarbone')],/Invalid or duplicate/],[[candidate(r1,'old','road_rash','minor','elbow')],/Out of order health stage/]]
 for(const [i,[packet,error]] of invalid.entries()){const runId=seed(40+i,'2000-01-03',packet),before=snapshot();sql(apply(runId),error);assert.equal(snapshot(),before)}
 const partial=seed(49,'2000-01-03',[candidate(r2,'a','road_rash','minor','elbow'),candidate(r3,'b','cold','minor')]),before=snapshot()
 sql(apply(partial),/Invalid race catalogue/);assert.equal(snapshot(),before)
 pass('043I invalid source, foreign rider club, body part, duplicate and chronological violations roll back all health effects')
 const a=seed(51,'2000-01-06',[candidate(r3,'a','road_rash','moderate','elbow')]),b=seed(52,'2000-01-06',[candidate(r3,'b','muscle_strain','moderate','hamstring')])
 const pair=await Promise.all([concurrent('BEGIN;'+apply(a)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(apply(b))])
 assert.deepEqual(pair,['applied_fixture','applied_fixture']);assert.equal(open(r3).length,1)
 assert.deepEqual([events(a)[0].outcome,events(b)[0].outcome].sort(),['created','superseded'])
 assert.equal(sql('SELECT count(*) FROM '+sch+'.cases WHERE rider_id='+lit(r3)+';'),'2')
 pass('043I concurrent independent runs serialize one open health case per rider')
 const retry=seed(61,'2000-01-06',[candidate(r4,'once','heat_exhaustion','major')])
 const twice=await Promise.all([concurrent('BEGIN;'+apply(retry)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(apply(retry))])
 assert.deepEqual(twice.sort(),['already_applied_fixture','applied_fixture']);assert.equal(open(r4).length,1);assert.equal(rider(r4).availability,'sick')
 const closed=snapshot();for(const j of [first,later,major,merge,prevention])assert.equal(sql(apply(j)),'already_applied_fixture');assert.equal(snapshot(),closed)
 sql('UPDATE '+sch+'.events SET detail=detail||'+lit('{"tampered":true}')+'::jsonb WHERE run_id='+lit(first)+';')
 const altered=snapshot();sql(apply(first),/Immutable health receipt changed/);assert.equal(snapshot(),altered)
 pass('043I concurrent exact retry, sickness availability, historical receipt survives subsequent cases and tamper refused')
 assert.equal(sql('SELECT count(*) FROM '+sch+'.receipts WHERE official OR hosted_write_allowed OR accounting_allowed;'),'0')
 sql('UPDATE '+sch+'.receipts SET official=true;',/violates check constraint/)
 assert.equal(checks,6);pass('043I no official health publication or hosted authority')
 console.log('PASS 7/7 health persistence checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster cleaned up')}
