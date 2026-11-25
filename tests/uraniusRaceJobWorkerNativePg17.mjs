// Offline-only native PG17 worker acceptance. Never uses hosted credentials.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, delimiter, join, resolve } from 'node:path'
import { createServer } from 'node:net'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'


import {spawn} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {build} from 'esbuild'
import {claimSql,completeSql,executeOne,expireExhaustedSql} from '../scripts/uranius-race-job-worker.mjs'
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

const scratch = mkdtempSync(join(tmpdir(), 'uranius-025-job-disposable-'))
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
const source=readFileSync(join(root,'database/reconstruction/worker/025_race_job_contract_REVIEW_ONLY.sql'),'utf8')
const childSql=query=>new Promise((resolve,reject)=>{
 const p=spawn(exe.psql,['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U',worker,'-f','-'],{env:dbEnv,windowsHide:true})
 let stdout='',stderr=''
 p.stdout.on('data',v=>stdout+=v);p.stderr.on('data',v=>stderr+=v)
 p.on('error',reject);p.on('close',code=>code===0?resolve(stdout.trim()):reject(Error(stderr.slice(0,1000))))
 p.stdin.end(query)
})
try {
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true
 run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 sql('CREATE ROLE uranius_migrator LOGIN NOINHERIT; CREATE ROLE uranius_worker LOGIN NOINHERIT; CREATE ROLE uranius_smoke_reader LOGIN NOINHERIT; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; GRANT CONNECT,CREATE ON DATABASE postgres TO uranius_migrator;',admin)
 sql('BEGIN;\n'+source+'\nROLLBACK;')
 assert.equal(sql("SELECT to_regnamespace('uranius_jobs') IS NULL",admin),'t')
 sql('BEGIN;\n'+source+'\nCOMMIT;')
 assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='uranius_jobs.race_jobs'::regclass",admin),'true:true')
 pass('025 private FORCE RLS job schema installs and rolls back atomically')
 const bundle=join(scratch,'review.mjs'),engine=join(scratch,'engine.mjs')
 for(const [entry,outfile] of [['scripts/uranius-startlist-engine-review.ts',bundle],['scripts/uranius-race-job-engine.ts',engine]])await build({entryPoints:[join(root,entry)],outfile,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 const stageId='25251441-bd5d-4f00-993d-859a95cf099e'
 const packet={raceId:'19000000-0000-4000-8000-000000000001',stageId,stageName:'Fixture flat stage',distanceKm:120,terrainType:'flat',stageFormat:'road_race',stageNumber:1,rows:Array.from({length:10},(_,i)=>({riderUuid:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),clubId:'00000000-0000-4000-8000-0000000000'+(i<5?'11':'12'),teamId:i<5?1:2,riderName:'Fixture Rider '+(i+1),teamName:'Fixture Team '+(i<5?1:2),selectionOrder:i%5+1,role:i%5===0?'captain':'domestique',flat:60+i,climbing:65,stamina:70,resistance:75,provenance:'uranius_synthetic_fixture'}))}
 // Use the existing trusted adapter as the independent no-command reference.
 const pure=(file,input,argv=[])=>{
  const res=spawnSync(process.execPath,[file,...argv],{input,env,encoding:'utf8',timeout:120000,maxBuffer:12*1024*1024,windowsHide:true})
  if(res.error||res.status!==0)throw Error('Pure engine test failed: '+String(res.stderr).slice(0,1000))
  return res.stdout.trim()
 }
 const {artifact}=JSON.parse(pure(bundle,JSON.stringify(packet),['--emit-private-review-artifact']))
 const simulate=input=>pure(engine,input)
 assert.equal(simulate(artifact.inputText),artifact.outputText)
 pass('025 actual queued engine output matches existing validated adapter byte-for-byte')
 const table='uranius_jobs.race_jobs'
 const enc=s=>"convert_from(decode('"+Buffer.from(s,'utf8').toString('hex')+"','hex'),'UTF8')"
 const insert=due=>"INSERT INTO "+table+"(stage_id,input_text,input_sha256,expected_output_sha256,due_at) VALUES ('"+stageId+"',"+enc(artifact.inputText)+",'"+artifact.inputSha256+"','"+artifact.outputSha256+"',"+due+")"
 const seed=(due="clock_timestamp()-interval '1 second'")=>{sql('TRUNCATE '+table,admin);sql(insert(due),admin)}
 const q=s=>sql(s,worker)
 const count=()=>sql("SELECT count(*) FROM "+table+" WHERE status='completed'",admin)
 seed("clock_timestamp()+interval '1 day'")
 assert.deepEqual(await executeOne({query:q,simulate}),{status:'idle'})
 assert.equal(count(),'0')
 pass('025 future job not claimed')
 seed()
 sql(insert("clock_timestamp()"),admin,true)
 const [a,b]=await Promise.all([childSql(claimSql(randomUUID(),3)),childSql(claimSql(randomUUID(),3))])
 const claims=[JSON.parse(a),JSON.parse(b)].filter(Boolean)
 assert.equal(claims.length,1)
 const stale=claims[0]
 assert.equal(stale.attempt,1)
 pass('025 duplicate job and concurrent claim rejected; exactly one lease')
 sql("SELECT pg_sleep(3.2)",admin)
 const fresh=JSON.parse(q(claimSql(randomUUID(),180)))
 assert.equal(fresh.job_id,stale.job_id);assert.equal(fresh.attempt,2)
 assert.throws(()=>completeSql(fresh,artifact.outputText+' '),/digest mismatch/)
 assert.equal(q(completeSql(stale,artifact.outputText)),'0')
 assert.equal(q(completeSql(fresh,artifact.outputText)),'1')
 assert.equal(count(),'1')
 assert.equal(sql("SELECT output_sha256 FROM "+table,admin),artifact.outputSha256)
 assert.equal(q(completeSql(fresh,artifact.outputText)),'0')
 assert.deepEqual(await executeOne({query:q,simulate}),{status:'idle'})
 pass('025 expired lease reclaimed; stale completion fenced; successful result immutable and idempotent')
 seed()
 const report=await executeOne({query:q,simulate})
 assert.equal(report.status,'completed');assert.equal(report.outputSha256,artifact.outputSha256)
 assert.equal(count(),'1')
 pass('025 worker claims and runs real engine through restricted role and persists exact result')
 seed()
 await assert.rejects(()=>executeOne({query:q,simulate:()=>{throw Error('injected crash')},leaseSeconds:1}))
 for(let i=2;i<=3;i++){
  sql("SELECT pg_sleep(1.2)",admin)
  assert.equal(JSON.parse(q(claimSql(randomUUID(),1))).attempt,i)
 }
 sql("SELECT pg_sleep(1.2)",admin)
 q(expireExhaustedSql)
 assert.equal(sql("SELECT status||':'||attempt FROM "+table,admin),'failed:3')
 assert.deepEqual(await executeOne({query:q,simulate}),{status:'idle'})
 pass('025 crash retry capped at three attempts; exhausted job fails without publishing')
 seed()
 for(const role of ['anon','authenticated','uranius_smoke_reader'])sql("SELECT * FROM "+table,role,true)
 sql(insert("clock_timestamp()"),worker,true)
 sql("DELETE FROM "+table,worker,true)
 sql("UPDATE "+table+" SET input_text='tamper'",worker,true)
 sql("UPDATE "+table+" SET status='completed'",worker,true)
 assert.throws(()=>claimSql("invalid"),/Invalid job identity/)
 assert.throws(()=>claimSql(randomUUID(),181),/Invalid lease duration/)
 assert.equal(sql("SELECT count(*) FROM "+table,admin),'1')
 assert.equal(sql("SELECT status FROM "+table,admin),'queued')
 pass('025 unauthorized role access, inserts, deletes, input edits and invalid transition denied')
 console.log('PASS '+checks+'/8 targeted worker checks; no hosted connection')
} finally {
 if(started){try{run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'})}catch(error){console.error('Disposable shutdown failed: '+error.message)}}
 rmSync(scratch,{recursive:true,force:true,maxRetries:8,retryDelay:300})
 console.log('INFO Disposable PostgreSQL files cleaned up')
}
