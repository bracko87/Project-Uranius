import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const read = name => readFileSync(new URL(name, root))
const sha = value => createHash('sha256').update(value).digest('hex')
const manifest = JSON.parse(read('database/reconstruction/overview/010_install_manifest_REVIEW_ONLY.json'))
const sql = read('database/reconstruction/overview/010_overview_race_reader_REVIEW_ONLY.sql')
test('hosted candidate SHA and original source hashes are pinned exactly', () => {
  assert.equal(manifest.projectRef, 'sdtsivgtcaoaeoihcwzd')
  assert.equal(manifest.status, 'REVIEW_ONLY_NOT_APPROVED')
  assert.equal(manifest.hostedApplied, false)
  assert.equal(manifest.candidate.sha256, sha(sql))
  assert.equal(manifest.expectedLedgerEntries, 9)
  assert.equal(manifest.requires.length, 9)
  for (const item of manifest.sources) {
    assert.equal(item.sha256, sha(read('database/reconstruction/overview/' + item.file)))
  }
})
test('integrated 010 includes all 4 FORCE RLS tables and scoped reader policies', () => {
  const body = sql.toString('utf8')
  assert.match(body, /current_user <> 'uranius_migrator'/)
  assert.match(body, /pg_advisory_xact_lock\(410501\)/)
  assert.match(body, /count\(\*\) FROM uranius_private\.migration_ledger\) <> 9/)
  for (const table of ['races','race_stages','race_team_entries','race_preparations']) {
    assert.ok(body.includes('CREATE TABLE uranius_game."'+table+'"'))
    assert.ok(body.includes('ALTER TABLE uranius_game."'+table+'" FORCE ROW LEVEL SECURITY'))
  }
  for (const name of ['uranius_races_reader','uranius_race_stages_reader',
                      'uranius_entries_owner','uranius_preparations_owner']) {
    assert.ok(body.includes('CREATE POLICY '+name))
  }
  assert.match(body, /pg_stat_ssl/)
  assert.doesNotMatch(body, /\bCOMMIT\s*;/i)
  assert.doesNotMatch(body, /\bINSERT\s+INTO\s+uranius_game\./i)
  assert.doesNotMatch(body, /GRANT\s+SELECT[^;]+TO\s+(?:authenticated|anon|PUBLIC)/i)
})
test('offline installer review checksums without credentials or network', () => {
  const command = new URL('../scripts/apply-uranius-overview.mjs',import.meta.url)
  const result = spawnSync(process.execPath,[fileURLToPath(command),'--review'],
    {encoding:'utf8',timeout:15000,env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||''}})
  assert.equal(result.status,0, result.stderr)
  assert.match(result.stdout,/no database connection/)
  assert.ok(result.stdout.includes(manifest.candidate.sha256))
})
test('installer rejects missing approval; cannot apply without digest', () => {
  const command = new URL('../scripts/apply-uranius-overview.mjs',import.meta.url)
  const result = spawnSync(process.execPath,[fileURLToPath(command),'--apply-reviewed-overview','0'.repeat(64)],
    {encoding:'utf8',timeout:15000,env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||''}})
  assert.notEqual(result.status,0)
  assert.match(result.stderr,/Explicit approval for exact Overview manifest digest required/)
})
