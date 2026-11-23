import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { assertSandboxTarget } from './assert-sandbox-target.mjs'

function failureCategory(result) {
  if (result.error?.code === 'ETIMEDOUT') return 'process timeout'
  if (result.error) return 'process I/O failure'
  const output = result.stderr ?? ''
  const sqlstate = output.match(/\b(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/)?.[1]
  let category = 'SQL execution failure'
  if (sqlstate?.startsWith('28') || /password authentication failed|no password supplied/i.test(output)) {
    category = 'authentication failure'
  } else if (/timeout expired|timed out/i.test(output) && result.status === 2 && !sqlstate) {
    category = 'connection timeout'
  } else if (result.status === 2 || sqlstate?.startsWith('08')) {
    category = 'connection or TLS failure'
  } else if (!sqlstate && /could not read from input|broken pipe|input\/output error/i.test(output)) {
    category = 'process I/O failure'
  }
  return sqlstate ? category + ' (SQLSTATE ' + sqlstate + ')' : category
}

export function runPsqlBatch({ executable, input, env, timeout, transaction = false, stage }) {
  const args = [
    '--no-psqlrc', '--no-password', '--quiet', '--set=ON_ERROR_STOP=1',
    '--set=VERBOSITY=sqlstate', '--pset=pager=off', '--file=-',
  ]
  if (transaction) args.unshift('--single-transaction')

  // Node supervises both pipe I/O and process exit on the same deadline.
  const result = spawnSync(executable, args, {
    input, env, encoding: 'utf8', timeout, windowsHide: true,
    maxBuffer: 1024 * 1024,
  })
  if (result.error || result.status !== 0) {
    const file = [...(result.stdout ?? '').matchAll(/^URANIUS_MIGRATION (\d{3}_[a-z_]+\.sql)\r?$/gm)].at(-1)?.[1]
    throw new Error(stage + (file ? ' at ' + file : '') + ': ' + failureCategory(result) + '.')
  }
  return result.stdout
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { URANIUS_BATCH_SQL: input, URANIUS_BATCH_PSQL: executable, URANIUS_BATCH_TIMEOUT_MS, ...env } = process.env
  const timeout = Number(URANIUS_BATCH_TIMEOUT_MS)
  try {
    if (!input || !executable || !Number.isInteger(timeout) || timeout < 1 || timeout > 120_000) {
      throw new Error('Invalid local PostgreSQL batch configuration.')
    }
    const ref = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(env.PGHOST)?.[1]
    assertSandboxTarget('admin', { URANIUS_SUPABASE_PROJECT_REF: ref, URANIUS_SUPABASE_URL: 'https://' + ref + '.supabase.co' })
    if (env.PGPORT !== '5432' || env.PGDATABASE !== 'postgres' ||
        !['postgres', 'uranius_migrator'].includes(env.PGUSER) || env.PGSSLMODE !== 'verify-full' ||
        env.PGGSSENCMODE !== 'disable' || !env.PGSSLROOTCERT || !env.PGPASSWORD) {
      throw new Error('Invalid guarded PostgreSQL connection configuration.')
    }
    const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'PGHOST', 'PGPORT',
      'PGDATABASE', 'PGUSER', 'PGSSLMODE', 'PGSSLROOTCERT', 'PGGSSENCMODE', 'PGCONNECT_TIMEOUT',
      'PGOPTIONS', 'PGPASSWORD'])
    const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => allowed.has(key.toUpperCase())))
    process.stdout.write(runPsqlBatch({ executable, input, env: childEnv, timeout, stage: 'PostgreSQL batch' }))
  } catch (error) {
    process.stderr.write(error.message + '\n')
    process.exitCode = 1
  }
}
