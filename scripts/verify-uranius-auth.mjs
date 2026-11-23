import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const origin = 'https://sdtsivgtcaoaeoihcwzd.supabase.co'
const endpoints = new Map([
  ['/auth/v1/token?grant_type=password', 'POST'],
  ['/auth/v1/user', 'GET'],
  ['/auth/v1/logout?scope=local', 'POST'],
])
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const requestIdPattern = /^(?:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|[a-f0-9]{16,32}(?:-[a-z]{3})?)$/i
const knownCodes = new Set(['invalid_credentials', 'email_not_confirmed', 'user_banned',
  'over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit'])

class AuthDiagnostic extends Error {}

function category(status, code) {
  if (status >= 500) return status === 500 ? 'Auth service failure' : 'gateway or server failure'
  if (status === 429 || code?.startsWith('over_')) return 'rate limited'
  if (status === 408) return 'request timeout'
  if (code === 'invalid_credentials') return 'invalid credentials'
  if (code === 'email_not_confirmed') return 'unconfirmed account'
  if (code === 'user_banned') return 'account banned'
  return 'HTTP request rejected'
}

function safeResponse(status, code) {
  return Response.json({ message: 'Uranius Auth request failed', error_code: code }, { status })
}

// The fetch parameter is used only by offline tests. The terminal always uses native fetch.
export async function openVerifiedManager(slot, key, password, fetcher = globalThis.fetch) {
  if (!['a', 'b'].includes(slot) || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || !password) {
    throw new AuthDiagnostic('Expected a manager slot, Uranius publishable key and existing password.')
  }
  const email = 'fixture-manager-' + slot + '@' + 'uranius.example'
  let lastFailure
  const client = createClient(origin, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      lastFailure = undefined
      const url = new URL(input)
      if (url.origin !== origin || endpoints.get(url.pathname + url.search) !== options?.method) {
        lastFailure = 'unexpected Auth route blocked'
        return safeResponse(400)
      }
      const signal = AbortSignal.timeout(15000)
      try {
        const response = await fetcher(url, { ...options, redirect: 'error', signal })
        if (response.ok) return response
        const requestId = ['sb-request-id', 'x-request-id', 'x-kong-request-id', 'cf-ray']
          .map(header => response.headers.get(header)).find(value => value && requestIdPattern.test(value))
        let code
        if ([400, 401, 403, 429].includes(response.status)) {
          const payload = await response.json().catch(() => null)
          const candidate = payload?.error_code ?? payload?.code
          if (knownCodes.has(candidate)) code = candidate
        } else {
          // Discard gateway error bodies without reading potentially sensitive text.
          void response.body?.cancel().catch(() => {})
        }
        lastFailure = 'HTTP ' + response.status + ', ' + category(response.status, code) +
          ', request ID ' + (requestId ?? 'unavailable')
        return safeResponse(response.status, code)
      } catch {
        lastFailure = signal.aborted ? 'request timeout' : 'transport failure'
        return safeResponse(503)
      }
    } },
  })

  const fail = (stage, fallback) => new AuthDiagnostic(
    'Uranius Auth ' + stage + ' for manager ' + slot.toUpperCase() + ': ' + (lastFailure ?? fallback) + '.',
  )
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token) throw fail('sign-in', 'no session returned')
  let proofFailure
  try {
    const { data: lookup, error: lookupError } = await client.auth.getUser(data.session.access_token)
    if (lookupError) throw fail('identity lookup', 'user verification failed')
    const user = lookup.user
    if (user?.email !== email || !user.email_confirmed_at || user.id !== data.user?.id ||
        !uuid.test(user.id) || user.id === '00000000-0000-0000-0000-000000000000') {
      throw fail('identity lookup', 'confirmed identity mismatch')
    }
  } catch (failure) {
    proofFailure = failure
  }
  const close = async () => {
    const { error: logoutError } = await client.auth.signOut({ scope: 'local' })
    if (logoutError || lastFailure) throw fail('logout', 'sign-out failed')
  }
  if (proofFailure) {
    await close().catch(() => {})
    throw proofFailure
  }
  return { id: data.user.id, expiresAt: data.session.expires_at * 1000, close }
}

export async function verifyManager(slot, key, password, fetcher = globalThis.fetch) {
  const verified = await openVerifiedManager(slot, key, password, fetcher)
  await verified.close()
  return verified.id
}

export async function privatePrompt(label) {
  const mute = new Writable({ write(_bytes, _encoding, done) { done() } })
  const line = createInterface({ input: process.stdin, output: mute, terminal: true, historySize: 0 })
  const cancel = new AbortController()
  line.on('SIGINT', () => cancel.abort())
  line.on('close', () => cancel.abort())
  process.stderr.write(label + ' (input hidden): ')
  try {
    return await line.question('', { signal: cancel.signal })
  } catch {
    throw new AuthDiagnostic('Private input cancelled.')
  } finally {
    line.close()
    process.stderr.write('\n')
  }
}

async function main() {
  if (process.argv.length !== 2 || !process.stdin.isTTY || !process.stderr.isTTY) {
    throw new AuthDiagnostic('Run with no arguments in a private interactive terminal.')
  }
  const key = (await privatePrompt('Uranius publishable API key')).trim()
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new AuthDiagnostic('Use the Uranius publishable key.')
  const a = await verifyManager('a', key, await privatePrompt('Manager A existing password'))
  console.log('Manager A verified and signed out.')
  const b = await verifyManager('b', key, await privatePrompt('Manager B existing password'))
  if (a === b) throw new AuthDiagnostic('The two verified subjects are not distinct.')
  console.log('Manager B verified and signed out. Both Uranius identities passed.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main() } catch (error) {
    console.error(error instanceof AuthDiagnostic ? error.message : 'Uranius Auth verification stopped.')
    process.exitCode = 1
  }
}
