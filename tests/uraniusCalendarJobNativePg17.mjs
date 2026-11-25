// Focused offline-only native PG17 calendar dispatch and new-job acceptance.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, delimiter, join, resolve } from 'node:path'
import { createServer } from 'node:net'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'


import {randomUUID} from 'node:crypto'
import {build} from 'esbuild'
import {planCalendarDispatch,buildCalendarInput,digest} from '../scripts/uranius-calendar-dispatch.mjs'
import {executeCalendarJob} from '../scripts/uranius-calendar-job-worker.mjs'
const args=process.argv.slice(2)
assert.ok(args.length===3&&args[0]==='--disposable-native-pg17'&&args[1]==='--postgres-bin')
const root = fileURLToPath(new URL('../', import.meta.url))
const bin = resolve(args[2])
const ext = process.platform === 'win32' ? '.exe' : ''
const exe = Object.fromEntries(['initdb','pg_ctl','psql'].map(n => [n, join(bin, n + ext)]))
for (const file of Object.values(exe)) if (!existsSync(file)) throw new Error('Missing PostgreSQL binary: ' + file)
const env = { PATH: bin + delimiter + (process.env.PATH || ''), SYSTEMROOT: process.env.SYSTEMROOT || '', WINDIR: process.env.WINDIR || '', TEMP: process.env.TEMP || tmpdir(), TMP: process.env.TMP || tmpdir() }
function run(file, argv, options = {}) {
  const r = spawnSync(file, argv, {
    env: options.env || env, input: options.input, stdio: options.stdio,
    encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 4e6,
  })
  if (r.error) throw r.error
  if (options.reject) { assert.notEqual(r.status, 0, 'Expected a denial but the command succeeded'); return }
  if (r.status !== 0) throw new Error(basename(file) + ' failed: ' + (r.stderr || r.stdout || 'Unknown error').slice(0, 1600))
  return (r.stdout || '').trim()
}
for (const file of Object.values(exe)) assert.match(run(file, ['--version']), /\b17\.\d+/)

const scratch = mkdtempSync(join(tmpdir(), 'uranius-027-calendar-disposable-'))
const data = join(scratch, 'data')
const listener = createServer()
await new Promise((yes, no) => listener.once('error', no).listen(0, '127.0.0.1', yes))
const port = listener.address().port
await new Promise(yes => listener.close(yes))
const dbEnv = { ...env, PGHOST: '127.0.0.1', PGHOSTADDR: '127.0.0.1', PGPORT: String(port), PGDATABASE: 'postgres', PGSSLMODE: 'disable', PGCONNECT_TIMEOUT: '5', PGOPTIONS: '-c statement_timeout=10000' }
function sql(query, user = 'uranius_migrator', reject = false) {
  const output = run(exe.psql, ['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-f','-'], { env: dbEnv, input: query, reject })
  return reject ? undefined : output.split(/\r?\n/).at(-1)
}

let started=false,checks=0
const admin='uranius_fixture_admin',worker='uranius_worker'
const pass=label=>{checks++;console.log('PASS '+label)}
const stageId='882801c4-ea99-4aaf-8ae5-d2a11cd26fd8',clubA='00000000-0000-4000-8000-000000000011',clubB='00000000-0000-4000-8000-000000000012'
const stage={raceId:'19000000-0000-4000-8000-000000000002',stageId,stageName:'Synthetic rolling stage',stageDate:'2000-01-03',stageNumber:1,distanceKm:120,terrainType:'hilly',stageFormat:'road_race',raceStatus:'scheduled',acceptedClubs:[clubA,clubB],preparedClubs:[clubA,clubB],hasJob:false,hasArchive:false,rows:Array.from({length:10},(_,i)=>({riderUuid:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),clubId:i<5?clubA:clubB,teamId:i<5?1:2,riderName:'Fixture Rider '+(i+1),teamName:'Fixture Team '+(i<5?1:2),selectionOrder:i%5+1,role:i%5===0?'captain':'domestique',flat:60+i,climbing:65+i,stamina:70,resistance:75,provenance:'uranius_synthetic_fixture'}))}
const snapshot=(overrides={},s=stage)=>({clock:{date:'2000-01-03',paused:false,...overrides},stages:[s]})
try {
 const paused=planCalendarDispatch(snapshot({paused:true}))
 assert.equal(paused.dispatchAllowed,false);assert.equal(paused.jobs.length,0)
 const preview=planCalendarDispatch(snapshot({date:'2000-01-01',paused:true}),{previewDate:'2000-01-03'})
 assert.equal(preview.dispatchAllowed,false);assert.equal(preview.jobs.length,1);assert.equal(preview.decisions[0].reason,'preview-eligible')
 assert.equal(planCalendarDispatch(snapshot({date:'2000-01-02'})).decisions[0].reason,'not-due')
 pass('027 paused clock, future date and explicit non-dispatching preview enforced')
 for(const [change,reason] of [[{hasJob:true},'already-dispatched'],[{hasArchive:true},'already-dispatched'],[{raceStatus:'cancelled'},'not-scheduled'],[{stageNumber:2},'stage-carryover-required'],[{acceptedClubs:[clubB]},'requires-two-accepted-teams'],[{preparedClubs:[clubB]},'invalid-preparation-or-input']]){
  const p=planCalendarDispatch(snapshot({}, {...stage,...change}));assert.equal(p.jobs.length,0);assert.equal(p.decisions[0].reason,reason)
 }
 for(const mutate of [s=>s.rows.pop(),s=>{s.rows[1].riderUuid=s.rows[0].riderUuid},s=>{s.rows[1].role='captain'},s=>{s.rows[1].flat=0}]){
  const bad=structuredClone(stage);mutate(bad);assert.throws(()=>buildCalendarInput(bad))
 }
 pass('027 ineligible entries, duplicate execution, malformed rosters and stage carryover rejected')
 const plan=planCalendarDispatch(snapshot()),job=plan.jobs[0]
 assert.equal(plan.dispatchAllowed,true);assert.equal(job.expectedOutputSha256,null)
 const reverse={...stage,rows:[...stage.rows].reverse(),acceptedClubs:[...stage.acceptedClubs].reverse()}
 assert.equal(planCalendarDispatch(snapshot({},reverse)).jobs[0].inputText,job.inputText)
 const input=JSON.parse(job.inputText)
 assert.equal(input.riders.length,10);assert.equal(input.teams.length,2)
 assert.equal(input.profilePoints.at(-1).kilometre,120)
 assert.ok(new Set(input.profilePoints.map(p=>p.elevationMetres)).size>2)
 assert.equal(digest(job.inputText),job.inputSha256)
 pass('027 new canonical hilly input is independent of row order and has no expected result')
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true
 run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 sql('CREATE ROLE uranius_migrator LOGIN NOINHERIT; CREATE ROLE uranius_worker LOGIN NOINHERIT; CREATE ROLE uranius_smoke_reader LOGIN NOINHERIT; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; GRANT CONNECT,CREATE ON DATABASE postgres TO uranius_migrator;',admin)
 const src=p=>readFileSync(join(root,'database/reconstruction/worker/',p),'utf8')
 sql(src('025_race_job_contract_REVIEW_ONLY.sql'))
 const table='uranius_jobs.race_jobs'
 const enc=s=>"convert_from(decode('"+Buffer.from(s,'utf8').toString('hex')+"','hex'),'UTF8')"
 // Existing repeat row remains unchanged after upgrade. Use a different stage.
 const priorStage='25251441-bd5d-4f00-993d-859a95cf099e',priorText='{}'
 sql("INSERT INTO "+table+"(stage_id,input_text,input_sha256,expected_output_sha256,due_at) VALUES ('"+priorStage+"',"+enc(priorText)+",'"+digest(priorText)+"','"+digest('{}')+"',clock_timestamp()+interval '1 day')",admin)
 const priorBefore=sql("SELECT to_jsonb(j)::text FROM "+table+" j",admin)
 const candidate=src('027_calendar_job_contract_REVIEW_ONLY.sql')
 sql('BEGIN;\n'+candidate+'\nROLLBACK;')
 assert.equal(sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='uranius_jobs' AND table_name='race_jobs' AND column_name='job_kind'",admin),'0')
 sql('BEGIN;\n'+candidate+'\nCOMMIT;')
 assert.equal(sql("SELECT (to_jsonb(j)-'job_kind'-'calendar_date')::text FROM "+table+" j",admin),priorBefore)
 assert.equal(sql("SELECT job_kind FROM "+table,admin),'verified_repeat')
 pass('027 atomic upgrade preserves existing repeat job and rolls back cleanly')
 const insert="INSERT INTO "+table+"(stage_id,input_text,input_sha256,expected_output_sha256,due_at,job_kind,calendar_date) VALUES ('"+stageId+"',"+enc(job.inputText)+",'"+job.inputSha256+"',NULL,clock_timestamp()-interval '1 second','calendar_review','2000-01-03')"
 sql(insert,admin);sql(insert,admin,true)
 const different=job.inputText+' '
 sql(insert.replace(enc(job.inputText),enc(different)).replace(job.inputSha256,digest(different)),admin,true)
 for(const role of ['anon','authenticated','uranius_smoke_reader'])sql('SELECT * FROM '+table,role,true)
 sql(insert,worker,true);sql("UPDATE "+table+" SET calendar_date='2000-01-04'",worker,true)
 pass('027 one calendar job per stage, private access and immutable calendar identity enforced')
 const bundle=join(scratch,'engine.mjs')
 await build({entryPoints:[join(root,'scripts/uranius-race-job-engine.ts')],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 let calls=0
 const simulate=text=>{
  calls++
  const result=spawnSync(process.execPath,[bundle],{input:text,env,encoding:'utf8',timeout:60000,maxBuffer:5*1024*1024,windowsHide:true})
  if(result.error||result.status!==0)throw Error('Pure engine failed: '+String(result.stderr).slice(0,1000))
  return result.stdout
 }
 const q=s=>sql(s,worker)
 const report=await executeCalendarJob({query:q,simulate})
 assert.equal(report.status,'completed');assert.equal(report.attempt,1);assert.equal(calls,2)
 assert.equal(sql("SELECT output_sha256=encode(sha256(convert_to(output_text,'UTF8')),'hex') AND expected_output_sha256 IS NULL AND jsonb_array_length(output_text::jsonb->'finalRiderStates')=10 FROM "+table+" WHERE job_kind='calendar_review'",admin),'t')
 assert.deepEqual(await executeCalendarJob({query:q,simulate}),{status:'idle'});assert.equal(calls,2)
 pass('027 new hilly race executed twice by restricted worker, exact output stored once without precomputed result')
 // Terminal result still immutable; independent mismatch is rejected before persistence.
 sql("UPDATE "+table+" SET status='failed' WHERE job_kind='calendar_review'",worker)
 assert.equal(sql("SELECT status FROM "+table+" WHERE job_kind='calendar_review'",admin),'completed')
 const fresh=JSON.parse(job.inputText);fresh.stageId='882801c4-ea99-4aaf-8ae5-d2a11cd26fd9';fresh.seed='uranius-calendar-v1:'+fresh.stageId+':2000-01-03'
 const text=JSON.stringify(fresh)
 sql(insert.replace(stageId,fresh.stageId).replace(enc(job.inputText),enc(text)).replace(job.inputSha256,digest(text)),admin)
 let n=0
 await assert.rejects(()=>executeCalendarJob({query:q,simulate:input=>{const out=simulate(input);return ++n===2?out+' ':out}}),/disagree/)
 assert.equal(sql("SELECT status||':'||(output_text IS NULL)::text FROM "+table+" WHERE stage_id='"+fresh.stageId+"'",admin),'running:true')
 pass('027 nondeterministic output rejected; terminal result and previous repeat remain unchanged')
 console.log('PASS '+checks+'/7 targeted calendar worker checks; no hosted connection')
}finally{
 if(started){try{run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'})}catch(error){console.error('Disposable shutdown failed: '+error.message)}}
 rmSync(scratch,{recursive:true,force:true,maxRetries:8,retryDelay:300})
 console.log('INFO Disposable PostgreSQL files cleaned up')
}
