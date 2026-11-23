import assert from 'node:assert/strict'
import { execFile, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { createClubDashboardAdapter } from './club-dashboard-adapter.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const here = fileURLToPath(new URL('./', import.meta.url))
const dbMode = process.argv[2] === '--postgres-fixture'
const dbPsql = process.env.URANIUS_SMOKE_PSQL
const dbPort = process.env.URANIUS_SMOKE_DB_PORT
const readSql = dbMode ? await readFile(join(here, 'club-dashboard-read.sql'), 'utf8') : ''
if (dbMode && (!dbPsql || !/^\d{4,5}$/.test(dbPort ?? ''))) throw new Error('Local PostgreSQL fixture is missing')

const bundle = await build({
  absWorkingDir: root,
  entryPoints: [join(here, 'login-smoke-client.tsx')],
  bundle: true, write: false, platform: 'browser',
  plugins: [{ name: 'local-only-auth', setup(api) {
    api.onResolve({ filter: /(?:lib\/supabase|^\.\/supabase|^\.\/login-smoke-supabase)$/ }, () => ({
      path: join(here, dbMode ? 'login-db-transport.ts' : 'login-smoke-supabase.ts'),
    }))
  } }],
})
const adapter = dbMode && createClubDashboardAdapter({
  secureCookie: false,
  origin: () => 'http://127.0.0.1:' + server.address().port,
  verifyLogin(email, password) {
    if (password !== 'offline-fixture-only') return null
    for (const [index, letter] of ['a', 'b'].entries()) {
      if (email === 'fixture-manager-' + letter + '@' + 'uranius.example') {
        return { id: '00000000-0000-4000-8000-00000000000' + (index + 1) }
      }
    }
    return null
  },
  readDashboard(id) {
    if (!/^00000000-0000-4000-8000-00000000000[12]$/.test(id)) throw new Error('Unexpected test subject')
    const system = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'].includes(key.toUpperCase())))
    const result = spawnSync(dbPsql, ['-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
      env: { ...system, PGHOST: '127.0.0.1', PGHOSTADDR: '127.0.0.1', PGPORT: dbPort,
        PGUSER: 'uranius_smoke_reader', PGDATABASE: 'uranius_006_test_dashboard', PGCONNECT_TIMEOUT: '5',
        PGOPTIONS: '-c statement_timeout=5000' },
      input: readSql.replace('__VERIFIED_SUBJECT__', id), encoding: 'utf8', timeout: 7000, windowsHide: true,
    })
    if (result.error || result.status !== 0) throw new Error('Local dashboard SQL failed')
    return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1))
  },
})
const server = createServer(async (request, response) => {
  if (adapter && await adapter(request, response)) return
  if (request.url === '/smoke.js') {
    response.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    response.end(bundle.outputFiles[0].contents)
  } else {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'")
    response.end('<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/smoke.js"></script>')
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
try {
  if (dbMode) {
    const origin = 'http://127.0.0.1:' + server.address().port
    const dashboard = cookie => fetch(origin + '/fixture/dashboard', { headers: cookie ? { Cookie: cookie } : {} })
    assert.equal((await dashboard()).status, 401)
    const login = (letter, requestOrigin = origin) => fetch(origin + '/fixture/login', {
      method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fixture-manager-' + letter + '@' + 'uranius.example', password: 'offline-fixture-only' }),
    })
    assert.equal((await login('a', 'http://127.0.0.1:1')).status, 403)
    for (const [index, letter] of ['a', 'b'].entries()) {
      const response = await login(letter)
      assert.equal(response.status, 200)
      const header = response.headers.get('set-cookie')
      assert.match(header, /HttpOnly; SameSite=Strict/)
      const cookie = header.split(';')[0]
      const data = await (await dashboard(cookie)).json()
      assert.equal(data.club.name, 'Fixture Team ' + (index + 1))
      assert.deepEqual([data.riders, data.credits, data.calendar], [10, 10000, 3])
      const logout = await fetch(origin + '/fixture/logout', { method: 'POST', headers: { Origin: origin, Cookie: cookie } })
      assert.equal(logout.status, 200)
      assert.equal((await dashboard(cookie)).status, 401)
    }
  }
  const chrome = process.env.URANIUS_CHROME ?? join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe')
  for (const manager of ['a', 'b']) {
    const { stdout } = await promisify(execFile)(chrome, [
      '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update',
      '--disable-sync', '--no-first-run', '--no-proxy-server',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      '--incognito', '--dump-dom', '--virtual-time-budget=5000',
      'http://127.0.0.1:' + server.address().port + '/?manager=' + manager,
    ], { windowsHide: true, timeout: 20000 })
    assert.ok(stdout.includes('data-smoke="passed-' + manager + '"'), 'Fixture login failed for manager ' + manager)
  }
  console.log('Both Login, dashboard, isolation and logout checks passed' + (dbMode ? ' against native PostgreSQL.' : ' with fixture data.'))
} finally {
  server.close()
}
