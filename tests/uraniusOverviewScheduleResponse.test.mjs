import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectOverviewScheduleResponse as project } from '../database/reconstruction/overview/overview-schedule-response.mjs'

const valid = {
  upcoming_schedule: [{ id: 'race1', title: 'Fixture race', subtitle: 'One-day',
    date_label: 'Jan 7', country_code: 'DE', href: '/races/race1' }],
  today_races: [{ id: 'race2', title: 'Today race', time_label: '12:00', country_iso2: 'FR' }],
}
test('requires independently verified owner context', () => {
  assert.throws(() => project(valid), /Verified club ownership/)
  assert.throws(() => project(valid, { ownerVerified: false }), /Verified club ownership/)
})
test('normalizes original snake-case RPC fields for first-paint cards', () => {
  const out = project(valid, { ownerVerified: true })
  assert.deepEqual(out.upcomingSchedule, [{ id: 'race1', title: 'Fixture race',
    subtitle: 'One-day', countryCode: 'DE', dateLabel: 'Jan 7', href: '/races/race1' }])
  assert.deepEqual(out.todayRaces, [{ id: 'race2', title: 'Today race',
    subtitle: '', countryCode: 'FR', timeLabel: '12:00' }])
})
test('also accepts original camel-case RPC fields', () => {
  const out = project({ upcomingSchedule: [{ title: 'Race', dateLabel: 'Jan 8' }],
    todayRaces: [] }, { ownerVerified: true })
  assert.equal(out.upcomingSchedule[0].dateLabel, 'Jan 8')
  assert.equal(out.todayRaces.length, 0)
})
test('missing schedule arrays are errors, not false empty schedules', () => {
  assert.throws(() => project({}, { ownerVerified: true }), /schedule array/)
  assert.throws(() => project({ upcomingSchedule: [], todayRaces: null }, { ownerVerified: true }))
})
test('invalid entries and unreviewed external navigation fail closed', () => {
  for (const row of [null, 10, { href: 'https://elsewhere.example' },
    { href: '//elsewhere.example' }, { href: 'javascript:alert(1)' }]) {
    assert.throws(() => project({ upcomingSchedule: [row], todayRaces: [] }, { ownerVerified: true }))
  }
})
test('does not invent accepted race entry, date or club identifiers', () => {
  const out = project({ upcomingSchedule: [{ title: 'Race' }], todayRaces: [] }, { ownerVerified: true })
  assert.equal(out.upcomingSchedule[0].dateLabel, '')
  assert.equal(own(out.upcomingSchedule[0], 'accepted'), false)
  assert.equal(own(out.upcomingSchedule[0], 'club_id'), false)
})
function own(o,k) { return Object.prototype.hasOwnProperty.call(o,k) }
test('read model is immutable and bounds oversized responses', () => {
  const out = project({ upcomingSchedule: [], todayRaces: [] }, { ownerVerified: true })
  assert.equal(Object.isFrozen(out), true)
  assert.equal(Object.isFrozen(out.upcomingSchedule), true)
  assert.throws(() => project({ upcomingSchedule: Array(501).fill({}), todayRaces: [] },
    { ownerVerified: true }), /limit/)
})
