/**
 * Exact first-paint presentation contract from src/pages/dashboard/Overview.tsx
 * normalizeOverviewRaceWorldData and loadOverviewRaceScheduleData.
 *
 * STRICT SERVER BOUNDARY: never infer acceptance from a world calendar.
 * Caller must first prove the RPC's club id was bound from authenticated ownership.
 * This module only projects a verified response, not an authorization oracle.
 */
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const text = (v, fallback = '') => typeof v === 'string' ? v : fallback
const first = (row, keys) => {
  for (const k of keys) if (row[k] !== null && row[k] !== undefined) return row[k]
  return undefined
}

function rows(input, label) {
  if (!Array.isArray(input)) throw new TypeError('Invalid ' + label + ' schedule array')
  if (input.length > 500) throw new RangeError('Schedule response exceeds review limit')
  return input
}

/**
 * The original frontend supports camelCase and snake_case from its RPC.
 * Missing arrays are an error at this boundary rather than a false "no races".
 */
export function projectOverviewScheduleResponse(response, { ownerVerified = false } = {}) {
  if (ownerVerified !== true) throw new Error('Verified club ownership required')
  if (!object(response)) throw new TypeError('Invalid overview schedule result')
  const up = first(response, ['upcomingSchedule', 'upcoming_schedule'])
  const today = first(response, ['todayRaces', 'today_races'])
  const map = (input, label) => Object.freeze(rows(input, label).map((row, index) => {
    if (!object(row)) throw new TypeError('Invalid ' + label + ' race')
    // Preserve the original UI field spellings without generating race dates,
    // entries or external navigation links.
    const title = text(row.title, label === 'upcoming' ? 'Upcoming race' : 'Race')
    const subtitle = text(row.subtitle)
    const countryCode = text(first(row, ['countryCode', 'country_code',
      'raceCountryCode', 'race_country_code', 'country_iso2', 'country']))
    const id = text(row.id, label + ':' + index)
    const href = text(row.href)
    if (href && !/^\/(?!\/)[a-zA-Z0-9/_?=&.%-]*$/.test(href)) {
      throw new Error('Unreviewed schedule navigation')
    }
    return Object.freeze({
      id, title, subtitle, countryCode: countryCode || null,
      ...(label === 'upcoming'
        ? { dateLabel: text(first(row, ['dateLabel', 'date_label'])) }
        : { timeLabel: text(first(row, ['timeLabel', 'time_label'])) }),
      ...(href ? { href } : {}),
    })
  }))
  return Object.freeze({ upcomingSchedule: map(up, 'upcoming'), todayRaces: map(today, 'today') })
}
