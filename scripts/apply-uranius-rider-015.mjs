// Project Uranius 015: OFFLINE frozen review or separately owner-approved direct TLS install.
// Never supplies an admin fallback, a production target or an automatic migration.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'

const sha=x=>createHash('sha256').update(x).digest('hex')
const root=new URL('../database/reconstruction/squad/',import.meta.url)
const read=n=>readFileSync(new URL(n,root))
const exactCandidate='71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e'
const exactManifest='f9d835dd58c242d83b7366976810be1eb0525d9e2c401e361ef7b6d66e76ec81'
const manifestBytes=read('015_install_manifest_REVIEW_ONLY.json')
const manifest=JSON.parse(manifestBytes.toString('utf8'))
const prior=JSON.parse(read('014_install_manifest_REVIEW_ONLY.json').toString('utf8'))
const history=[...prior.requires,{file:prior.candidate.ledgerVersion,sha256:prior.candidate.sha256}]
const expectedHistoryNames=[
 '001_identity.sql','002_reference_schema.sql','003_access.sql','004_synthetic_reference.sql',
 '005_club_identity.sql','006_synthetic_world.sql','007_smoke_reader.sql',
 '008_game_clock_v1.sql','009_clock_smoke_reader.sql','010_overview_race_reader.sql',
 '013_squad_reader_grant.sql','014_synthetic_rider_uuid.sql'
]
function verify(){
 const bytes=read('015_rider_uuid_owner_read_REVIEW_ONLY.sql')
 const sql=bytes.toString('utf8')
 const executable=sql.replace(/^\s*--[^\r\n]*/gm,'')
 if(sha(manifestBytes)!==exactManifest || sha(bytes)!==exactCandidate ||
    manifest.projectRef!=='sdtsivgtcaoaeoihcwzd' || manifest.postgresMajor!==17 ||
    manifest.status!=='REVIEW_ONLY_NOT_APPROVED' || manifest.hostedApplied!==false ||
    manifest.approvalRequired!==true || manifest.expectedLedgerEntries!==12 ||
    manifest.candidate?.file!=='015_rider_uuid_owner_read_REVIEW_ONLY.sql' ||
    manifest.candidate?.ledgerVersion!=='015_rider_uuid_owner_read.sql' ||
    manifest.candidate?.sha256!==exactCandidate ||
    JSON.stringify(manifest.requires)!==JSON.stringify(history) ||
    JSON.stringify(history.map(r=>r.file))!==JSON.stringify(expectedHistoryNames) ||
    !history.every(r=>/^[a-f0-9]{64}$/.test(r.sha256)) ||
    !sql.startsWith('-- PROJECT URANIUS — 015 OWNER-RESTRICTED UUID READ / REVIEW ONLY.') ||
    !sql.includes("current_user <> 'uranius_migrator'") ||
    !sql.includes('pg_stat_ssl') ||
    !sql.includes('CREATE POLICY synthetic_rider_uuid_owner_read') ||
    !sql.includes('SELECT 1 FROM uranius_catalog.riders AS own_rider') ||
    !sql.includes('GRANT SELECT (rider_id,rider_uuid)') ||
    !sql.includes("has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','created_at','SELECT')") ||
    /\b(?:COMMIT|ROLLBACK)\s*;/i.test(executable) ||
    /\b(?:SECURITY\s+DEFINER|CREATE\s+ROLE|CREATE\s+VIEW|CREATE\s+FUNCTION|ALTER\s+TABLE|GRANT\s+ALL)\b/i.test(executable))
  throw new Error('Uranius 015 exact source, manifest or policy boundary differs from owner-reviewed freeze; refused.')
 return sql
}
const literal=s=>"'"+s.replaceAll("'","''")+"'"
function historicalCheck(){
 const v=history.map(r=>'('+literal(r.file)+','+literal(r.sha256)+')').join(',\n')
 return [
 'DO $uranius015_full_history$', 'BEGIN',
 "PERFORM set_config('search_path','pg_catalog',true);",
 "IF current_user<>'uranius_migrator' OR session_user<>current_user",
 "OR current_database()<>'postgres'",
 "OR current_setting('uranius.approved_project_ref',true)<>'sdtsivgtcaoaeoihcwzd'",
 "OR current_setting('server_version_num')::integer/10000<>17",
 "OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)",
 "OR (SELECT count(*) FROM uranius_private.migration_ledger)<>12",
 'OR EXISTS (SELECT version,sha256 FROM (VALUES '+v+') expected(version,sha256)',
 ' EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)',
 'OR EXISTS (SELECT version,sha256 FROM uranius_private.migration_ledger',
 ' EXCEPT SELECT version,sha256 FROM (VALUES '+v+') expected(version,sha256))',
 "THEN RAISE EXCEPTION 'Uranius 015 full historical ledger mismatch; roll back';",
 'END IF;', 'END', '$uranius015_full_history$;'
 ].join('\n')
}
function finalCheck(){
 return [
 'DO $uranius015_transaction_postflight$', 'BEGIN',
 "IF (SELECT count(*) FROM uranius_private.migration_ledger)<>13",
 "OR (SELECT sha256 FROM uranius_private.migration_ledger WHERE version='015_rider_uuid_owner_read.sql') IS DISTINCT FROM '"+exactCandidate+"'",
 "OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_game.synthetic_rider_identity'::regclass AND relrowsecurity AND relforcerowsecurity)",
 "OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity')<>1",
 "OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity' AND policyname='synthetic_rider_uuid_owner_read' AND 'uranius_smoke_reader'=ANY(roles) AND qual LIKE '%uranius_catalog.riders%')",
 "OR NOT has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','rider_id','SELECT')",
 "OR NOT has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','rider_uuid','SELECT')",
 "OR has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','identity_provenance','SELECT')",
 "OR has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','created_at','SELECT')",
 "OR has_any_column_privilege('anon','uranius_game.synthetic_rider_identity','SELECT')",
 "OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_identity','SELECT')",
 "OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','INSERT')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','UPDATE')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','DELETE')",
 "OR (SELECT count(*) FROM uranius_catalog.riders)<>200",
 "OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2",
 "OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1",
 "THEN RAISE EXCEPTION 'Uranius 015 atomic postflight failed; rolling back';",
 'END IF;', 'END', '$uranius015_transaction_postflight$;'
 ].join('\n')
}
function atomicSql(){
 return [
 "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
 historicalCheck(),
 verify(),
 "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('015_rider_uuid_owner_read.sql','"+exactCandidate+"');",
 finalCheck()
 ].join('\n')
}
function apply(approvedDigest){
 if(approvedDigest!==exactManifest)
  throw new Error('Separate owner approval of exact 015 manifest SHA-256 required; no connection attempted.')
 const sql=atomicSql()
 const env=process.env
 assertSandboxTarget('migrate',env)
 if(!env.URANIUS_PSQL_PATH || !env.URANIUS_DATABASE_CA_FILE)
  throw new Error('Direct PostgreSQL 17 binary and verified TLS CA are mandatory.')
 const target=new URL(env.URANIUS_DATABASE_URL)
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([name])=>allowed.has(name.toUpperCase())))
 Object.assign(child,{PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',
  PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),
  PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,
  PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 runPsqlBatch({executable:env.URANIUS_PSQL_PATH,input:sql,env:child,transaction:true,
  timeout:120000,stage:'Guarded Uranius 015 refused'})
 console.log('Uranius 015 atomic installation returned success. Independently verify hosted owner RLS and ledger.')
}
try{
 const [mode,digest]=process.argv.slice(2)
 if(mode==='--review' && process.argv.length===3){
  verify()
  console.log('URANIUS 015 EXACT OFFLINE REVIEW PASSED; no database connection.')
  console.log('Candidate SHA-256: '+exactCandidate)
  console.log('Manifest SHA-256: '+exactManifest)
  console.log('Historical prerequisites: '+history.length)
  console.log('Status: NOT APPROVED. No hosted installation.')
 }else if(mode==='--apply-approved-015' && process.argv.length===4){
  apply(digest)
 }else throw new Error('Usage: node scripts/apply-uranius-rider-015.mjs --review, or ONLY AFTER SEPARATE APPROVAL --apply-approved-015 <exact 015 manifest SHA-256>.')
}catch(error){
 console.error(error instanceof Error?error.message:'Uranius 015 installer stopped.')
 process.exitCode=1
}
