// Owner-local exact Stage 2 enqueue, no schema change, no execution.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'
import {projectStage2} from './uranius-stage-carryover.mjs'
const root=new URL('../',import.meta.url),base='database/reconstruction/worker/'
const guard=base+'030_stage2_enqueue_guard_REVIEW_ONLY.sql',post=base+'030_stage2_enqueue_postflight_REVIEW_ONLY.sql'
const snapshot=base+'027_calendar_snapshot_REVIEW_ONLY.sql',preview=base+'030_stage2_preview_REVIEW_ONLY.json'
const manifest=base+'030_stage2_enqueue_manifest_REVIEW_ONLY.json'
const ref='sdtsivgtcaoaeoihcwzd',stage='263edaea-28a2-438a-81b8-f7ca1fcd6d9f',sourceJob='e3fe3c1e-7eb3-40c1-9f44-d8e38ce359f0'
const sourceInput='f10fdaf48b87a4b3fcef2f075d50e6ab44b2f0f846a550819ecb7fee4337182a'
const sourceOutput='6ca7d849e4aa4c2ac3257380f4a0a2a841223ebe8ff0775df592cc76a40dd150'
const inputHash='d260f02b7447fa9caf40d41bd563197735ebf9dee05ae2bb553d4d89a70510f7'
const read=p=>readFileSync(new URL(p,root))
const hash=b=>createHash('sha256').update(b).digest('hex')
const enc=s=>"convert_from(decode('"+Buffer.from(s,'utf8').toString('hex')+"','hex'),'UTF8')"
function verify(approved){
 assert.match(approved,/^[a-f0-9]{64}$/)
 const bytes=read(manifest);assert.equal(hash(bytes),approved,'Exact approved 030 manifest required')
 const m=JSON.parse(bytes)
 assert.equal(m.projectRef,ref);assert.equal(m.operation,'single_stage2_enqueue')
 assert.equal(m.status,'REVIEW_ONLY_REQUIRES_EXPLICIT_APPROVAL')
 assert.equal(m.expectedLedgerEntries,20);assert.equal(m.stageId,stage)
 assert.equal(m.sourceJobId,sourceJob);assert.equal(m.sourceInputSha256,sourceInput)
 assert.equal(m.sourceOutputSha256,sourceOutput);assert.equal(m.stage2InputSha256,inputHash)
 assert.deepEqual(m.files.map(f=>f.path),[guard,post,snapshot,preview,'scripts/uranius-stage-carryover.mjs','scripts/uranius-calendar-dispatch.mjs','scripts/uranius-calendar-job-worker.mjs','scripts/uranius-race-job-worker.mjs','scripts/apply-uranius-stage2-030.mjs','scripts/run-approved-stage2-030-windows.ps1','scripts/assert-sandbox-target.mjs','scripts/run-uranius-psql-batch.mjs',base+'027_install_manifest_REVIEW_ONLY.json',base+'028_one_job_execution_manifest_REVIEW_ONLY.json'])
 for(const f of m.files)assert.equal(hash(read(f.path)),f.sha256,'Frozen file mismatch: '+f.path)
 return JSON.parse(read(preview))
}
function apply(p){
 const env=process.env;assertSandboxTarget('migrate',env)
 assert.ok(env.URANIUS_PSQL_PATH&&env.URANIUS_DATABASE_CA_FILE)
 const target=new URL(env.URANIUS_DATABASE_URL),executable=env.URANIUS_PSQL_PATH
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([n])=>allowed.has(n.toUpperCase())))
 Object.assign(child,{PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,PGCLIENTENCODING:'UTF8',PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 const sql=(input,transaction=false)=>runPsqlBatch({executable,input,env:child,timeout:120000,transaction,stage:'030 guarded Stage 2 enqueue refused',extraArgs:['--tuples-only','--no-align']}).trim()
 const prefix="DO $config030$ BEGIN PERFORM set_config('uranius.approved_project_ref','"+ref+"',true); END $config030$;\n"+read(guard).toString('utf8')
 const query=read(snapshot).toString('utf8').trim().replace(/;$/,'')
 const source="SELECT jsonb_build_object('jobId',job_id,'stageId',stage_id,'stageNumber',1,'calendarDate',calendar_date,'jobKind',job_kind,'status',status,'inputText',input_text,'inputSha256',input_sha256,'outputText',output_text,'outputSha256',output_sha256) FROM uranius_jobs.race_jobs WHERE job_id='"+sourceJob+"'"
 const packetQuery="SELECT jsonb_build_object('calendar',("+query+"),'previous',("+source+"))"
 try{
  const packet=JSON.parse(sql('BEGIN;\n'+prefix+'\n'+packetQuery+';\nROLLBACK;'))
  assert.deepEqual(packet.calendar.clock,{date:'2000-01-01',paused:true})
  assert.equal(packet.calendar.stages.length,4)
  const nextStage=packet.calendar.stages.find(s=>s.stageId===stage)
  assert.equal(nextStage.stageNumber,2);assert.equal(nextStage.stageDate,'2000-01-04')
  const j=projectStage2({previous:packet.previous,nextStage})
  assert.equal(j.dispatchAllowed,false);assert.equal(j.compatibleWithCurrentQueue,true)
  assert.equal(j.withdrawn.length,0);assert.equal(j.carryover.length,10)
  assert.equal(j.source.jobId,sourceJob);assert.equal(j.source.inputSha256,sourceInput)
  assert.equal(j.source.outputSha256,sourceOutput);assert.equal(j.stageId,stage)
  assert.equal(j.calendarDate,'2000-01-04');assert.equal(j.inputSha256,inputHash)
  assert.equal(j.inputSha256,p.stage2InputSha256);assert.equal(hash(j.inputText),inputHash)
  const input=JSON.parse(j.inputText)
  assert.deepEqual(input.riders.map(x=>({riderId:x.riderId,teamId:x.teamId,condition:x.condition})),p.startingConditions)
  assert.equal(input.riders.length,10);assert.equal(input.teams.length,2)
  console.log('PASS 030 exact Stage 1 source and independently frozen carryover input; preview rolled back')
  const batch=[prefix,
   "DO $compare030$ BEGIN IF ("+query+") IS DISTINCT FROM "+enc(JSON.stringify(packet.calendar))+"::jsonb THEN RAISE EXCEPTION '030 calendar snapshot changed'; END IF; END $compare030$;",
   "CREATE POLICY uranius_030_temp_insert ON uranius_jobs.race_jobs FOR INSERT TO uranius_migrator WITH CHECK(stage_id='"+stage+"' AND job_kind='calendar_review' AND calendar_date='2000-01-04' AND input_sha256='"+inputHash+"' AND expected_output_sha256 IS NULL AND status='queued' AND attempt=0);",
   "INSERT INTO uranius_jobs.race_jobs(stage_id,input_text,input_sha256,expected_output_sha256,due_at,job_kind,calendar_date) VALUES ('"+stage+"',"+enc(j.inputText)+",'"+inputHash+"',NULL,clock_timestamp(),'calendar_review','2000-01-04');",
   read(post).toString('utf8')
  ].join('\n')
  sql('BEGIN;\n'+batch+'\nROLLBACK;')
  console.log('PASS 030 full Stage 2 enqueue rehearsal rolled back')
  sql(batch,true)
  console.log('PASS 030 one Stage 2 job committed; input SHA-256 '+inputHash)
  console.log('Independent verification required; do not retry. Worker remains NOLOGIN.')
 }finally{delete child.PGPASSWORD}
}
try{
 const [mode,approved]=process.argv.slice(2);assert.equal(process.argv.length,4)
 assert.ok(mode==='--review'||mode==='--apply-approved-030')
 const p=verify(approved)
 if(mode==='--review')console.log('PASS 030 frozen review; no connection: '+approved)
 else apply(p)
}catch(e){console.error('030 stopped: '+(e instanceof Error?e.message:'unknown error')+'; verify hosted state before retry.');process.exitCode=1}
