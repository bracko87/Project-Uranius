import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const id = '43211310-eda9-49e0-a0ea-ee6b79f802ed'
const server = createServer((request, response) => {
  response.writeHead(Number(request.url.slice(1)), {
    'Content-Type': 'application/json',
    'sb-request-id': id,
  })
  response.end(JSON.stringify({ error_code: 'invalid_credentials', msg: 'fixture-body-must-not-print' }))
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
try {
  const port = server.address().port
  const command = [
    '. ./scripts/UraniusSyntheticManagerAuth.ps1',
    "foreach ($status in 400,555) { try { Invoke-RestMethod -ErrorAction Stop ('http://127.0.0.1:" +
    port + "/'+$status) } catch { (Get-UraniusAuthFailure $_).Diagnostic } }",
  ].join('\n')
  const encoded = Buffer.from(command, 'utf16le').toString('base64')
  const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), timeout: 15000,
  })
  assert.match(stdout, /HTTP 400, invalid credentials, request ID 43211310/)
  assert.match(stdout, /HTTP 555, gateway failure, request ID 43211310/)
  assert.doesNotMatch(stdout, /fixture-body/)
  console.log('Native PowerShell 5.1 HTTP diagnostics passed on loopback.')
} finally {
  server.close()
}
