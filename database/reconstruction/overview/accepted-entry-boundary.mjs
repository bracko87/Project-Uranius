/**
 * Read-only, offline acceptance boundary for the original Overview's accepted entries.
 * This is not a hosted SQL reader and does not authorize enabling the original Overview.
 *
 * Source: src/pages/dashboard/Overview.tsx, lines 2042-2148.
 * The original consumer requires accepted race_team_entries AND a submitted
 * race_preparations record for the same (club_id, race_id) pair.
 */
// Exact predicates from original Overview.tsx isSubmittedRacePreparationStatus.
// No unknown, draft, pending or accepted-only preparation status is sufficient.
export const OVERVIEW_SUBMITTED_STATUSES = Object.freeze([
  'submitted', 'finalised', 'finalized', 'locked',
])

export function isOverviewSubmittedPreparationStatus(value) {
  return typeof value === 'string' &&
    OVERVIEW_SUBMITTED_STATUSES.includes(value.trim().toLowerCase())
}

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i

function requireUuid(value, label) {
  if (typeof value !== 'string' || !uuid.test(value)) {
    throw new TypeError('Invalid ' + label)
  }
  return value.toLowerCase()
}

/**
 * Accept an allowlist only from an authenticated, owner-verified server lookup.
 * Never accept that list directly from a browser parameter.
 */
export function filterAcceptedEntriesForOwnedClubs({
  ownedClubIds, entries, preparations,
} = {}) {
  if (!Array.isArray(ownedClubIds) || !Array.isArray(entries) ||
      !Array.isArray(preparations)) {
    throw new TypeError('Expected verified owner clubs, entries and preparations')
  }
  if (!ownedClubIds.length) return Object.freeze([])
  const owned = new Set(ownedClubIds.map(value => requireUuid(value, 'owned club id')))
  if (owned.size !== ownedClubIds.length) throw new Error('Duplicate verified club id')
  const preparationPairs = new Set()
  for (const row of preparations) {
    if (!row || typeof row !== 'object') throw new TypeError('Invalid preparation row')
    const clubId = requireUuid(row.club_id, 'preparation club id')
    const raceId = requireUuid(row.race_id, 'preparation race id')
    if (owned.has(clubId) &&
      (isOverviewSubmittedPreparationStatus(row.status) ||
       isOverviewSubmittedPreparationStatus(row.startlist_status))) {
      preparationPairs.add(clubId + ':' + raceId)
    }
  }
  const accepted = []
  const seen = new Set()
  for (const row of entries) {
    if (!row || typeof row !== 'object') throw new TypeError('Invalid entry row')
    const clubId = requireUuid(row.club_id, 'entry club id')
    const raceId = requireUuid(row.race_id, 'entry race id')
    if (!owned.has(clubId) || row.status !== 'accepted' ||
        !preparationPairs.has(clubId + ':' + raceId)) continue
    const id = requireUuid(row.id, 'entry id')
    if (seen.has(id)) throw new Error('Duplicate accepted entry id')
    seen.add(id)
    accepted.push(Object.freeze({ id, club_id: clubId, race_id: raceId, status: 'accepted' }))
  }
  return Object.freeze(accepted)
}
