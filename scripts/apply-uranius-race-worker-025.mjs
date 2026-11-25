// 025 owner-local guarded installation. Worker remains NOLOGIN.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'
const root=new URL('../',import.meta.url)
const expected='bdce37e954dd878e05e4d75fa6c387c5da17d98dd66bfc63f30c08841a5b816d'
const candidate='database/reconstruction/worker/025_hosted_worker_install_REVIEW_ONLY.sql'
const manifest='database/reconstruction/worker/025_install_manifest_REVIEW_ONLY.json'
const read=p=>readFileSync(new URL(p,root))
const digest=b=>createHash('sha256').update(b).digest('hex')
function verify(){
 const bytes=read(manifest)
 if(digest(bytes)!==expected)throw Error('025 manifest drift; no connection')
 const m=JSON.parse(bytes)
 const previous=JSON.parse(read('database/reconstruction/overview/024_install_manifest_REVIEW_ONLY.json'))
 const history=[...previous.requires,{file:previous.candidate.ledgerVersion,sha256:previous.candidate.sha256}]
 if(m.projectRef!=='sdtsivgtcaoaeoihcwzd'||m.postgresMajor!==17||m.expectedLedgerEntries!==18||
 m.status!=='REVIEW_ONLY_NOT_APPROVED'||m.hostedApplied!==false||m.approvalRequired!==true||
 m.candidate.file!==candidate||m.candidate.ledgerVersion!=='025_private_race_job_worker.sql'||
 JSON.stringify(m.requires)!==JSON.stringify(history)||history.length!==18||
 digest(read(candidate))!==m.candidate.sha256||m.files.length!==6)throw Error('025 frozen boundary mismatch')
 for(const f of m.files)if(digest(read(f.path))!==f.sha256)throw Error('025 frozen file mismatch: '+f.path)
 return m
}
function apply(m,approval){
 if(approval!==expected)throw Error('Exact owner approval required; no connection')
 const env=process.env
 assertSandboxTarget('migrate',env)
 if(!env.URANIUS_PSQL_PATH||!env.URANIUS_DATABASE_CA_FILE)throw Error('Trusted psql and CA required')
 const url=new URL(env.URANIUS_DATABASE_URL),executable=env.URANIUS_PSQL_PATH
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([n])=>allowed.has(n.toUpperCase())))
 Object.assign(child,{PGHOST:url.hostname,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,PGCLIENTENCODING:'UTF8',PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 const batch=[
 "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
 read(candidate).toString('utf8'),
 "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('025_private_race_job_worker.sql','"+m.candidate.sha256+"');",
 "DO $ledger025$ BEGIN IF (SELECT count(*) FROM uranius_private.migration_ledger)<>19 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_worker' AND NOT rolcanlogin) THEN RAISE EXCEPTION '025 postflight failed'; END IF; END $ledger025$;"
 ].join('\n')
 try{
  runPsqlBatch({executable,env:child,input:'BEGIN;\n'+batch+'\nROLLBACK;',timeout:120000,stage:'025 rehearsal refused'})
  console.log('PASS 025 full installation rollback rehearsal')
  runPsqlBatch({executable,env:child,input:batch,transaction:true,timeout:120000,stage:'025 atomic install refused'})
  console.log('PASS 025 private job installed; worker NOLOGIN; independently verify before activation')
 }finally{delete child.PGPASSWORD}
}
try{
 const [mode,approved]=process.argv.slice(2),m=verify()
 if(mode==='--review'&&process.argv.length===3)console.log('PASS 025 exact frozen package; no connection: '+expected)
 else if(mode==='--apply-approved-025'&&process.argv.length===4)apply(m,approved)
 else throw Error('Usage: --review; or --apply-approved-025 <exact owner-approved manifest>')
}catch(e){console.error(e instanceof Error?e.message:'025 stopped');process.exitCode=1}
