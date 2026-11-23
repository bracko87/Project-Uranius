import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { assertSandboxTarget } from './assert-sandbox-target.mjs'
import { runPsqlBatch } from './run-uranius-psql-batch.mjs'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

const packages = {
  club: { directory: '', file: '005_club_identity.sql' },
  world: { directory: 'world/', file: '006_synthetic_world.sql' },
  smoke: { directory: 'smoke/', file: '007_smoke_reader.sql' },
}

function apply(env, approvedDigest, scope) {
  const pkg = packages[scope]
  assertSandboxTarget('migrate', env)
  if (!env.URANIUS_DATABASE_CA_FILE) throw new Error('Sandbox database CA file is required.')
  const dir = new URL('../database/reconstruction/' + pkg.directory, import.meta.url)
  const manifestBytes = readFileSync(new URL('manifest.json', dir))
  if (sha256(manifestBytes) !== approvedDigest.toLowerCase()) throw new Error('Approved manifest SHA-256 does not match.')
  const { projectRef, postgresMajor, requires, migrations, bootstrap: manifestBootstrap } = JSON.parse(manifestBytes)
  const foundation = JSON.parse(readFileSync(new URL('../database/preparation/manifest.json', import.meta.url), 'utf8'))
  if (scope === 'world' || scope === 'smoke') {
    const previous = JSON.parse(readFileSync(new URL('../database/reconstruction/manifest.json', import.meta.url), 'utf8'))
    foundation.push(...previous.migrations)
  }
  if (scope === 'smoke') {
    const previous = JSON.parse(readFileSync(new URL('../database/reconstruction/world/manifest.json', import.meta.url), 'utf8'))
    foundation.push(...previous.migrations)
    const bootstrap = readFileSync(new URL('bootstrap-reader.sql', dir))
    if (manifestBootstrap?.file !== 'bootstrap-reader.sql' || sha256(bootstrap) !== manifestBootstrap.sha256) {
      throw new Error('Reader bootstrap checksum mismatch.')
    }
  }
  if (projectRef !== env.URANIUS_SUPABASE_PROJECT_REF || postgresMajor !== 17 ||
      JSON.stringify(requires) !== JSON.stringify(foundation) ||
      migrations.length !== 1 || migrations[0].file !== pkg.file) {
    throw new Error('Unexpected reconstruction manifest scope.')
  }
  const { file, sha256: hash } = migrations[0]
  const sql = readFileSync(new URL(file, dir), 'utf8')
  if (sha256(sql) !== hash || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Migration checksum mismatch.')

  const dependencyRows = requires.map(row => {
    if (!/^00[1-6]_[a-z_]+\.sql$/.test(row.file) || !/^[a-f0-9]{64}$/.test(row.sha256)) {
      throw new Error('Invalid foundation ledger dependency.')
    }
    return "('" + row.file + "', '" + row.sha256 + "')"
  }).join(', ')
  const preflight = `
SELECT pg_advisory_xact_lock(410501);
SELECT set_config('uranius.approved_project_ref', '${projectRef}', true);
SELECT uranius_private.assert_project();
DO $$
BEGIN
  IF current_user <> 'uranius_migrator' OR session_user <> current_user OR current_database() <> 'postgres'
     OR current_setting('server_version_num')::integer / 10000 <> 17
     OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid = pg_backend_pid() AND ssl)
     OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND
         (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls OR NOT rolcanlogin))
     OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = current_user::regrole) THEN
    RAISE EXCEPTION 'Uranius connection, TLS or restricted role prerequisite failed';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
     OR (SELECT count(*) FROM uranius_private.migration_ledger) <> ${requires.length}
     OR EXISTS (
       SELECT * FROM (VALUES ${dependencyRows}) AS expected(version, sha256)
       EXCEPT SELECT version, sha256 FROM uranius_private.migration_ledger
     ) THEN
    RAISE EXCEPTION 'Uranius foundation ledger drift or unexpected migration history';
  END IF;
END
$$;
`

  const target = new URL(env.URANIUS_DATABASE_URL)
  const platformKeys = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'])
  const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => platformKeys.has(key.toUpperCase())))
  Object.assign(childEnv, {
    PGHOST: target.hostname, PGPORT: target.port, PGDATABASE: 'postgres', PGUSER: target.username,
    PGPASSWORD: decodeURIComponent(target.password), PGSSLMODE: 'verify-full', PGGSSENCMODE: 'disable',
    PGSSLROOTCERT: env.URANIUS_DATABASE_CA_FILE, PGCONNECT_TIMEOUT: '10',
    PGOPTIONS: '-c statement_timeout=30000 -c lock_timeout=10000',
  })
  runPsqlBatch({
    executable: env.URANIUS_PSQL_PATH || 'psql',
    input: [preflight, '\\echo URANIUS_MIGRATION ' + file, sql,
      "INSERT INTO uranius_private.migration_ledger (version, sha256) VALUES ('" + file + "', '" + hash + "');",
    ].join('\n'),
    env: childEnv, timeout: 120_000, transaction: true, stage: 'Reviewed reconstruction stopped',
  })
  const messages = { club: 'Reviewed club reconstruction applied.', world: 'Reviewed synthetic world migration applied.',
    smoke: 'Reviewed smoke reader migration applied.' }
  console.log(messages[scope])
}

export function runReviewedReconstruction(scope, flag) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== flag || !/^[0-9a-f]{64}$/i.test(process.argv[3])) {
      throw new Error('Explicit reconstruction manifest approval is required.')
    }
    apply(process.env, process.argv[3], scope)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Reviewed reconstruction failed.')
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runReviewedReconstruction('club', '--apply-reviewed-club-reconstruction')
}
