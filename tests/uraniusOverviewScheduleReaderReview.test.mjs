import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
const sql = readFileSync(new URL('../database/reconstruction/overview/011_overview_schedule_REVIEW_ONLY.sql',import.meta.url),'utf8')
test('owner identity is server-derived, not a caller supplied club UUID',()=>{
  assert.match(sql,/uranius_game\.get_my_club_id\(\)/)
  assert.match(sql,/JOIN uranius_game\.race_preparations rp ON rp\.club_id = i\.club_id/)
  assert.doesNotMatch(sql,/p_club_id|SECURITY DEFINER|auth\.uid\s*\(\s*\)\s*=\s*\$\d/i)
})
test('original global today races are separate from owner upcoming races',()=>{
  const today=sql.split('  today AS (')[1].split('\n  )\nSELECT')[0]
  assert.match(today,/FROM uranius_game\.race_stages s/)
  assert.doesNotMatch(today,/JOIN uranius_game\.race_preparations|JOIN uranius_game\.race_team_entries/)
  assert.match(sql,/LIMIT 5/)
  assert.match(today,/LIMIT 20/)
})
test('reads authoritative paused clock and avoids wall-clock fallback',()=>{
  assert.match(sql,/FROM uranius_game\.game_state/)
  assert.match(sql,/is_paused IS TRUE/)
  assert.doesNotMatch(sql,/CURRENT_DATE|now\(\)|clock_timestamp|Date\.now/i)
})
test('candidate cannot be mistaken for deployable DDL',()=>{
  assert.match(sql,/REVIEW ONLY, NOT EXECUTABLE ON HOSTED DB/)
  assert.doesNotMatch(sql,/\b(?:CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|COMMIT)\s+(?:TABLE|FUNCTION|POLICY|INTO|ON|FROM)?/im)
})
test('result keys and internal links match original Overview reader',()=>{
  assert.match(sql,/'upcomingSchedule'/)
  assert.match(sql,/'todayRaces'/)
  assert.match(sql,/'#\/dashboard\/races\/'/)
  assert.match(sql,/'dateLabel'/)
  assert.match(sql,/'timeLabel'/)
})
