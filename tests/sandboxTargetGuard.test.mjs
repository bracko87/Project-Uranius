import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { assertSandboxDatabaseUrl, assertSandboxTarget } from '../scripts/assert-sandbox-target.mjs'

const script = fileURLToPath(new URL('../scripts/assert-sandbox-target.mjs', import.meta.url))
const projectRef = 'exampleprojectrefabc'
const origin = `https://${projectRef}.supabase.co`

test('missing and unapproved targets fail for every privileged operation', () => {
  for (const operation of ['migrate', 'admin', 'write', 'schedule']) {
    assert.throws(() => assertSandboxTarget(operation, {}), /configuration is missing/)
    assert.throws(() => assertSandboxTarget(operation, {
      URANIUS_SUPABASE_PROJECT_REF: projectRef,
      URANIUS_SUPABASE_URL: origin,
      URANIUS_SITE_ID: 'unapproved-test-site',
    }), /project is unapproved/)
  }
})

test('mismatched origin, credentials, path, query and trailing slash are rejected', () => {
  for (const candidate of ['https://example.invalid', `https://user@${projectRef}.supabase.co`, `${origin}/rest/v1`, `${origin}?sandbox=true`, `${origin}/`]) {
    assert.throws(() => assertSandboxTarget('admin', {
      URANIUS_SUPABASE_PROJECT_REF: projectRef,
      URANIUS_SUPABASE_URL: candidate,
    }), /origin does not exactly match/)
  }
})

test('CLI rejects missing configuration and unknown operations without leaking target values', () => {
  for (const [operation, message] of [['migrate', /configuration is missing/], ['unknown', /unknown sandbox operation/i]]) {
    const result = spawnSync(process.execPath, [script, operation], { encoding: 'utf8', env: {} })
    assert.equal(result.status, 1)
    assert.match(result.stderr, message)
    assert.equal(result.stdout, '')
  }

  const result = spawnSync(process.execPath, [script, 'deploy'], {
    encoding: 'utf8',
    env: { URANIUS_SUPABASE_PROJECT_REF: projectRef, URANIUS_SUPABASE_URL: origin },
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Deployment is disabled/)
  assert.ok(!result.stderr.includes(projectRef))
})

test('direct database target requires the expected project, role, database and verified TLS', () => {
  const host = 'db.' + projectRef + '.supabase.co:5432'
  const valid = 'postgresql://uranius_worker:fixture-value@' + host + '/postgres?sslmode=verify-full'
  assert.doesNotThrow(() => assertSandboxDatabaseUrl(valid, projectRef, 'uranius_worker'))
  for (const candidate of [
    undefined,
    valid.replace(projectRef, 'differentprojectabcd'),
    valid.replace('uranius_worker', 'postgres'),
    valid.replace(':5432', ':6543'),
    valid.replace('/postgres?', '/other?'),
    valid.replace('verify-full', 'require'),
    valid + '&host=other.example',
    valid + '#unexpected',
    valid.replace(':fixture-value', ''),
  ]) {
    assert.throws(() => assertSandboxDatabaseUrl(candidate, projectRef, 'uranius_worker'), error => {
      assert.match(error.message, /Sandbox database connection/)
      assert.ok(!error.message.includes('fixture-value'))
      return true
    })
  }
})

test('session pooler requires both a pinned host and a project-qualified role', () => {
  const poolerHost = 'aws-0-eu-central-1.pooler.supabase.com'
  const valid = 'postgresql://uranius_worker.' + projectRef + ':fixture-value@' + poolerHost + ':5432/postgres?sslmode=verify-full'
  assert.doesNotThrow(() => assertSandboxDatabaseUrl(valid, projectRef, 'uranius_worker', poolerHost))
  assert.throws(() => assertSandboxDatabaseUrl(valid, projectRef, 'uranius_worker'))
  assert.throws(() => assertSandboxDatabaseUrl(valid.replace(projectRef, 'differentprojectabcd'), projectRef, 'uranius_worker', poolerHost))
  assert.throws(() => assertSandboxDatabaseUrl(valid, projectRef, 'uranius_worker', poolerHost.replace('aws-0', 'aws-1')))
})
