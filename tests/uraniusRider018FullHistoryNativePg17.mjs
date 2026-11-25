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
const replayReview = args[0] === '--participant-replay-review'
const archiveReview = replayReview || args[0] === '--race-persistence-review'
const startlistReview = archiveReview || args[0] === '--startlist-engine-review'
const raceWorldSeed = startlistReview || args[0] === '--race-world-seed-review'
if (raceWorldSeed) args.shift()
if (args.length !== 3 || args[0] !== '--disposable-native-pg17' || args[1] !== '--postgres-bin') {
  throw new Error('Usage: node tests/uraniusRider018FullHistoryNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\\path\\to\\postgresql-17.12-portable\\bin"')
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
const scratch = mkdtempSync(join(tmpdir(), 'uranius-018-full-history-disposable-'))
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

  // REHEARSAL: exact combined candidate except the TLS requirement, which a
  // trusted-local socket cannot meet. The original candidate bytes are never edited.
  const manifest010 = JSON.parse(readFileSync(join(root,
    'database/reconstruction/overview/010_install_manifest_REVIEW_ONLY.json'),'utf8'))
  const candidate010 = readFileSync(join(root,
    'database/reconstruction/overview/010_overview_race_reader_REVIEW_ONLY.sql'),'utf8')
  assert.equal(hash(candidate010), manifest010.candidate.sha256)
  assert.equal(manifest010.projectRef, project)
  assert.equal(manifest010.expectedLedgerEntries, 9)
  assert.equal(manifest010.hostedApplied, false)
  assert.match(candidate010, /OR NOT EXISTS \(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid\(\) AND ssl\)/)
  const localOnly = candidate010.replace(
    /OR NOT EXISTS \(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid\(\) AND ssl\)/,
    "OR false /* offline test-only: local socket is not TLS; original hosted guard remains */")
  assert.notEqual(localOnly,candidate010)
  const ledgerInsert = "INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('" +
    manifest010.candidate.ledgerVersion + "','" + manifest010.candidate.sha256 + "');"
  const counts010 = () => sql("SELECT (SELECT count(*) FROM uranius_private.migration_ledger)::text || ':' || " +
    "(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace " +
    "WHERE n.nspname='uranius_game' AND c.relname IN " +
    "('races','race_stages','race_team_entries','race_preparations'))::text || ':' || " +
    "(SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid " +
    "WHERE c.relnamespace='uranius_game'::regnamespace AND p.polname LIKE 'uranius_%')::text")
  assert.equal(counts010(), '9:0:0')
  sql(wrap(localOnly + "\nDO $fail$ BEGIN RAISE EXCEPTION 'test forced rollback after schema and policies'; END $fail$;"), 'uranius_migrator', true)
  assert.equal(counts010(), '9:0:0')
  pass('Exact combined 010 DDL plus restrictive ACL transaction failure rolls back completely')

  sql(wrap(localOnly + '\n' + ledgerInsert))
  assert.equal(counts010(), '10:4:4')
  assert.equal(sql("SELECT sha256 FROM uranius_private.migration_ledger WHERE version='010_overview_race_reader.sql';"), manifest010.candidate.sha256)
  assert.equal(sql("SELECT count(*) FROM pg_class c WHERE c.relnamespace='uranius_game'::regnamespace " +
    "AND c.relname IN ('races','race_stages','race_team_entries','race_preparations') AND c.relrowsecurity AND c.relforcerowsecurity"),'4')
  assert.equal(snapshot(), '10:2:200:3:true')
  pass('Combined package installs ONLY in disposable database; ten-entry ledger and FORCE RLS correct')

  sql(wrap(localOnly + '\n' + ledgerInsert), 'uranius_migrator', true)
  assert.equal(counts010(), '10:4:4')
  assert.equal(membership(), beforeMembers)
  pass('Duplicate combined migration fails closed with no extra ledger or privilege leakage')

  // Populated race fixtures are strictly disposable. No hosted DML.
  const schedule011 = readFileSync(join(root, 'database/reconstruction/overview/011_overview_schedule_REVIEW_ONLY.sql'),'utf8')
  const raceA = '11111111-1111-4111-8111-111111111111'
  const raceB = '22222222-2222-4222-8222-222222222222'
  const raceWorld = '33333333-3333-4333-8333-333333333333'
  // FORCE RLS deliberately blocks a migrator's fixture INSERTs. Disable FORCE
  // only during disposable seeding, then immediately restore the strict model.
  const toggles = ['races', 'race_stages', 'race_team_entries', 'race_preparations']
  for (const table of toggles) {
    sql('ALTER TABLE uranius_game.' + table + ' NO FORCE ROW LEVEL SECURITY')
  }
  sql("INSERT INTO uranius_game.races(id,name,start_date,end_date) VALUES " +
      "('" + raceA + "','Manager A race','2000-01-01','2000-01-01')," +
      "('" + raceB + "','Manager B race','2000-01-01','2000-01-01')," +
      "('" + raceWorld + "','World race','2000-01-01','2000-01-01')")
  sql("INSERT INTO uranius_game.race_stages(race_id,stage_number,stage_date,start_city,finish_city,distance_km,terrain_type) VALUES " +
      "('" + raceA + "',1,'2000-01-01','Start','Finish',100,'flat')," +
      "('" + raceB + "',1,'2000-01-01','Start','Finish',100,'flat')," +
      "('" + raceWorld + "',1,'2000-01-01','Start','Finish',100,'flat')")
  const clubs = sql("SELECT string_agg(club_id::text,',' ORDER BY team_id) FROM uranius_game.club_profiles WHERE team_id IN (SELECT team_id FROM uranius_catalog.team_owners)").split(',')
  assert.equal(clubs.length, 2)
  for (const [i, race] of [raceA,raceB].entries()) {
    const club = clubs[i]
    sql("INSERT INTO uranius_game.race_team_entries(race_id,club_id,participating_club_id,status) VALUES ('" +
        race + "','" + club + "','" + club + "','accepted')")
    sql("INSERT INTO uranius_game.race_preparations(race_id,club_id,participating_club_id,status,startlist_status) VALUES ('" +
        race + "','" + club + "','" + club + "','submitted','submitted')")
  }
  for (const table of toggles) {
    sql('ALTER TABLE uranius_game.' + table + ' FORCE ROW LEVEL SECURITY')
  }
  pass('Two synthetic owner clubs and world race inserted with FORCE RLS restored')

  const scheduleFor = subject => JSON.parse(sql("BEGIN READ ONLY;\n" +
    "SELECT set_config('request.jwt.claims','" + JSON.stringify({sub:subject}) + "',true);\n" +
    schedule011 + "\nROLLBACK;", 'uranius_smoke_reader'))
  for (const [subject, own, other] of [[a,raceA,raceB],[b,raceB,raceA]]) {
    const response = scheduleFor(subject)
    assert.equal(response.upcomingSchedule.length, 1)
    assert.equal(response.upcomingSchedule[0].id, own)
    assert.equal(response.todayRaces.length, 3)
    assert.ok(response.todayRaces.some(row => row.id.startsWith(other + ':')))
    assert.equal(readFor(subject, "count(*) FROM uranius_game.race_preparations"), '1')
    assert.equal(readFor(subject, "count(*) FROM uranius_game.race_team_entries"), '1')
  }
  pass('Real 001–009 JWT owner mapping filters preparations and entries; world cards remain global')

  const unknown = '00000000-0000-4000-8000-000000000003'
  assert.equal(readFor(unknown, "count(*) FROM uranius_game.race_preparations"), '0')
  assert.equal(readFor(unknown, "count(*) FROM uranius_game.race_team_entries"), '0')
  assert.equal(readFor(unknown, "uranius_game.get_my_club_id() IS NULL"), 't')
  pass('Unknown authenticated subject has zero private race rows and no club mapping')

  sql('BEGIN; SET LOCAL ROLE anon; SELECT id FROM uranius_game.race_preparations; ROLLBACK;', 'uranius_fixture_admin', true)
  sql('UPDATE uranius_game.races SET name = \'tampered\'', 'uranius_smoke_reader', true)
  assert.equal(sql("SELECT (SELECT count(*) FROM uranius_private.migration_ledger)::text || ':' || (SELECT count(*) FROM uranius_catalog.riders)::text"), '10:200')
  assert.equal(sql("SELECT count(*) FROM pg_class WHERE oid='uranius_game.races'::regclass AND relforcerowsecurity"), '1')
  pass('Native anonymous and reader write denial; ten migrated ledger entries intact')

  assert.equal(counts010(), '10:4:4')
  pass('Populated A/B isolation preserves exact combined installed 010 permissions and ledger')

  // The original 21-step Overview fixture is reused to avoid inventing A/B
  // ownership models. This additional Squad integration runs only in PGDATA.
  const acl013 = readFileSync(join(root,'database/reconstruction/squad/013_squad_reader_acl_DISPOSABLE_REVIEW_ONLY.sql'),'utf8')
  const preview013 = readFileSync(join(root,'database/reconstruction/squad/013_synthetic_squad_preview_REVIEW_ONLY.sql'),'utf8')
  assert.match(acl013,/ROLLBACK;\s*$/)
  assert.match(preview013,/ROLLBACK;\s*$/)
  const grantCheck = "SELECT has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','label','SELECT')::text;"
  assert.equal(sql(grantCheck),'false')
  sql(acl013)
  assert.equal(sql(grantCheck),'false')
  pass('Exact narrow reader grant rehearsal rolls back without persisting permissions')

  // A direct change cannot be attempted as an ordinary reader; both SQL sources
  // fail closed before the fixture-only privilege is installed.
  sql(preview013.replace(":'verified_subject'","'"+a+"'"),'uranius_smoke_reader',true)
  sql("SELECT label FROM uranius_catalog.riders",'uranius_smoke_reader',true)
  pass('Before privilege approval restricted reader cannot inspect rider labels')

  // Commit an unmodified grant rehearsal only in this disposable PGDATA.
  // This is NEVER a hosted migration, installer or owner approval.
  sql(acl013.replace(/ROLLBACK;\s*$/,'COMMIT;'))
  assert.equal(sql(grantCheck),'true')
  assert.equal(sql("SELECT has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')"),'f')
  assert.equal(sql("SELECT has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','UPDATE')"),'f')
  pass('Disposable-only grant exposes requested columns but not entire table or writes')

  // Local fixture is intentionally non-TLS; assert the original source denies it.
  // For verifying only the SQL ownership projection, disable exactly this TLS
  // predicate in an in-memory test copy; retain original source unchanged.
  const tlsGuard="OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)"
  assert.equal(preview013.split(tlsGuard).length,2)
  sql(preview013.replace(":'verified_subject'","'"+a+"'"),'uranius_smoke_reader',true)
  pass('Unmodified Squad preview denies non-TLS connections in disposable fixture')

  const fixturePreview = preview013.replace(tlsGuard,'OR FALSE /* test fixture lacks TLS */')
  const previewFor = subject => {
    const query=fixturePreview.replace(":'verified_subject'","'"+subject+"'")
    return JSON.parse(sql(query,'uranius_smoke_reader'))
  }
  const results=[]
  for(const [subject,expectedTeam] of [[a,1],[b,2]]) {
    const packet=previewFor(subject)
    const expectedClub=sql("SELECT club_id::text FROM uranius_game.club_profiles WHERE team_id="+expectedTeam)
    assert.equal(packet.kind,'syntheticSquadPreview')
    assert.equal(packet.clubId,expectedClub)
    assert.equal(packet.riders.length,10)
    const expectedLabels=sql("SELECT string_agg(label,',' ORDER BY rider_id) FROM uranius_catalog.riders WHERE team_id="+expectedTeam)
    assert.equal(packet.riders.map(r=>r.label).join(','),expectedLabels)
    results.push(packet)
  }
  assert.equal(results[0].riders.some(r=>results[1].riders.some(other=>other.syntheticRiderId===r.syntheticRiderId)),false)
  pass('Both managers see exactly ten own synthetic riders, with no cross-manager IDs')

  const unknownSquad='00000000-0000-4000-8000-000000000003'
  sql(fixturePreview.replace(":'verified_subject'","'"+unknownSquad+"'"),'uranius_smoke_reader',true)
  sql(fixturePreview.replace(":'verified_subject'","'00000000-0000-4000-8000-000000000000'"),'uranius_smoke_reader',true)
  pass('Unknown and unowned subjects are denied rather than receiving global roster')

  sql("BEGIN READ ONLY;SET LOCAL ROLE anon;SELECT label FROM uranius_catalog.riders;ROLLBACK;",'uranius_fixture_admin',true)
  sql("UPDATE uranius_catalog.riders SET label='tamper' WHERE rider_id=1;",'uranius_smoke_reader',true)
  assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'10')
  assert.equal(sql("SELECT count(*) FROM uranius_catalog.riders"),'200')
  pass('Anonymous reader and restricted writes denied; 010 ledger and catalog preserved')


  // Exact proposed forward-only grant has not been approved and must not be
  // tested against hosted Supabase. Reset only the disposable fixture ACL.
  const candidate013 = readFileSync(join(root,'database/reconstruction/squad/013_squad_reader_grant_REVIEW_ONLY.sql'),'utf8')
  sql('REVOKE SELECT (label,flat,climbing,stamina,resistance) ON uranius_catalog.riders FROM uranius_smoke_reader')
  assert.equal(sql(grantCheck),'false')
  assert.equal(sql("SELECT has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')"),'f')
  sql(wrap(candidate013),'uranius_migrator',true)
  assert.equal(sql(grantCheck),'false')
  pass('Unmodified 013 forward candidate rejects local non-TLS and leaves ACL unchanged')

  // Local-only fixture does not support TLS; bypass ONLY the pinned TLS
  // guard in an in-memory copy to test every other production precondition.
  const candidateTlsGuard="OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)"
  assert.equal(candidate013.split(candidateTlsGuard).length,2)
  const fixtureCandidate013=candidate013.replace(candidateTlsGuard,'OR FALSE /* local-only native PG17 */')
  sql(wrap(fixtureCandidate013),'postgres',true)
  assert.equal(sql(grantCheck),'false')
  pass('Proposed 013 preflight refuses non-migrator execution')

  sql(wrap(fixtureCandidate013),'uranius_migrator')
  assert.equal(sql(grantCheck),'true')
  assert.equal(sql("SELECT has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')"),'f')
  assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'10')
  sql(wrap(fixtureCandidate013),'uranius_migrator',true)
  pass('Proposed 013 grant is least-privilege and repeated application fails closed')


  // 014 full predecessor sequence: the 013 grant already passed, but requires
  // its exact ledger entry to match the hosted installed state.
  const frozen014=JSON.parse(readFileSync(join(root,'database/reconstruction/squad/014_install_manifest_REVIEW_ONLY.json'),'utf8'))
  const raw014=readFileSync(join(root,'database/reconstruction/squad/014_synthetic_rider_uuid_REVIEW_ONLY.sql'),'utf8')
  assert.equal(hash(raw014),'f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f')
  assert.equal(frozen014.candidate.sha256,hash(raw014))
  assert.equal(frozen014.requires.length,11)
  assert.equal(frozen014.requires[10].file,'013_squad_reader_grant.sql')
  sql("INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('013_squad_reader_grant.sql','8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859')")
  const exactHistorySql = "WITH expected(version,sha256) AS (VALUES " +
    frozen014.requires.map(item=>"('"+item.file+"','"+item.sha256+"')").join(',')+
    ") SELECT ((SELECT count(*) FROM uranius_private.migration_ledger)=11 AND "+
    "NOT EXISTS(SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger) AND "+
    "NOT EXISTS(SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected))::text"
  assert.equal(sql(exactHistorySql),'true')
  pass('Full real 001–010 plus 013 history matches all 11 frozen version/hash entries')


  // Fail closed if historical version/hash values drift (not merely the row count).
  const tampered=exactHistorySql.replaceAll('FROM uranius_private.migration_ledger','FROM (SELECT version,CASE WHEN version = '+
    "'009_clock_smoke_reader.sql' THEN 'tampered' ELSE sha256 END AS sha256 FROM uranius_private.migration_ledger) ledger")
  assert.equal(sql(tampered),'false')
  pass('Bidirectional full-history verification detects a tampered earlier migration digest')

  const tls014="OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)"
  assert.equal(raw014.split(tls014).length,2)
  sql(wrap(raw014),'uranius_migrator',true)
  assert.equal(sql("SELECT to_regclass('uranius_game.synthetic_rider_identity') IS NULL"),'t')
  pass('Exact reviewed 014 refuses non-TLS transaction with no table created')

  const local014=raw014.replace(tls014,'OR FALSE /* offline disposable fixture only */')
  sql(wrap(local014),'postgres',true)
  assert.equal(sql("SELECT to_regclass('uranius_game.synthetic_rider_identity') IS NULL"),'t')
  pass('014 rejects wrong database identity even after all eleven prerequisites')

  sql(wrap(local014))
  assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='uranius_game.synthetic_rider_identity'::regclass"),'true:true')
  pass('014 mapped all 200 synthetic riders in original fixture with private FORCE RLS')

  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity"),'0')
  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity",'uranius_fixture_admin'),'200')
  assert.equal(sql("SELECT count(DISTINCT rider_uuid) FROM uranius_game.synthetic_rider_identity",'uranius_fixture_admin'),'200')
  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity m JOIN uranius_catalog.riders r USING (rider_id)",'uranius_fixture_admin'),'200')
  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity WHERE identity_provenance<>'uranius_generated_synthetic'",'uranius_fixture_admin'),'0')
  pass('All 200 mappings are unique, valid, fully joined and synthetic-provenance only')

  for(const role of ['anon','authenticated','uranius_smoke_reader'])
    assert.equal(sql("SELECT has_any_column_privilege('"+role+"','uranius_game.synthetic_rider_identity','SELECT')"),'f')
  sql("SELECT * FROM uranius_game.synthetic_rider_identity",'uranius_smoke_reader',true)
  sql("UPDATE uranius_game.synthetic_rider_identity SET identity_provenance='tampered'",'uranius_smoke_reader',true)
  pass('Direct anonymized and restricted mapping access denied; reader cannot mutate UUIDs')

  sql("INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('014_synthetic_rider_uuid.sql','"+frozen014.candidate.sha256+"')")
  assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'12')
  assert.equal(sql("SELECT count(*) FROM uranius_catalog.riders"),'200')
  assert.equal(sql("SELECT count(*) FROM uranius_catalog.team_owners"),'2')
  assert.equal(sql("SELECT count(*) FROM uranius_game.game_state WHERE season_number=1 AND month_number=1 AND day_number=1 AND is_paused"),'1')
  pass('Final 12 ledger entries, paused clock, 200 riders and two club owners all preserved')

  sql(wrap(local014),'uranius_migrator',true)
  pass('014 repeated execution fails closed in full historical fixture')

  // Phase 015: only local disposable database; approved 014 itself is unchanged.
  const sql015=readFileSync(join(root,'database/reconstruction/squad/015_rider_uuid_owner_read_REVIEW_ONLY.sql'),'utf8')
  const tls015="OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)"
  assert.equal(sql015.split(tls015).length,2)
  const ownerSelect="count(*) FROM uranius_game.synthetic_rider_identity"
  sql('SELECT count(*) FROM uranius_game.synthetic_rider_identity','uranius_smoke_reader',true)
  pass('Without 015 grant even verified owner A/B have no UUID table SELECT permission')

  sql(wrap(sql015),'uranius_migrator',true)
  sql('SELECT count(*) FROM uranius_game.synthetic_rider_identity','uranius_smoke_reader',true)
  pass('Exact 015 candidate denies non-TLS local session; mapping stays locked')

  const local015=sql015.replace(tls015,'OR FALSE /* offline disposable fixture only */')
  sql(wrap(local015),'postgres',true)
  sql('SELECT count(*) FROM uranius_game.synthetic_rider_identity','uranius_smoke_reader',true)
  pass('015 refuses unauthorized postgres execution identity and does not change reader access')

  sql(wrap(local015))
  assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='uranius_game.synthetic_rider_identity'::regclass"),'true:true')
  assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity'"),'1')
  pass('015 enables one owner-only RLS policy without disabling FORCE RLS')

  assert.equal(readFor(a,ownerSelect),'10')
  assert.equal(readFor(b,ownerSelect),'10')
  const unknown015='00000000-0000-4000-8000-000000000003'
  assert.equal(readFor(unknown015,ownerSelect),'0')
  const ownerRiderIds=sub=>readFor(sub,
    "coalesce(string_agg(rider_id::text,',' ORDER BY rider_id),'<no-owned-riders>') FROM uranius_game.synthetic_rider_identity")
  assert.equal(ownerRiderIds(a),'1,2,3,4,5,6,7,8,9,10')
  assert.equal(ownerRiderIds(b),'11,12,13,14,15,16,17,18,19,20')
  assert.equal(ownerRiderIds(unknown015),'<no-owned-riders>')
  pass('Real A and B JWT sessions see ONLY their ten UUID identity mappings; unknown user sees zero')

  const idsFor=sub=>readFor(sub,"count(DISTINCT rider_uuid) FROM uranius_game.synthetic_rider_identity")
  assert.equal(idsFor(a),'10')
  assert.equal(idsFor(b),'10')
  assert.equal(idsFor(unknown015),'0')
  pass('Each real owner has ten distinct stable synthetic UUIDs and no global catalog leakage')

  sql("SELECT identity_provenance FROM uranius_game.synthetic_rider_identity LIMIT 1",'uranius_smoke_reader',true)
  sql("SELECT created_at FROM uranius_game.synthetic_rider_identity LIMIT 1",'uranius_smoke_reader',true)
  sql("SELECT team_id FROM uranius_catalog.riders LIMIT 1",'uranius_smoke_reader',true)
  sql("UPDATE uranius_game.synthetic_rider_identity SET rider_uuid=gen_random_uuid()", 'uranius_smoke_reader', true)
  assert.equal(sql("SELECT has_any_column_privilege('anon','uranius_game.synthetic_rider_identity','SELECT')"),'f')
  assert.equal(sql("SELECT has_any_column_privilege('authenticated','uranius_game.synthetic_rider_identity','SELECT')"),'f')
  pass('Extra identity fields, hidden team_id, writes, public and default app access stay denied')

  sql(wrap(local015),'uranius_migrator',true)
  assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'12')
  assert.equal(sql("SELECT count(*) FROM uranius_catalog.riders"),'200')
  assert.equal(sql("SELECT count(*) FROM uranius_catalog.team_owners"),'2')
  pass('015 duplicate run fails closed; 12 ledger entries and 200 riders preserved')


  // 018 REVIEW-ONLY: append only to NEW disposable full-history test.
  // The source 015 test remains untouched; NONE of this reaches hosted Supabase.
  const frozen015=JSON.parse(readFileSync(join(root,'database/reconstruction/squad/015_install_manifest_REVIEW_ONLY.json'),'utf8'))
  sql("INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('015_rider_uuid_owner_read.sql','"+frozen015.candidate.sha256+"')")
  const expected018=[...frozen015.requires,{file:frozen015.candidate.ledgerVersion,sha256:frozen015.candidate.sha256}]
  assert.equal(expected018.length,13)
  const expected018Rows=expected018.map(v=>"('"+v.file+"','"+v.sha256+"')").join(',')
  const historical018="WITH expected(version,sha256) AS (VALUES "+expected018Rows+") "+
    "SELECT ((SELECT count(*) FROM uranius_private.migration_ledger)=13 AND "+
    "NOT EXISTS(SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger) AND "+
    "NOT EXISTS(SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected))::text"
  assert.equal(sql(historical018),'true')
  pass('018 full 001–015 historical fixture has exact 13 frozen version/digest pairs')

  const raw018=readFileSync(join(root,'database/reconstruction/squad/018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql'),'utf8')
  const tls018="OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)"
  assert.equal(raw018.split(tls018).length,2)
  sql(wrap(raw018),'uranius_migrator',true)
  assert.equal(sql("SELECT to_regclass('uranius_game.synthetic_rider_attributes') IS NULL"),'t')
  pass('Exact 018 review proposal refuses non-TLS full-history fixture without table creation')

  const local018=raw018.replace(tls018,'OR FALSE /* disposable full-history fixture TLS simulation ONLY */')
  sql(wrap(local018),'postgres',true)
  assert.equal(sql("SELECT to_regclass('uranius_game.synthetic_rider_attributes') IS NULL"),'t')
  pass('018 wrong direct execution role refused')

  const saved015=frozen015.candidate.sha256
  // Historical ledger enforces 64-char digests; tamper with a syntactically valid
  // but incorrect SHA-256 so the 018 baseline guard, not the ledger CHECK, rejects it.
  sql("UPDATE uranius_private.migration_ledger SET sha256='"+'0'.repeat(64)+"' WHERE version='015_rider_uuid_owner_read.sql'")
  assert.equal(sql(historical018),'false')
  sql(wrap(local018),'uranius_migrator',true)
  assert.equal(sql("SELECT to_regclass('uranius_game.synthetic_rider_attributes') IS NULL"),'t')
  sql("UPDATE uranius_private.migration_ledger SET sha256='"+saved015+"' WHERE version='015_rider_uuid_owner_read.sql'")
  assert.equal(sql(historical018),'true')
  pass('018 detects altered installed 015 digest and leaves history unchanged')

  sql(wrap(local018))
  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_attributes",'uranius_fixture_admin'),'200')
  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_attributes a JOIN uranius_catalog.riders r USING(rider_id) WHERE a.flat=r.flat AND a.climbing=r.climbing AND a.resistance=r.resistance",'uranius_fixture_admin'),'200')
  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_attributes WHERE sprint IS NOT NULL OR time_trial IS NOT NULL OR endurance IS NOT NULL OR recovery IS NOT NULL OR race_iq IS NOT NULL OR teamwork IS NOT NULL",'uranius_fixture_admin'),'0')
  assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_attributes WHERE climbing_source='isolated_catalog' AND flat_source='isolated_catalog' AND resistance_source='isolated_catalog'",'uranius_fixture_admin'),'200')
  pass('018 in disposable full-history fixture copies all three skills exactly and leaves six NULL')

  const attrs='uranius_game.synthetic_rider_attributes'
  assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='"+attrs+"'::regclass"),'true:true')
  assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_attributes'"),'0')
  for(const role of ['uranius_smoke_reader','anon','authenticated'])
   assert.equal(sql("SELECT has_any_column_privilege('"+role+"','"+attrs+"','SELECT')"),'f')
  sql("SELECT * FROM "+attrs,'uranius_smoke_reader',true)
  sql("UPDATE "+attrs+" SET sprint=1 WHERE rider_id=1",'uranius_smoke_reader',true)
  pass('018 FORCE RLS/no reader or public access and no read/write/privilege leak')

  // Test constraint failures only under disposable administrative fixture.
  const deny=q=>sql('BEGIN;\n'+q+'\nROLLBACK;','uranius_fixture_admin',true)
  deny("UPDATE "+attrs+" SET sprint=12 WHERE rider_id=1;")
  deny("UPDATE "+attrs+" SET sprint=12,sprint_source='isolated_catalog' WHERE rider_id=1;")
  deny("UPDATE "+attrs+" SET sprint=101,sprint_source='approved_synthetic_fixture' WHERE rider_id=1;")
  deny("UPDATE "+attrs+" SET flat_source=NULL WHERE rider_id=1;")
  deny("UPDATE "+attrs+" SET endurance=12,endurance_source='isolated_catalog' WHERE rider_id=1;")
  deny("INSERT INTO "+attrs+"(rider_id) VALUES (999999);")
  pass('018 SQL CHECK/FK denies missing provenance, fake source, overscale and orphan rows')

  sql("BEGIN; UPDATE "+attrs+" SET sprint=12,sprint_source='approved_synthetic_fixture' WHERE rider_id=1; ROLLBACK;",'uranius_fixture_admin')
  assert.equal(sql("SELECT sprint IS NULL FROM "+attrs+" WHERE rider_id=1",'uranius_fixture_admin'),'t')
  pass('018 synthetic-only future source accepted only inside rolled-back disposable transaction')

  sql(wrap(local018),'uranius_migrator',true)
  assert.equal(sql(historical018),'true')
  assert.equal(sql("SELECT count(*) FROM uranius_catalog.riders"),'200')
  assert.equal(sql("SELECT count(*) FROM uranius_catalog.team_owners"),'2')
  assert.equal(sql("SELECT count(*) FROM uranius_game.game_state WHERE season_number=1 AND month_number=1 AND day_number=1 AND is_paused"),'1')
  pass('018 duplicate proposal refused; 13 exact historical rows and paused world remain intact')

  console.log('PASS '+tests+' full-history 001–015 plus 018 REVIEW candidate checks on disposable PG17; NO hosted apply')

  if (raceWorldSeed) {
    const seedChecksStart=tests
    // This branch runs ONLY inside the already-created scratch PGDATA.
    // The earlier 010 test populated its own disposable rows; remove just
    // those four fixture relations' rows before replaying the empty hosted baseline.
    sql("TRUNCATE uranius_game.race_preparations, uranius_game.race_team_entries, uranius_game.race_stages, uranius_game.races",'uranius_fixture_admin')
    assert.equal(hash(raw018),'622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc')
    sql("INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('018_synthetic_nine_skill_attributes.sql','"+hash(raw018)+"')")
    const seed=readFileSync(join(root,'database/reconstruction/overview/019_synthetic_race_world_REVIEW_ONLY.sql'),'utf8')
    const tls="OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)"
    assert.equal(seed.split(tls).length,2)
    const localSeed=seed.replace(tls,'OR FALSE /* scratch PGDATA rehearsal only */')
    const counts=()=>sql("SELECT (SELECT count(*) FROM uranius_game.races)||':'||(SELECT count(*) FROM uranius_game.race_stages)||':'||(SELECT count(*) FROM uranius_game.race_team_entries)||':'||(SELECT count(*) FROM uranius_game.race_preparations)",'uranius_fixture_admin')
    const policies=()=>sql("SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname)::text FROM pg_policies p WHERE schemaname='uranius_game' AND tablename IN ('races','race_stages','race_team_entries','race_preparations')",'uranius_fixture_admin')
    const beforePolicies=policies()
    assert.equal(counts(),'0:0:0:0')
    sql(wrap(seed),'uranius_migrator',true)
    sql(wrap(localSeed),'postgres',true)
    assert.equal(counts(),'0:0:0:0')
    assert.equal(policies(),beforePolicies)
    pass('019 exact source rejects non-TLS and wrong role with zero rows and unchanged policies')
    sql(wrap(localSeed).replace(/COMMIT;$/,'ROLLBACK;'))
    assert.equal(counts(),'0:0:0:0')
    assert.equal(policies(),beforePolicies)
    pass('019 full transaction rollback removes fixture rows and temporary policies')
    sql(wrap(localSeed))
    assert.equal(counts(),'3:4:2:2')
    assert.equal(policies(),beforePolicies)
    assert.equal(sql("SELECT count(*) FROM pg_class WHERE relnamespace='uranius_game'::regnamespace AND relname IN ('races','race_stages','race_team_entries','race_preparations') AND relrowsecurity AND relforcerowsecurity"),'4')
    pass('019 exact synthetic fixture counts; FORCE RLS and existing policy definitions preserved')
    const fixtureA='19000000-0000-4000-8000-000000000001'
    const fixtureB='19000000-0000-4000-8000-000000000002'
    const fixtureWorld='19000000-0000-4000-8000-000000000003'
    for(const [subject,own] of [[a,fixtureA],[b,fixtureB]]){
      const response=scheduleFor(subject)
      assert.equal(response.upcomingSchedule.length,1)
      assert.equal(response.upcomingSchedule[0].id,own)
      assert.equal(response.todayRaces.length,1)
      assert.equal(response.todayRaces[0].id,fixtureWorld+':1')
      assert.equal(readFor(subject,"count(*) FROM uranius_game.race_team_entries WHERE status='accepted'"),'1')
      assert.equal(readFor(subject,"count(*) FROM uranius_game.race_preparations WHERE status='submitted' AND startlist_status='submitted'"),'1')
      assert.equal(readFor(subject,"count(*) FROM uranius_game.race_stages"),'4')
    }
    pass('019 populated real JWT A/B schedule isolation, one shared world event, four global stages')
    assert.equal(readFor(unknown015,"count(*) FROM uranius_game.race_preparations"),'0')
    assert.equal(readFor(unknown015,"count(*) FROM uranius_game.race_team_entries"),'0')
    sql("SELECT id FROM uranius_game.races",'anon',true)
    sql("INSERT INTO uranius_game.races(name) VALUES ('unauthorized')",'uranius_smoke_reader',true)
    pass('019 unknown owner private rows, anonymous access and reader writes denied')
    sql(wrap(localSeed),'uranius_migrator',true)
    assert.equal(counts(),'3:4:2:2')
    assert.equal(policies(),beforePolicies)
    assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'14')
    assert.equal(sql("SELECT count(*) FROM uranius_game.game_state WHERE season_number=1 AND month_number=1 AND day_number=1 AND is_paused"),'1')
    assert.equal(sql("SELECT count(*) FROM uranius_catalog.riders"),'200')
    pass('019 duplicate seed denied, ledger, paused clock, roster and permissions intact')
    console.log('PASS '+(tests-seedChecksStart)+'/6 NEW populated race-world seed checks; disposable PG17 ONLY; hosted installation NOT authorized')
    if(startlistReview){
      const checksStart=tests
      const manifest019=JSON.parse(readFileSync(join(root,'database/reconstruction/overview/019_install_manifest_REVIEW_ONLY.json'),'utf8'))
      assert.equal(hash(seed),manifest019.candidate.sha256)
      sql("INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('019_synthetic_race_world.sql','"+hash(seed)+"')")
      const startlistSql=readFileSync(join(root,'database/reconstruction/overview/021_synthetic_startlists_REVIEW_ONLY.sql'),'utf8')
      assert.equal(startlistSql.split(tls).length,2)
      const localStartlist=startlistSql.replace(tls,'OR FALSE /* scratch PGDATA rehearsal only */')
      const missing=()=>sql("SELECT to_regclass('uranius_game.synthetic_race_startlists') IS NULL")
      sql(wrap(startlistSql),'uranius_migrator',true)
      sql(wrap(localStartlist),'postgres',true)
      assert.equal(missing(),'t')
      assert.equal(policies(),beforePolicies)
      pass('021 exact source non-TLS/wrong-role denied; no table or policy change')
      sql(wrap(localStartlist).replace(/COMMIT;$/,'ROLLBACK;'))
      assert.equal(missing(),'t')
      assert.equal(sql("SELECT count(*) FROM pg_constraint WHERE conname='uranius_club_team_pair'"),'0')
      assert.equal(policies(),beforePolicies)
      pass('021 rollback removes table, ownership constraint and temporary policies')
      sql(wrap(localStartlist))
      const sl='uranius_game.synthetic_race_startlists'
      assert.equal(sql("SELECT count(*) FROM "+sl,'uranius_fixture_admin'),'10')
      assert.equal(sql("SELECT string_agg(rider_id::text,',' ORDER BY rider_id) FROM "+sl+" WHERE team_id=1",'uranius_fixture_admin'),'1,2,3,4,5')
      assert.equal(sql("SELECT string_agg(rider_id::text,',' ORDER BY rider_id) FROM "+sl+" WHERE team_id=2",'uranius_fixture_admin'),'11,12,13,14,15')
      assert.equal(sql("SELECT count(*) FROM "+sl+" WHERE role='captain'",'uranius_fixture_admin'),'2')
      assert.equal(sql("SELECT count(*) FROM "+sl+" l JOIN uranius_game.synthetic_rider_identity i USING(rider_id)",'uranius_fixture_admin'),'10')
      assert.equal(policies(),beforePolicies)
      pass('021 deterministic five-rider roster per accepted entry with UUID identity and one captain')
      for(const [q,label] of [
        ["UPDATE "+sl+" SET rider_id=11 WHERE team_id=1 AND selection_order=2","foreign-club rider"],
        ["UPDATE "+sl+" SET role='captain' WHERE team_id=1 AND selection_order=2","duplicate captain"],
        ["UPDATE "+sl+" SET selection_order=1 WHERE team_id=1 AND selection_order=2","duplicate selection"],
        ["UPDATE "+sl+" SET race_id='"+fixtureWorld+"' WHERE team_id=1 AND selection_order=2","missing preparation"]
      ]){sql('BEGIN;'+q+';ROLLBACK;','uranius_fixture_admin',true)}
      assert.equal(sql("SELECT count(*) FROM "+sl,'uranius_fixture_admin'),'10')
      pass('021 foreign rider, duplicate captain/slot and missing preparation rejected by constraints')
      assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='"+sl+"'::regclass"),'true:true')
      assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_race_startlists'"),'0')
      for(const role of ['anon','authenticated','uranius_smoke_reader']){
        assert.equal(sql("SELECT has_any_column_privilege('"+role+"','"+sl+"','SELECT')"),'f')
        assert.equal(sql("SELECT has_table_privilege('"+role+"','"+sl+"','INSERT,UPDATE,DELETE')"),'f')
      }
      sql("SELECT rider_id FROM "+sl,'uranius_smoke_reader',true)
      assert.equal(sql("SELECT count(*) FROM uranius_game.race_preparations WHERE rider_count=0 AND finance_transaction_id IS NULL",'uranius_fixture_admin'),'2')
      pass('021 private FORCE RLS, no client/reader grants, no preparation or finance state advanced')
      // Actual rows from disposable PostgreSQL, not hardcoded rider data.
      const packetSql=`SELECT jsonb_build_object(
        'raceId',r.id,'stageId',s.id,'stageName',s.name,'distanceKm',s.distance_km,
        'terrainType',s.terrain_type,'stageFormat',s.stage_format,'stageNumber',s.stage_number,
        'rows',(SELECT jsonb_agg(jsonb_build_object('riderUuid',i.rider_uuid,'clubId',l.club_id,
          'teamId',l.team_id,'riderName',c.label,'teamName',t.label,'selectionOrder',l.selection_order,
          'role',l.role,'flat',c.flat,'climbing',c.climbing,'stamina',c.stamina,'resistance',c.resistance,
          'provenance',l.provenance) ORDER BY l.team_id,l.selection_order)
          FROM ${sl} l JOIN uranius_catalog.riders c USING(rider_id)
          JOIN uranius_game.synthetic_rider_identity i USING(rider_id)
          JOIN uranius_catalog.teams t ON t.team_id=l.team_id WHERE l.race_id=r.id))
        FROM uranius_game.races r JOIN uranius_game.race_stages s ON s.race_id=r.id
        WHERE r.id='${fixtureA}' AND s.stage_number=1`
      // The real engine requires two teams. Add B to A's race ONLY inside
      // one rolled-back scratch transaction, preserving the exact tested 021 SQL.
      // Reuse B's five actual database-selected riders and its existing club.
      const opponentSql=`WITH rival AS (
        SELECT club_id FROM uranius_game.club_profiles WHERE team_id=2
      ), entry AS (
        INSERT INTO uranius_game.race_team_entries(race_id,club_id,participating_club_id,status,entry_source)
        SELECT '${fixtureA}',club_id,club_id,'accepted','uranius_synthetic_fixture' FROM rival
        RETURNING id,club_id
      )
      INSERT INTO uranius_game.race_preparations(race_id,club_id,participating_club_id,race_team_entry_id,status,startlist_status,metadata)
      SELECT '${fixtureA}',club_id,club_id,id,'submitted','submitted','{"uranius_synthetic":true}'::jsonb FROM entry;
      INSERT INTO ${sl}(race_id,club_id,team_id,rider_id,selection_order,role,provenance)
      SELECT '${fixtureA}',club_id,team_id,rider_id,selection_order,role,provenance
      FROM ${sl} WHERE race_id='${fixtureB}' AND team_id=2;`
      const packet=sql('BEGIN;\n'+opponentSql+'\n'+packetSql+';\nROLLBACK;','uranius_fixture_admin')
      const parsedPacket=JSON.parse(packet)
      assert.equal(parsedPacket.rows.length,10)
      assert.equal(new Set(parsedPacket.rows.map(r=>r.clubId)).size,2)
      assert.equal(counts(),'3:4:2:2')
      assert.equal(sql("SELECT count(*) FROM "+sl,'uranius_fixture_admin'),'10')
      assert.equal(policies(),beforePolicies)
      const {build}=await import('esbuild')
      const bundle=join(scratch,'startlist-engine.mjs')
      await build({entryPoints:[join(root,'scripts/uranius-startlist-engine-review.ts')],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
      const engine=JSON.parse(run(process.execPath,archiveReview?[bundle,'--emit-private-review-artifact']:[bundle],{input:packet}))
      assert.equal(engine.finishers,10)
      assert.equal(engine.teams,2)
      assert.equal(engine.deterministic,true)
      assert.equal(engine.negativePacketsRejected,6)
      assert.equal(engine.fixtureUnchanged,true)
      const {artifact,...engineSummary}=engine
      console.log('ENGINE '+JSON.stringify(engineSummary))
      pass('021 disposable database UUID roster feeds unchanged existing_v1 engine, two teams, all ten finish, repeated output matches; temporary opponent rolled back')
      sql(wrap(localStartlist),'uranius_migrator',true)
      assert.equal(counts(),'3:4:2:2')
      assert.equal(policies(),beforePolicies)
      assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'15')
      assert.equal(sql("SELECT count(*) FROM "+sl,'uranius_fixture_admin'),'10')
      assert.equal(sql("SELECT count(*) FROM uranius_game.game_state WHERE season_number=1 AND month_number=1 AND day_number=1 AND is_paused"),'1')
      pass('021 duplicate refused; fifteen historical entries, fixture rows and paused clock preserved')
      console.log('PASS '+(tests-checksStart)+'/7 NEW startlist/engine checks; scratch PG17 only; hosted install NOT authorized')
      if(archiveReview){
        const archiveChecksStart=tests
        const manifest021=JSON.parse(readFileSync(join(root,'database/reconstruction/overview/021_install_manifest_REVIEW_ONLY.json'),'utf8'))
        assert.equal(hash(startlistSql),manifest021.candidate.sha256)
        sql("INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('021_synthetic_startlists.sql','"+hash(startlistSql)+"')")
        const archiveSql=readFileSync(join(root,'database/reconstruction/overview/022_completed_race_archive_REVIEW_ONLY.sql'),'utf8')
        assert.equal(archiveSql.split(tls).length,2)
        const localArchive=archiveSql.replace(tls,'OR FALSE /* scratch PGDATA rehearsal only */')
        const ar='uranius_private.synthetic_completed_race_runs'
        const admin='uranius_fixture_admin'
        const absent=()=>sql("SELECT to_regclass('"+ar+"') IS NULL")
        const archiveCount=()=>sql("SELECT count(*) FROM "+ar,admin)
        sql(wrap(archiveSql),'uranius_migrator',true)
        sql(wrap(localArchive),'postgres',true)
        assert.equal(absent(),'t')
        sql(wrap(localArchive).replace(/COMMIT;$/,'ROLLBACK;'))
        assert.equal(absent(),'t')
        assert.equal(sql("SELECT to_regprocedure('uranius_private.validate_synthetic_completed_race_run()') IS NULL"),'t')
        pass('022 exact source denies non-TLS and wrong role; schema rollback leaves nothing')
        sql(wrap(localArchive))
        assert.equal(archiveCount(),'0')
        assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='"+ar+"'::regclass"),'true:true')
        assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs'"),'0')
        for(const role of ['anon','authenticated','uranius_smoke_reader']){
          assert.equal(sql("SELECT has_any_column_privilege('"+role+"','"+ar+"','SELECT,INSERT,UPDATE,REFERENCES')"),'f')
          assert.equal(sql("SELECT has_table_privilege('"+role+"','"+ar+"','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')"),'f')
          assert.equal(sql("SELECT has_function_privilege('"+role+"','uranius_private.validate_synthetic_completed_race_run()','EXECUTE')"),'f')
          sql("SELECT * FROM "+ar,role,true)
        }
        pass('022 empty private archive has FORCE RLS and no client or reader access')
        assert.equal(typeof artifact?.inputText,'string')
        assert.equal(typeof artifact?.outputText,'string')
        assert.equal(hash(artifact.inputText),artifact.inputSha256)
        assert.equal(hash(artifact.outputText),artifact.outputSha256)
        assert.equal(artifact.outputSha256,engine.outputSha256)
        // This competitive entry is committed ONLY to the disposable database,
        // so the archive can enforce actual race/roster foreign relationships.
        // The hosted 021 state still has separate single-club entries.
        sql('BEGIN;\n'+opponentSql+'\nCOMMIT;',admin)
        assert.equal(counts(),'3:4:3:3')
        assert.equal(sql("SELECT count(*) FROM "+sl+" WHERE race_id='"+fixtureA+"'",admin),'10')
        const hex=s=>Buffer.from(s,'utf8').toString('hex')
        const encoded=s=>"convert_from(decode('"+hex(s)+"','hex'),'UTF8')"
        const insertRun=(inputText=artifact.inputText,outputText=artifact.outputText,inputHash=hash(inputText),outputHash=hash(outputText))=>
          "INSERT INTO "+ar+"(race_id,stage_id,contract_version,engine_lane,provenance,input_text,output_text,input_sha256,output_sha256) VALUES ('"+fixtureA+"','"+parsedPacket.stageId+"',1,'existing_v1','uranius_synthetic_review',"+encoded(inputText)+","+encoded(outputText)+",'"+inputHash+"','"+outputHash+"');"
        const insert=insertRun()
        sql('BEGIN;\n'+insert+'\nROLLBACK;',admin)
        assert.equal(archiveCount(),'0')
        sql(insert,admin)
        assert.equal(archiveCount(),'1')
        const stored=JSON.parse(sql("SELECT jsonb_build_object('inputSha',input_sha256,'outputSha',output_sha256,'inputCheck',encode(sha256(convert_to(input_text,'UTF8')),'hex'),'outputCheck',encode(sha256(convert_to(output_text,'UTF8')),'hex'),'finishers',jsonb_array_length(output_text::jsonb->'finalRiderStates'),'frames',jsonb_array_length(output_text::jsonb->'snapshots'),'events',jsonb_array_length(output_text::jsonb->'events'),'teams',jsonb_array_length(input_text::jsonb->'teams')) FROM "+ar,admin))
        assert.equal(stored.inputSha,artifact.inputSha256)
        assert.equal(stored.inputCheck,artifact.inputSha256)
        assert.equal(stored.outputSha,artifact.outputSha256)
        assert.equal(stored.outputCheck,artifact.outputSha256)
        assert.equal(stored.finishers,10)
        assert.equal(stored.teams,2)
        assert.equal(stored.frames,engine.frames)
        assert.equal(stored.events,engine.events)
        console.log('ARCHIVE '+JSON.stringify(stored))
        pass('022 actual engine payloads commit and read back in new SQL sessions with exact hashes, ten results and full replay')
        sql(insert,admin,true)
        sql("UPDATE "+ar+" SET created_at=now()",admin,true)
        sql("DELETE FROM "+ar,admin,true)
        assert.equal(archiveCount(),'1')
        pass('022 duplicate run, update and delete rejected; one immutable archive retained')
        const malformedInput=JSON.parse(artifact.inputText)
        malformedInput.riders[0].riderId='ffffffff-ffff-4fff-8fff-ffffffffffff'
        const malformedOutput=JSON.parse(artifact.outputText)
        malformedOutput.finalRiderStates[1].finishPosition=malformedOutput.finalRiderStates[0].finishPosition
        sql(insertRun(JSON.stringify(malformedInput)),admin,true)
        sql(insertRun(artifact.inputText,JSON.stringify(malformedOutput)),admin,true)
        // Same valid content but wrong digest; unique constraint cannot mask this check.
        sql(insertRun(artifact.inputText,artifact.outputText,'0'.repeat(64),artifact.outputSha256),admin,true)
        assert.equal(archiveCount(),'1')
        pass('022 mismatched roster, duplicate finish rank and tampered hash refused')
        sql(wrap(localArchive),'uranius_migrator',true)
        assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'16')
        assert.equal(sql("SELECT count(*) FROM uranius_game.game_state WHERE season_number=1 AND month_number=1 AND day_number=1 AND is_paused"),'1')
        assert.equal(policies(),beforePolicies)
        assert.equal(sql("SELECT count(*) FROM uranius_game.race_preparations WHERE rider_count<>0 OR total_cost_cash<>0 OR finance_transaction_id IS NOT NULL",admin),'0')
        assert.equal(archiveCount(),'1')
        pass('022 duplicate schema refused; ledger, clock, policies and financial preparations unchanged')
        console.log('PASS '+(tests-archiveChecksStart)+'/6 NEW completed race archive checks; disposable PG17 only; hosted install NOT authorized')
        if(replayReview){
          const start=tests
          const manifest022=JSON.parse(readFileSync(join(root,'database/reconstruction/overview/022_install_manifest_REVIEW_ONLY.json'),'utf8'))
          assert.equal(hash(archiveSql),manifest022.candidate.sha256)
          sql("INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('022_completed_race_archive.sql','"+hash(archiveSql)+"')")
          const source=readFileSync(join(root,'database/reconstruction/overview/024_participant_replay_preview_REVIEW_ONLY.sql'),'utf8')
          const runId=sql("SELECT run_id FROM "+ar,admin)
          assert.match(runId,/^[a-f0-9-]{36}$/)
          const scratchSource=source.replaceAll('ff57a18f-9eca-4c65-9692-5d9bec28b101',runId)
            .replaceAll('a4b666233b28e829ca55f3f3ca46f8cfd881eaa992897f70abc1c9b7fafd81bf',artifact.inputSha256)
            .replaceAll('0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed',artifact.outputSha256)
          const tls024='OR NOT EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)'
          assert.equal(scratchSource.split(tls024).length,2)
          const local=scratchSource.replace(tls024,'OR FALSE /* scratch PGDATA only */')
          const table='uranius_game.synthetic_race_replay_preview'
          const absent=()=>sql("SELECT to_regclass('"+table+"') IS NULL")
          sql(wrap(scratchSource),'uranius_migrator',true)
          sql(wrap(local),'postgres',true)
          assert.equal(absent(),'t')
          sql(wrap(local).replace(/COMMIT;$/,'ROLLBACK;'))
          assert.equal(absent(),'t')
          pass('024 non-TLS and wrong role rejected; rollback removes projection')
          sql(wrap(local))
          const {projectRaceReplay}=await import('../database/reconstruction/overview/race-replay-preview.mjs')
          const packetExpr="jsonb_build_object('clubId',uranius_game.get_my_club_id(),'replay',(SELECT packet FROM "+table+"))"
          const aa=projectRaceReplay(JSON.parse(readFor(a,packetExpr)))
          const bb=projectRaceReplay(JSON.parse(readFor(b,packetExpr)))
          assert.notEqual(aa.clubId,bb.clubId)
          assert.deepEqual(aa.replay,bb.replay)
          assert.equal(aa.replay.classification.length,10)
          assert.equal(aa.replay.frames.length,347)
          assert.equal(aa.replay.events.length,12)
          assert.equal(aa.replay.runId,runId)
          pass('024 both accepted managers see the same validated real archive projection')
          assert.equal(readFor('00000000-0000-4000-8000-000000000003',"count(packet) FROM "+table),'0')
          // Known owner with no accepted entry must also see zero.
          sql("BEGIN; UPDATE uranius_game.race_team_entries SET status='withdrawn' WHERE race_id='"+fixtureA+"' AND club_id=(SELECT club_id FROM uranius_game.club_profiles WHERE team_id=2); COMMIT;",admin)
          assert.equal(readFor(b,"count(packet) FROM "+table),'0')
          assert.equal(readFor(a,"count(packet) FROM "+table),'1')
          sql("UPDATE uranius_game.race_team_entries SET status='accepted' WHERE race_id='"+fixtureA+"' AND club_id=(SELECT club_id FROM uranius_game.club_profiles WHERE team_id=2);",admin)
          pass('024 unknown subject and known withdrawn participant denied; accepted participant retained')
          for(const role of ['anon','authenticated'])sql("SELECT packet FROM "+table,role,true)
          sql("SELECT * FROM "+table,'uranius_smoke_reader',true)
          sql("SELECT input_text FROM "+ar,'uranius_smoke_reader',true)
          sql("UPDATE "+table+" SET packet='{}'::jsonb",'uranius_smoke_reader',true)
          assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='"+table+"'::regclass"),'true:true')
          assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs'"),'0')
          assert.equal(sql("SELECT count(*) FROM pg_policies WHERE policyname='uranius_024_temp_read'"),'0')
          sql(wrap(local),'uranius_migrator',true)
          assert.equal(archiveCount(),'1')
          assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'17')
          pass('024 raw archive, full-row and mutation access denied; security restored and duplicate refused')
          console.log('PASS '+(tests-start)+'/4 NEW participant replay database checks; scratch PG17 only; hosted install NOT authorized')
        }

      }

    }

  }



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
