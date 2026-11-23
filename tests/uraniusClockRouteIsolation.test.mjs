import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { createClubDashboardAdapter } from '../database/synthetic-world/club-dashboard-adapter.mjs'
import { projectManagerClock } from '../database/synthetic-world/manager-clock-projection.mjs'

const uuidA = '00000000-0000-4000-8000-000000000001'
const uuidB = '00000000-0000-4000-8000-000000000002'
const fixtureRow = Object.freeze({
  season_number: 1, month_number: 1, day_number: 1,
  is_paused: true, internal_test_flag: 'must-not-leak',
})

test('clock projection must be validated, minimal and never inferred from wall clock', () => {
  assert.deepEqual(projectManagerClock(fixtureRow), {
    current_game_date: '2000-01-01',
    season_number: 1, month_number: 1, day_number: 1, is_paused: true,
  })
  assert.equal(Object.hasOwn(projectManagerClock(fixtureRow), 'internal_test_flag'), false)
  assert.throws(() => projectManagerClock(null), /Missing authoritative/)
  assert.throws(() => projectManagerClock({ season_number: 1, month_number: 1, day_number: 1 }), /pause/)
  assert.throws(() => projectManagerClock({ ...fixtureRow, day_number: 32 }), /Invalid/)
  assert.throws(() => projectManagerClock({ ...fixtureRow, is_paused: 'true' }), /pause/)
})

async function localAdapter(adapterOptions, check) {
  let origin
  const adapter = createClubDashboardAdapter({
    secureCookie: false,
    origin: () => origin,
    async verifyLogin(email, password) {
      const slot = email === 'fixture-a' ? uuidA : email === 'fixture-b' ? uuidB : null
      if (!slot || password !== 'offline-fixture-only') return null
      return { id: slot, expiresAt: Date.now() + 60000, close() {} }
    },
    readDashboard: id => ({ owner: id === uuidA ? 1 : 2 }),
    ...adapterOptions,
  })
  const server = createServer(async (req, res) => {
    if (!(await adapter(req, res))) res.writeHead(404).end()
  })
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  origin = 'http://127.0.0.1:' + server.address().port
  async function call(path, { cookie, method = 'GET', body, requestOrigin, headers = {} } = {}) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        Origin: requestOrigin ?? origin,
        ...(cookie && { Cookie: cookie }),
        ...(body && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body && { body: JSON.stringify(body) }),
    })
    // Unmatched routes deliberately return HTTP 404 with no body. Preserve
    // that denial instead of mistaking an empty response for malformed JSON.
    const text = await response.text()
    return {
      status: response.status,
      headers: response.headers,
      data: text ? JSON.parse(text) : null,
    }
  }
  async function login(email) {
    const result = await call('/fixture/login', {
      method: 'POST', body: { email, password: 'offline-fixture-only', subject: uuidB },
    })
    assert.equal(result.status, 200)
    const cookie = result.headers.get('set-cookie')
    assert.match(cookie, /^uranius_club_session=[a-f0-9]{64}; HttpOnly; SameSite=Strict; Path=\//)
    return cookie.split(';')[0]
  }
  try { await check({ call, login, origin }) }
  finally {
    await adapter.close()
    await new Promise(resolve => server.close(resolve))
  }
}

test('GET /fixture/clock uses only server-owned authenticated identity and keeps manager sessions isolated', async () => {
  const seen = []
  await localAdapter({
    async readClock(subject) {
      seen.push(subject)
      if (subject !== uuidA && subject !== uuidB) throw new Error('Unexpected verified subject')
      return fixtureRow
    },
  }, async ({ call, login }) => {
    assert.equal((await call('/fixture/clock')).status, 401)
    assert.equal((await call('/fixture/clock', { cookie: 'uranius_club_session=' + '0'.repeat(64) })).status, 401)
    const a = await login('fixture-a')
    const b = await login('fixture-b')
    assert.deepEqual((await call('/fixture/clock', { cookie: a })).data, projectManagerClock(fixtureRow))
    assert.deepEqual((await call('/fixture/clock', { cookie: b })).data, projectManagerClock(fixtureRow))
    assert.deepEqual(seen, [uuidA, uuidB])
    const refusedTenant = await call('/fixture/clock?subject=' + uuidA, { cookie: b })
    assert.equal(refusedTenant.status, 404)
    assert.equal(refusedTenant.data, null)
    assert.deepEqual(seen, [uuidA, uuidB], 'Tenant query must not reach the clock reader')
    assert.equal((await call('/fixture/clock', { cookie: b, method: 'POST' })).status, 405)
    assert.equal((await call('/fixture/clock', { cookie: b, requestOrigin: 'http://127.0.0.1:1' })).status, 403)
    assert.equal((await call('/fixture/logout', { cookie: b, method: 'POST' })).status, 200)
    assert.equal((await call('/fixture/clock', { cookie: b })).status, 401)
    assert.equal((await call('/fixture/clock', { cookie: a })).status, 200)
    assert.equal((await call('/fixture/logout', { cookie: a, method: 'POST' })).status, 200)
    assert.equal((await call('/fixture/clock', { cookie: a })).status, 401)
    assert.deepEqual(seen, [uuidA, uuidB, uuidA])
  })
})

test('without separately approved clock-read access, private route fails closed after authentication', async () => {
  await localAdapter({}, async ({ call, login }) => {
    assert.equal((await call('/fixture/clock')).status, 401)
    const a = await login('fixture-a')
    const unavailable = await call('/fixture/clock', { cookie: a })
    assert.equal(unavailable.status, 503)
    assert.deepEqual(unavailable.data, { error: 'Game clock read not connected' })
    assert.equal((await call('/fixture/dashboard', { cookie: a })).status, 200)
    assert.equal((await call('/fixture/logout', { cookie: a, method: 'POST' })).status, 200)
  })
})
