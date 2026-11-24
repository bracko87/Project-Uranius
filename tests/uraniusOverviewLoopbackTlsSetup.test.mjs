import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
const setup=readFileSync(new URL('../scripts/setup-uranius-loopback-tls-windows.ps1',import.meta.url),'utf8')
const runner=readFileSync(new URL('../scripts/run-approved-overview-https-windows.ps1',import.meta.url),'utf8')
test('loopback setup creates a short-lived IP-only certificate entirely outside the repository',()=>{
 assert.match(setup,/Join-Path \$env:LOCALAPPDATA 'Uranius\\loopback-tls'/)
 assert.match(setup,/genrsa -out \$key 3072/)
 assert.match(setup,/req -new -x509 -sha256 -days 2/)
 assert.match(setup,/subjectAltName=IP:127\.0\.0\.1/)
 assert.match(setup,/basicConstraints=critical,CA:FALSE/)
 assert.match(setup,/extendedKeyUsage=serverAuth/)
 assert.match(setup,/icacls\.exe \$key \/inheritance:r/)
 assert.doesNotMatch(setup,/\.git[\\/] |git add|Copy-Item.*repository/)
})
test('browser trust is only opt-in and removable for exact fingerprint',()=>{
 assert.match(setup,/\[switch\]\$TrustForCurrentUser/)
 assert.match(setup,/\[switch\]\$RemoveTrust/)
 assert.match(setup,/if \(\$TrustForCurrentUser\)/)
 assert.match(setup,/if \(\$RemoveTrust\)/)
 assert.match(setup,/FindByThumbprint,\$fingerprint/)
 assert.match(setup,/New-Object System\.Security\.Cryptography\.X509Certificates\.X509Store\('Root','CurrentUser'\)/)
 assert.match(setup,/\$store\.Remove\(\$item\)/)
})
test('existing HTTPS launcher still requires real cert key and restricted reader',()=>{
 assert.match(runner,/\[string\]\$TlsCert/)
 assert.match(runner,/\[string\]\$TlsKey/)
 assert.match(runner,/Test-Path -LiteralPath \$value -PathType Leaf/)
 assert.match(runner,/run-uranius-hosted-smoke\.mjs/)
 assert.match(runner,/URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED = '1'/)
})
