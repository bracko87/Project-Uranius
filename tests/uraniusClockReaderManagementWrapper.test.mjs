import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const manifest = JSON.parse(read('../database/reconstruction/clock/009_clock_reader_manifest.json'))
const source = read('../database/reconstruction/clock/009_clock_smoke_reader_REVIEW_ONLY.sql')
const wrapper = read('../database/reconstruction/clock/009_management_REVIEW_ONLY.sql')
const nativeRunner = read('./uraniusClockReaderManagedPg17.mjs')
const digest = s => createHash('sha256').update(s).digest('hex')

test('009 review manifest pins exact candidate and atomic wrapper bytes', () => {
  assert.equal(manifest.projectRef, 'sdtsivgtcaoaeoihcwzd')
  assert.equal(manifest.status, 'REVIEW_ONLY_NOT_APPROVED')
  assert.equal(manifest.hostedApplied, false)
  assert.equal(manifest.nodeTests.retest, 'OWNER_REPORTED_PASS_8_OF_8')
  assert.equal(manifest.nativeRehearsal.result, 'OWNER_REPORTED_PASS_21_OF_21')
  assert.equal(digest(source), manifest.candidate.sha256)
  assert.equal(digest(wrapper), manifest.managementWrapper.sha256)
  assert.equal(manifest.managementWrapper.status, 'OWNER_REPORTED_NATIVE_PASS_13_OF_13_REVIEW_ONLY')
})

test('wrapper preserves exactly the four source SQL statements without changing bytes', () => {
  const statements = [...wrapper.matchAll(/EXECUTE \$(ur009_stmt_\d{2})\$([\s\S]*?)\$\1\$;/g)]
  assert.equal(statements.length, 4)
  const combined = statements.map((match, index) => {
    assert.equal(match[1], 'ur009_stmt_' + String(index + 1).padStart(2, '0'))
    assert.ok(match[2].startsWith('\n') && match[2].endsWith('\n'))
    return match[2].slice(1, -1)
  }).join('')
  assert.ok(source.startsWith(combined))
  assert.match(source.slice(combined.length), /^(?:\s|--[^\n]*(?:\n|$))*$/)
})

test('009 wrapper enforces isolated role, project, and eight-entry ledger checks', () => {
  assert.match(wrapper, /^DO \$uranius_009_management\$/m)
  assert.match(wrapper, /current_user <> 'postgres' OR session_user <> current_user/)
  assert.match(wrapper, /current_database\(\) <> 'postgres'/)
  assert.match(wrapper, /current_setting\('server_version_num'\)::integer \/ 10000 <> 17/)
  assert.match(wrapper, /pg_advisory_xact_lock\(410501\)/)
  assert.match(wrapper, /set_config\('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true\)/)
  assert.match(wrapper, /uranius_private\.assert_project\(\)/)
  assert.match(wrapper, /INSERT INTO uranius_private\.migration_ledger\(version,sha256\)/)
  assert.ok(wrapper.includes("'009_clock_smoke_reader.sql','" + manifest.candidate.sha256 + "'"))
  assert.match(source, /migration_ledger\) <> 8/)
  assert.match(source, /EXCEPT SELECT version, sha256 FROM uranius_private\.migration_ledger/)
})

test('temporary role SET grant is revoked and membership identity compared exactly', () => {
  assert.match(wrapper, /membership_before/)
  assert.match(wrapper, /membership_after/)
  assert.match(wrapper, /admin_option AND NOT set_option AND NOT inherit_option/)
  assert.match(wrapper, /GRANT uranius_migrator TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres/)
  assert.match(wrapper, /set_config\('role','uranius_migrator',true\)/)
  assert.match(wrapper, /set_config\('role','none',true\)/)
  assert.match(wrapper, /REVOKE uranius_migrator FROM postgres GRANTED BY postgres RESTRICT/)
  assert.match(wrapper, /membership_before IS DISTINCT FROM membership_after/)
})

test('clock data, prior policies, owner predicate and privilege boundaries must remain unchanged', () => {
  assert.match(wrapper, /data_before IS DISTINCT FROM data_after/)
  assert.match(wrapper, /existing_policies_before IS DISTINCT FROM existing_policies_after/)
  assert.match(wrapper, /clock_policy_before IS DISTINCT FROM clock_policy_after/)
  assert.match(wrapper, /has_column_privilege\('uranius_smoke_reader','uranius_game.game_state','id','SELECT'\)/)
  assert.match(wrapper, /has_any_column_privilege\('anon','uranius_game.game_state','SELECT'\)/)
  assert.match(wrapper, /has_table_privilege\('uranius_smoke_reader','uranius_game.game_state','UPDATE'\)/)
  assert.match(wrapper, /roles @> ARRAY\['authenticated','uranius_smoke_reader'\]::name\[\]/)
  assert.match(source, /GRANT SELECT \(season_number, month_number, day_number, is_paused\)/)
  assert.match(source, /ALTER POLICY game_state_manager_read ON uranius_game.game_state/)
  assert.doesNotMatch(source, /DROP TABLE|CASCADE|GRANT\s+(?:UPDATE|INSERT|DELETE|ALL)\s+ON/i)
})

test('dedicated native runner uses local temporary cluster and tests failure-injected rollback', () => {
  assert.match(nativeRunner, /--disposable-native-pg17/)
  assert.match(nativeRunner, /uranius-009-managed-disposable-/)
  assert.match(nativeRunner, /PGHOST: '127\.0\.0\.1'/)
  assert.match(nativeRunner, /CREATE ROLE postgres LOGIN NOSUPERUSER/)
  assert.match(nativeRunner, /GRANT uranius_migrator TO postgres WITH ADMIN TRUE, INHERIT FALSE, SET FALSE/)
  assert.match(nativeRunner, /inject after temporary membership grant/)
  assert.match(nativeRunner, /inject after 009 ACL\/RLS changes/)
  assert.match(nativeRunner, /readerWrapper, 'postgres'/)
  assert.match(nativeRunner, /assert\.equal\(membership\(\), beforeMembers\)/)
  assert.match(nativeRunner, /INFO Disposable PostgreSQL files cleaned up/)
  assert.doesNotMatch(nativeRunner, /supabase\.co|SUPABASE_SERVICE_ROLE_KEY|https:\/\//)
})

test('native tests and owner approval are distinct gates; hosted 009 remains unauthorized', () => {
  assert.equal(manifest.status, 'REVIEW_ONLY_NOT_APPROVED')
  assert.equal(manifest.managementWrapper.status, 'OWNER_REPORTED_NATIVE_PASS_13_OF_13_REVIEW_ONLY')
  assert.equal(manifest.managementWrapper.nativeRehearsal.result, 'OWNER_REPORTED_PASS_13_OF_13')
  assert.equal(manifest.managementWrapper.nodeTests.status, 'OWNER_REPORTED_PASS_7_OF_7')
  assert.ok(manifest.unmet.some(s => /Explicit owner authorization/.test(s)))
})
