// Frozen, guarded Uranius Squad 013 installer. No database in --review.
// Apply mode requires explicit owner-approved manifest SHA and direct TLS migrator.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {assertSandboxTarget} from './assert-sandbox-target.mjs'
import {runPsqlBatch} from './run-uranius-psql-batch.mjs'

const hash=x=>createHash('sha256').update(x).digest('hex')
const base=new URL('../database/reconstruction/squad/',import.meta.url)
const read=name=>readFileSync(new URL(name,base))
const manifestBytes=read('013_install_manifest_REVIEW_ONLY.json')
const manifest=JSON.parse(manifestBytes.toString('utf8'))
const manifestHash=hash(manifestBytes)
const approvedManifestHash='ab63e7949889a49bd33fb584885f4911df6b027eb20d3aed3be43e77f0ccaa7a'
const candidateHash='8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859'
const expectedNames=[
 '001_identity.sql','002_reference_schema.sql','003_access.sql','004_synthetic_reference.sql',
 '005_club_identity.sql','006_synthetic_world.sql','007_smoke_reader.sql',
 '008_game_clock_v1.sql','009_clock_smoke_reader.sql','010_overview_race_reader.sql'
]
function verify(){
 const bytes=read('013_squad_reader_grant_REVIEW_ONLY.sql')
 const sql=bytes.toString('utf8')
 const executable=sql.replace(/^\s*--[^\r\n]*/gm,'')
 if(manifestHash!==approvedManifestHash||hash(bytes)!==candidateHash||
 manifest.candidate?.sha256!==candidateHash||
 manifest.candidate?.file!=='013_squad_reader_grant_REVIEW_ONLY.sql'||
 manifest.candidate?.ledgerVersion!=='013_squad_reader_grant.sql'||
 manifest.projectRef!=='sdtsivgtcaoaeoihcwzd'||manifest.postgresMajor!==17||
 manifest.expectedLedgerEntries!==10||manifest.status!=='REVIEW_ONLY_NOT_APPROVED'||
 manifest.hostedApplied!==false||manifest.approvalRequired!==true||
 JSON.stringify(manifest.requires?.map(x=>x.file))!==JSON.stringify(expectedNames)||
 !manifest.requires.every(x=>/^[a-f0-9]{64}$/.test(x.sha256))||
 manifest.requires[9].sha256!=='56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af'||
 !sql.includes('REVIEW_ONLY_NOT_APPROVED')||
 !sql.includes("current_user <> 'uranius_migrator'")||
 !sql.includes("uranius.approved_project_ref")||
 !sql.includes("policyname='riders_read'")||
 !sql.includes("GRANT SELECT (label,flat,climbing,stamina,resistance)")||
 !sql.includes("has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')")||
 /\b(?:BEGIN|COMMIT|ROLLBACK)\s*;/i.test(executable)||
 /\b(?:SECURITY\s+DEFINER|CREATE\s+ROLE|ALTER\s+POLICY|INSERT\s+INTO)\b/i.test(executable))
 throw new Error('Squad 013 frozen candidate or manifest differs from owner review; denied.')
 return sql
}
function apply(digest){
 if(digest!==approvedManifestHash)
  throw new Error('Explicit separate owner approval of exact Squad manifest SHA-256 required.')
 const sql=verify()
 const env=process.env
 assertSandboxTarget('migrate',env)
 if(!env.URANIUS_PSQL_PATH||!env.URANIUS_DATABASE_CA_FILE)
  throw new Error('Direct PostgreSQL 17 client and trusted CA required.')
 const target=new URL(env.URANIUS_DATABASE_URL)
 const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
 const child=Object.fromEntries(Object.entries(env).filter(([key])=>allowed.has(key.toUpperCase())))
 Object.assign(child,{PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',
 PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),
 PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,
 PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000'})
 const postflight= [
 'DO $squad013_install_verify$',
 'BEGIN',
 'IF (SELECT count(*) FROM uranius_private.migration_ledger)<>11',
 "OR (SELECT sha256 FROM uranius_private.migration_ledger WHERE version='013_squad_reader_grant.sql') IS DISTINCT FROM '"+candidateHash+"'",
 "OR NOT (SELECT bool_and(has_column_privilege('uranius_smoke_reader','uranius_catalog.riders',c,'SELECT')) FROM unnest(ARRAY['rider_id','label','flat','climbing','stamina','resistance']) c)",
 "OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','INSERT')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','UPDATE')",
 "OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','DELETE')",
 "OR has_any_column_privilege('anon','uranius_catalog.riders','SELECT')",
 "OR NOT has_table_privilege('authenticated','uranius_catalog.riders','SELECT')",
 "OR (SELECT count(*) FROM uranius_catalog.riders)<>200",
 "OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2",
 "OR (SELECT count(*) FROM uranius_game.game_state WHERE season_number=1 AND month_number=1 AND day_number=1 AND is_paused)<>1",
 "THEN RAISE EXCEPTION 'Uranius Squad 013 postflight mismatch; transaction must roll back';",
 'END IF;',
 'END',
 '$squad013_install_verify$;'
 ].join('\n')
 const batch=[
 "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
 sql,
 "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('013_squad_reader_grant.sql','"+candidateHash+"');",
 postflight].join('\n')
 runPsqlBatch({executable:env.URANIUS_PSQL_PATH,input:batch,env:child,transaction:true,
 timeout:120000,stage:'Guarded Uranius Squad 013 installation rejected'})
 console.log('Uranius Squad 013 atomic installation passed transaction postflight; verify hosted ledger independently.')
}
try{
 const [mode,digest]=process.argv.slice(2)
 if(mode==='--review'&&process.argv.length===3){
  verify()
  console.log('REVIEW ONLY: no database connection.')
  console.log('Candidate SHA-256: '+candidateHash)
  console.log('Manifest SHA-256: '+manifestHash)
  console.log('Approval status: NOT APPROVED until separately authorized by owner.')
 }else if(mode==='--apply-reviewed-squad'&&process.argv.length===4){
  apply(digest)
 }else throw new Error('Usage: node scripts/apply-uranius-squad.mjs --review, or --apply-reviewed-squad <owner-approved exact manifest SHA-256>.')
}catch(e){console.error(e instanceof Error?e.message:'Guarded Uranius installer stopped.');process.exitCode=1}
