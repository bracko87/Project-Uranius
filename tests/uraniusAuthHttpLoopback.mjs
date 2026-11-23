import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const id = '43211310-eda9-49e0-a0ea-ee6b79f802ed'
const fixture = 'offline-P\u00e4ss-\u6f22-\u{1f9ea}'
let utf8PasswordPreserved = false
const server = createServer(async (request, response) => {
  if (request.url === '/encoding') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    utf8PasswordPreserved = body.password === fixture && request.headers['content-type'] === 'application/json; charset=utf-8'
    response.end('{}')
    return
  }
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
    "$payload = ConvertTo-Json -Compress @{password='" + fixture + "'}",
    "Invoke-RestMethod -Method Post -ContentType 'application/json; charset=utf-8' " +
      "-Body ([Text.Encoding]::UTF8.GetBytes($payload)) -Uri 'http://127.0.0.1:" + port + "/encoding' | Out-Null",
  ].join('\n')
  const encoded = Buffer.from(command, 'utf16le').toString('base64')
  const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), timeout: 15000,
  })
  assert.match(stdout, /HTTP 400, invalid credentials, request ID 43211310/)
  assert.match(stdout, /HTTP 555, gateway failure, request ID 43211310/)
  assert.doesNotMatch(stdout, /fixture-body/)
  assert.ok(utf8PasswordPreserved)
  console.log('Native PowerShell 5.1 HTTP diagnostics passed on loopback.')
} finally {
  server.close()
}
