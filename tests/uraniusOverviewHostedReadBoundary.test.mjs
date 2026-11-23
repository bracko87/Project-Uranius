import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')
const batch=read('../database/synthetic-world/hosted-overview-schedule-read_REVIEW_ONLY.sql')
const source=read('../database/reconstruction/overview/011_overview_schedule_REVIEW_ONLY.sql')
const server=read('../scripts/run-uranius-hosted-smoke.mjs')
const statements=batch.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n')
test('schedule is disabled by default and the trusted server owns subject binding',()=>{
  assert.match(server,/env\.URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED === '1'/)
  assert.match(server,/readSchedule: scheduleSql \? \(id\) =>/)
  assert.match(server,/input: .*set verified_subject .*scheduleSql/)
  assert.match(batch,/:\x27verified_subject\x27/)
  assert.doesNotMatch(statements,/p_club_id|SECURITY DEFINER/)
})
test('SQL batch forces restricted role, TLS, owner mapping and transaction rollback',()=>{
  assert.match(batch,/^-- REVIEW_ONLY_NOT_APPROVED/)
  assert.match(batch,/BEGIN READ ONLY;/)
  assert.match(batch,/current_user <> 'uranius_smoke_reader'/)
  assert.match(batch,/session_user <> current_user/)
  assert.match(batch,/pg_stat_ssl/)
  assert.match(batch,/has_schema_privilege\(current_user, 'uranius_private', 'USAGE'\)/)
  assert.match(batch,/uranius_game\.get_my_club_id\(\) IS NULL/)
  assert.match(batch,/ROLLBACK;\s*$/)
  assert.doesNotMatch(statements,/\bCOMMIT\s*;/)
})
test('only four approved game clock fields are read',()=>{
  for(const file of [batch,source]){
    assert.match(file,/FROM uranius_game\.game_state/)
    assert.match(file,/WHERE is_paused IS TRUE/)
    assert.doesNotMatch(file,/WHERE id IS TRUE/)
  }
})
test('world stage cards and private preparation cards stay distinct',()=>{
  assert.match(batch,/JOIN uranius_game\.race_preparations rp ON rp\.club_id = i\.club_id/)
  const today=batch.split('  today AS (')[1].split('\n  )\nSELECT')[0]
  assert.doesNotMatch(today,/race_preparations|race_team_entries/)
  assert.match(today,/LIMIT 20/)
  assert.match(batch,/LIMIT 5/)
})
