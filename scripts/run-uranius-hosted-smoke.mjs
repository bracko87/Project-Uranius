import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import { X509Certificate } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:https'
import { fileURLToPath } from 'node:url'
import { createClubDashboardAdapter } from '../database/synthetic-world/club-dashboard-adapter.mjs'
import { openVerifiedManager, privatePrompt } from './verify-uranius-auth.mjs'
import { assertSandboxTarget } from './assert-sandbox-target.mjs'
import { runPsqlBatch } from './run-uranius-psql-batch.mjs'

const ref = 'sdtsivgtcaoaeoihcwzd'
const root = new URL('../', import.meta.url)
const world = new URL('database/synthetic-world/', root)

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--reviewed-hosted-smoke' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('Explicit hosted smoke mode and TLS verification are required.')
  }
  const env = process.env
  if (![env.URANIUS_SMOKE_TLS_CERT, env.URANIUS_SMOKE_TLS_KEY, env.URANIUS_DATABASE_CA_FILE, env.URANIUS_PSQL_PATH].every(Boolean)) {
    throw new Error('Configure the loopback certificate/key, Uranius database CA and trusted psql path.')
  }
  const cert = await readFile(env.URANIUS_SMOKE_TLS_CERT)
  const key = await readFile(env.URANIUS_SMOKE_TLS_KEY)
  const identity = new X509Certificate(cert)
  if (!identity.checkIP('127.0.0.1') || Date.parse(identity.validFrom) > Date.now() || Date.parse(identity.validTo) <= Date.now()) {
    throw new Error('A current TLS certificate for loopback 127.0.0.1 is required.')
  }
  const dbPassword = await privatePrompt('Uranius smoke-reader password')
  const publishable = (await privatePrompt('Uranius publishable API key')).trim()
  if (!dbPassword || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishable)) throw new Error('Expected the reader password and publishable key.')
  const host = 'db.' + ref + '.supabase.co'
  const dsn = 'postgresql://uranius_smoke_reader:' + encodeURIComponent(dbPassword) + '@' + host + ':5432/postgres?sslmode=verify-full'
  assertSandboxTarget('read', {
    URANIUS_SUPABASE_PROJECT_REF: ref, URANIUS_SUPABASE_URL: 'https://' + ref + '.supabase.co', URANIUS_DATABASE_URL: dsn,
  })
  const platform = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'])
  const childEnv = Object.fromEntries(Object.entries(env).filter(([name]) => platform.has(name.toUpperCase())))
  Object.assign(childEnv, {
    PGHOST: host, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'uranius_smoke_reader',
    PGPASSWORD: dbPassword, PGSSLMODE: 'verify-full', PGGSSENCMODE: 'disable',
    PGSSLROOTCERT: env.URANIUS_DATABASE_CA_FILE, PGCONNECT_TIMEOUT: '5',
    PGOPTIONS: '-c statement_timeout=5000 -c lock_timeout=2000',
  })

  const readSql = await readFile(new URL('hosted-club-dashboard-read.sql', world), 'utf8')
  // Opt-in stays disabled until a separately reviewed, RLS-limited clock reader
  // grant is installed. The existing 008 clock intentionally denies this role.
  if (env.URANIUS_CLOCK_READ_APPROVED && !['0', '1'].includes(env.URANIUS_CLOCK_READ_APPROVED)) {
    throw new Error('Invalid clock reader review flag.')
  }
  const clockSql = env.URANIUS_CLOCK_READ_APPROVED === '1'
    ? await readFile(new URL('hosted-clock-read_REVIEW_ONLY.sql', world), 'utf8')
    : null
  // Separately authorized only after 010/012 are installed and live RLS verified.
  // Default is OFF, including for existing hosted clock/dashboard smoke tests.
  if (env.URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED &&
      !['0', '1'].includes(env.URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED)) {
    throw new Error('Invalid Overview schedule review flag.')
  }
  const scheduleSql = env.URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED === '1'
    ? await readFile(new URL('hosted-overview-schedule-read_REVIEW_ONLY.sql', world), 'utf8')
    : null
  // Opt-in only after independent hosted migration 013 verification.
  if (env.URANIUS_SQUAD_READ_APPROVED && !['0','1'].includes(env.URANIUS_SQUAD_READ_APPROVED)) {
    throw new Error('Invalid Squad reader review flag.')
  }
  const squadSql = env.URANIUS_SQUAD_READ_APPROVED === '1'
    ? await readFile(new URL('hosted-squad-preview-read_REVIEW_ONLY.sql', world), 'utf8')
    : null
  const cssPath = fileURLToPath(new URL('src/shadcn.css', root))
  const css = (await postcss([tailwindcss(fileURLToPath(new URL('tailwind.config.js', root)))]).process(await readFile(cssPath, 'utf8'), { from: cssPath })).css
  const background = await readFile(new URL('public/assets/uranius-placeholders/background.png', root))
  const bundle = await build({
    absWorkingDir: fileURLToPath(root),
    entryPoints: [fileURLToPath(new URL('hosted-smoke-client.tsx', world))],
    bundle: true, write: false, platform: 'browser',
    plugins: [{ name: 'uranius-local-auth', setup(api) {
      api.onResolve({ filter: /(?:lib\/supabase|^\.\/supabase)$/ }, () => ({
        path: fileURLToPath(new URL('login-db-transport.ts', world)),
      }))
    } }],
  })
  const route = createClubDashboardAdapter({
    origin: () => 'https://127.0.0.1:' + server.address().port,
    async verifyLogin(email, password) {
      const slot = /^fixture-manager-([ab])@uranius\.example$/.exec(email)?.[1]
      if (!slot) {
        console.error('Uranius hosted Auth: unsupported fixture manager identifier.')
        return null
      }
      try {
        return await openVerifiedManager(slot, publishable, password)
      } catch (error) {
        // Only emit fixed diagnostic categories. Never log credentials, keys,
        // Auth response bodies, tokens, identifiers, or raw exception messages.
        const message = error instanceof Error ? error.message : ''
        const stage = message.startsWith('Uranius Auth identity lookup') ? 'identity lookup'
          : message.startsWith('Uranius Auth sign-in') ? 'sign-in' : 'verification'
        const categories = [
          'invalid credentials', 'unconfirmed account', 'account banned',
          'rate limited', 'gateway or server failure', 'Auth service failure',
          'request timeout', 'transport failure', 'confirmed identity mismatch',
          'unexpected Auth route blocked',
        ]
        const category = categories.find(value => message.includes(value)) ?? 'other verification failure'
        console.error('Uranius hosted Auth: manager ' + slot.toUpperCase() + ' ' + stage + ' failed (' + category + ').')
        return null
      }
    },
    readClock: clockSql ? (id) => {
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
        throw new Error('Invalid verified subject.')
      }
      const output = runPsqlBatch({
        executable: env.URANIUS_PSQL_PATH, env: childEnv,
        input: '\\set verified_subject ' + id + '\n' + clockSql,
        timeout: 10000, stage: 'Uranius read-only clock query',
        extraArgs: ['--tuples-only', '--no-align'],
      })
      return JSON.parse(output.trim().split(/\r?\n/).at(-1))
    } : undefined,
    readSchedule: scheduleSql ? (id) => {
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
        throw new Error('Invalid verified subject.')
      }
      const output = runPsqlBatch({
        executable: env.URANIUS_PSQL_PATH, env: childEnv,
        input: '\\set verified_subject ' + id + '\n' + scheduleSql,
        timeout: 10000, stage: 'Uranius read-only Overview schedule query',
        extraArgs: ['--tuples-only', '--no-align'],
      })
      return JSON.parse(output.trim().split(/\r?\n/).at(-1))
    } : undefined,
    readSquad: squadSql ? (id) => {
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
        throw new Error('Invalid verified subject.')
      }
      const output = runPsqlBatch({
        executable: env.URANIUS_PSQL_PATH, env: childEnv,
        input: '\\set verified_subject ' + id + '\n' + squadSql,
        timeout: 10000, stage: 'Uranius read-only Squad preview query',
        extraArgs: ['--tuples-only', '--no-align'],
      })
      return JSON.parse(output.trim().split(/\r?\n/).at(-1))
    } : undefined,
    readDashboard(id) {
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw new Error('Invalid verified subject.')
      const output = runPsqlBatch({
        executable: env.URANIUS_PSQL_PATH, env: childEnv,
        input: '\\set verified_subject ' + id + '\n' + readSql, timeout: 10000, stage: 'Uranius dashboard read',
        extraArgs: ['--tuples-only', '--no-align'],
      })
      return JSON.parse(output.trim().split(/\r?\n/).at(-1))
    },
  })
  const server = createServer({ cert, key, minVersion: 'TLSv1.2' }, async (req, res) => {
    if (await route(req, res)) return
    res.setHeader('Cache-Control', 'no-store')
    if (req.headers.host !== '127.0.0.1:' + server.address().port || req.method !== 'GET') {
      res.writeHead(403).end()
    } else if (req.url === '/smoke.js') {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.end(bundle.outputFiles[0].contents)
    } else if (req.url === '/smoke.css') {
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.end(css)
    } else if (req.url?.split('?')[0] === '/assets/uranius-placeholders/background.png') {
      res.setHeader('Content-Type', 'image/png')
      res.end(background)
    } else if (req.url === '/') {
      res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'")
      res.end('<!doctype html><meta charset="utf-8"><title>Uranius club smoke</title><link rel="stylesheet" href="/smoke.css"><div id="root"></div><script src="/smoke.js"></script>')
    } else res.writeHead(404).end()
  })
  server.requestTimeout = 20000
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  console.log('Uranius smoke available at https://127.0.0.1:' + server.address().port)
  process.once('SIGINT', async () => {
    server.close()
    await route.close()
  })
}

try { await main() } catch { console.error('Uranius hosted smoke did not start. Check local TLS, terminal and reader settings.'); process.exitCode = 1 }
