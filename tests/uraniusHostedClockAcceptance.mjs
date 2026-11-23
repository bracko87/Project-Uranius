// Authenticated loopback HTTPS acceptance of the restricted hosted Uranius clock.
// Nothing is modified in hosted PostgreSQL. All credentials are private terminal input.
import assert from 'node:assert/strict'
import { request } from 'node:https'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { privatePrompt } from '../scripts/verify-uranius-auth.mjs'

const [address, ...args] = process.argv.slice(2)
if (!address || (args.length !== 0 && !(args.length === 2 && args[0] === '--ca'))) {
  throw new Error('Usage: node tests/uraniusHostedClockAcceptance.mjs https://127.0.0.1:PORT [--ca trusted-rootCA.pem]')
}
const url = new URL(address)
if (url.protocol !== 'https:' || url.hostname !== '127.0.0.1' ||
    !/^\d{2,5}$/.test(url.port) || Number(url.port) < 1024 || Number(url.port) > 65535 ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('Expected an exact HTTPS loopback URL without credentials or query parameters')
}
if (!process.stdin.isTTY || !process.stderr.isTTY) {
  throw new Error('Run from a private interactive terminal; manager passwords are never command-line arguments')
}
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('TLS verification cannot be disabled')

const caPath = args.length
  ? resolve(args[1])
  : resolve(execFileSync('mkcert', ['-CAROOT'], {
    encoding: 'utf8', timeout: 5000, windowsHide: true,
  }).trim(), 'rootCA.pem')
const ca = readFileSync(caPath)
const origin = url.origin
const sessionName = '__Host-uranius_club_session'
let passes = 0
const cookies = new Set()

function check(label, condition) {
  assert.ok(condition, label)
  console.log('PASS ' + label)
  passes++
}

function send(path, { method = 'GET', cookie, body, originHeader } = {}) {
  // Fixed local endpoint only: no redirects, URL overrides, client-side identity
  // parameters, arbitrary SQL, or credentials delivered to remote search tools.
  assert.ok(['/fixture/login', '/fixture/logout', '/fixture/dashboard', '/fixture/clock'].includes(path))
  const encoded = body === undefined ? undefined : JSON.stringify(body)
  return new Promise((accept, reject) => {
    const req = request({
      hostname: '127.0.0.1', port: Number(url.port), protocol: 'https:',
      path, method, ca, rejectUnauthorized: true, timeout: 7000,
      headers: {
        Host: '127.0.0.1:' + url.port,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(originHeader ? { Origin: originHeader } : {}),
        ...(encoded !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
    }, res => {
      const parts = []
      let bytes = 0
      res.on('data', part => {
        bytes += part.length
        if (bytes > 16_384) req.destroy(new Error('Response exceeded safe acceptance size'))
        else parts.push(part)
      })
      res.on('end', () => {
        if (!req.socket?.authorized) return reject(new Error('TLS server identity was not verified'))
        const text = Buffer.concat(parts).toString('utf8')
        let data = null
        if (text) {
          try { data = JSON.parse(text) } catch { return reject(new Error('Invalid JSON from local clock adapter')) }
        }
        accept({ status: res.statusCode, data, cookies: res.headers['set-cookie'] || [] })
      })
    })
    req.on('timeout', () => req.destroy(new Error('Local HTTPS request timed out')))
    req.on('error', reject)
    req.end(encoded)
  })
}

async function login(slot) {
  let password = await privatePrompt('Manager ' + slot.toUpperCase() + ' existing password')
  let response
  try {
    response = await send('/fixture/login', {
      method: 'POST', originHeader: origin,
      body: { email: 'fixture-manager-' + slot + '@uranius.example', password },
    })
  } finally {
    password = undefined
  }
  assert.equal(response.status, 200, 'Manager ' + slot.toUpperCase() + ' login rejected')
  assert.equal(response.data?.ok, true)
  const entry = response.cookies.find(s => s.startsWith(sessionName + '='))
  assert.ok(entry, 'No secure opaque session cookie returned')
  assert.match(entry, /^__Host-uranius_club_session=[0-9a-f]{64}; HttpOnly; SameSite=Strict; Path=\/; Secure(?:;|$)/)
  const cookie = entry.split(';')[0]
  assert.ok(!cookies.has(cookie), 'Manager sessions must be distinct')
  cookies.add(cookie)
  check('Manager ' + slot.toUpperCase() + ' sign-in and secure cookie', true)
  return cookie
}

async function dashboard(cookie, label) {
  const r = await send('/fixture/dashboard', { cookie })
  assert.equal(r.status, 200, label + ' dashboard')
  assert.ok(r.data?.club?.id && r.data.club.owner_user_id, label + ' owned club record missing')
  check(label + ' owned dashboard read', true)
  return r.data
}

async function clock(cookie, label) {
  const response = await send('/fixture/clock', { cookie })
  assert.equal(response.status, 200, label + ' clock HTTP status (check local feature flag and DB reader access)')
  assert.deepEqual(response.data, {
    current_game_date: '2000-01-01',
    season_number: 1, month_number: 1, day_number: 1, is_paused: true,
  })
  check(label + ' authoritative paused Season 1 clock read', true)
}

async function logout(cookie, label) {
  const r = await send('/fixture/logout', { method: 'POST', cookie, originHeader: origin })
  assert.equal(r.status, 200, label + ' logout')
  check(label + ' logout accepted', true)
  cookies.delete(cookie)
  const denied = await send('/fixture/clock', { cookie })
  assert.equal(denied.status, 401, 'Old session cookie should not retrieve the clock')
  check(label + ' previous session token invalidated', true)
}

async function main() {
  try {
    const anon = await send('/fixture/clock')
    assert.equal(anon.status, 401)
    check('Anonymous clock request denied', true)

    const a = await login('a')
    const dashA = await dashboard(a, 'A')
    await clock(a, 'A')
    const b = await login('b')
    const dashB = await dashboard(b, 'B')
    check('Managers own distinct clubs and users',
      dashA.club.id !== dashB.club.id && dashA.club.owner_user_id !== dashB.club.owner_user_id)
    await clock(b, 'B')

    // Reusing A's cookie cannot switch to B's club, even after B logs in.
    const againA = await send('/fixture/dashboard', { cookie: a })
    assert.equal(againA.status, 200)
    check('A session remains isolated after B signs in',
      againA.data?.club?.id === dashA.club.id && againA.data?.club?.owner_user_id === dashA.club.owner_user_id)

    await logout(b, 'B')
    await clock(a, 'A after B logout')
    await logout(a, 'A')
    console.log('PASS ' + passes + ' authenticated Uranius HTTPS clock checks. No secrets printed or hosted writes performed.')
  } finally {
    // Do not retain active fixture sessions on expected or unexpected failures.
    for (const cookie of cookies) {
      try { await send('/fixture/logout', { method: 'POST', cookie, originHeader: origin }) }
      catch { /* The local adapter may already be closed. */ }
    }
  }
}

try {
  await main()
} catch (error) {
  // Error messages are fixed assertions/status information, never response body,
  // Auth tokens, passwords, cookie values or database connection details.
  console.error('Uranius HTTPS clock acceptance FAILED: ' +
    (error instanceof Error ? error.message : 'unexpected error'))
  process.exitCode = 1
}
