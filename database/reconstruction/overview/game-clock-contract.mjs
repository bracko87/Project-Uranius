/**
 * Offline Uranius read-model compatibility for the original ProPeloton game clock.
 * Not a source of authoritative time; no queries, network calls, or write paths.
 *
 * Source: reference/database/20260929184613_baseline_04_sql_dump_001_120.sql.txt
 *   game_year_from_season, game_date_from_parts,
 *   get_current_game_date_date and get_current_game_date_parts.
 */

const BASE_YEAR = 2000
const digits = value => String(value).padStart(2, '0')

function requiredInteger(source, key, min, max) {
  const value = source[key]
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError('Invalid authoritative game clock field: ' + key)
  }
  return value
}

/**
 * Returns null when authoritative game_state has not been initialized.
 * Intentionally never substitutes Date.now(), current_date, or fixture season_day.
 */
export function gameDateFromState(gameState) {
  if (gameState == null) return null
  if (typeof gameState !== 'object' || Array.isArray(gameState)) {
    throw new TypeError('Expected one authoritative game_state row')
  }
  const season = requiredInteger(gameState, 'season_number', 1, 8000)
  const month = requiredInteger(gameState, 'month_number', 1, 12)
  const day = requiredInteger(gameState, 'day_number', 1, 31)
  const year = BASE_YEAR + season - 1
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new RangeError('Invalid Gregorian date in authoritative game_state')
  }
  return year + '-' + digits(month) + '-' + digits(day)
}

/** Matches get_current_game_date_parts for the fields the original RPC exposes. */
export function gameDatePartsFromState(gameState) {
  const date = gameDateFromState(gameState)
  if (date === null) return null
  return Object.freeze({
    current_game_date: date,
    season_number: gameState.season_number,
    month_number: gameState.month_number,
    day_number: gameState.day_number,
  })
}

/**
 * A world-stage *fixture listing*, NOT a player's accepted upcoming schedule.
 * Returns no fabricated race date, start time, acceptance, result or game clock.
 */
export function projectFixtureStageListing(rows) {
  if (!Array.isArray(rows)) throw new TypeError('Expected stage-calendar rows')
  const seen = new Set()
  return Object.freeze(rows.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new TypeError('Invalid stage-calendar row')
    }
    const stageId = requiredInteger(row, 'stage_id', 1, 2147483647)
    if (seen.has(stageId)) throw new Error('Duplicate stage identifier')
    seen.add(stageId)
    const season = requiredInteger(row, 'season_no', 1, 8000)
    const stageNo = requiredInteger(row, 'stage_no', 1, 2147483647)
    const seasonDay = requiredInteger(row, 'season_day', 1, 366)
    const distanceM = requiredInteger(row, 'distance_m', 1, 2147483647)
    if (typeof row.label !== 'string' || !row.label.trim()) throw new TypeError('Missing stage label')
    return Object.freeze({ stageId, season, stageNo, seasonDay, label: row.label, distanceM })
  }).sort((a, b) => a.season - b.season || a.seasonDay - b.seasonDay || a.stageNo - b.stageNo))
}

/**
 * The original Overview's accepted-race cards require an authoritative clock,
 * accepted race/team entries and the original result/publication contracts.
 * Do not turn a shared stage list into a manager-specific race schedule.
 */
export function overviewScheduleGate({ gameState, acceptedTeamEntriesVerified = false } = {}) {
  if (gameState == null) return Object.freeze({ ready: false, reason: 'missing_authoritative_game_state' })
  gameDateFromState(gameState)
  if (acceptedTeamEntriesVerified !== true) {
    return Object.freeze({ ready: false, reason: 'missing_verified_accepted_team_entries' })
  }
  return Object.freeze({ ready: false, reason: 'overview_schedule_response_contract_not_reviewed' })
}
