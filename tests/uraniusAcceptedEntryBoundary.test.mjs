import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterAcceptedEntriesForOwnedClubs, isOverviewSubmittedPreparationStatus } from '../database/reconstruction/overview/accepted-entry-boundary.mjs'

const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'
const r1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const r2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const e1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const e2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const base = {
  ownedClubIds: [a],
  entries: [
    { id: e1, club_id: a, race_id: r1, status: 'accepted' },
    { id: e2, club_id: b, race_id: r2, status: 'accepted' },
  ],
  preparations: [
    { club_id: a, race_id: r1, status: 'submitted' },
    { club_id: b, race_id: r2, status: 'submitted' },
  ],
}
test('only accepted entries from verified owned clubs with matching submitted preparation', () => {
  assert.deepEqual(filterAcceptedEntriesForOwnedClubs(base), [
    { id: e1, club_id: a, race_id: r1, status: 'accepted' },
  ])
})
test('cross-manager entries are never exposed', () => {
  assert.deepEqual(filterAcceptedEntriesForOwnedClubs({ ...base, ownedClubIds: [b] }), [
    { id: e2, club_id: b, race_id: r2, status: 'accepted' },
  ])
})
test('accepted without submitted preparation is not ready', () => {
  assert.deepEqual(filterAcceptedEntriesForOwnedClubs({ ...base, preparations: [] }), [])
})
test('submitted preparation for another race cannot authorize an entry', () => {
  assert.deepEqual(filterAcceptedEntriesForOwnedClubs({
    ...base, preparations: [{ club_id: a, race_id: r2, status: 'submitted' }],
  }), [])
})
test('pending or rejected entry never qualifies', () => {
  for (const status of ['pending', 'rejected', 'withdrawn']) {
    assert.deepEqual(filterAcceptedEntriesForOwnedClubs({
      ...base, entries: [{ ...base.entries[0], status }],
    }), [])
  }
})
test('startlist_status can satisfy the verified submitted-status policy', () => {
  assert.equal(filterAcceptedEntriesForOwnedClubs({
    ...base, preparations: [{ club_id: a, race_id: r1, status: 'draft', startlist_status: 'submitted' }],
  }).length, 1)
})
test('malformed owned IDs, entry IDs and duplicate entries fail closed', () => {
  assert.throws(() => filterAcceptedEntriesForOwnedClubs({ ...base, ownedClubIds: ['unverified'] }))
  assert.throws(() => filterAcceptedEntriesForOwnedClubs({
    ...base, entries: [{ ...base.entries[0], id: 'unverified' }],
  }))
  assert.throws(() => filterAcceptedEntriesForOwnedClubs({
    ...base, entries: [base.entries[0], base.entries[0]],
  }))
})
test('exact Overview preparation statuses and case-folding', () => {
  for (const status of ['submitted', 'finalised', 'finalized', 'locked', ' LOCKED ']) {
    assert.equal(isOverviewSubmittedPreparationStatus(status), true)
    assert.equal(filterAcceptedEntriesForOwnedClubs({
      ...base, preparations: [{ club_id: a, race_id: r1, status }],
    }).length, 1)
  }
  for (const status of ['', 'draft', 'pending', 'accepted', null, undefined]) {
    assert.equal(isOverviewSubmittedPreparationStatus(status), false)
    assert.deepEqual(filterAcceptedEntriesForOwnedClubs({
      ...base, preparations: [{ club_id: a, race_id: r1, status }],
    }), [])
  }
})
test('missing row inputs fail closed', () => {
  assert.throws(() => filterAcceptedEntriesForOwnedClubs({ ...base, entries: null }))
  assert.throws(() => filterAcceptedEntriesForOwnedClubs({ ...base, preparations: null }))
})
