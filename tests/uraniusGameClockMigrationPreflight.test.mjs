import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migration = readFileSync(new URL('../database/reconstruction/clock/008_game_clock_v1.sql', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../database/reconstruction/smoke/manifest.json', import.meta.url), 'utf8'))
const game = readFileSync(new URL('../database/reconstruction/overview/game-clock-contract.mjs', import.meta.url), 'utf8')
const prior = [...manifest.requires, ...manifest.migrations]

test('008 is explicitly review-only and isolated to approved project', () => {
  assert.match(migration, /REVIEW-ONLY candidate, NOT approved for hosted execution/)
  assert.match(migration, /sdtsivgtcaoaeoihcwzd/)
  assert.match(migration, /current_user <> 'uranius_migrator'/)
  assert.match(migration, /uranius_private\.assert_project\(\)/)
  assert.match(migration, /seven-entry ledger/)
})

test('requires the complete exact seven-entry canonical ledger', () => {
  assert.equal(prior.length, 7)
  assert.equal(new Set(prior.map(x => x.file)).size, 7)
  for (const item of prior) {
    assert.match(item.sha256, /^[0-9a-f]{64}$/)
    assert.ok(migration.includes("'" + item.file + "', '" + item.sha256 + "'"), 'missing ' + item.file)
  }
  assert.match(migration, /count\(\*\) FROM uranius_private\.migration_ledger\) <> 7/)
})

test('creates a single frozen synthetic clock with no advancing worker', () => {
  assert.match(migration, /CREATE TABLE uranius_game\.game_state/)
  assert.match(migration, /id boolean PRIMARY KEY DEFAULT true CHECK \(id\)/)
  assert.match(migration, /is_paused boolean NOT NULL DEFAULT true CHECK \(is_paused\)/)
  assert.match(migration, /VALUES \(true, 1, 1, 1, 0, 0, true\)/)
  assert.doesNotMatch(migration, /\b(?:CREATE TRIGGER|CREATE EXTENSION|pg_cron|cron\.schedule|CREATE POLICY .* FOR UPDATE)\b/i)
  assert.doesNotMatch(migration, /GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)\s+ON/i)
})

test('clock RLS requires verified owner and denies anon reader', () => {
  assert.match(migration, /ALTER TABLE uranius_game\.game_state ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /CREATE POLICY game_state_manager_read/)
  assert.match(migration, /owner\.user_id = \(SELECT uranius_catalog\.request_uid\(\)\)/)
  assert.match(migration, /REVOKE ALL ON uranius_game\.game_state FROM PUBLIC, anon, authenticated, uranius_smoke_reader/)
  assert.doesNotMatch(migration, /BYPASSRLS|SECURITY DEFINER/)
})

test('matches all three original read-only RPC signatures without direct public grants', () => {
  for (const signature of [
    /CREATE FUNCTION uranius_game\.get_current_game_date_date\(\)\s*RETURNS date/i,
    /CREATE FUNCTION uranius_game\.get_current_game_date_parts\(\)\s*RETURNS TABLE \(current_game_date date, season_number integer, month_number integer, day_number integer\)/i,
    /CREATE FUNCTION uranius_game\.get_current_game_date\(\)\s*RETURNS TABLE \(season_number integer, month_number smallint, day_number smallint\)/i,
  ]) assert.match(migration, signature)
  assert.equal((migration.match(/SECURITY INVOKER/g) || []).length, 3)
  assert.equal((migration.match(/GRANT EXECUTE ON FUNCTION/g) || []).length, 3)
  assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION .* TO (?:anon|PUBLIC|uranius_smoke_reader)/)
})

test('source still rejects fabricated current dates and schedules', () => {
  assert.match(game, /missing_authoritative_game_state/)
  assert.match(game, /missing_verified_accepted_team_entries/)
  assert.match(game, /overview_schedule_response_contract_not_reviewed/)
  assert.doesNotMatch(game, /Date\.now\(\)/)
})
