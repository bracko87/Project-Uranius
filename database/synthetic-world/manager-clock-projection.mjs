import { gameDateFromState } from '../reconstruction/overview/game-clock-contract.mjs'

/**
 * Server-side projection of an authoritative clock row.
 * Strictly read-only; does not accept client dates, tenant IDs or a wall-clock fallback.
 */
export function projectManagerClock(row) {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    throw new TypeError('Missing authoritative Uranius game clock')
  }
  if (typeof row.is_paused !== 'boolean') {
    throw new TypeError('Invalid authoritative clock pause flag')
  }
  const current_game_date = gameDateFromState(row)
  return Object.freeze({
    current_game_date,
    season_number: row.season_number,
    month_number: row.month_number,
    day_number: row.day_number,
    is_paused: row.is_paused,
  })
}
