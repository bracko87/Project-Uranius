// One approved isolated queued race. No scheduler or permanent worker login.
import assert from 'node:assert/strict'
import {createHash,createHmac,pbkdf2Sync,randomBytes} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'
import {digest} from './uranius-race-job-worker.mjs'
import {executeCalendarJob} from './uranius-calendar-job-worker.mjs'

const root=new URL('../',import.meta.url)
const base='database/reconstruction/worker/'
const manifestPath=base+'028_one_job_execution_manifest_REVIEW_ONLY.json'
const priorPath=base+'027_install_manifest_REVIEW_ONLY.json'
const priorHash='ad130138dab518b5ab832b8fb4ed8667e7334d3ed555b3951f6f2ee8e0b0e2dd'
const ref='sdtsivgtcaoaeoihcwzd'
const job='e3fe3c1e-7eb3-40c1-9f44-d8e38ce359f0'
const stage='882801c4-ea99-4aaf-8ae5-d2a11cd26fd8'
const inputHash='f10fdaf48b87a4b3fcef2f075d50e6ab44b2f0f846a550819ecb7fee4337182a'
const originalOutputHash='0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed'
const read=p=>readFileSync(new URL(p,root))
const hash=b=>createHash('sha256').update(b).digest('hex')
const sameJob=`job_id='${job}' AND stage_id='${stage}' AND input_sha256='${inputHash}' AND job_kind='calendar_review' AND calendar_date='2000-01-03' AND expected_output_sha256 IS NULL AND input_sha256=encode(sha256(convert_to(input_text,'UTF8')),'hex')`
const roleSafe="rolname='uranius_worker' AND NOT(rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR rolinherit)"
const adminGuard=`IF current_user<>'postgres' OR session_user<>current_user OR current_database()<>'postgres'
 OR NOT EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR NOT EXISTS(SELECT 1 FROM uranius_private.project_identity WHERE project_ref='${ref}')
 THEN RAISE EXCEPTION '028 admin target refused'; END IF;`
function verify(approved){
 assert.match(approved,/^[a-f0-9]{64}$/)
 const bytes=read(manifestPath)
 assert.equal(hash(bytes),approved,'Exact approved 028 manifest required')
 const m=JSON.parse(bytes)
 assert.equal(m.projectRef,ref);assert.equal(m.operation,'single_novel_calendar_stage')
 assert.equal(m.status,'REVIEW_ONLY_REQUIRES_EXPLICIT_APPROVAL')
 assert.equal(m.jobId,job);assert.equal(m.stageId,stage)
 assert.equal(m.inputSha256,inputHash);assert.equal(m.expectedOutputSha256,null)
 assert.equal(m.maxLoginSeconds,300);assert.equal(m.priorManifestSha256,priorHash)
 assert.equal(hash(read(priorPath)),priorHash)
 assert.deepEqual(m.files.map(f=>f.path),['scripts/run-uranius-calendar-stage-028.mjs','scripts/run-approved-calendar-stage-028-windows.ps1','scripts/uranius-calendar-job-worker.mjs','scripts/uranius-race-job-worker.mjs','scripts/uranius-race-job-engine.ts','scripts/assert-sandbox-target.mjs','scripts/run-uranius-psql-batch.mjs',priorPath])
 for(const f of m.files)assert.equal(hash(read(f.path)),f.sha256,'Frozen file mismatch: '+f.path)
 const prior=JSON.parse(read(priorPath))
 const history=[...prior.requires,{file:prior.candidate.ledgerVersion,sha256:prior.candidate.sha256}]
 assert.equal(history.length,20)
 const check=spawnSync('git',['diff','--exit-code','536259932b85992924bda6ee693c3db198d7fb17','--','src/race-engine','package.json','package-lock.json'],{cwd:fileURLToPath(root),encoding:'utf8',timeout:30000,windowsHide:true})
 const untracked=spawnSync('git',['ls-files','--others','--exclude-standard','--','src/race-engine'],{cwd:fileURLToPath(root),encoding:'utf8',timeout:30000,windowsHide:true})
 assert.ok(!check.error&&check.status===0&&!untracked.error&&untracked.status===0&&!untracked.stdout.trim(),'Validated engine source/dependencies changed')
 return history
}
// PostgreSQL SCRAM verifier: the random temporary password itself never enters SQL.
function scram(password){
 const salt=randomBytes(16),iterations=4096
 const salted=pbkdf2Sync(password,salt,iterations,32,'sha256')
 const client=createHmac('sha256',salted).update('Client Key').digest()
 const stored=createHash('sha256').update(client).digest('base64')
 const server=createHmac('sha256',salted).update('Server Key').digest('base64')
 salted.fill(0);client.fill(0)
 return 'SCRAM-SHA-256$'+iterations+':'+salt.toString('base64')+'$'+stored+':'+server
}
async function execute(history){
 const env=process.env
 assertSandboxTarget('admin',env)
 assert.ok(env.URANIUS_PSQL_PATH&&env.URANIUS_DATABASE_CA_FILE&&env.URANIUS_LOCAL_ADMIN_PASSWORD,'Local admin credentials and trusted TLS CA required')
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const safe=Object.fromEntries(Object.entries(env).filter(([n])=>allowed.has(n.toUpperCase())))
 const executable=env.URANIUS_PSQL_PATH
 const common={...safe,PGHOST:'db.'+ref+'.supabase.co',PGPORT:'5432',PGDATABASE:'postgres',PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,PGCLIENTENCODING:'UTF8',PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=15000 -c lock_timeout=5000'}
 const admin={...common,PGUSER:'postgres',PGPASSWORD:env.URANIUS_LOCAL_ADMIN_PASSWORD}
 delete env.URANIUS_LOCAL_ADMIN_PASSWORD
 const password=randomBytes(32).toString('base64url')
 const worker={...common,PGUSER:'uranius_worker',PGPASSWORD:password}
 assertSandboxTarget('write',{URANIUS_SUPABASE_PROJECT_REF:ref,URANIUS_SUPABASE_URL:'https://'+ref+'.supabase.co',URANIUS_DATABASE_URL:'postgresql://uranius_worker:'+password+'@db.'+ref+'.supabase.co:5432/postgres?sslmode=verify-full'})
 const batch=(input,pg,stageName)=>runPsqlBatch({executable,input,env:pg,timeout:25000,transaction:true,stage:stageName,extraArgs:['--tuples-only','--no-align']}).trim()
 const qAdmin=s=>batch(s,admin,'028 admin boundary refused')
 const workerGuard=`DO $worker028$ BEGIN
 IF current_user<>'uranius_worker' OR session_user<>current_user OR current_database()<>'postgres'
 OR NOT EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE ${roleSafe} AND rolcanlogin AND rolvaliduntil>clock_timestamp())
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
 THEN RAISE EXCEPTION '028 worker boundary refused'; END IF;
 END $worker028$;`
 const qWorker=s=>batch(workerGuard+'\n'+s,worker,'028 restricted worker refused')
 const vals=history.map(x=>"('"+x.file+"','"+x.sha256+"')").join(',')
 const baseline=`DO $baseline028$ BEGIN
 ${adminGuard}
 IF (SELECT count(*) FROM uranius_private.migration_ledger)<>20
 OR EXISTS(SELECT version,sha256 FROM (VALUES ${vals}) e(version,sha256) EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 OR EXISTS(SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM (VALUES ${vals}) e(version,sha256))
 OR (SELECT count(*) FROM uranius_jobs.race_jobs)<>2
 OR (SELECT count(*) FROM uranius_jobs.race_jobs j JOIN uranius_private.synthetic_completed_race_runs a ON a.stage_id=j.stage_id AND a.input_text=j.input_text AND a.output_text=j.output_text WHERE j.job_id='a8800680-3970-4826-aca7-aa0e72420f66' AND j.job_kind='verified_repeat' AND j.status='completed' AND j.attempt=1 AND j.output_sha256='${originalOutputHash}')<>1
 OR (SELECT count(*) FROM uranius_game.race_team_entries)<>4
 OR (SELECT count(*) FROM uranius_game.race_preparations WHERE total_cost_cash=0 AND finance_transaction_id IS NULL AND rider_count=0)<>4
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists)<>20
 OR EXISTS(SELECT 1 FROM uranius_jobs.race_jobs WHERE stage_id='263edaea-28a2-438a-81b8-f7ca1fcd6d9f')
 OR (SELECT count(*) FROM uranius_jobs.race_jobs WHERE ${sameJob} AND status='queued' AND attempt=0 AND due_at<=clock_timestamp())<>1
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE ${roleSafe} AND NOT rolcanlogin)
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member='uranius_worker'::regrole)
 OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='uranius_worker')
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_scheduler')
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 OR (SELECT count(*) FROM uranius_private.synthetic_completed_race_runs)<>1
 OR (SELECT count(*) FROM uranius_game.synthetic_race_replay_preview)<>1
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['uranius_private','uranius_game','uranius_catalog']) s(name) WHERE has_schema_privilege('uranius_worker',name,'USAGE'))
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_jobs.race_jobs'::regclass AND relrowsecurity AND relforcerowsecurity)
 THEN RAISE EXCEPTION '028 exact baseline refused'; END IF;
 END $baseline028$;`
 const dir=mkdtempSync(join(tmpdir(),'uranius-028-worker-'))
 let activationAttempted=false,expiresAt=null
 try{
  const {build}=await import('esbuild'),bundle=join(dir,'engine.mjs')
  await build({entryPoints:[fileURLToPath(new URL('scripts/uranius-race-job-engine.ts',root))],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
  qAdmin(baseline)
  console.log('PASS 028 exact hosted baseline and local engine bundle')
  // Activation transaction rechecks baseline; password expires even if local process crashes.
  const verifier=scram(password)
  expiresAt=qAdmin(`SELECT to_char((clock_timestamp()+interval '5 minutes') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');`)
  assert.match(expiresAt,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)
  activationAttempted=true
  qAdmin("SELECT pg_advisory_xact_lock(410526);\n"+baseline+`\nDO $activate028$ BEGIN
  EXECUTE format('ALTER ROLE uranius_worker LOGIN PASSWORD %L VALID UNTIL %L', '${verifier}', '${expiresAt}');
  END $activate028$;`)
  console.log('PASS temporary worker login enabled, maximum five minutes')
  assert.equal(qWorker(`SELECT count(*) FROM uranius_jobs.race_jobs WHERE ${sameJob} AND status='queued' AND attempt=0;`),'1')
  let simulations=0
  const result=await executeCalendarJob({query:qWorker,simulate:input=>{
   assert.equal(digest(input),inputHash)
   const child=spawnSync(process.execPath,[bundle],{input,env:safe,encoding:'utf8',timeout:60000,maxBuffer:5*1024*1024,windowsHide:true})
   if(child.error||child.status!==0)throw Error('028 pure engine failed; no result committed')
   simulations++
   return child.stdout
  }})
  assert.equal(result.status,'completed');assert.equal(result.jobId,job);assert.equal(result.attempt,1);assert.match(result.outputSha256,/^[a-f0-9]{64}$/);assert.equal(simulations,2)
  console.log('PASS two independent simulations agree byte-for-byte')
  const idle=await executeCalendarJob({query:qWorker,simulate:()=>{throw Error('Duplicate simulation refused')}})
  assert.equal(idle.status,'idle')
  console.log('WORKER_RESULT '+JSON.stringify(result))
  console.log('PASS duplicate claim is idle; new stage completed exactly once')
 }finally{
  delete worker.PGPASSWORD
  try{
   if(activationAttempted){
    qAdmin(`SELECT pg_advisory_xact_lock(410526);\nDO $restore028$ BEGIN ${adminGuard}
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE ${roleSafe}) THEN RAISE EXCEPTION '028 role drift; manual cleanup required'; END IF;
      IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_worker' AND rolcanlogin AND rolvaliduntil='${expiresAt}'::timestamptz) THEN
       ALTER ROLE uranius_worker NOLOGIN PASSWORD NULL;
      ELSIF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_worker' AND rolcanlogin) THEN
       RAISE EXCEPTION '028 unexpected activation window; independent cleanup required';
      END IF;
    END $restore028$;`)
    assert.equal(qAdmin("SELECT count(*) FROM pg_roles WHERE "+roleSafe+" AND NOT rolcanlogin;"),'1')
    console.log('PASS worker restored to NOLOGIN; temporary credential removed')
   }
  }finally{delete admin.PGPASSWORD;rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
 }
 console.log('PASS 028 one-job execution finished; independent hosted verification required; do not retry')
}
try{
 const [mode,approved]=process.argv.slice(2)
 assert.equal(process.argv.length,4)
 assert.ok(mode==='--review'||mode==='--execute-approved')
 const history=verify(approved)
 if(mode==='--review')console.log('PASS 028 frozen source review; no connection: '+approved)
 else await execute(history)
}catch(e){console.error('028 stopped: '+(e instanceof Error?e.message:'unknown error')+'; do not retry; verify job and worker login state independently.');process.exitCode=1}
