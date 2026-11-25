// REVIEW ONLY until separately approved exact 022 manifest. Isolated direct TLS migrator.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'

const root=new URL('../database/reconstruction/overview/',import.meta.url)
const candidateHash='5839e61caadced1a44a9f40e3f41c8fd45dbb9a99963312d1bd224e7a43c979d'
const manifestHash='39ba9742640369d0239b6eb4f7bfb2c0b6c32751d54e0094156f26b48e64a267'
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const read=name=>readFileSync(new URL(name,root))
function verify(){
 const bytes=read('022_install_manifest_REVIEW_ONLY.json')
 const candidate=read('022_completed_race_archive_REVIEW_ONLY.sql')
 if(digest(bytes)!==manifestHash||digest(candidate)!==candidateHash)
  throw Error('022 frozen source/manifest digest mismatch; no connection.')
 const manifest=JSON.parse(bytes.toString('utf8'))
 const previous=JSON.parse(readFileSync(new URL('021_install_manifest_REVIEW_ONLY.json',root),'utf8'))
 const history=[...previous.requires,{file:previous.candidate.ledgerVersion,sha256:previous.candidate.sha256}]
 if(manifest.status!=='REVIEW_ONLY_NOT_APPROVED'||manifest.hostedApplied!==false||
    manifest.projectRef!=='sdtsivgtcaoaeoihcwzd'||manifest.postgresMajor!==17||
    manifest.approvalRequired!==true||manifest.expectedLedgerEntries!==16||
    manifest.candidate.file!=='022_completed_race_archive_REVIEW_ONLY.sql'||
    manifest.candidate.ledgerVersion!=='022_completed_race_archive.sql'||
    manifest.candidate.sha256!==candidateHash||
    JSON.stringify(manifest.requires)!==JSON.stringify(history)||history.length!==16)
  throw Error('022 historical manifest boundary changed; no connection.')
 return {sql:candidate.toString('utf8'),history}
}
const lit=s=>"'"+s.replaceAll("'","''")+"'"
function atomicBatch(){
 const {sql,history}=verify()
 const expected=[...history,{file:'022_completed_race_archive.sql',sha256:candidateHash}]
 const vals=expected.map(x=>'('+lit(x.file)+','+lit(x.sha256)+')').join(',')
 return [
  "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
  sql,
  "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('022_completed_race_archive.sql','"+candidateHash+"');",
  "DO $uranius022_postflight$ BEGIN",
  "IF (SELECT count(*) FROM uranius_private.migration_ledger)<>17",
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
  "OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_private.synthetic_completed_race_runs'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)",
  "OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')",
  "OR EXISTS (SELECT 1 FROM unnest(ARRAY['anon','authenticated','uranius_smoke_reader']) AS t(role_name) WHERE has_any_column_privilege(role_name,'uranius_private.synthetic_completed_race_runs','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(role_name,'uranius_private.synthetic_completed_race_runs','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_function_privilege(role_name,'uranius_private.validate_synthetic_completed_race_run()','EXECUTE'))",
  "OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='uranius_private.synthetic_completed_race_runs'::regclass AND tgname='synthetic_completed_run_validate' AND NOT tgisinternal AND tgenabled='O' AND tgfoid='uranius_private.validate_synthetic_completed_race_run()'::regprocedure)",
  "OR (SELECT count(*) FROM pg_constraint WHERE conrelid='uranius_private.synthetic_completed_race_runs'::regclass AND contype='f' AND convalidated)<>2",
  "OR (SELECT count(*) FROM pg_constraint WHERE conrelid='uranius_private.synthetic_completed_race_runs'::regclass AND contype='u' AND convalidated)<>1",
  "THEN RAISE EXCEPTION '022 atomic postflight failed; rolling back'; END IF;",
  "END $uranius022_postflight$;"
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
  timeout:120000,stage:'Guarded Uranius 022 refused'})
 console.log('022 atomic archive installation returned success; independently verify hosted 17 ledger entries, empty private archive, constraints and RLS before closing.')
}
try{
 const [mode,approved]=process.argv.slice(2)
 if(mode==='--review'&&process.argv.length===3){
  verify()
  console.log('URANIUS 022 FROZEN OFFLINE REVIEW PASSED; no database connection.')
  console.log('Candidate SHA-256: '+candidateHash)
  console.log('Manifest SHA-256: '+manifestHash)
 }else if(mode==='--apply-approved-022'&&process.argv.length===4)apply(approved)
 else throw Error('Usage: --review; or ONLY after separate exact owner approval --apply-approved-022 <manifest SHA-256>')
}catch(e){console.error(e instanceof Error?e.message:'022 stopped');process.exitCode=1}
