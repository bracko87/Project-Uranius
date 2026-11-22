import { cp, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const project = fileURLToPath(new URL('../', import.meta.url))
const output = await mkdtemp(join(tmpdir(), 'uranius-replay-'))
const source = join(project, 'demo', 'race-replay')
await Promise.all([
  cp(join(source, 'index.html'), join(output, 'index.html')),
  cp(join(source, 'comparison.html'), join(output, 'comparison.html')),
  cp(join(source, 'replay.css'), join(output, 'replay.css')),
  build({ entryPoints: [join(source, 'main.ts')], outfile: join(output, 'replay.js'), bundle: true, platform: 'browser' }),
  build({ entryPoints: [join(source, 'comparison.ts')], outfile: join(output, 'comparison.js'), bundle: true, platform: 'browser' }),
  build({ entryPoints: [join(source, 'server.ts')], outfile: join(output, 'server.mjs'), bundle: true, platform: 'node', format: 'esm' }),
])
const { serveDemo } = await import(pathToFileURL(join(output, 'server.mjs')).href)
await serveDemo()
