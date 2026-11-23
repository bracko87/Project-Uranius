import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../../', import.meta.url))
const here = fileURLToPath(new URL('./', import.meta.url))
const bundle = await build({
  absWorkingDir: root,
  entryPoints: [join(here, 'login-smoke-client.tsx')],
  bundle: true, write: false, platform: 'browser',
  plugins: [{ name: 'local-only-auth', setup(api) {
    api.onResolve({ filter: /(?:lib\/supabase|^\.\/supabase)$/ }, () => ({
      path: join(here, 'login-smoke-supabase.ts'),
    }))
  } }],
})
const server = createServer((request, response) => {
  if (request.url === '/smoke.js') {
    response.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    response.end(bundle.outputFiles[0].contents)
  } else {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'")
    response.end('<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/smoke.js"></script>')
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
try {
  const chrome = process.env.URANIUS_CHROME ?? join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe')
  for (const manager of ['a', 'b']) {
    const { stdout } = await promisify(execFile)(chrome, [
      '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update',
      '--disable-sync', '--no-first-run', '--no-proxy-server',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      '--incognito', '--dump-dom', '--virtual-time-budget=5000',
      'http://127.0.0.1:' + server.address().port + '/?manager=' + manager,
    ], { windowsHide: true, timeout: 20000 })
    assert.ok(stdout.includes('data-smoke="passed-' + manager + '"'), 'Fixture login failed for manager ' + manager)
  }
  console.log('Existing Login route and club-context dashboard passed for both isolated browser fixtures.')
} finally {
  server.close()
}
