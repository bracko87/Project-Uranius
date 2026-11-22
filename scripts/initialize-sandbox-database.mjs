import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { assertSandboxTarget } from './assert-sandbox-target.mjs'

function initialize(env, expectedDigest) {
  // Validate the exact connection configuration consumed by psql before reading SQL.
  assertSandboxTarget('migrate', env)
  const target = new URL(env.URANIUS_DATABASE_URL)
  const projectRef = env.URANIUS_SUPABASE_PROJECT_REF
  if (!env.URANIUS_DATABASE_CA_FILE) throw new Error('Sandbox database CA file is required.')

  const directory = new URL('../database/preparation/', import.meta.url)
  const manifestBytes = readFileSync(new URL('manifest.json', directory))
  if (createHash('sha256').update(manifestBytes).digest('hex') !== expectedDigest.toLowerCase()) {
    throw new Error('Approved migration manifest SHA-256 does not match.')
  }
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('Migration manifest is empty.')
  const statements = [
    "DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid = pg_backend_pid() AND ssl)\n     OR current_database() <> 'postgres'\n     OR NOT EXISTS (\n       SELECT 1 FROM pg_roles\n       WHERE rolname = current_user AND rolcanlogin\n         AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls)\n     )\n     OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = current_user::regrole) THEN\n    RAISE EXCEPTION 'Migration connection or restricted role verification failed';\n  END IF;\nEND\n$$;",
    "SELECT pg_advisory_xact_lock(410501);",
    readFileSync(new URL("preflight.sql", directory), "utf8"),
    "SELECT set_config('uranius.approved_project_ref', '" + projectRef + "', true);",
  ]
  for (const [index, { file, sha256 }] of manifest.entries()) {
    const prefix = String(index + 1).padStart(3, '0')
    if (!file.startsWith(prefix + '_') || !/^\d{3}_[a-z_]+\.sql$/.test(file)) {
      throw new Error('Invalid migration manifest order or filename.')
    }
    const migration = readFileSync(new URL(file, directory), 'utf8')
    if (createHash('sha256').update(migration).digest('hex') !== sha256) {
      throw new Error('Migration hash mismatch for ' + file + '.')
    }
    statements.push("\\echo URANIUS_MIGRATION " + file, migration,
      "INSERT INTO uranius_private.migration_ledger (version, sha256) VALUES ('" + file + "', '" + sha256 + "');",
    )
  }
  // Use one explicit connection and suppress libpq inherited PG* configuration.
  const platformKeys = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'])
  const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => platformKeys.has(key.toUpperCase())))
  Object.assign(childEnv, {
    PGHOST: target.hostname,
    PGPORT: target.port,
    PGDATABASE: 'postgres',
    PGUSER: target.username,
    PGPASSWORD: decodeURIComponent(target.password),
    PGSSLMODE: 'verify-full',
    PGGSSENCMODE: 'disable',
    PGSSLROOTCERT: env.URANIUS_DATABASE_CA_FILE,
    PGCONNECT_TIMEOUT: '10',
    PGOPTIONS: '-c statement_timeout=30000 -c lock_timeout=10000',
  })
  const result = spawnSync(env.URANIUS_PSQL_PATH || 'psql', [
    '--no-psqlrc', '--no-password', '--quiet', '--set=ON_ERROR_STOP=1', '--set=VERBOSITY=sqlstate',
    '--single-transaction', '--file=-',
  ], { env: childEnv, input: statements.join('\n'), encoding: 'utf8', timeout: 120_000, stdio: ['pipe', 'pipe', 'pipe'] })
  if (result.error || result.status !== 0) {
    const file = [...(result.stdout ?? '').matchAll(/^URANIUS_MIGRATION (\d{3}_[a-z_]+\.sql)\r?$/gm)].at(-1)?.[1]
    const sqlstate = (result.stderr ?? '').match(/\b(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/)?.[1]
    const stage = file || 'connection or preflight'
    const code = result.error?.code === 'ETIMEDOUT' ? 'timeout' : sqlstate || 'no SQLSTATE'
    throw new Error('Sandbox initialization stopped at ' + stage + ' (' + code + '). Verify the migration ledger before retrying.')
  }
  console.log('Sandbox preparation migrations applied.')
}

try {
  if (process.argv.length !== 4 || process.argv[2] !== '--apply-reviewed-initial-migrations' || !/^[a-f0-9]{64}$/i.test(process.argv[3])) {
    throw new Error('Explicit initial migration approval argument is required.')
  }
  initialize(process.env, process.argv[3])
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Sandbox initialization failed.')
  process.exitCode = 1
}
