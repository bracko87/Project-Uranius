// REVIEW ONLY until separately approved exact 024 manifest. Isolated direct TLS migrator.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'

const root=new URL('../database/reconstruction/overview/',import.meta.url)
const candidateHash='ee90f17d233680052b7fb281019467e7b6040f136371a52cd3686ded4102da55'
const manifestHash='69ff9a4b8d4f3d7ec988627884bbe7ba8e9373c0dc8c6e6a57715946376b45f4'
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const read=name=>readFileSync(new URL(name,root))
function verify(){
 const bytes=read('024_install_manifest_REVIEW_ONLY.json')
 const candidate=read('024_participant_replay_preview_REVIEW_ONLY.sql')
 if(digest(bytes)!==manifestHash||digest(candidate)!==candidateHash)
  throw Error('024 frozen source/manifest digest mismatch; no connection.')
 const manifest=JSON.parse(bytes.toString('utf8'))
 const previous=JSON.parse(readFileSync(new URL('022_install_manifest_REVIEW_ONLY.json',root),'utf8'))
 const history=[...previous.requires,{file:previous.candidate.ledgerVersion,sha256:previous.candidate.sha256}]
 if(manifest.status!=='REVIEW_ONLY_NOT_APPROVED'||manifest.hostedApplied!==false||
    manifest.projectRef!=='sdtsivgtcaoaeoihcwzd'||manifest.postgresMajor!==17||
    manifest.approvalRequired!==true||manifest.expectedLedgerEntries!==17||
    manifest.candidate.file!=='024_participant_replay_preview_REVIEW_ONLY.sql'||
    manifest.candidate.ledgerVersion!=='024_participant_replay_preview.sql'||
    manifest.candidate.sha256!==candidateHash||
    JSON.stringify(manifest.requires)!==JSON.stringify(history)||history.length!==17)
  throw Error('024 historical manifest boundary changed; no connection.')
 return {sql:candidate.toString('utf8'),history}
}
const lit=s=>"'"+s.replaceAll("'","''")+"'"
function atomicBatch(){
 const {sql,history}=verify()
 const expected=[...history,{file:'024_participant_replay_preview.sql',sha256:candidateHash}]
 const vals=expected.map(x=>'('+lit(x.file)+','+lit(x.sha256)+')').join(',')
 return [
  "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
  sql,
  "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('024_participant_replay_preview.sql','"+candidateHash+"');",
  "DO $uranius024_postflight$ BEGIN",
  "IF (SELECT count(*) FROM uranius_private.migration_ledger)<>18",
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
  "OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_game.synthetic_race_replay_preview'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)",
  "OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_race_replay_preview')<>1",
  "OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_race_replay_preview' AND policyname='participant_replay_read' AND cmd='SELECT' AND roles=ARRAY['uranius_smoke_reader']::name[])",
  "OR NOT has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_race_replay_preview','race_id','SELECT')",
  "OR NOT has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_race_replay_preview','packet','SELECT')",
  "OR has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_race_replay_preview','run_id','SELECT')",
  "OR has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_race_replay_preview','stage_id','SELECT')",
  "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_race_replay_preview','SELECT')",
  "OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated']) t(role_name) WHERE has_any_column_privilege(role_name,'uranius_game.synthetic_race_replay_preview','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(role_name,'uranius_game.synthetic_race_replay_preview','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))",
  "OR has_any_column_privilege('uranius_smoke_reader','uranius_game.synthetic_race_replay_preview','INSERT,UPDATE,REFERENCES')",
  "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_race_replay_preview','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')",
  "OR (SELECT count(*) FROM pg_constraint WHERE conrelid='uranius_game.synthetic_race_replay_preview'::regclass AND contype='f' AND convalidated)<>3",
  "OR EXISTS(SELECT 1 FROM pg_policies WHERE policyname='uranius_024_temp_read')",
  "THEN RAISE EXCEPTION '024 atomic postflight failed; rolling back'; END IF;",
  "END $uranius024_postflight$;"
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
  timeout:120000,stage:'Guarded Uranius 024 refused'})
 console.log('024 atomic participant replay installation returned success; independently verify 18 ledger entries, one derived replay and participant-only RLS before closing.')
}
try{
 const [mode,approved]=process.argv.slice(2)
 if(mode==='--review'&&process.argv.length===3){
  verify()
  console.log('URANIUS 024 FROZEN OFFLINE REVIEW PASSED; no database connection.')
  console.log('Candidate SHA-256: '+candidateHash)
  console.log('Manifest SHA-256: '+manifestHash)
 }else if(mode==='--apply-approved-024'&&process.argv.length===4)apply(approved)
 else throw Error('Usage: --review; or ONLY after separate exact owner approval --apply-approved-024 <manifest SHA-256>')
}catch(e){console.error(e instanceof Error?e.message:'024 stopped');process.exitCode=1}
