import { randomBytes } from 'node:crypto'

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const cookieName = 'uranius_club_session'

export function createClubDashboardAdapter({ verifyLogin, readDashboard, origin, secureCookie = true }) {
  const sessions = new Map()
  const cookieFlags = '; HttpOnly; SameSite=Strict; Path=/' + (secureCookie ? '; Secure' : '')
  return async function handle(req, res) {
    const path = req.url
    if (!['/fixture/login', '/fixture/logout', '/fixture/dashboard'].includes(path)) return false
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(value))
      return true
    }
    if (req.headers.host !== new URL(origin()).host ||
        (req.headers.origin && req.headers.origin !== origin())) return send(403, { error: 'Forbidden origin' })
    const sessionKey = req.headers.cookie?.match(/(?:^|;\s*)uranius_club_session=([a-f0-9]{64})(?:;|$)/)?.[1]
    const active = sessions.get(sessionKey)
    if (active && active.expiresAt <= Date.now()) sessions.delete(sessionKey)
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
        const identity = await verifyLogin(email, password)
        if (!uuid.test(identity?.id ?? '')) return send(401, { error: 'Login rejected' })
        sessions.delete(sessionKey)
        const key = randomBytes(32).toString('hex')
        sessions.set(key, { subject: identity.id, expiresAt: Date.now() + 15 * 60_000 })
        res.setHeader('Set-Cookie', cookieName + '=' + key + cookieFlags)
        return send(200, { ok: true })
      }
      if (path === '/fixture/logout' && req.method === 'POST') {
        if (req.headers.origin !== origin()) return send(403, { error: 'Forbidden request' })
        sessions.delete(sessionKey)
        res.setHeader('Set-Cookie', cookieName + '=' + cookieFlags + '; Max-Age=0')
        return send(200, { ok: true })
      }
      if (path === '/fixture/dashboard' && req.method === 'GET') {
        const current = sessions.get(sessionKey)
        if (!current) return send(401, { error: 'Sign in required' })
        return send(200, await readDashboard(current.subject))
      }
      return send(405, { error: 'Method rejected' })
    } catch {
      return send(500, { error: 'Dashboard smoke request failed' })
    }
  }
}
