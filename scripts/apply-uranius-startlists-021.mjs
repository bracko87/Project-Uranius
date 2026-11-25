// REVIEW ONLY until separately approved exact 021 manifest. Isolated direct TLS migrator.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'

const root=new URL('../database/reconstruction/overview/',import.meta.url)
const candidateHash='041964c176d2e647d13f7ef01d211757fc6738226f4679e18baea64b4df57186'
const manifestHash='8aa6ead9640bdd460fb15d27150259f947c517e76dc9cc8ad56e4ea739b4536e'
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const read=name=>readFileSync(new URL(name,root))
function verify(){
 const bytes=read('021_install_manifest_REVIEW_ONLY.json')
 const candidate=read('021_synthetic_startlists_REVIEW_ONLY.sql')
 if(digest(bytes)!==manifestHash||digest(candidate)!==candidateHash)
  throw Error('021 frozen source/manifest digest mismatch; no connection.')
 const manifest=JSON.parse(bytes.toString('utf8'))
 const previous=JSON.parse(readFileSync(new URL('019_install_manifest_REVIEW_ONLY.json',root),'utf8'))
 const history=[...previous.requires,{file:previous.candidate.ledgerVersion,sha256:previous.candidate.sha256}]
 if(manifest.status!=='REVIEW_ONLY_NOT_APPROVED'||manifest.hostedApplied!==false||
    manifest.projectRef!=='sdtsivgtcaoaeoihcwzd'||manifest.postgresMajor!==17||
    manifest.approvalRequired!==true||manifest.expectedLedgerEntries!==15||
    manifest.candidate.file!=='021_synthetic_startlists_REVIEW_ONLY.sql'||
    manifest.candidate.ledgerVersion!=='021_synthetic_startlists.sql'||
    manifest.candidate.sha256!==candidateHash||
    JSON.stringify(manifest.requires)!==JSON.stringify(history)||history.length!==15)
  throw Error('021 historical manifest boundary changed; no connection.')
 return {sql:candidate.toString('utf8'),history}
}
const lit=s=>"'"+s.replaceAll("'","''")+"'"
function atomicBatch(){
 const {sql,history}=verify()
 const expected=[...history,{file:'021_synthetic_startlists.sql',sha256:candidateHash}]
 const vals=expected.map(x=>'('+lit(x.file)+','+lit(x.sha256)+')').join(',')
 return [
  "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
  sql,
  "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('021_synthetic_startlists.sql','"+candidateHash+"');",
  "DO $uranius021_postflight$ BEGIN",
  "IF (SELECT count(*) FROM uranius_private.migration_ledger)<>16",
  "OR EXISTS(SELECT version,sha256 FROM (VALUES "+vals+") expected(version,sha256) EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)",
  "OR EXISTS(SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM (VALUES "+vals+") expected(version,sha256))",
  "OR (SELECT count(*) FROM uranius_catalog.riders)<>200",
  "OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2",
  "OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1",
  "OR (SELECT count(*) FROM pg_class WHERE relnamespace='uranius_game'::regnamespace AND relname IN ('races','race_stages','race_team_entries','race_preparations') AND relrowsecurity AND relforcerowsecurity)<>4",
  "OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename IN ('races','race_stages','race_team_entries','race_preparations') AND cmd='SELECT' AND roles=ARRAY['uranius_smoke_reader']::name[])<>4",
  "OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename IN ('races','race_stages','race_team_entries','race_preparations'))<>4",
  "OR EXISTS(SELECT 1 FROM unnest(ARRAY['races','race_stages','race_team_entries','race_preparations']) AS t(name) WHERE has_any_column_privilege('anon','uranius_game.'||name,'SELECT') OR has_any_column_privilege('authenticated','uranius_game.'||name,'SELECT') OR has_table_privilege('uranius_smoke_reader','uranius_game.'||name,'INSERT,UPDATE,DELETE') OR has_any_column_privilege('uranius_smoke_reader','uranius_game.'||name,'INSERT,UPDATE'))",
  "OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_game.synthetic_race_startlists'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)",
  "OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_race_startlists')",
  "OR EXISTS (SELECT 1 FROM unnest(ARRAY['anon','authenticated','uranius_smoke_reader']) AS t(role_name) WHERE has_any_column_privilege(role_name,'uranius_game.synthetic_race_startlists','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(role_name,'uranius_game.synthetic_race_startlists','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))",
  "OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='uranius_game.club_profiles'::regclass AND conname='uranius_club_team_pair' AND contype='u' AND convalidated)",
  "THEN RAISE EXCEPTION '021 atomic postflight failed; rolling back'; END IF;",
  "END $uranius021_postflight$;"
 ].join('\n')
}
function apply(approved){
 if(approved!==manifestHash)throw Error('Separate exact owner approval required; no connection.')
 const input=atomicBatch(),env=process.env
 assertSandboxTarget('migrate',env)
 if(!env.URANIUS_PSQL_PATH||!env.URANIUS_DATABASE_CA_FILE)throw Error('Trusted psql and TLS CA required.')
 const target=new URL(env.URANIUS_DATABASE_URL)
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([n])=>allowed.has(n.toUpperCase())))
 Object.assign(child,{PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',
  PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),
  PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,
  PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 runPsqlBatch({executable:env.URANIUS_PSQL_PATH,input,env:child,transaction:true,
  timeout:120000,stage:'Guarded Uranius 021 refused'})
 console.log('021 atomic startlist installation returned success; independently verify hosted 16 ledger entries, roster counts and RLS before closing.')
}
try{
 const [mode,approved]=process.argv.slice(2)
 if(mode==='--review'&&process.argv.length===3){
  verify()
  console.log('URANIUS 021 FROZEN OFFLINE REVIEW PASSED; no database connection.')
  console.log('Candidate SHA-256: '+candidateHash)
  console.log('Manifest SHA-256: '+manifestHash)
 }else if(mode==='--apply-approved-021'&&process.argv.length===4)apply(approved)
 else throw Error('Usage: --review; or ONLY after separate exact owner approval --apply-approved-021 <manifest SHA-256>')
}catch(e){console.error(e instanceof Error?e.message:'021 stopped');process.exitCode=1}
