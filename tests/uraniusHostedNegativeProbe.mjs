import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { request } from 'node:https'
import { resolve } from 'node:path'

// Sends fixed, unauthenticated negative requests ONLY to an explicitly named loopback HTTPS listener.
// Does not read or send browser cookies, manager credentials, DB credentials or Supabase API keys.
const [address, ...args] = process.argv.slice(2)
if (!address || args.length > 2 || (args.length !== 0 && !(args.length === 2 && args[0] === '--ca'))) {
  throw new Error('Usage: node tests/uraniusHostedNegativeProbe.mjs https://127.0.0.1:PORT [--ca path-to-mkcert-rootCA.pem]')
}
const url = new URL(address)
if (url.protocol !== 'https:' || url.hostname !== '127.0.0.1' || !/^\d{2,5}$/.test(url.port) ||
    Number(url.port) < 1024 || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('Only an exact https://127.0.0.1:PORT/ target (port 1024-65535) is allowed.')
}
const rootCa = args.length === 2
  ? resolve(args[1])
  : resolve(execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8', timeout: 5000, windowsHide: true }).trim(), 'rootCA.pem')
const ca = readFileSync(rootCa)
const origin = url.origin
let passed = 0

function send(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolveResult, reject) => {
    const req = request({
      protocol: 'https:', hostname: '127.0.0.1', port: Number(url.port),
      path, method, ca, rejectUnauthorized: true, timeout: 5000,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    }, res => {
      let bytes = 0
      res.on('data', chunk => { bytes += chunk.length; if (bytes > 16384) req.destroy(new Error('Unexpected large response')) })
      res.on('end', () => {
        if (!res.socket?.authorized && !req.socket?.authorized) return reject(new Error('TLS certificate was not verified'))
        resolveResult(res.statusCode)
      })
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Local HTTPS probe timed out')))
    req.end(body)
  })
}
async function expect(label, path, expected, opts) {
  const status = await send(path, opts)
  assert.equal(status, expected, label + ': expected HTTP ' + expected + ', received ' + status)
  passed++
  console.log('PASS ' + label + ' (HTTP ' + status + ')')
}

await expect('Anonymous dashboard denied', '/fixture/dashboard', 401)
await expect('Forged cookie denied', '/fixture/dashboard', 401, {
  headers: { Cookie: '__Host-uranius_club_session=' + '0'.repeat(64) },
})
await expect('Wrong Origin denied for dashboard', '/fixture/dashboard', 403, {
  headers: { Origin: 'https://127.0.0.1:1' },
})
await assert.rejects(send('/fixture/dashboard', { headers: { Host: 'localhost:' + url.port } }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' })
passed++
console.log('PASS Wrong Host is rejected by TLS certificate identity validation')
await expect('Missing Origin denied for login', '/fixture/login', 403, {
  method: 'POST', body: JSON.stringify({ email: 'unused', password: 'unused' }),
})
await expect('Wrong Origin denied for login', '/fixture/login', 403, {
  method: 'POST', body: JSON.stringify({ email: 'unused', password: 'unused' }),
  headers: { Origin: 'https://127.0.0.1:1' },
})
await expect('Wrong content type denied for login', '/fixture/login', 403, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'text/plain' }, body: '{}',
})
await expect('Wrong Origin denied for logout', '/fixture/logout', 403, {
  method: 'POST', headers: { Origin: 'https://127.0.0.1:1' },
})
await expect('Disallowed logout method rejected', '/fixture/logout', 405)
await expect('Tenant query is not accepted', '/fixture/dashboard?team_id=2', 404)
await expect('Unknown route is not exposed', '/uranius_private', 404)
console.log('PASS ' + passed + ' loopback HTTPS negative checks. No real credentials, sessions, or hosted data were accessed.')
