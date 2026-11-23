import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const source = JSON.parse(readFileSync(
  new URL('../reference/database/20261123_original_overview_race_schema_METADATA_ONLY.json', import.meta.url), 'utf8'
)).tables
const script = readFileSync(
  new URL('../database/reconstruction/overview/010_race_schema_DISPOSABLE_REVIEW_ONLY.sql', import.meta.url), 'utf8'
)
const tables = ['races','race_stages','race_team_entries','race_preparations']
test('review-only candidate is transactionally rolled back, not applied', () => {
  assert.match(script, /^-- REVIEW_ONLY_NOT_APPROVED/)
  assert.match(script, /BEGIN;[\s\S]*ROLLBACK;\s*$/)
  assert.doesNotMatch(script, /\bCOMMIT\s*;/i)
  assert.doesNotMatch(script, /migration_ledger\s*\(/i)
})
test('all original source columns retain types, nullability and defaults', () => {
  for (const table of tables) {
    assert.match(script, new RegExp('CREATE TABLE uranius_game\\."'+table+'" \\('))
    const section = script.split('CREATE TABLE uranius_game."'+table+'" (')[1].split('\n);')[0]
    for (const col of source[table].columns) {
      const expected = '  "' + col.name + '" ' + col.type +
        (col.required ? ' NOT NULL' : '') +
        (col.default == null ? '' : ' DEFAULT ' + col.default)
      assert.ok(section.includes(expected), table+'.'+col.name+' expected '+expected)
    }
  }
})
test('all original PK, uniqueness and CHECK constraints retained', () => {
  for (const table of tables) {
    for (const constraint of source[table].constraints.filter(c => ['p','u','c'].includes(c.kind))) {
      assert.ok(script.includes('CONSTRAINT "'+constraint.name+'" '+constraint.definition),
        table+'.'+constraint.name)
    }
  }
})
test('known foreign keys map club profiles and preserve race links', () => {
  for (const table of ['race_team_entries', 'race_preparations']) {
    assert.ok(script.includes('ALTER TABLE uranius_game."'+table+
      '" ADD CONSTRAINT "'+table+'_club_id_fkey"'))
    assert.ok(script.includes('REFERENCES uranius_game."club_profiles" ("club_id")'))
  }
  for (const table of ['race_stages','race_team_entries','race_preparations']) {
    assert.ok(script.includes('CONSTRAINT "'+table+'_race_id_fkey"'))
  }
  assert.ok(script.includes('CONSTRAINT "race_preparations_race_team_entry_id_fkey"'))
})
test('schema denies client grants and uses restrictive RLS', () => {
  for (const table of tables) {
    for (const clause of [
      'ALTER TABLE uranius_game."'+table+'" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE uranius_game."'+table+'" FORCE ROW LEVEL SECURITY',
      'REVOKE ALL ON uranius_game."'+table+'" FROM PUBLIC, anon, authenticated',
    ]) assert.ok(script.includes(clause))
  }
  assert.doesNotMatch(script, /CREATE POLICY|GRANT\s+SELECT|SECURITY DEFINER/i)
})
