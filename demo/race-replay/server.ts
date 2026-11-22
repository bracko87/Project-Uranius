import { compareAttacks, type AttackComparison } from './attackComparison'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { RaceAuthority } from '../../src/race-engine/hybrid/raceAuthority'
import { syntheticTenRiderStage } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'

export function createDemoAuthority() {
  return new RaceAuthority(syntheticTenRiderStage, { 'synthetic-team-a': 'manager-a', 'synthetic-team-b': 'manager-b' })
}

export async function serveDemo() {
  const race = createDemoAuthority()
  const comparisons = new Map<string, AttackComparison>()
  const assets = new Map(await Promise.all([
    ['/', 'index.html', 'text/html; charset=utf-8'],
    ['/replay.css', 'replay.css', 'text/css; charset=utf-8'],
    ['/replay.js', 'replay.js', 'text/javascript; charset=utf-8'],
    ['/comparison', 'comparison.html', 'text/html; charset=utf-8'],
    ['/comparison.js', 'comparison.js', 'text/javascript; charset=utf-8'],
  ].map(async ([url, file, type]) => [url, { type, content: await readFile(fileURLToPath(new URL(file, import.meta.url))) }] as const)))
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'")
    const at = server.address()
    const host = at && typeof at === 'object' ? '127.0.0.1:' + at.port : ''
    const route = request.url?.split('?')[0] ?? ''
    const json = (status: number, data: unknown) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify(data))
    }
    if (request.headers.host !== host) return json(403, { reason: 'host' })
    const asset = assets.get(route)
    if (request.method === 'GET' && asset) {
      response.writeHead(200, { 'Content-Type': asset.type })
      return response.end(asset.content)
    }
    if (request.method === 'GET' && route === '/api/attack-comparison') {
      const scenario = new URLSearchParams(request.url?.split('?')[1]).get('case')
      if (scenario !== 'strong' && scenario !== 'caught') return json(400, { reason: 'scenario' })
      try {
        const comparison = comparisons.get(scenario) ?? compareAttacks(scenario)
        comparisons.set(scenario, comparison)
        return json(200, comparison)
      } catch {
        return json(500, { reason: 'comparison failed' })
      }
    }
    if (request.method === 'GET' && route === '/api/state') {
      const elapsed = race.elapsed()
      const final = elapsed.completed ? race.finalize() : null
      return json(200, { ...elapsed, ...(final ? { final } : {}) })
    }
    if (request.method === 'POST' && request.headers.origin === 'http:' + '//' + host) {
      if (route === '/api/advance' || route === '/api/complete') {
        const elapsed = race.elapsed()
        const tick = elapsed.raceSecond / syntheticTenRiderStage.settings.tickSeconds
        race.advanceTo(route === '/api/complete' ? 1000 : tick + 1)
        return json(200, { ok: true })
      }
      if (route === '/api/command') {
        let body = ''
        try {
          for await (const chunk of request) {
            body += chunk
            if (body.length > 8192) throw Error('body limit')
          }
          const input = JSON.parse(body)
          if (input.owner !== 'manager-a' && input.owner !== 'manager-b') return json(403, { reason: 'owner' })
          return json(200, race.submit(input.owner, input.command))
        } catch {
          return json(400, { reason: 'invalid' })
        }
      }
    }
    return json(404, { reason: 'route' })
  })
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (address && typeof address === 'object') console.log('Uranius replay demo at http:' + '//127.0.0.1:' + address.port)
  })
}
