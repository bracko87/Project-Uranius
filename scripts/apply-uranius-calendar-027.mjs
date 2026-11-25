// Owner-local guarded calendar upgrade and one paused-clock preview enqueue.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'
import {planCalendarDispatch} from './uranius-calendar-dispatch.mjs'
const root=new URL('../',import.meta.url),base='database/reconstruction/worker/'
const candidate=base+'027_hosted_calendar_upgrade_REVIEW_ONLY.sql'
const snapshot=base+'027_calendar_snapshot_REVIEW_ONLY.sql'
const post=base+'027_calendar_enqueue_postflight_REVIEW_ONLY.sql'
const manifest=base+'027_install_manifest_REVIEW_ONLY.json'
const ref='sdtsivgtcaoaeoihcwzd',stage='882801c4-ea99-4aaf-8ae5-d2a11cd26fd8'
const read=p=>readFileSync(new URL(p,root))
const hash=b=>createHash('sha256').update(b).digest('hex')
const enc=s=>"convert_from(decode('"+Buffer.from(s,'utf8').toString('hex')+"','hex'),'UTF8')"
function verify(approved){
 assert.match(approved,/^[a-f0-9]{64}$/)
 const bytes=read(manifest);assert.equal(hash(bytes),approved,'Exact approved 027 manifest required')
 const m=JSON.parse(bytes)
 assert.equal(m.projectRef,ref);assert.equal(m.status,'REVIEW_ONLY_REQUIRES_EXPLICIT_APPROVAL')
 assert.equal(m.expectedLedgerEntries,19);assert.equal(m.stageId,stage)
 assert.equal(m.candidate.file,candidate);assert.equal(m.candidate.ledgerVersion,'027_calendar_job_dispatch.sql')
 assert.deepEqual(m.files.map(f=>f.path),[candidate,snapshot,post,base+'027_calendar_job_contract_REVIEW_ONLY.sql','scripts/uranius-calendar-dispatch.mjs','scripts/uranius-calendar-job-worker.mjs','scripts/apply-uranius-calendar-027.mjs','scripts/run-approved-calendar-027-windows.ps1','scripts/assert-sandbox-target.mjs','scripts/run-uranius-psql-batch.mjs',base+'025_install_manifest_REVIEW_ONLY.json'])
 for(const f of m.files)assert.equal(hash(read(f.path)),f.sha256,'Frozen file mismatch: '+f.path)
 assert.equal(m.candidate.sha256,hash(read(candidate)))
 return m
}
function apply(m){
 const env=process.env;assertSandboxTarget('migrate',env)
 assert.ok(env.URANIUS_PSQL_PATH&&env.URANIUS_DATABASE_CA_FILE)
 const target=new URL(env.URANIUS_DATABASE_URL),executable=env.URANIUS_PSQL_PATH
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([n])=>allowed.has(n.toUpperCase())))
 Object.assign(child,{PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,PGCLIENTENCODING:'UTF8',PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 const sql=(input,transaction=false)=>runPsqlBatch({executable,input,env:child,timeout:120000,transaction,stage:'027 guarded calendar upgrade refused',extraArgs:['--tuples-only','--no-align']}).trim()
 const prefix="DO $config027$ BEGIN PERFORM set_config('uranius.approved_project_ref','"+ref+"',true); END $config027$;\n"+read(candidate).toString('utf8')
 const query=read(snapshot).toString('utf8').trim().replace(/;$/,'')
 try{
  const packet=sql('BEGIN;\n'+prefix+'\n'+query+';\nROLLBACK;')
  const data=JSON.parse(packet)
  assert.deepEqual(data.clock,{date:'2000-01-01',paused:true})
  assert.equal(data.stages.length,4)
  const plan=planCalendarDispatch(data,{previewDate:'2000-01-03'})
  assert.equal(plan.dispatchAllowed,false);assert.equal(plan.preview,true)
  assert.equal(plan.jobs.length,1)
  const j=plan.jobs[0]
  assert.equal(j.stageId,stage);assert.equal(j.calendarDate,'2000-01-03')
  assert.equal(j.expectedOutputSha256,null);assert.equal(j.kind,'calendar_review')
  assert.equal(hash(j.inputText),j.inputSha256)
  const input=JSON.parse(j.inputText);assert.equal(input.raceId,'19000000-0000-4000-8000-000000000002')
  assert.equal(input.riders.length,10);assert.equal(input.teams.length,2)
  console.log('PASS 027 controlled calendar preview; new opponent and schema rolled back')
  const batch=[prefix,
   "DO $compare027$ BEGIN IF ("+query+") IS DISTINCT FROM "+enc(packet)+"::jsonb THEN RAISE EXCEPTION '027 calendar snapshot changed'; END IF; END $compare027$;",
   "INSERT INTO uranius_jobs.race_jobs(stage_id,input_text,input_sha256,expected_output_sha256,due_at,job_kind,calendar_date) VALUES ('"+stage+"',"+enc(j.inputText)+",'"+j.inputSha256+"',NULL,clock_timestamp(),'calendar_review','2000-01-03');",
   read(post).toString('utf8'),
   "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('027_calendar_job_dispatch.sql','"+m.candidate.sha256+"');",
   "DO $ledger027$ BEGIN IF (SELECT count(*) FROM uranius_private.migration_ledger)<>20 THEN RAISE EXCEPTION '027 ledger postflight failed'; END IF; END $ledger027$;"
  ].join('\n')
  sql('BEGIN;\n'+batch+'\nROLLBACK;')
  console.log('PASS 027 full upgrade and enqueue rehearsal rolled back')
  sql(batch,true)
  console.log('PASS 027 atomic upgrade and one novel calendar job committed; input SHA-256 '+j.inputSha256)
  console.log('Independent verification required; do not retry. Worker remains NOLOGIN.')
 }finally{delete child.PGPASSWORD}
}
try{
 const [mode,approved]=process.argv.slice(2);assert.equal(process.argv.length,4)
 assert.ok(mode==='--review'||mode==='--apply-approved-027')
 const m=verify(approved)
 if(mode==='--review')console.log('PASS 027 frozen review; no connection: '+approved)
 else apply(m)
}catch(e){console.error('027 stopped: '+(e instanceof Error?e.message:'unknown error')+'; verify hosted state before retry.');process.exitCode=1}
