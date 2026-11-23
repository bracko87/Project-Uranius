// Offline-only, disposable PostgreSQL 17 MANAGEMENT-WRAPPER rehearsal. No hosted DB or production access.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, delimiter, join, resolve } from 'node:path'
import { createServer } from 'node:net'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
if (args.length !== 3 || args[0] !== '--disposable-native-pg17' || args[1] !== '--postgres-bin') {
  throw new Error('Usage: node tests/uraniusClockReaderManagedPg17.mjs --disposable-native-pg17 --postgres-bin "C:\\path\\to\\postgresql-17.12-portable\\bin"')
}
const root = fileURLToPath(new URL('../', import.meta.url))
const bin = resolve(args[2])
const ext = process.platform === 'win32' ? '.exe' : ''
const exe = Object.fromEntries(['initdb','pg_ctl','psql'].map(n => [n, join(bin, n + ext)]))
for (const file of Object.values(exe)) if (!existsSync(file)) throw new Error('Missing PostgreSQL binary: ' + file)
const env = { PATH: bin + delimiter + (process.env.PATH || ''), SYSTEMROOT: process.env.SYSTEMROOT || '', WINDIR: process.env.WINDIR || '', TEMP: process.env.TEMP || tmpdir(), TMP: process.env.TMP || tmpdir() }
function run(file, argv, options = {}) {
  const r = spawnSync(file, argv, {
    env: options.env || env, input: options.input, stdio: options.stdio,
    encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 4e6,
  })
  if (r.error) throw r.error
  if (options.reject) { assert.notEqual(r.status, 0, 'Expected a denial but the command succeeded'); return }
  if (r.status !== 0) throw new Error(basename(file) + ' failed: ' + (r.stderr || r.stdout || 'Unknown error').slice(0, 1600))
  return (r.stdout || '').trim()
}
for (const file of Object.values(exe)) assert.match(run(file, ['--version']), /\b17\.\d+/)
const baseManifest = JSON.parse(readFileSync(join(root, 'database/reconstruction/smoke/manifest.json')))
const proposal = JSON.parse(readFileSync(join(root, 'database/reconstruction/clock/manifest.json')))
assert.equal(proposal.status, 'REVIEW_ONLY_NOT_AUTHORIZED')
assert.equal(proposal.projectRef, 'sdtsivgtcaoaeoihcwzd')
const files = new Map([
 ['001_identity.sql', 'database/preparation/001_identity.sql'],
 ['002_reference_schema.sql', 'database/preparation/002_reference_schema.sql'],
 ['003_access.sql', 'database/preparation/003_access.sql'],
 ['004_synthetic_reference.sql', 'database/preparation/004_synthetic_reference.sql'],
 ['005_club_identity.sql', 'database/reconstruction/005_club_identity.sql'],
 ['006_synthetic_world.sql', 'database/reconstruction/world/006_synthetic_world.sql'],
 ['007_smoke_reader.sql', 'database/reconstruction/smoke/007_smoke_reader.sql'],
])
const revisions = [...baseManifest.requires, ...baseManifest.migrations]
assert.equal(revisions.length, 7)
assert.deepEqual(proposal.requires, revisions)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
for (const item of revisions) {
  assert.ok(files.has(item.file))
  assert.equal(hash(readFileSync(join(root, files.get(item.file)))), item.sha256, 'Source checksum drift: ' + item.file)
}
const clock = readFileSync(join(root, 'database/reconstruction/clock/008_game_clock_v1.sql'), 'utf8')
assert.equal(hash(clock), proposal.candidate.sha256)
const management = readFileSync(join(root, 'database/reconstruction/clock/008_management_REVIEW_ONLY.sql'), 'utf8')
assert.equal(hash(management), proposal.managementWrapper.sha256)
assert.equal(proposal.managementWrapper.status, 'OWNER_REPORTED_NATIVE_PASS_12_OF_12_REVIEW_ONLY')
const readerManifest = JSON.parse(readFileSync(join(root, 'database/reconstruction/clock/009_clock_reader_manifest.json'), 'utf8'))
const readerSql = readFileSync(join(root, 'database/reconstruction/clock/009_clock_smoke_reader_REVIEW_ONLY.sql'), 'utf8')
const readerWrapper = readFileSync(join(root, 'database/reconstruction/clock/009_management_REVIEW_ONLY.sql'), 'utf8')
assert.equal(readerManifest.status, 'REVIEW_ONLY_NOT_APPROVED')
assert.equal(readerManifest.hostedApplied, false)
assert.equal(readerManifest.projectRef, 'sdtsivgtcaoaeoihcwzd')
assert.equal(hash(readerSql), readerManifest.candidate.sha256)
assert.equal(hash(readerWrapper), readerManifest.managementWrapper.sha256)
assert.equal(readerManifest.managementWrapper.status, 'OWNER_REPORTED_NATIVE_PASS_13_OF_13_REVIEW_ONLY')

// A fresh, isolated PGDATA under the user's temp directory; the server binds 127.0.0.1 only.
const scratch = mkdtempSync(join(tmpdir(), 'uranius-009-managed-disposable-'))
const data = join(scratch, 'data')
const listener = createServer()
await new Promise((yes, no) => listener.once('error', no).listen(0, '127.0.0.1', yes))
const port = listener.address().port
await new Promise(yes => listener.close(yes))
const dbEnv = { ...env, PGHOST: '127.0.0.1', PGHOSTADDR: '127.0.0.1', PGPORT: String(port), PGDATABASE: 'postgres', PGSSLMODE: 'disable', PGCONNECT_TIMEOUT: '5', PGOPTIONS: '-c statement_timeout=10000' }
function sql(query, user = 'uranius_migrator', reject = false) {
  const output = run(exe.psql, ['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-f','-'], { env: dbEnv, input: query, reject })
  return reject ? undefined : output.split(/\r?\n/).at(-1)
}
const project = 'sdtsivgtcaoaeoihcwzd'
const wrap = query => 'BEGIN;\nSELECT set_config(\'uranius.approved_project_ref\',\'' + project + '\',true);\n' + query + '\nCOMMIT;'
const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002'
const snapshot = () => sql("SELECT (SELECT count(*) FROM uranius_private.migration_ledger)::text || ':' || (SELECT count(*) FROM uranius_catalog.team_owners)::text || ':' || (SELECT count(*) FROM uranius_catalog.riders)::text || ':' || (SELECT count(*) FROM uranius_game.stage_calendar)::text || ':' || (to_regclass('uranius_game.game_state') IS NOT NULL)::text;")
let startAttempted = false, started = false, tests = 0
const pass = label => { tests++; console.log('PASS ' + label) }
try {
  console.log('INFO Initializing an isolated PostgreSQL 17 fixture in a new temporary directory')
  run(exe.initdb, ['-D',data,'-U','uranius_fixture_admin','-A','trust','--no-locale','--no-sync','-E','UTF8'])
  console.log('INFO Disposable initdb completed')
  startAttempted = true
  // pg_ctl starts a detached server. On Windows the child can inherit a
  // piped stdout/stderr handle and keep spawnSync blocked until timeout.
  // Use ignored stdio; collect server diagnostic text from postgres.log.
  try {
    run(exe.pg_ctl, ['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p ' + port + ' -c fsync=off','-w','start'], { stdio: 'ignore' })
  } catch (error) {
    let serverLog = ''
    try { serverLog = readFileSync(join(scratch, 'postgres.log'), 'utf8').slice(-1800) }
    catch { /* No log exists if pg_ctl could not launch postgres. */ }
    throw new Error('Disposable pg_ctl start failed: ' + error.message + (serverLog ? '\nServer log: ' + serverLog : ''))
  }
  started = true
  console.log('INFO Disposable PostgreSQL started on loopback')
  sql('CREATE ROLE uranius_migrator LOGIN NOINHERIT; CREATE ROLE postgres LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE uranius_smoke_reader LOGIN NOINHERIT; GRANT CONNECT,CREATE ON DATABASE postgres TO uranius_migrator; GRANT uranius_migrator TO postgres WITH ADMIN TRUE, INHERIT FALSE, SET FALSE;', 'uranius_fixture_admin')
  for (const entry of revisions) {
    const ddl = readFileSync(join(root, files.get(entry.file)), 'utf8')
    try {
      sql(wrap(ddl + "\nINSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('" + entry.file + "','" + entry.sha256 + "');"))
    } catch (error) {
      throw new Error('Disposable migration ' + entry.file + ' failed: ' + error.message)
    }
    console.log('INFO Disposable migration ' + entry.file + ' applied')
  }
  pass('Seven canonical migrations replayed in isolated native PostgreSQL 17')
  sql(wrap("SELECT uranius_private.bind_synthetic_managers('" + a + "'::uuid,'" + b + "'::uuid);"))
  assert.equal(snapshot(), '7:2:200:3:false')
  pass('Synthetic club owners, 200 riders and 3 stages preserved')
  sql(management, 'postgres')
  assert.equal(snapshot(), '8:2:200:3:true')
  assert.equal(sql("SELECT season_number::text||':'||month_number||':'||day_number||':'||is_paused::text FROM uranius_game.game_state;"), '1:1:1:true')
  pass('Native-tested management wrapper 008 reapplied only in disposable fixture')

  const membership = () => sql("SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.oid)::text,'[]') FROM pg_auth_members m WHERE m.roleid='uranius_migrator'::regrole;", 'uranius_fixture_admin')
  const beforeMembers = membership()
  const roleState = () => sql("SELECT pg_has_role('postgres','uranius_migrator','SET')::text||':'||pg_has_role('postgres','uranius_migrator','USAGE')::text;", 'uranius_fixture_admin')
  const clockPolicy = () => sql("SELECT roles::text FROM pg_policies WHERE schemaname='uranius_game' AND tablename='game_state' AND policyname='game_state_manager_read'", 'uranius_fixture_admin')
  const readerSelect = () => sql("SELECT has_any_column_privilege('uranius_smoke_reader','uranius_game.game_state','SELECT')::text;", 'uranius_fixture_admin')
  const ledger009 = () => sql("SELECT count(*)::text FROM uranius_private.migration_ledger WHERE version='009_clock_smoke_reader.sql';")
  const baseline = () => {
    assert.equal(snapshot(), '8:2:200:3:true')
    assert.equal(membership(), beforeMembers)
    assert.equal(roleState(), 'false:false')
    assert.equal(clockPolicy(), '{authenticated}')
    assert.equal(readerSelect(), 'false')
    assert.equal(ledger009(), '0')
  }
  baseline()
  sql('SET ROLE uranius_migrator;', 'postgres', true)
  pass('Existing non-superuser postgres cannot SET migrator before temporary grant')

  sql(readerWrapper, 'uranius_fixture_admin', true)
  baseline()
  pass('Wrong management execution role refused without changes')

  sql(wrap("UPDATE uranius_private.project_identity SET project_ref='xxxxxxxxxxxxxxxxxxxx';"))
  sql(readerWrapper, 'postgres', true)
  sql(wrap("UPDATE uranius_private.project_identity SET project_ref='" + project + "';"))
  baseline()
  pass('Wrong isolated project rejected without privilege leakage')

  sql(wrap("UPDATE uranius_private.migration_ledger SET sha256=repeat('0',64) WHERE version='008_game_clock_v1.sql';"))
  sql(readerWrapper, 'postgres', true)
  sql(wrap("UPDATE uranius_private.migration_ledger SET sha256='" + proposal.candidate.sha256 + "' WHERE version='008_game_clock_v1.sql';"))
  baseline()
  pass('Historical migration digest drift rejected and restored')

  const grantAnchor = "  PERFORM set_config('role','uranius_migrator',true);"
  assert.equal(readerWrapper.split(grantAnchor).length, 2)
  sql(readerWrapper.replace(grantAnchor, "  RAISE EXCEPTION 'inject after temporary membership grant';\n" + grantAnchor), 'postgres', true)
  baseline()
  pass('Failure after temporary grant rolls back membership')

  const ledgerAnchor = "  INSERT INTO uranius_private.migration_ledger(version,sha256)"
  assert.equal(readerWrapper.split(ledgerAnchor).length, 2)
  sql(readerWrapper.replace(ledgerAnchor, "  RAISE EXCEPTION 'inject after 009 ACL/RLS changes';\n" + ledgerAnchor), 'postgres', true)
  baseline()
  pass('Failure after clock grant and policy change rolls back ACL, ledger and membership')

  sql(readerWrapper, 'postgres')
  assert.equal(snapshot(), '9:2:200:3:true')
  assert.equal(membership(), beforeMembers)
  assert.equal(roleState(), 'false:false')
  assert.equal(ledger009(), '1')
  assert.equal(sql("SELECT sha256 FROM uranius_private.migration_ledger WHERE version='009_clock_smoke_reader.sql';"), readerManifest.candidate.sha256)
  assert.equal(readerSelect(), 'true')
  assert.equal(clockPolicy(), '{authenticated,uranius_smoke_reader}')
  pass('009 atomic management wrapper installs only in disposable fixture and restores exact membership')

  const readFor = (subject, expression) => sql("BEGIN READ ONLY;\nSELECT set_config('request.jwt.claims','" +
    JSON.stringify({ sub: subject }) + "',true);\nSELECT " + expression + ";\nROLLBACK;", 'uranius_smoke_reader')
  for (const subject of [a, b]) {
    assert.equal(readFor(subject, "row_to_json(c)::text FROM (SELECT season_number,month_number,day_number,is_paused FROM uranius_game.game_state LIMIT 1) c"),
      '{"season_number":1,"month_number":1,"day_number":1,"is_paused":true}')
  }
  assert.equal(readFor('00000000-0000-4000-8000-000000000003',
    "coalesce((SELECT season_number::text FROM uranius_game.game_state),'denied')"), 'denied')
  pass('Restricted reader sees clock for two managers, not for unknown subject')

  sql('BEGIN; SET LOCAL ROLE anon; SELECT season_number FROM uranius_game.game_state; ROLLBACK;', 'uranius_fixture_admin', true)
  sql('UPDATE uranius_game.game_state SET day_number=2;', 'uranius_smoke_reader', true)
  assert.equal(sql("SELECT has_table_privilege('uranius_smoke_reader','uranius_game.game_state','SELECT')::text;", 'uranius_fixture_admin'), 'false')
  assert.equal(sql("SELECT has_column_privilege('uranius_smoke_reader','uranius_game.game_state','id','SELECT')::text;", 'uranius_fixture_admin'), 'false')
  assert.equal(sql("SELECT has_any_column_privilege('anon','uranius_game.game_state','SELECT')::text;", 'uranius_fixture_admin'), 'false')
  pass('Anonymous access, reader writes, full table and singleton id denied')

  sql(readerWrapper, 'postgres', true)
  assert.equal(snapshot(), '9:2:200:3:true')
  assert.equal(membership(), beforeMembers)
  assert.equal(roleState(), 'false:false')
  pass('Duplicate 009 management wrapper rejected with restored membership')
  console.log('PASS ' + tests + ' disposable native PostgreSQL 17 management-wrapper checks; hosted 009 remains untouched')
} finally {
  // Windows may hold PGDATA files briefly after a failed initdb/pg_ctl or after
  // PostgreSQL has stopped. Cleanup must NEVER replace the original failure.
  // A failed pg_ctl start may still have launched a postmaster: check status
  // even when the start command did not return successfully.
  let safeToRemove = !startAttempted
  if (startAttempted) {
    try {
      const status = spawnSync(exe.pg_ctl, ['-D', data, 'status'], {
        env, encoding: 'utf8', timeout: 5000, windowsHide: true,
      })
      if (status.error) {
        console.error('WARNING Could not inspect disposable PostgreSQL status: ' + status.error.message)
      } else if (status.status === 0 || started) {
        try {
          run(exe.pg_ctl, ['-D', data, '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore' })
          safeToRemove = true
        } catch (error) {
          console.error('WARNING Disposable PostgreSQL shutdown failed: ' + error.message)
        }
      } else if (status.status === 3 || status.status === 4) {
        // pg_ctl 3/4 means the managed server is not running or PGDATA is invalid.
        safeToRemove = true
      } else {
        console.error('WARNING Unexpected PostgreSQL status code: ' + status.status)
      }
    } catch (error) {
      console.error('WARNING Disposable PostgreSQL status/stop check failed: ' + error.message)
    }
  }
  if (safeToRemove) {
    try {
      // Node retries EBUSY/EPERM/ENOTEMPTY for recursive removal on Windows.
      rmSync(scratch, { recursive: true, force: true, maxRetries: 12, retryDelay: 500 })
      console.log('INFO Disposable PostgreSQL files cleaned up')
    } catch (error) {
      // Preserve the actual SQL/initdb failure that caused this finally clause.
      console.error('WARNING Temporary PostgreSQL files could not yet be removed: ' + error.message)
      console.error('WARNING Review the stopped disposable fixture folder later: ' + scratch)
      process.exitCode = 1
    }
  } else {
    console.error('WARNING Cannot prove disposable PostgreSQL is stopped; retained fixture: ' + scratch)
    process.exitCode = 1
  }
}
