import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)
const load = name => readFileSync(new URL(name, root), 'utf8')
const sql = load('database/reconstruction/clock/009_clock_smoke_reader_REVIEW_ONLY.sql')
const read = load('database/synthetic-world/hosted-clock-read_REVIEW_ONLY.sql')
const server = load('scripts/run-uranius-hosted-smoke.mjs')
const adapter = load('database/synthetic-world/club-dashboard-adapter.mjs')
const frontend = load('database/synthetic-world/hosted-smoke-client.tsx')
const manifest = JSON.parse(load('database/reconstruction/clock/009_clock_reader_manifest.json'))

test('009 source is SHA-pinned and does not authorize hosted execution', () => {
  assert.equal(manifest.candidate.sha256, createHash('sha256').update(sql).digest('hex'))
  assert.equal(manifest.projectRef, 'sdtsivgtcaoaeoihcwzd')
  assert.equal(manifest.status, 'REVIEW_ONLY_NOT_APPROVED')
  assert.equal(manifest.hostedApplied, false)
  assert.match(sql, /REVIEW ONLY: DO NOT APPLY ON HOSTED URANIUS/)
})

test('009 verifies all eight migration digests and exact isolated server context', () => {
  assert.match(sql, /uranius_private\.assert_project\(\)/)
  assert.match(sql, /current_user <> 'uranius_migrator'/)
  assert.match(sql, /uranius\.approved_project_ref/)
  assert.match(sql, /sdtsivgtcaoaeoihcwzd/)
  assert.match(sql, /migration_ledger\) <> 8/)
  for (let i = 1; i <= 8; i++) assert.ok(sql.includes(String(i).padStart(3, '0') + '_'), 'Missing migration ' + i)
  assert.match(sql, /EXCEPT SELECT version, sha256 FROM uranius_private\.migration_ledger/)
})

test('009 grants only clock column reads under the existing owner-backed RLS policy', () => {
  assert.match(sql, /GRANT SELECT \(season_number, month_number, day_number, is_paused\)/)
  assert.match(sql, /TO uranius_smoke_reader/)
  assert.match(sql, /ALTER POLICY game_state_manager_read ON uranius_game\.game_state/)
  assert.match(sql, /TO authenticated, uranius_smoke_reader/)
  assert.doesNotMatch(sql, /GRANT\s+(?:UPDATE|INSERT|DELETE|ALL)\s+ON/)
  assert.doesNotMatch(sql, /SECURITY DEFINER|BYPASSRLS|CREATE POLICY .*USING \(true\)|GRANT .* TO (?:anon|PUBLIC)/i)
})

test('clock read query requires verified server role, TLS, fixed subject and read-only transaction', () => {
  assert.match(read, /BEGIN READ ONLY/)
  assert.match(read, /current_user <> 'uranius_smoke_reader'/)
  assert.match(read, /pg_stat_ssl/)
  assert.match(read, /:'verified_subject'/)
  assert.match(read, /SELECT season_number, month_number, day_number, is_paused/)
  assert.match(read, /ROLLBACK;/)
  const executableRead = read.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(executableRead, /\b(?:UPDATE|DELETE|INSERT|EXECUTE|GRANT)\b/i)
  assert.doesNotMatch(read, /request\.jwt\.claims.*team_id|current_date|clock_timestamp/i)
})

test('hosted clock read stays disabled without explicit local feature flag', () => {
  assert.match(server, /URANIUS_CLOCK_READ_APPROVED === '1'/)
  assert.match(server, /clockSql \? \(id\) =>/)
  assert.match(server, /runPsqlBatch\(\{/)
  assert.match(server, /URANIUS_PSQL_PATH/)
  assert.match(server, /hosted-clock-read_REVIEW_ONLY\.sql/)
  assert.match(adapter, /typeof readClock !== 'function'\) return send\(503/)
  assert.match(adapter, /projectManagerClock\(await readClock\(current\.subject\)\)/)
  assert.match(frontend, /Clock data is not connected to this sandbox interface yet/)
  assert.doesNotMatch(server, /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/)
})
