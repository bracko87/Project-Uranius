import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { createClubDashboardAdapter } from '../database/synthetic-world/club-dashboard-adapter.mjs'

// Pure loopback fixture. Never contacts Supabase, uses no real credentials and changes no DB data.
const accounts = new Map([
  ['fixture-a', 1], ['fixture-b', 2], ['fixture-short', 3], ['fixture-close-error', 4],
])
const revoked = []
let origin
const adapter = createClubDashboardAdapter({
  secureCookie: false, origin: () => origin,
  async verifyLogin(email, password) {
    const slot = accounts.get(email)
    if (!slot || password !== 'offline-fixture-only') return null
    return {
      id: '00000000-0000-4000-8000-' + String(slot).padStart(12, '0'),
      expiresAt: Date.now() + (slot === 3 ? 25 : 120_000),
      async close() {
        revoked.push(slot)
        if (slot === 4) throw new Error('Simulated upstream logout failure')
      },
    }
  },
  readDashboard(id) { return { ownTeam: Number(id.slice(-1)) } },
})
const server = createServer(async (req, res) => {
  if (!await adapter(req, res)) res.writeHead(404).end()
})
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
origin = 'http://127.0.0.1:' + server.address().port

async function call(path, { method = 'GET', cookie, body, requestOrigin, sendOrigin = true, headers = {} } = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      ...(sendOrigin ? { Origin: requestOrigin ?? origin } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}), ...headers,
    },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  })
  return { status: response.status, headers: response.headers, data: await response.json() }
}
const creds = email => ({ email, password: 'offline-fixture-only' })
async function login(email, overrides = {}) {
  const response = await call('/fixture/login', { method: 'POST', body: { ...creds(email), ...overrides } })
  assert.equal(response.status, 200)
  const setCookie = response.headers.get('set-cookie')
  assert.match(setCookie, /^uranius_club_session=[a-f0-9]{64}; HttpOnly; SameSite=Strict; Path=\//)
  return setCookie.split(';')[0]
}
async function own(cookie, expected) {
  const result = await call('/fixture/dashboard', { cookie })
  assert.equal(result.status, 200)
  assert.deepEqual(result.data, { ownTeam: expected })
}
try {
  assert.equal((await call('/fixture/dashboard')).status, 401, 'anonymous dashboard denied')
  assert.equal((await call('/fixture/dashboard', { cookie: 'uranius_club_session=forged' })).status, 401)
  assert.equal((await call('/fixture/login', { method: 'POST', body: creds('fixture-a'), sendOrigin: false })).status, 403)
  assert.equal((await call('/fixture/login', { method: 'POST', body: creds('fixture-a'), requestOrigin: 'http://127.0.0.1:1' })).status, 403)
  assert.equal((await call('/fixture/login', { method: 'POST', body: creds('fixture-a'), headers: { 'Content-Type': 'text/plain' } })).status, 403)
  assert.equal((await call('/fixture/login', { method: 'POST', body: { email: 'fixture-a', password: 'wrong' } })).status, 401)

  const a = await login('fixture-a', { subject: '00000000-0000-4000-8000-000000000002', teamId: 2, role: 'postgres' })
  const b = await login('fixture-b', { teamId: 1, subject: '00000000-0000-4000-8000-000000000001' })
  await own(a, 1)
  await own(b, 2)
  assert.equal((await call('/fixture/dashboard', { cookie: a, requestOrigin: 'http://127.0.0.1:1' })).status, 403)
  assert.equal((await call('/fixture/logout', { method: 'POST', cookie: b, requestOrigin: 'http://127.0.0.1:1' })).status, 403)
  await own(b, 2)
  assert.equal((await call('/fixture/logout', { method: 'POST', cookie: b })).status, 200)
  assert.equal((await call('/fixture/dashboard', { cookie: b })).status, 401, 'B cookie replay denied')
  await own(a, 1)
  assert.equal((await call('/fixture/logout', { method: 'POST', cookie: a })).status, 200)
  assert.equal((await call('/fixture/dashboard', { cookie: a })).status, 401, 'A cookie replay denied')

  const short = await login('fixture-short')
  await delay(60)
  assert.equal((await call('/fixture/dashboard', { cookie: short })).status, 401, 'expired cookie denied')

  const broken = await login('fixture-close-error')
  assert.equal((await call('/fixture/logout', { method: 'POST', cookie: broken })).status, 500)
  assert.equal((await call('/fixture/dashboard', { cookie: broken })).status, 401, 'replay denied even when upstream logout fails')
  assert.deepEqual([...revoked].sort(), [1, 2, 3, 4])
  console.log('PASS: anonymous, forged-cookie, invalid login, wrong origin, subject spoof, two-manager isolation, logout/replay, expiry, upstream failure')
} finally {
  await adapter.close()
  await new Promise(resolve => server.close(resolve))
}
