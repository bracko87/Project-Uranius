import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { assertSandboxTarget } from './assert-sandbox-target.mjs'

function initialize(env) {
  // Validate the exact connection configuration consumed by psql before reading SQL.
  assertSandboxTarget('migrate', env)
  const target = new URL(env.URANIUS_DATABASE_URL)
  const projectRef = env.URANIUS_SUPABASE_PROJECT_REF
  if (!env.URANIUS_DATABASE_CA_FILE) throw new Error('Sandbox database CA file is required.')

  const directory = new URL('../database/preparation/', import.meta.url)
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'))
  if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('Migration manifest is empty.')
  const statements = [
    "SELECT pg_advisory_xact_lock(410501);",
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
    statements.push(migration,
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
    PGSSLROOTCERT: env.URANIUS_DATABASE_CA_FILE,
    PGCONNECT_TIMEOUT: '10',
  })
  const result = spawnSync('psql', [
    '--no-psqlrc', '--no-password', '--quiet', '--set=ON_ERROR_STOP=1',
    '--single-transaction', '--file=-',
  ], { env: childEnv, input: statements.join('\n'), encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] })
  if (result.error || result.status !== 0) {
    throw new Error('Sandbox initialization did not report success. Verify the migration ledger before retrying.')
  }
  console.log('Sandbox preparation migrations applied.')
}

try {
  initialize(process.env)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Sandbox initialization failed.')
  process.exitCode = 1
}
