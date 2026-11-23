import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer, request } from 'node:https'
import { createClubDashboardAdapter } from '../database/synthetic-world/club-dashboard-adapter.mjs'

const [certPath, keyPath] = process.argv.slice(2)
const cert = await readFile(certPath)
const key = await readFile(keyPath)
let closeCount = 0
const adapter = createClubDashboardAdapter({
  origin: () => origin,
  async verifyLogin(email, password) {
    if (password !== 'offline-fixture-only') return null
    const slot = email === 'fixture-a' ? 1 : email === 'fixture-b' ? 2 : 0
    if (!slot) return null
    return {
      id: '00000000-0000-4000-8000-00000000000' + slot,
      expiresAt: Date.now() + 120_000,
      close: async () => { closeCount++ },
    }
  },
  readDashboard(id) { return { ownTeam: Number(id.at(-1)) } },
})
const server = createServer({ cert, key, minVersion: 'TLSv1.2' }, async (req, res) => {
  if (!(await adapter(req, res))) res.writeHead(404).end()
})
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
const origin = 'https://127.0.0.1:' + server.address().port

function call(path, { method = 'GET', cookie, body, requestOrigin = origin, trusted = true } = {}) {
  return new Promise((resolve, reject) => {
    const req = request(origin + path, {
      ca: trusted ? cert : undefined,
      method,
      headers: { Origin: requestOrigin, ...(body && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
    }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(Buffer.concat(chunks)) }))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('Loopback request timeout')))
    req.end(body ? JSON.stringify(body) : undefined)
  })
}

try {
  await assert.rejects(call('/fixture/dashboard', { trusted: false }), /certificate/i)
  assert.equal((await call('/fixture/dashboard')).status, 401)
  const credentials = { email: 'fixture-a', password: 'offline-fixture-only' }
  assert.equal((await call('/fixture/login', { method: 'POST', body: credentials, requestOrigin: 'https://127.0.0.1:1' })).status, 403)
  for (const [index, email] of ['fixture-a', 'fixture-b'].entries()) {
    const login = await call('/fixture/login', { method: 'POST', body: { ...credentials, email, subject: 'spoofed' } })
    assert.equal(login.status, 200)
    const header = login.headers['set-cookie'][0]
    assert.match(header, /^__Host-uranius_club_session=[a-f0-9]{64}; HttpOnly; SameSite=Strict; Path=\/; Secure$/)
    const cookie = header.split(';')[0]
    assert.deepEqual((await call('/fixture/dashboard', { cookie })).data, { ownTeam: index + 1 })
    assert.equal((await call('/fixture/logout', { method: 'POST', cookie, requestOrigin: 'https://127.0.0.1:1' })).status, 403)
    assert.equal((await call('/fixture/logout', { method: 'POST', cookie })).status, 200)
    assert.equal((await call('/fixture/dashboard', { cookie })).status, 401)
  }
  assert.equal(closeCount, 2)
  console.log('Trusted loopback HTTPS, Secure cookies, server-owned identity and logout revocation passed.')
} finally {
  await adapter.close()
  server.close()
}
