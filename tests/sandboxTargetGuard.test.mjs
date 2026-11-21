import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { assertSandboxTarget } from '../scripts/assert-sandbox-target.mjs'

const script = fileURLToPath(new URL('../scripts/assert-sandbox-target.mjs', import.meta.url))
const projectRef = 'exampleprojectrefabc'
const origin = `https://${projectRef}.supabase.co`

test('missing and unapproved targets fail for every privileged operation', () => {
  for (const operation of ['deploy', 'migrate', 'admin']) {
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
  assert.match(result.stderr, /project is unapproved/)
  assert.ok(!result.stderr.includes(projectRef))
})
