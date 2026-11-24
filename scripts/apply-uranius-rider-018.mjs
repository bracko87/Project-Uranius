// Uranius 018: exact frozen review / guarded, SEPARATELY owner-approved install only.
// No production/admin fallback. Migrator-only direct TLS; atomic transaction.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'

const root=new URL('../database/reconstruction/squad/',import.meta.url)
const read=name=>readFileSync(new URL(name,root))
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const candidateHash='622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc'
const manifestHash='9995c7a1558d222426e759b5af4911981d5d4b12688a4e2e3c1adee8d6975205'
const manifestBytes=read('018_install_manifest_REVIEW_ONLY.json')
const manifest=JSON.parse(manifestBytes.toString('utf8'))
const prior=JSON.parse(read('015_install_manifest_REVIEW_ONLY.json').toString('utf8'))
const history=[...prior.requires,{file:prior.candidate.ledgerVersion,sha256:prior.candidate.sha256}]
const names=['001_identity.sql','002_reference_schema.sql','003_access.sql',
 '004_synthetic_reference.sql','005_club_identity.sql','006_synthetic_world.sql',
 '007_smoke_reader.sql','008_game_clock_v1.sql','009_clock_smoke_reader.sql',
 '010_overview_race_reader.sql','013_squad_reader_grant.sql',
 '014_synthetic_rider_uuid.sql','015_rider_uuid_owner_read.sql']
const skills=['sprint','climbing','time_trial','endurance','flat',
 'recovery','resistance','race_iq','teamwork']
function verify(){
 const bytes=read('018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql')
 const sql=bytes.toString('utf8'),statements=sql.replace(/^\s*--[^\r\n]*/gm,'')
 if(digest(bytes)!==candidateHash || digest(manifestBytes)!==manifestHash ||
    manifest.projectRef!=='sdtsivgtcaoaeoihcwzd' || manifest.postgresMajor!==17 ||
    manifest.status!=='REVIEW_ONLY_NOT_APPROVED' || manifest.hostedApplied!==false ||
    manifest.approvalRequired!==true || manifest.expectedLedgerEntries!==13 ||
    manifest.candidate?.file!=='018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql' ||
    manifest.candidate?.ledgerVersion!=='018_synthetic_nine_skill_attributes.sql' ||
    manifest.candidate?.sha256!==candidateHash ||
    JSON.stringify(manifest.requires)!==JSON.stringify(history) ||
    JSON.stringify(history.map(x=>x.file))!==JSON.stringify(names) ||
    history.length!==13 || !history.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)) ||
    !sql.startsWith('-- PROJECT URANIUS — 018 SYNTHETIC NINE-SKILL STORAGE / OFFLINE REVIEW ONLY.') ||
    !sql.includes("current_user <> 'uranius_migrator'") ||
    !sql.includes('pg_stat_ssl') ||
    !sql.includes('FORCE ROW LEVEL SECURITY') ||
    !sql.includes("version='015_rider_uuid_owner_read.sql'") ||
    !sql.includes('FROM uranius_catalog.riders r ORDER BY r.rider_id') ||
    !sql.includes('REVOKE ALL ON uranius_game.synthetic_rider_attributes FROM PUBLIC, anon, authenticated, uranius_smoke_reader') ||
    skills.some(n=>!sql.includes(n+' smallint CHECK ('+n+' BETWEEN 0 AND 100)') ||
       !sql.includes(n+'_source text CHECK') ||
       !sql.includes('CONSTRAINT '+n+'_source_pair CHECK')) ||
    /\b(?:COMMIT|ROLLBACK)\s*;/i.test(statements) ||
    /\b(?:SECURITY\s+DEFINER|GRANT\s+SELECT|CREATE\s+POLICY|DROP\s+TABLE|CREATE\s+ROLE)\b/i.test(statements))
   throw new Error('018 source/manifest/history changed from tested exact freeze. No connection.')
 return sql
}
const lit=s=>"'"+s.replaceAll("'","''")+"'"
function priorCheck(){
 const vals=history.map(x=>'('+lit(x.file)+','+lit(x.sha256)+')').join(',')
 return [
  'DO $uranius018_history$','BEGIN',
  "PERFORM set_config('search_path','pg_catalog',true);",
  "IF current_user<>'uranius_migrator' OR session_user<>current_user",
  "OR current_database()<>'postgres'",
  "OR current_setting('uranius.approved_project_ref',true)<>'sdtsivgtcaoaeoihcwzd'",
  "OR current_setting('server_version_num')::integer/10000<>17",
  "OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)",
  "OR (SELECT count(*) FROM uranius_private.migration_ledger)<>13",
  'OR EXISTS(SELECT version,sha256 FROM (VALUES '+vals+') expected(version,sha256)',
  ' EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)',
  'OR EXISTS(SELECT version,sha256 FROM uranius_private.migration_ledger',
  ' EXCEPT SELECT version,sha256 FROM (VALUES '+vals+') expected(version,sha256))',
  "THEN RAISE EXCEPTION '018 full frozen migration history mismatch';",
  'END IF;','END','$uranius018_history$;'
 ].join('\n')
}
function postflight(){
 return [
  'DO $uranius018_postflight$','BEGIN',
  "IF (SELECT count(*) FROM uranius_private.migration_ledger)<>14",
  "OR (SELECT sha256 FROM uranius_private.migration_ledger WHERE version='018_synthetic_nine_skill_attributes.sql') IS DISTINCT FROM '"+candidateHash+"'",
  "OR (SELECT count(*) FROM pg_attribute WHERE attrelid='uranius_game.synthetic_rider_attributes'::regclass AND attnum>0 AND NOT attisdropped)<>19",
  "OR (SELECT count(*) FROM pg_constraint WHERE conrelid='uranius_game.synthetic_rider_attributes'::regclass AND contype='c')<>27",
  "OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_game.synthetic_rider_attributes'::regclass AND relrowsecurity AND relforcerowsecurity)",
  "OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_attributes')<>0",
  "OR has_any_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','SELECT')",
  "OR has_any_column_privilege('anon','uranius_game.synthetic_rider_attributes','SELECT')",
  "OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_attributes','SELECT')",
  "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','INSERT')",
  "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','UPDATE')",
  "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','DELETE')",
  "OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_game.synthetic_rider_identity'::regclass AND relrowsecurity AND relforcerowsecurity)",
  "OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity')<>1",
  "OR (SELECT count(*) FROM uranius_catalog.riders)<>200",
  "OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2",
  "OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1",
  "THEN RAISE EXCEPTION '018 atomic permission/ledger postflight failed; rolling back';",
  'END IF;','END','$uranius018_postflight$;'
 ].join('\n')
}
function atomicBatch(){
 return [
  "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
  priorCheck(),verify(),
  "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('018_synthetic_nine_skill_attributes.sql','"+candidateHash+"');",
  postflight()
 ].join('\n')
}
function apply(approved){
 if(approved!==manifestHash)throw new Error('Separate owner approval of exact 018 manifest required; no connection.')
 const input=atomicBatch(),env=process.env
 assertSandboxTarget('migrate',env)
 if(!env.URANIUS_PSQL_PATH||!env.URANIUS_DATABASE_CA_FILE)
  throw new Error('Direct PostgreSQL 17 psql and trusted TLS CA required.')
 const target=new URL(env.URANIUS_DATABASE_URL)
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([n])=>allowed.has(n.toUpperCase())))
 Object.assign(child,{PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',
  PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),
  PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,
  PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 runPsqlBatch({executable:env.URANIUS_PSQL_PATH,input,env:child,transaction:true,
  timeout:120000,stage:'Guarded Uranius 018 refused'})
 console.log('018 atomic installation returned success; independently verify hosted 14 ledger entries and FORCE RLS before closing.')
}
try{
 const [mode,digestArg]=process.argv.slice(2)
 if(mode==='--review'&&process.argv.length===3){
  verify()
  console.log('URANIUS 018 FROZEN OFFLINE REVIEW PASSED; no database connection.')
  console.log('Candidate SHA-256: '+candidateHash)
  console.log('Manifest SHA-256: '+manifestHash)
  console.log('Historical prerequisites: '+history.length)
  console.log('Status: NOT APPROVED. No hosted installation.')
 }else if(mode==='--apply-approved-018'&&process.argv.length===4){
  apply(digestArg)
 }else throw new Error('Usage: --review; or ONLY after separate exact owner approval --apply-approved-018 <manifest SHA-256>')
}catch(e){console.error(e instanceof Error?e.message:'018 stopped');process.exitCode=1}
