// Project Uranius 014: guarded DIRECT TLS-only migrator. Never auto-installs.
// A future installation requires exact owner approval of the frozen manifest hash.
// --review is completely offline and never reads credentials or opens a connection.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'

const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const root=new URL('../database/reconstruction/squad/',import.meta.url)
const read=name=>readFileSync(new URL(name,root))
const expectedManifestHash='620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62'
const expectedCandidateHash='f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f'
const prior=JSON.parse(read('013_install_manifest_REVIEW_ONLY.json').toString('utf8'))
const manifestBytes=read('014_install_manifest_REVIEW_ONLY.json')
const manifest=JSON.parse(manifestBytes.toString('utf8'))
const history=[...prior.requires,{file:prior.candidate.ledgerVersion,sha256:prior.candidate.sha256}]
const expectedVersions=[
 '001_identity.sql','002_reference_schema.sql','003_access.sql','004_synthetic_reference.sql',
 '005_club_identity.sql','006_synthetic_world.sql','007_smoke_reader.sql',
 '008_game_clock_v1.sql','009_clock_smoke_reader.sql','010_overview_race_reader.sql',
 '013_squad_reader_grant.sql'
]
function candidate(){
 const bytes=read('014_synthetic_rider_uuid_REVIEW_ONLY.sql')
 const sql=bytes.toString('utf8')
 const executable=sql.replace(/^\s*--[^\r\n]*/gm,'')
 if(hash(manifestBytes)!==expectedManifestHash ||
    hash(bytes)!==expectedCandidateHash ||
    manifest.candidate?.sha256!==expectedCandidateHash ||
    manifest.candidate?.file!=='014_synthetic_rider_uuid_REVIEW_ONLY.sql' ||
    manifest.candidate?.ledgerVersion!=='014_synthetic_rider_uuid.sql' ||
    manifest.projectRef!=='sdtsivgtcaoaeoihcwzd' ||
    manifest.postgresMajor!==17 ||
    manifest.expectedLedgerEntries!==11 ||
    manifest.status!=='REVIEW_ONLY_NOT_APPROVED' ||
    manifest.hostedApplied!==false ||
    manifest.approvalRequired!==true ||
    JSON.stringify(manifest.requires)!==JSON.stringify(history) ||
    JSON.stringify(history.map(x=>x.file))!==JSON.stringify(expectedVersions) ||
    !history.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)) ||
    !sql.startsWith('-- PROJECT URANIUS — 014 UUID mapping DESIGN / REVIEW ONLY / NOT APPROVED.') ||
    !sql.includes("current_user <> 'uranius_migrator'") ||
    !sql.includes('pg_stat_ssl') ||
    !sql.includes('FORCE ROW LEVEL SECURITY') ||
    !sql.includes('REVOKE ALL ON uranius_game.synthetic_rider_identity FROM PUBLIC, anon, authenticated, uranius_smoke_reader') ||
    /\b(?:BEGIN|COMMIT|ROLLBACK)\s*;/i.test(executable) ||
    /\b(?:GRANT|SECURITY\s+DEFINER|CREATE\s+POLICY|CREATE\s+ROLE)\b/i.test(executable)) {
   throw new Error('Uranius 014 approved review bytes, permissions or historical prerequisites changed: refused.')
 }
 return sql
}
const sqlLiteral=s=>"'"+s.replaceAll("'","''")+"'"
function historyPreflight(){
 const values=history.map(item=>'('+sqlLiteral(item.file)+','+sqlLiteral(item.sha256)+')').join(',\n')
 return [
 'DO $uranius014_history_check$',
 'BEGIN',
 "PERFORM set_config('search_path','pg_catalog',true);",
 "IF current_user <> 'uranius_migrator'",
 "OR session_user <> current_user",
 "OR current_database()<>'postgres'",
 "OR current_setting('uranius.approved_project_ref',true)<>'sdtsivgtcaoaeoihcwzd'",
 "OR current_setting('server_version_num')::integer/10000<>17",
 "OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)",
 "OR (SELECT count(*) FROM uranius_private.migration_ledger)<>11",
 'OR EXISTS (SELECT version,sha256 FROM (VALUES '+values+') AS expected(version,sha256)',
 ' EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)',
 'OR EXISTS (SELECT version,sha256 FROM uranius_private.migration_ledger',
 ' EXCEPT SELECT version,sha256 FROM (VALUES '+values+') AS expected(version,sha256))',
 "THEN RAISE EXCEPTION 'Uranius 014 complete historical migration ledger mismatch';",
 'END IF;',
 'END',
 '$uranius014_history_check$;'
 ].join('\n')
}
function postflight(){
 return [
 'DO $uranius014_install_verify$',
 'BEGIN',
 "IF (SELECT count(*) FROM uranius_private.migration_ledger)<>12",
 "OR (SELECT sha256 FROM uranius_private.migration_ledger WHERE version='014_synthetic_rider_uuid.sql') IS DISTINCT FROM '"+expectedCandidateHash+"'",
 "OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_game.synthetic_rider_identity'::regclass AND relrowsecurity AND relforcerowsecurity)",
 "OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity')",
 "OR has_any_column_privilege('anon','uranius_game.synthetic_rider_identity','SELECT')",
 "OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_identity','SELECT')",
 "OR has_any_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','SELECT')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','INSERT')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','UPDATE')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','DELETE')",
 "OR (SELECT count(*) FROM uranius_catalog.riders)<>200",
 "OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2",
 "OR (SELECT count(*) FROM uranius_game.game_state WHERE season_number=1 AND month_number=1 AND day_number=1 AND is_paused)<>1",
 "THEN RAISE EXCEPTION 'Uranius 014 atomic postflight failed; rollback required';",
 'END IF;',
 'END',
 '$uranius014_install_verify$;'
 ].join('\n')
}
function buildAtomicSql(){
 const source=candidate()
 return [
 "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
 historyPreflight(),source,
 "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('014_synthetic_rider_uuid.sql','"+expectedCandidateHash+"');",
 postflight()
 ].join('\n')
}
function install(digest){
 if(digest!==expectedManifestHash)
  throw new Error('Exact separate owner approval of 014 manifest SHA-256 required. No database connection.')
 const sql=buildAtomicSql()
 const env=process.env
 assertSandboxTarget('migrate',env)
 if(!env.URANIUS_PSQL_PATH||!env.URANIUS_DATABASE_CA_FILE)
  throw new Error('Direct PostgreSQL 17 client and trusted TLS CA file required.')
 const target=new URL(env.URANIUS_DATABASE_URL)
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([name])=>allowed.has(name.toUpperCase())))
 Object.assign(child,{PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',
  PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),
  PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,
  PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 runPsqlBatch({executable:env.URANIUS_PSQL_PATH,input:sql,env:child,transaction:true,
  timeout:120000,stage:'Guarded Uranius 014 installation rejected'})
 console.log('Uranius 014 transactional installation completed. Independently verify hosted ledger, mapping integrity and RLS.')
}
try{
 const [mode,digest]=process.argv.slice(2)
 if(mode==='--review'&&process.argv.length===3){
  candidate()
  console.log('REVIEW ONLY. No database connection or writes.')
  console.log('Candidate SHA-256: '+expectedCandidateHash)
  console.log('Manifest SHA-256: '+expectedManifestHash)
  console.log('Historical prerequisites: '+history.length)
  console.log('Status: approval not supplied. Hosted installation NOT performed.')
 }else if(mode==='--apply-approved-014'&&process.argv.length===4){
  install(digest)
 }else throw new Error('Usage: node scripts/apply-uranius-rider-identity.mjs --review; or (only after explicit owner approval) --apply-approved-014 <exact approved manifest SHA-256>.')
}catch(error){
 console.error(error instanceof Error?error.message:'Uranius 014 installer refused.')
 process.exitCode=1
}
