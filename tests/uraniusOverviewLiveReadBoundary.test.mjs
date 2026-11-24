import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const source = readFileSync(new URL('../scripts/verify-uranius-overview-live.mjs',import.meta.url),'utf8')
const launcher = readFileSync(new URL('../scripts/run-overview-live-read-windows.ps1',import.meta.url),'utf8')
test('live A/B runner uses only real confirmed manager Auth and direct private reader',()=>{
  assert.match(source,/openVerifiedManager\(slot,publishable,managerPassword\)/)
  assert.match(source,/for \(const slot of \['a','b'\]\)/)
  assert.match(source,/subjects\.has\(verified\.id\)/)
  assert.match(source,/PGUSER:'uranius_smoke_reader'/)
  assert.match(source,/assertSandboxTarget\('read'/)
  assert.match(source,/PGSSLMODE:'verify-full'/)
  assert.match(source,/PGSSLROOTCERT:ca/)
  assert.match(source,/projectOverviewScheduleResponse\(json,\{ownerVerified:true\}\)/)
})
test('the trusted server binds verified subject to fixed read-only SQL',()=>{
  assert.match(source,/hosted-overview-schedule-read_REVIEW_ONLY\.sql/)
  assert.match(source,/\\\\set verified_subject/)
  assert.match(source,/input:sql\(verifiedSubject\)/)
  assert.match(source,/if \(!uuid\.test\(verifiedSubject\)\)/)
  assert.doesNotMatch(source,/\bINSERT\s+INTO\b|\bUPDATE\s+uranius_game\b|\bALTER\s+TABLE\b/)
  assert.doesNotMatch(source,/uranius_migrator|PGUSER:'postgres'/)
})
test('Windows launcher contains no plaintext secrets, direct SQL or production references',()=>{
  assert.match(launcher,/verify-uranius-overview-live\.mjs/)
  assert.match(launcher,/--verify-live-overview-read-only/)
  assert.match(launcher,/Resolve-Path -LiteralPath \$CaFile/)
  assert.match(launcher,/Env:URANIUS_PSQL_PATH/)
  assert.doesNotMatch(launcher,/ALTER\s+ROLE|PGPASSWORD|service_role|okuravitxocyevkexfgi/)
})
test('missing explicit live approval mode exits without connecting',()=>{
  const file=fileURLToPath(new URL('../scripts/verify-uranius-overview-live.mjs',import.meta.url))
  const p=spawnSync(process.execPath,[file],{encoding:'utf8',timeout:15000,env:{
    PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||''
  }})
  assert.notEqual(p.status,0)
  assert.match(p.stderr,/Live Overview read-only verification stopped/)
})
