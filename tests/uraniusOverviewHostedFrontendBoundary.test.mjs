import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const client = readFileSync(new URL('../database/synthetic-world/hosted-smoke-client.tsx', import.meta.url), 'utf8')
const server = readFileSync(new URL('../scripts/run-uranius-hosted-smoke.mjs', import.meta.url), 'utf8')
const transport = readFileSync(new URL('../database/synthetic-world/login-db-transport.ts', import.meta.url), 'utf8')
const adapter = readFileSync(new URL('../database/synthetic-world/club-dashboard-adapter.mjs', import.meta.url), 'utf8')
const query = readFileSync(new URL('../database/synthetic-world/hosted-overview-schedule-read_REVIEW_ONLY.sql', import.meta.url), 'utf8')

test('local HTTPS dashboard renders real authenticated schedule with separate empty and disconnected states',()=>{
  assert.match(client, /request\('overview-schedule'\)/)
  assert.match(client, /function ScheduleStatus\(\)/)
  assert.match(client, /<ScheduleStatus\s*\/>/)
  assert.match(client, /No upcoming race preparations are recorded for this club/)
  assert.match(client, /No races are scheduled in the current game day/)
  assert.match(client, /not connected\. This is not a confirmed empty calendar/)
  assert.match(client, /status === 'ready' && schedule/)
  assert.doesNotMatch(client, /syntheticWorldDraft\.race|stageCalendar\.map/)
})
test('schedule responds only to the validated server session and cannot accept browser club scope',()=>{
  assert.match(adapter, /path === '\/fixture\/overview-schedule' && req\.method === 'GET'/)
  assert.match(adapter, /const current = sessions\.get\(sessionKey\)/)
  assert.match(adapter, /await readSchedule\(current\.subject\)/)
  assert.match(server, /URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED === '1'/)
  assert.match(server, /readSchedule: scheduleSql \? \(id\) =>/)
  assert.match(server, /input: .*verified_subject.*scheduleSql/)
  assert.match(transport, /fetch\('\/fixture\/' \+ path/)
  assert.doesNotMatch(query, /p_club_id/)
})
test('hosted read remains invoker-scoped, TLS-bound, read-only, and never assumes acceptance',()=>{
  assert.match(query, /BEGIN READ ONLY;/)
  assert.match(query, /current_user <> 'uranius_smoke_reader'/)
  assert.match(query, /pg_stat_ssl/)
  assert.match(query, /uranius_game\.get_my_club_id\(\) IS NULL/)
  assert.match(query, /JOIN uranius_game\.race_preparations rp ON rp\.club_id = i\.club_id/)
  assert.match(query, /CROSS JOIN game_day g/)
  assert.doesNotMatch(query, /SECURITY DEFINER/)
  assert.match(query, /ROLLBACK;\s*$/)
})
