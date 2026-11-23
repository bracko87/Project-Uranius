import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const source = readFileSync(new URL('../database/reconstruction/clock/008_game_clock_v1.sql', import.meta.url), 'utf8')
const wrapper = readFileSync(new URL('../database/reconstruction/clock/008_management_REVIEW_ONLY.sql', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../database/reconstruction/clock/manifest.json', import.meta.url), 'utf8'))
const nativeRunner = readFileSync(new URL('./uraniusClockManagedPg17.mjs', import.meta.url), 'utf8')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

test('review-only management wrapper pins exact canonical 008 SHA and project', () => {
  assert.equal(sha(source), manifest.candidate.sha256)
  assert.equal(sha(wrapper), manifest.managementWrapper.sha256)
  assert.equal(manifest.managementWrapper.status, 'REVIEW_ONLY_NATIVE_NOT_TESTED')
  assert.equal(manifest.status, 'REVIEW_ONLY_NOT_AUTHORIZED')
  assert.match(wrapper, /REVIEW ONLY\. DO NOT EXECUTE ON ANY HOSTED DATABASE/)
  assert.ok(wrapper.includes(manifest.candidate.sha256))
  assert.ok(wrapper.includes(manifest.projectRef))
})

test('each of the exact 17 canonical SQL statements is embedded without substitutions', () => {
  const matches = [...wrapper.matchAll(/EXECUTE \$(ur008_stmt_\d{2})\$([\s\S]*?)\$\1\$;/g)]
  assert.equal(matches.length, 17, 'Expected 17 dynamic SQL statements')
  let merged = ''
  for (const [i, match] of matches.entries()) {
    assert.equal(match[1], 'ur008_stmt_' + String(i + 1).padStart(2, '0'))
    assert.ok(match[2].startsWith('\n') && match[2].endsWith('\n'))
    merged += match[2].slice(1, -1)
  }
  assert.ok(source.startsWith(merged), 'Canonical source statements must match exact bytes in order')
  const tail = source.slice(merged.length)
  assert.match(tail, /^(?:\s|--[^\n]*(?:\n|$))*$/)
})

test('management privilege changes are bounded and restored atomically', () => {
  assert.match(wrapper, /^DO \$uranius_008_management\$/m)
  assert.match(wrapper, /current_user <> 'postgres' OR session_user <> current_user/)
  assert.match(wrapper, /pg_advisory_xact_lock\(410501\)/)
  assert.match(wrapper, /membership_before/)
  assert.match(wrapper, /membership_after/)
  assert.match(wrapper, /grantor<>member\s+AND admin_option AND NOT set_option AND NOT inherit_option/)
  assert.match(wrapper, /GRANT uranius_migrator TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres/)
  assert.match(wrapper, /set_config\('role','uranius_migrator',true\)/)
  assert.match(wrapper, /set_config\('role','none',true\)/)
  assert.match(wrapper, /REVOKE uranius_migrator FROM postgres GRANTED BY postgres RESTRICT/)
  assert.match(wrapper, /membership_before IS DISTINCT FROM membership_after/)
})

test('protects the existing ledger, manager mappings and RLS while adding 008', () => {
  assert.match(wrapper, /pg_advisory_xact_lock\(410501\)/)
  assert.match(wrapper, /uranius_private\.assert_project\(\)/)
  assert.match(wrapper, /data_before IS DISTINCT FROM data_after/)
  assert.match(wrapper, /policies_before IS DISTINCT FROM policies_after/)
  assert.match(wrapper, /INSERT INTO uranius_private\.migration_ledger\(version,sha256\)/)
  assert.ok(wrapper.includes("'008_game_clock_v1.sql','" + manifest.candidate.sha256 + "'"))
  assert.match(wrapper, /lock_timeout','5s'/)
  assert.doesNotMatch(wrapper, /\b(?:CREATE EXTENSION|cron\.schedule|pg_cron)\b/)
})

test('non-superuser role semantics require disposable native management rehearsal before approval', () => {
  assert.match(wrapper, /Native management-role replay and failure injection NOT YET TESTED/)
  assert.equal(manifest.status, 'REVIEW_ONLY_NOT_AUTHORIZED')
  assert.ok(manifest.notReadyReasons.some(x => /No reviewed atomic management-connection execution wrapper yet/.test(x)))
})

test('native wrapper rehearsal is explicitly disposable, pinned and exercises membership rollback', () => {
  assert.match(nativeRunner, /--disposable-native-pg17/)
  assert.match(nativeRunner, /mkdtempSync\(join\(tmpdir\(\), 'uranius-008-managed-disposable-'\)\)/)
  assert.match(nativeRunner, /PGHOST: '127\.0\.0\.1'/)
  assert.match(nativeRunner, /assert\.equal\(hash\(management\), proposal\.managementWrapper\.sha256\)/)
  assert.match(nativeRunner, /CREATE ROLE postgres LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT/)
  assert.match(nativeRunner, /GRANT uranius_migrator TO postgres WITH ADMIN TRUE, INHERIT FALSE, SET FALSE/)
  assert.match(nativeRunner, /forced after temp grant/)
  assert.match(nativeRunner, /forced after 008 DDL and ledger/)
  assert.match(nativeRunner, /assert\.equal\(membership\(\), beforeMembers\)/)
  assert.match(nativeRunner, /INFO Disposable PostgreSQL files cleaned up/)
  assert.doesNotMatch(nativeRunner, /https:\/\/|supabase\.co|SUPABASE_SERVICE_ROLE_KEY/)
})
