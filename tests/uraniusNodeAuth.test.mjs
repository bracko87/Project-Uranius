import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyManager } from '../scripts/verify-uranius-auth.mjs'

const id = '00000000-0000-4000-8000-000000000001'
const password = "offline-P\u00e4ss-\u6f22-\u{1f9ea} ' \" \\ "
const key = 'sb_publishable_offlinefixture'
const email = 'fixture-manager-a' + '@' + 'uranius.example'
const requestId = '43211310-eda9-49e0-a0ea-ee6b79f802ed'

test('official SDK transmits the exact password once and checks identity before logout', async () => {
  const calls = []
  const user = { id, email, email_confirmed_at: '2000-01-01T00:00:00Z' }
  const observed = await verifyManager('a', key, password, async (url, options) => {
    calls.push(url.pathname + url.search)
    assert.equal(url.origin, 'https://sdtsivgtcaoaeoihcwzd.supabase.co')
    assert.equal(options.redirect, 'error')
    assert.equal(new Headers(options.headers).get('apikey'), key)
    assert.ok(options.signal instanceof AbortSignal)
    if (calls.length === 1) {
      assert.equal(JSON.parse(options.body).password, password)
      assert.equal(JSON.parse(options.body).email, email)
      return Response.json({ access_token: 'offline-test-token', refresh_token: 'offline-test-refresh',
        expires_in: 3600, token_type: 'bearer', user })
    }
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer offline-test-token')
    if (calls.length === 2) return Response.json(user)
    return new Response(null, { status: 204 })
  })
  assert.equal(observed, id)
  assert.deepEqual(calls, ['/auth/v1/token?grant_type=password', '/auth/v1/user', '/auth/v1/logout?scope=local'])
})

for (const [status, expected] of [[400, /invalid credentials/], [555, /gateway or server failure/]]) {
  test('Auth ' + status + ' is sanitized and is never retried', async () => {
    let attempts = 0
    await assert.rejects(verifyManager('a', key, password, async () => {
      attempts++
      return Response.json({ error_code: 'invalid_credentials', message: password }, {
        status, headers: { 'sb-request-id': requestId },
      })
    }), error => {
      assert.match(error.message, expected)
      assert.ok(error.message.includes(requestId))
      assert.ok(!error.message.includes(password))
      return true
    })
    assert.equal(attempts, 1)
  })
}

test('verification stops before networking for a non-publishable key', async () => {
  await assert.rejects(verifyManager('a', 'offline-invalid-key', password, () => {
    assert.fail('Transport must not be reached')
  }), /publishable key/)
})
