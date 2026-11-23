import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  gameDateFromState, gameDatePartsFromState,
  projectFixtureStageListing, overviewScheduleGate,
} from '../database/reconstruction/overview/game-clock-contract.mjs'

const fixtureClock = { season_number: 1, month_number: 1, day_number: 1 }
const fixtureStages = [
  { stage_id: 3, season_no: 1, stage_no: 3, label: 'Fixture mountain', distance_m: 200000, season_day: 9 },
  { stage_id: 1, season_no: 1, stage_no: 1, label: 'Fixture flat', distance_m: 120000, season_day: 7 },
  { stage_id: 2, season_no: 1, stage_no: 2, label: 'Fixture rolling', distance_m: 160000, season_day: 8 },
]

test('never synthesizes a date from real-world time or stage days', () => {
  assert.equal(gameDateFromState(null), null)
  assert.equal(gameDateFromState(), null)
  assert.equal(gameDatePartsFromState(null), null)
  assert.deepEqual(overviewScheduleGate({}), { ready: false, reason: 'missing_authoritative_game_state' })
})
test('season 1 starts in game year 2000, not browser current year', () => {
  assert.equal(gameDateFromState(fixtureClock), '2000-01-01')
  assert.deepEqual(gameDatePartsFromState(fixtureClock), {
    current_game_date: '2000-01-01', season_number: 1, month_number: 1, day_number: 1,
  })
})
test('season year advances according to game_base_year and season number', () => {
  assert.equal(gameDateFromState({ season_number: 2, month_number: 12, day_number: 31 }), '2001-12-31')
})
test('Gregorian leap day is valid for 2000', () => {
  assert.equal(gameDateFromState({ season_number: 1, month_number: 2, day_number: 29 }), '2000-02-29')
})
test('non-leap day and overflowing month day are rejected', () => {
  assert.throws(() => gameDateFromState({ season_number: 2, month_number: 2, day_number: 29 }), /Invalid Gregorian/)
  assert.throws(() => gameDateFromState({ season_number: 1, month_number: 4, day_number: 31 }), /Invalid Gregorian/)
})
test('rejects malformed clock data, partial state and strings', () => {
  for (const state of [
    {}, { season_number: '1', month_number: 1, day_number: 1 },
    { season_number: 1, month_number: 1 },
    { season_number: 0, month_number: 1, day_number: 1 },
    { season_number: 1, month_number: 13, day_number: 1 },
    { season_number: 1, month_number: 1, day_number: 0 },
    100, [1, 1, 1],
  ]) assert.throws(() => gameDateFromState(state))
})
test('fixture stage projection is ordered and does not invent calendar dates or race acceptance', () => {
  const projected = projectFixtureStageListing(fixtureStages)
  assert.deepEqual(projected.map(x => x.stageId), [1, 2, 3])
  assert.deepEqual(projected.map(x => x.seasonDay), [7, 8, 9])
  assert.deepEqual(projected.map(x => x.distanceM), [120000, 160000, 200000])
  for (const row of projected) {
    assert.equal(Object.hasOwn(row, 'raceDate'), false)
    assert.equal(Object.hasOwn(row, 'accepted'), false)
    assert.equal(Object.hasOwn(row, 'result'), false)
  }
})
test('rejects duplicate stages and invalid source fields', () => {
  assert.throws(() => projectFixtureStageListing([fixtureStages[0], fixtureStages[0]]), /Duplicate/)
  assert.throws(() => projectFixtureStageListing([{ ...fixtureStages[0], season_day: 0 }]), /Invalid/)
  assert.equal(projectFixtureStageListing([{ ...fixtureStages[0], season_day: 367 }])[0].seasonDay, 367)
  assert.throws(() => projectFixtureStageListing([{ ...fixtureStages[0], label: '' }]), /Missing/)
  assert.throws(() => projectFixtureStageListing({}), /Expected/)
})
test('schedule must remain blocked until clock, accepted entries and response contract are reviewed', () => {
  assert.deepEqual(overviewScheduleGate({gameState:fixtureClock}), {
    ready: false, reason: 'missing_verified_accepted_team_entries',
  })
  assert.deepEqual(overviewScheduleGate({gameState:fixtureClock,acceptedTeamEntriesVerified:true}), {
    ready: false, reason: 'overview_schedule_response_contract_not_reviewed',
  })
})
