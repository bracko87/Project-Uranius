// Exact-hash review and explicitly approved installation ONLY for isolated Uranius.
// No direct database access in --review. Never targets original ProPeloton production.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { assertSandboxTarget } from './assert-sandbox-target.mjs'
import { runPsqlBatch } from './run-uranius-psql-batch.mjs'

const sha256 = value => createHash('sha256').update(value).digest('hex')
const directory = new URL('../database/reconstruction/overview/', import.meta.url)
const bytes = name => readFileSync(new URL(name, directory))
const manifestBytes = bytes('010_install_manifest_REVIEW_ONLY.json')
const manifest = JSON.parse(manifestBytes.toString('utf8'))
const manifestDigest = sha256(manifestBytes)
const expectedSourceFiles = [
  '010_race_schema_DISPOSABLE_REVIEW_ONLY.sql',
  '012_owner_schedule_reader_DISPOSABLE_REVIEW_ONLY.sql',
]
function verifyReviewPackage() {
  if (manifest.projectRef !== 'sdtsivgtcaoaeoihcwzd' || manifest.postgresMajor !== 17 ||
      manifest.status !== 'REVIEW_ONLY_NOT_APPROVED' || manifest.hostedApplied !== false ||
      manifest.expectedLedgerEntries !== 9 || manifest.approvalRequired !== true ||
      manifest.candidate.file !== '010_overview_race_reader_REVIEW_ONLY.sql' ||
      manifest.candidate.ledgerVersion !== '010_overview_race_reader.sql' ||
      !/^[a-f0-9]{64}$/.test(manifest.candidate.sha256) ||
      manifest.requires.length !== 9 || manifest.sources.length !== 2) {
    throw new Error('Unexpected Uranius overview package manifest.')
  }
  const sql = bytes(manifest.candidate.file)
  if (sha256(sql) !== manifest.candidate.sha256) {
    throw new Error('Review candidate differs from pinned canonical SHA-256.')
  }
  for (const [i,name] of expectedSourceFiles.entries()) {
    if (manifest.sources[i].file !== name || sha256(bytes(name)) !== manifest.sources[i].sha256) {
      throw new Error('Overview source changed since review: ' + name)
    }
  }
  const required = [...manifest.requires.map(row => row.file)]
  const expected = [
    '001_identity.sql','002_reference_schema.sql','003_access.sql',
    '004_synthetic_reference.sql','005_club_identity.sql',
    '006_synthetic_world.sql','007_smoke_reader.sql',
    '008_game_clock_v1.sql','009_clock_smoke_reader.sql',
  ]
  if (JSON.stringify(required) !== JSON.stringify(expected) ||
      !manifest.requires.every(row => /^[a-f0-9]{64}$/.test(row.sha256)) ||
      !sql.toString('utf8').includes('pg_advisory_xact_lock(410501)') ||
      !sql.toString('utf8').includes('CREATE POLICY uranius_preparations_owner') ||
      !sql.toString('utf8').includes('FORCE ROW LEVEL SECURITY') ||
      /\bCOMMIT\s*;/i.test(sql.toString('utf8'))) {
    throw new Error('Overview migration safeguards or dependencies changed.')
  }
  return sql.toString('utf8')
}
function applyReviewed(approvedDigest) {
  if (!/^[a-f0-9]{64}$/i.test(approvedDigest ?? '') ||
      approvedDigest.toLowerCase() !== manifestDigest) {
    throw new Error('Explicit approval for exact Overview manifest digest required.')
  }
  const sql = verifyReviewPackage()
  const env = process.env
  assertSandboxTarget('migrate', env)
  if (!env.URANIUS_DATABASE_CA_FILE || !env.URANIUS_PSQL_PATH) {
    throw new Error('Pinned PostgreSQL 17 client and CA file are required.')
  }
  const target = new URL(env.URANIUS_DATABASE_URL)
  const allowed = new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
  const child = Object.fromEntries(Object.entries(env).filter(([key])=>allowed.has(key.toUpperCase())))
  Object.assign(child,{
    PGHOST:target.hostname,PGPORT:'5432',PGDATABASE:'postgres',
    PGUSER:'uranius_migrator',PGPASSWORD:decodeURIComponent(target.password),
    PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',PGSSLROOTCERT:env.URANIUS_DATABASE_CA_FILE,
    PGCONNECT_TIMEOUT:'8',PGOPTIONS:'-c statement_timeout=60000 -c lock_timeout=5000',
  })
  const ledger = manifest.candidate.ledgerVersion
  const statement = [
    "SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);",
    sql,
    "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('" +
      ledger + "','" + manifest.candidate.sha256 + "');",
    `DO $uranius_overview_postflight$
BEGIN
 IF (SELECT count(*) FROM uranius_private.migration_ledger) <> 10
   OR NOT EXISTS (SELECT 1 FROM uranius_private.migration_ledger
     WHERE version='010_overview_race_reader.sql'
       AND sha256='${manifest.candidate.sha256}')
   OR (SELECT count(*) FROM pg_class WHERE relnamespace='uranius_game'::regnamespace
     AND relname IN ('races','race_stages','race_team_entries','race_preparations')
     AND relrowsecurity AND relforcerowsecurity) <> 4
   OR (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
     WHERE c.relnamespace='uranius_game'::regnamespace
       AND p.polname IN ('uranius_races_reader','uranius_race_stages_reader',
                         'uranius_entries_owner','uranius_preparations_owner')) <> 4
   OR has_any_column_privilege('anon','uranius_game.race_preparations','SELECT')
   OR has_any_column_privilege('authenticated','uranius_game.race_preparations','SELECT')
   OR has_table_privilege('uranius_smoke_reader','uranius_game.race_preparations','UPDATE')
   OR NOT has_column_privilege('uranius_smoke_reader','uranius_game.race_preparations','race_id','SELECT')
 THEN
    RAISE EXCEPTION 'Overview migration postflight mismatch; transaction rolled back';
 END IF;
END
$uranius_overview_postflight$;`,
  ].join('\n')
  runPsqlBatch({executable:env.URANIUS_PSQL_PATH,input:statement,
    env:child,transaction:true,timeout:120000,stage:'Reviewed Uranius Overview migration rejected'})
  console.log('Uranius overview migration 010 applied and transaction postflight passed.')
}
try {
  const [mode,digest] = process.argv.slice(2)
  if (mode === '--review' && process.argv.length === 3) {
    verifyReviewPackage()
    console.log('REVIEW ONLY: source and candidate SHA-256 verified; no database connection.')
    console.log('Candidate SHA-256: ' + manifest.candidate.sha256)
    console.log('Manifest SHA-256 for separate written approval: ' + manifestDigest)
  } else if (mode === '--apply-reviewed-overview' && process.argv.length === 4) {
    applyReviewed(digest)
  } else {
    throw new Error('Usage: node scripts/apply-uranius-overview.mjs --review (offline), or --apply-reviewed-overview <exact-approved-manifest-sha256> (after explicit approval).')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Overview migration stopped.')
  process.exitCode = 1
}
