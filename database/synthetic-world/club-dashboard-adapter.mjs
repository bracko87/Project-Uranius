import { randomBytes } from 'node:crypto'
import { projectManagerClock } from './manager-clock-projection.mjs'
import { projectOverviewScheduleResponse } from '../reconstruction/overview/overview-schedule-response.mjs'

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i

export function createClubDashboardAdapter({ verifyLogin, readDashboard, readClock, readSchedule, origin, secureCookie = true }) {
  const sessions = new Map()
  const cookieName = secureCookie ? '__Host-uranius_club_session' : 'uranius_club_session'
  async function revoke(key) {
    const active = sessions.get(key)
    sessions.delete(key)
    await active?.close?.()
  }
  const cookieFlags = '; HttpOnly; SameSite=Strict; Path=/' + (secureCookie ? '; Secure' : '')
  async function handle(req, res) {
    const path = req.url
    if (!['/fixture/login', '/fixture/logout', '/fixture/dashboard', '/fixture/clock', '/fixture/overview-schedule'].includes(path)) return false
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(value))
      return true
    }
    if (req.headers.host !== new URL(origin()).host ||
        (req.headers.origin && req.headers.origin !== origin())) return send(403, { error: 'Forbidden origin' })
    const sessionKey = req.headers.cookie?.split(';').map(cookie => cookie.trim()).find(cookie =>
      cookie.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
    for (const [key, active] of sessions) {
      if (active.expiresAt <= Date.now()) void revoke(key).catch(() => {})
    }
    try {
      if (path === '/fixture/login' && req.method === 'POST') {
        if (req.headers.origin !== origin() ||
            !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) return send(403, { error: 'Forbidden request' })
        const chunks = []
        let length = 0
        for await (const chunk of req) {
          length += chunk.length
          if (length > 4096) return send(413, { error: 'Body too large' })
          chunks.push(chunk)
        }
        const { email, password } = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (typeof email !== 'string' || typeof password !== 'string') return send(400, { error: 'Invalid input' })
        if (sessions.size >= 16 && !sessions.has(sessionKey)) return send(429, { error: 'Too many local sessions' })
        const identity = await verifyLogin(email, password)
        if (!uuid.test(identity?.id ?? '')) return send(401, { error: 'Login rejected' })
        await revoke(sessionKey).catch(() => {})
        const key = randomBytes(32).toString('hex')
        const expiresAt = Math.min(identity.expiresAt ?? Infinity, Date.now() + 15 * 60_000)
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          await identity.close?.()
          return send(401, { error: 'Invalid session lifetime' })
        }
        sessions.set(key, { subject: identity.id, expiresAt, close: identity.close })
        res.setHeader('Set-Cookie', cookieName + '=' + key + cookieFlags)
        return send(200, { ok: true })
      }
      if (path === '/fixture/logout' && req.method === 'POST') {
        if (req.headers.origin !== origin()) return send(403, { error: 'Forbidden request' })
        res.setHeader('Set-Cookie', cookieName + '=' + cookieFlags + '; Max-Age=0')
        await revoke(sessionKey)
        return send(200, { ok: true })
      }
      if (path === '/fixture/dashboard' && req.method === 'GET') {
        const current = sessions.get(sessionKey)
        if (!current) return send(401, { error: 'Sign in required' })
        return send(200, await readDashboard(current.subject))
      }
      if (path === '/fixture/clock' && req.method === 'GET') {
        const current = sessions.get(sessionKey)
        if (!current) return send(401, { error: 'Sign in required' })
        // This server callback is deliberately optional. Until a separately
        // reviewed, RLS-limited clock read is available, never invent a date.
        if (typeof readClock !== 'function') return send(503, { error: 'Game clock read not connected' })
        return send(200, projectManagerClock(await readClock(current.subject)))
      }
      if (path === '/fixture/overview-schedule' && req.method === 'GET') {
        const current = sessions.get(sessionKey)
        if (!current) return send(401, { error: 'Sign in required' })
        // The callback is trusted server code only. It must resolve club scope
        // from this verified Auth subject, not any browser-supplied club ID.
        // No fixture stage calendar may masquerade as an accepted schedule.
        if (typeof readSchedule !== 'function') return send(503, { error: 'Overview schedule not connected' })
        const data = await readSchedule(current.subject)
        return send(200, projectOverviewScheduleResponse(data, { ownerVerified: true }))
      }
      return send(405, { error: 'Method rejected' })
    } catch {
      return send(500, { error: 'Dashboard smoke request failed' })
    }
  }
  handle.close = () => Promise.allSettled([...sessions.keys()].map(revoke))
  return handle
}
