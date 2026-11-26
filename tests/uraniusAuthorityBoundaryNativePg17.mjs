// Local disposable PostgreSQL 17 only. No hosted URLs, passwords or app writes.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,delimiter} from 'node:path'
import {createServer} from 'node:net'
import {spawnSync,spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const args=process.argv.slice(2)
assert.ok(args.length===3&&args[0]==='--disposable-native-pg17'&&args[1]==='--postgres-bin')
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
const scratch=mkdtempSync(join(tmpdir(),'uranius-043d-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
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
const sch='uranius_043d_fixture',role=x=>'uranius_043d_'+x
const lit=s=>"'"+String(s).replaceAll("'","''")+"'"
const roleSql=(who,query)=>'SET ROLE '+role(who)+';'+query
const admit=j=>'SELECT '+sch+'.admit('+lit(j)+');'
const attest=(j,k,d)=>'SELECT '+sch+'.attest('+[j,k,d].map(lit).join(',')+');'
const kinds=['roster','markers','workload','resources','health','penalties','youth','policy','recovery','lifecycle']
const digest=(j,k)=>hash('LOCAL REHEARSAL '+j+':'+k)
const jobs={first:id(11),second:id(12),repeat:id(13),calendar:id(14),early:id(15),bad:id(16),running:id(17)}
function seed(j,r,st,n,prior,kind='authority_rehearsal',status='completed',early=false){
 const input=JSON.stringify({raceId:r,stageId:st,seed:'local-only'}),output=JSON.stringify({raceId:r,stageId:st,output:'local-only'})
 const values=[j,r,st].map(lit).join(',')+','+n+','+(prior?lit(prior):'NULL')+','+[kind,status,input,output,hash(input),hash(output)].map(lit).join(',')+','+(status==='completed'?"'2000-01-01 12:05Z'":"NULL")+','+(status==='running'?lit(id(99))+",'2000-01-01 13:00Z'":"NULL,NULL")+",'2000-01-01 12:00Z',"+(early?"'2000-01-01 12:29Z'":"'2000-01-01 12:30Z'")+",'2000-01-01 12:10Z','2000-01-01 12:10Z'"
 sql('INSERT INTO '+sch+'.source VALUES('+values+');')
 for(const k of kinds)sql('INSERT INTO '+sch+'.expected VALUES('+[j,k,digest(j,k)].map(lit).join(',')+');')
}
function evidence(j,ks=kinds){for(const k of ks)assert.equal(sql(roleSql('verifier',attest(j,k,digest(j,k)))),'attested')}
const snapshot=()=>sql("SELECT jsonb_build_array("+['source','expected','attestations','receipts'].map(t=>"(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM "+sch+"."+t+" x)").join(',')+");")
const count=()=>Number(sql('SELECT count(*) FROM '+sch+'.receipts;'))
let checks=0,started=false
const pass=x=>{checks++;console.log('PASS '+x)}
try{
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true;run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 sql(readFileSync(join(root,'database/reconstruction/worker/043D_authority_boundary_native_REVIEW_ONLY.sql'),'utf8'))
 seed(jobs.first,id(1),id(101),1,null);seed(jobs.second,id(1),id(102),2,jobs.first)
 seed(jobs.repeat,id(2),id(103),1,null,'verified_repeat');seed(jobs.calendar,id(3),id(104),1,null,'calendar_review')
 seed(jobs.early,id(4),id(105),1,null,'authority_rehearsal','completed',true)
 seed(jobs.bad,id(5),id(106),1,null);seed(jobs.running,id(6),id(107),1,null,'authority_rehearsal','running')
 const pristine=snapshot()
 for(const who of ['worker','client','verifier','admitter']){
  sql(roleSql(who,'SELECT input_text FROM '+sch+'.source;'),/permission denied/)
  sql(roleSql(who,'UPDATE '+sch+'.source SET job_kind=\'authority_rehearsal\';'),/permission denied/)
  sql(roleSql(who,'DELETE FROM '+sch+'.receipts;'),/permission denied/)
  sql(roleSql(who,'INSERT INTO '+sch+'.attestations VALUES('+[jobs.first,'roster',digest(jobs.first,'roster')].map(lit).join(',')+');'),/permission denied/)
 }
 for(const who of ['worker','client','verifier'])sql(roleSql(who,admit(jobs.first)),/permission denied/)
 for(const who of ['worker','client','admitter'])sql(roleSql(who,attest(jobs.first,'roster',digest(jobs.first,'roster'))),/permission denied/)
 assert.equal(snapshot(),pristine)
 pass('043D role separation: no raw job reads, direct writes, or cross-role function execution')
 for(const j of [jobs.repeat,jobs.calendar]){
  sql(roleSql('verifier',attest(j,'roster',digest(j,'roster'))),/Review job not eligible/)
  sql(roleSql('admitter',admit(j)),/Review jobs cannot be promoted/)
 }
 sql(roleSql('admitter',admit(jobs.running)),/Job not terminal/)
 assert.equal(snapshot(),pristine)
 pass('043D verified-repeat, calendar-review and running jobs cannot enter authority rehearsal')
 sql(roleSql('verifier',attest(jobs.first,'roster','0'.repeat(64))),/Evidence identity or digest mismatch/)
 sql(roleSql('verifier',attest(jobs.first,'unknown',digest(jobs.first,'unknown'))),/Evidence identity or digest mismatch/)
 evidence(jobs.first,kinds.slice(0,9))
 const incomplete=snapshot();sql(roleSql('admitter',admit(jobs.first)),/Incomplete or changed independent evidence/);assert.equal(snapshot(),incomplete)
 evidence(jobs.first,kinds.slice(9));assert.equal(sql(roleSql('verifier',attest(jobs.first,'roster',digest(jobs.first,'roster')))),'already_attested')
 pass('043D missing, invalid and repeated evidence fail closed or retry idempotently')
 evidence(jobs.early);evidence(jobs.bad);evidence(jobs.second)
 sql('UPDATE '+sch+'.source SET output_sha='+lit('0'.repeat(64))+' WHERE job_id='+lit(jobs.bad)+';')
 const blocked=snapshot()
 sql(roleSql('admitter',admit(jobs.early)),/Reveal gate closed/)
 sql(roleSql('admitter',admit(jobs.bad)),/Job digest mismatch/)
 sql(roleSql('admitter',admit(jobs.second)),/Prior rehearsal receipt missing or changed/)
 assert.equal(snapshot(),blocked);assert.equal(count(),0)
 pass('043D server-side reveal, terminal digest and prior-stage gates')
 assert.equal(sql('BEGIN;'+roleSql('admitter',admit(jobs.first))+'ROLLBACK;'),'rehearsed_only')
 assert.equal(count(),0);assert.equal(snapshot(),blocked)
 const pair=await Promise.all([concurrent('BEGIN;'+roleSql('admitter',admit(jobs.first))+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(roleSql('admitter',admit(jobs.first)))])
 assert.deepEqual(pair.sort(),['already_rehearsed','rehearsed_only']);assert.equal(count(),1)
 pass('043D rollback and concurrent exactly-once first receipt')
 const before=snapshot()
 sql('UPDATE '+sch+'.expected SET evidence_sha='+lit('1'.repeat(64))+' WHERE job_id='+lit(jobs.first)+" AND evidence_kind='roster';")
 const changed=snapshot();sql(roleSql('admitter',admit(jobs.second)),/Prior rehearsal receipt missing or changed/);assert.equal(snapshot(),changed)
 sql('UPDATE '+sch+'.expected SET evidence_sha='+lit(digest(jobs.first,'roster'))+' WHERE job_id='+lit(jobs.first)+" AND evidence_kind='roster';")
 assert.equal(snapshot(),before)
 assert.equal(sql(roleSql('admitter',admit(jobs.second))),'rehearsed_only');assert.equal(count(),2)
 const closed=snapshot()
 assert.equal(sql("SET timezone='Pacific/Auckland';"+roleSql('admitter',admit(jobs.first))),'already_rehearsed')
 assert.equal(sql(roleSql('admitter',admit(jobs.second))),'already_rehearsed');assert.equal(snapshot(),closed)
 pass('043D immutable prior evidence and both-stage idempotence, including timezone-independent hashes')
 assert.equal(sql("SELECT count(*) FROM "+sch+".receipts WHERE official OR hosted_write_allowed OR accounting_allowed OR decision<>'local_boundary_rehearsal_only';"),'0')
 assert.equal(sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname="+lit(sch)+" AND c.relkind='r';"),'4')
 assert.equal(sql("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname="+lit(sch)+";"),'2')
 assert.equal(sql("SELECT count(*) FROM pg_roles WHERE rolname IN ("+['guard','verifier','admitter','worker','client'].map(x=>lit(role(x))).join(',')+") AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolinherit OR rolcreaterole OR rolcreatedb OR rolreplication);"),'0')
 sql('UPDATE '+sch+'.receipts SET official=true;',/violates check constraint/)
 assert.equal(snapshot(),closed)
 pass('043D no publication or accounting writer, nonlogin roles and hard false receipt flags')
 assert.equal(checks,7);console.log('PASS 7/7 authority boundary rehearsal checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster cleaned up')}
