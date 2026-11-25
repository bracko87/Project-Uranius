// Owner-local one-shot review. No permanent worker or scheduler.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'
const root=new URL('../',import.meta.url)
const base='database/reconstruction/overview/'
const source=base+'023_first_competitive_race_REVIEW_ONLY.sql'
const read=p=>readFileSync(new URL(p,root))
const hash=x=>createHash('sha256').update(x).digest('hex')
const enc=x=>"convert_from(decode('"+Buffer.from(x,'utf8').toString('hex')+"','hex'),'UTF8')"
const race='19000000-0000-4000-8000-000000000001'
const packetQuery=`SELECT jsonb_build_object('raceId',r.id,'stageId',s.id,'stageName',s.name,'distanceKm',s.distance_km,
'terrainType',s.terrain_type,'stageFormat',s.stage_format,'stageNumber',s.stage_number,
'rows',(SELECT jsonb_agg(jsonb_build_object('riderUuid',i.rider_uuid,'clubId',l.club_id,'teamId',l.team_id,
'riderName',c.label,'teamName',t.label,'selectionOrder',l.selection_order,'role',l.role,
'flat',c.flat,'climbing',c.climbing,'stamina',c.stamina,'resistance',c.resistance,'provenance',l.provenance)
ORDER BY l.team_id,l.selection_order) FROM uranius_game.synthetic_race_startlists l JOIN uranius_catalog.riders c USING(rider_id)
JOIN uranius_game.synthetic_rider_identity i USING(rider_id) JOIN uranius_catalog.teams t ON t.team_id=l.team_id WHERE l.race_id=r.id))
FROM uranius_game.races r JOIN uranius_game.race_stages s ON s.race_id=r.id WHERE r.id='${race}' AND s.stage_number=1`
const finish=read(base+'023_first_competitive_race_postflight_REVIEW_ONLY.sql').toString('utf8')
function verify(approved){
 const bytes=read(base+'023_first_competitive_race_manifest_REVIEW_ONLY.json')
 assert.match(approved,/^[a-f0-9]{64}$/)
 assert.equal(hash(bytes),approved,'Exact approved manifest required')
 const m=JSON.parse(bytes)
 assert.equal(m.projectRef,'sdtsivgtcaoaeoihcwzd')
 assert.equal(m.status,'REVIEW_ONLY_REQUIRES_EXPLICIT_APPROVAL')
 assert.equal(m.existingLedgerEntries,17)
 assert.equal(m.operation,'one_shot_competitive_synthetic_archive')
 assert.deepEqual(m.files.map(f=>f.path),[source,base+'023_first_competitive_race_postflight_REVIEW_ONLY.sql',
 'scripts/run-uranius-first-hosted-race.mjs','scripts/uranius-startlist-engine-review.ts','scripts/assert-sandbox-target.mjs',
 'scripts/run-uranius-psql-batch.mjs',base+'022_install_manifest_REVIEW_ONLY.json','scripts/run-approved-first-hosted-race-023-windows.ps1'])
 for(const f of m.files)assert.equal(hash(read(f.path)),f.sha256,'Frozen file mismatch: '+f.path)
 const check=spawnSync('git',['diff','--exit-code','536259932b85992924bda6ee693c3db198d7fb17','--','src/race-engine','package.json','package-lock.json'],{cwd:fileURLToPath(root),encoding:'utf8',timeout:30000,windowsHide:true})
 assert.ok(!check.error&&check.status===0,'Previously validated engine source/dependencies changed; no connection')
 return read(source).toString('utf8')
}
async function execute(prefix){
 const env=process.env
 assertSandboxTarget('migrate',env)
 assert.ok(env.URANIUS_PSQL_PATH&&env.URANIUS_DATABASE_CA_FILE,'Trusted psql and CA required')
 const executable=env.URANIUS_PSQL_PATH,target=new URL(env.URANIUS_DATABASE_URL)
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const safeEnv=Object.fromEntries(Object.entries(env).filter(([n])=>allowed.has(n.toUpperCase())))
 const pgEnv={...safeEnv,PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'uranius_migrator',
 PGPASSWORD:decodeURIComponent(target.password),PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,
 PGCONNECT_TIMEOUT:'8',PGCLIENTENCODING:'UTF8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'}
 for(const key of ['URANIUS_DATABASE_URL','URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_PSQL_PATH'])delete env[key]
 const sql=(input,transaction=false)=>runPsqlBatch({executable,input,env:pgEnv,timeout:120000,transaction,
 stage:'Guarded first hosted race refused',extraArgs:['--tuples-only','--no-align']}).trim()
 const dir=mkdtempSync(join(tmpdir(),'uranius-first-hosted-race-'))
 try{
  const {build}=await import('esbuild')
  const bundle=join(dir,'engine.mjs')
  await build({entryPoints:[fileURLToPath(new URL('scripts/uranius-startlist-engine-review.ts',root))],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
  const packet=sql('BEGIN;\n'+prefix+'\n'+packetQuery+';\nROLLBACK;')
  const p=JSON.parse(packet)
  assert.equal(p.raceId,race);assert.match(p.stageId,/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)
  assert.equal(p.rows.length,10)
  console.log('PASS roster preview; temporary opponent and permissions rolled back')
  const child=spawnSync(process.execPath,[bundle,'--emit-private-review-artifact'],{input:packet,env:safeEnv,encoding:'utf8',timeout:120000,maxBuffer:12*1024*1024,windowsHide:true})
  if(child.error||child.status!==0)throw Error('Pure engine execution failed; no result committed')
  const {artifact,...report}=JSON.parse(child.stdout)
  assert.equal(report.finishers,10);assert.equal(report.teams,2);assert.equal(report.deterministic,true)
  assert.equal(report.negativePacketsRejected,6);assert.equal(report.fixtureUnchanged,true)
  assert.equal(report.outputSha256,artifact.outputSha256)
  assert.equal(hash(artifact.inputText),artifact.inputSha256);assert.equal(hash(artifact.outputText),artifact.outputSha256)
  assert.ok(Buffer.byteLength(artifact.inputText)<=1048576&&Buffer.byteLength(artifact.outputText)<=4194304)
  const batch=[prefix,
   "DO $compare023$ BEGIN IF ("+packetQuery+") IS DISTINCT FROM "+enc(packet)+"::jsonb THEN RAISE EXCEPTION '023 packet changed'; END IF; END $compare023$;",
   "INSERT INTO uranius_private.synthetic_completed_race_runs(race_id,stage_id,contract_version,engine_lane,provenance,input_text,output_text,input_sha256,output_sha256) VALUES ('"+race+"','"+p.stageId+"',1,'existing_v1','uranius_synthetic_review',"+enc(artifact.inputText)+","+enc(artifact.outputText)+",'"+artifact.inputSha256+"','"+artifact.outputSha256+"');",finish].join('\n')
  const validate=s=>{
   const v=JSON.parse(s)
   assert.equal(v.runs,1);assert.equal(v.finishers,10);assert.equal(v.teams,2)
   assert.equal(v.inputSha,artifact.inputSha256);assert.equal(v.outputSha,artifact.outputSha256)
   assert.equal(v.frames,report.frames);assert.equal(v.events,report.events)
   return v
  }
  const rehearsal=validate(sql('BEGIN;\n'+batch+'\nROLLBACK;'))
  console.log('PASS full hosted transaction rehearsal; rolled back')
  const committed=validate(sql(batch,true))
  assert.deepEqual(committed,rehearsal)
  console.log('HOSTED_RACE '+JSON.stringify(committed))
  console.log('PASS one competitive synthetic archive committed; independent verification required. Do not retry.')
 }finally{delete pgEnv.PGPASSWORD;rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
}
try{
 const args=process.argv.slice(2)
 assert.equal(args.length,2,'Usage: --review or --execute-approved plus exact manifest digest')
 const [mode,approved]=args
 assert.ok(mode==='--review'||mode==='--execute-approved')
 const prefix=verify(approved)
 if(mode==='--review')console.log('PASS 023 frozen files verified; no connection: '+approved)
 else await execute(prefix)
}catch(e){console.error('023 stopped: '+(e instanceof Error?e.message:'unknown error')+'; do not retry before independent state check.');process.exitCode=1}
