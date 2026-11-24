// One-time direct, read-only hosted Uranius Overview A/B verification.
// No local HTTPS certificate or frontend server needed. No SQL data/schema writes.
// Supabase Auth naturally creates/revokes short-lived login sessions. Credentials
// are prompted privately; UUIDs are sent only into the fixed server-side SQL bind.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { openVerifiedManager, privatePrompt } from './verify-uranius-auth.mjs'
import { assertSandboxTarget } from './assert-sandbox-target.mjs'
import { runPsqlBatch } from './run-uranius-psql-batch.mjs'
import { projectOverviewScheduleResponse } from '../database/reconstruction/overview/overview-schedule-response.mjs'

const ref = 'sdtsivgtcaoaeoihcwzd'
const host = 'db.' + ref + '.supabase.co'
const root = new URL('../', import.meta.url)
const query = readFileSync(new URL('database/synthetic-world/hosted-overview-schedule-read_REVIEW_ONLY.sql', root),'utf8')
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const sql = (verifiedSubject) => {
  if (!uuid.test(verifiedSubject)) throw new Error('Invalid verified manager identity')
  return '\\set verified_subject ' + verifiedSubject + '\n' + query
}
function readSchedule(verifiedSubject, environment, executable) {
  const output = runPsqlBatch({
    executable,env:environment,
    input:sql(verifiedSubject),timeout:15000,
    stage:'Uranius restricted read-only Overview verification',
    extraArgs:['--tuples-only','--no-align'],
  })
  const json = JSON.parse(output.trim().split(/\r?\n/).at(-1))
  return projectOverviewScheduleResponse(json,{ownerVerified:true})
}
async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--verify-live-overview-read-only' ||
      !process.stdin.isTTY || !process.stderr.isTTY || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('Run in a private interactive terminal with the explicit read-only mode and TLS verification.')
  }
  const ca = process.env.URANIUS_DATABASE_CA_FILE
  const psql = process.env.URANIUS_PSQL_PATH
  if (!ca || !psql) throw new Error('A trusted Uranius database CA and PostgreSQL 17 psql executable are required.')
  const password = await privatePrompt('Dedicated Uranius smoke-reader database password')
  const publishable = (await privatePrompt('Uranius publishable API key')).trim()
  if (!password || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishable)) {
    throw new Error('Restricted reader password and project publishable key are required.')
  }
  const dsn = 'postgresql://uranius_smoke_reader:' + encodeURIComponent(password) +
    '@' + host + ':5432/postgres?sslmode=verify-full'
  assertSandboxTarget('read',{
    URANIUS_SUPABASE_PROJECT_REF:ref,
    URANIUS_SUPABASE_URL:'https://'+ref+'.supabase.co',
    URANIUS_DATABASE_URL:dsn,
  })
  const platform = new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'])
  const child = Object.fromEntries(Object.entries(process.env).filter(([name])=>platform.has(name.toUpperCase())))
  Object.assign(child,{
    PGHOST:host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'uranius_smoke_reader',
    PGPASSWORD:password,PGSSLMODE:'verify-full',PGGSSENCMODE:'disable',
    PGSSLROOTCERT:ca,PGCONNECT_TIMEOUT:'7',
    PGOPTIONS:'-c statement_timeout=10000 -c lock_timeout=2000',
  })
  const subjects = new Set()
  for (const slot of ['a','b']) {
    const managerPassword = await privatePrompt('Manager '+slot.toUpperCase()+' existing Auth password')
    const verified = await openVerifiedManager(slot,publishable,managerPassword)
    try {
      if (subjects.has(verified.id)) throw new Error('Manager A/B identities unexpectedly identical.')
      subjects.add(verified.id)
      const schedule = readSchedule(verified.id,child,psql)
      console.log('PASS Manager '+slot.toUpperCase()+
        ' live Auth identity, owner-scoped restricted PostgreSQL read, validated Overview JSON.'+
        ' upcoming='+schedule.upcomingSchedule.length+' today='+schedule.todayRaces.length)
    } finally {
      await verified.close().catch(() => console.error('Warning: upstream Auth logout not confirmed.'))
    }
  }
  if (subjects.size !== 2) throw new Error('Both distinct verified manager sessions required.')
  console.log('PASS Both hosted Uranius managers verified; no race rows were inserted or altered.')
  console.log('NOTE An empty shared race catalog cannot prove populated cross-manager row isolation.')
}
try {
  await main()
} catch (error) {
  // Database/credential error details must never echo a connection string or token.
  const message=error instanceof Error ? error.message : ''
  const safe=message.startsWith('Uranius Auth ') ? message
    : message.startsWith('Uranius restricted read-only Overview verification') ? message
    : 'Live Overview read-only verification stopped. Check local configuration and credentials.'
  console.error(safe)
  process.exitCode=1
}
