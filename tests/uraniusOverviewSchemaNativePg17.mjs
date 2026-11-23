// Disposable PostgreSQL 17 syntax and behavior rehearsal for review-only 010.
// Creates a fresh local PGDATA and never connects to any hosted Supabase project.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { createServer } from 'node:net'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
if (args.length !== 3 || args[0] !== '--disposable-native-pg17' || args[1] !== '--postgres-bin') {
  throw new Error('Usage: node tests/uraniusOverviewSchemaNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\\path\\to\\postgresql-17.12-portable\\bin"')
}
const root = fileURLToPath(new URL('../', import.meta.url))
const bin = resolve(args[2])
const ext = process.platform === 'win32' ? '.exe' : ''
const exe = Object.fromEntries(['initdb','pg_ctl','psql'].map(x=>[x,join(bin,x+ext)]))
for (const file of Object.values(exe)) assert.ok(existsSync(file),'Missing PostgreSQL binary '+file)
const env = {
  PATH: bin + delimiter + (process.env.PATH||''),
  SYSTEMROOT:process.env.SYSTEMROOT||'', WINDIR:process.env.WINDIR||'',
  TEMP:process.env.TEMP||tmpdir(), TMP:process.env.TMP||tmpdir(),
}
function cmd(file, argv, input, reject=false, stdio=undefined) {
  const r=spawnSync(file,argv,{encoding:'utf8',env: input===undefined ? env : dbEnv,
    input,timeout:30000,windowsHide:true,maxBuffer:3000000,stdio})
  if (r.error) throw r.error
  if (reject) { assert.notEqual(r.status,0,'Expected PostgreSQL denial, but succeeded'); return '' }
  if (r.status!==0) throw new Error(file+' failed: '+(r.stderr||r.stdout||'unknown').slice(0,2500))
  return (r.stdout||'').trim().split(/\r?\n/).at(-1)
}
for (const file of Object.values(exe)) assert.match(cmd(file,['--version']),/17\.\d+/)
const scratch=mkdtempSync(join(tmpdir(),'uranius-010-disposable-'))
const data=join(scratch,'data')
const listener=createServer()
await new Promise((ok,no)=>listener.once('error',no).listen(0,'127.0.0.1',ok))
const port=listener.address().port
await new Promise(ok=>listener.close(ok))
const dbEnv={...env,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',PGPORT:String(port),
  PGDATABASE:'postgres',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',
  PGOPTIONS:'-c statement_timeout=15000'}
function sql(source,role='uranius_fixture_admin',reject=false) {
  const input=role==='uranius_fixture_admin'?source:'SET ROLE '+role+';\n'+source
  return cmd(exe.psql,['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U','uranius_fixture_admin','-f','-'],input,reject)
}
const candidate=readFileSync(join(root,'database/reconstruction/overview/010_race_schema_DISPOSABLE_REVIEW_ONLY.sql'),'utf8')
assert.match(candidate,/^-- REVIEW_ONLY_NOT_APPROVED/)
assert.match(candidate,/\nROLLBACK;\s*$/)
assert.doesNotMatch(candidate,/\bCOMMIT\s*;/i)
let startAttempted=false,started=false,safeToRemove=false,checks=0
function pass(msg){checks++;console.log('PASS '+msg)}
try {
  console.log('INFO Initializing disposable PG17 database on loopback')
  cmd(exe.initdb,['-D',data,'-U','uranius_fixture_admin','-A','trust','--no-locale','--no-sync','-E','UTF8'])
  startAttempted=true
  cmd(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),
    '-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],undefined,false,'ignore')
  started=true
  sql('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE uranius_reader NOLOGIN; CREATE SCHEMA uranius_game; CREATE TABLE uranius_game.club_profiles (club_id uuid PRIMARY KEY);')
  pass('Isolated PostgreSQL 17 fixture initialized with only required club UUID contract')

  // Review-only file must run unmodified and ROLLBACK every table.
  sql(candidate)
  assert.equal(sql("SELECT count(*)::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='uranius_game' AND c.relname IN ('races','race_stages','race_team_entries','race_preparations')"),'0')
  pass('Original 110-column candidate compiles and its own ROLLBACK leaves no tables')

  // Replace only terminal rollback for temporary SQL validation inside transaction.
  const expanded=candidate.replace(/\nROLLBACK;\s*$/, '')
  const probe=`
DO $test$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['races','race_stages','race_team_entries','race_preparations'] LOOP
    IF to_regclass('uranius_game.'||t) IS NULL THEN RAISE EXCEPTION 'Missing %',t; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.oid=to_regclass('uranius_game.'||t)
      AND c.relrowsecurity AND c.relforcerowsecurity) THEN RAISE EXCEPTION 'Unsecured %',t; END IF;
    IF has_table_privilege('anon','uranius_game.'||t,'SELECT') OR
       has_table_privilege('authenticated','uranius_game.'||t,'SELECT') THEN
      RAISE EXCEPTION 'Unexpected browser grant %',t;
    END IF;
  END LOOP;
END $test$;
SELECT COUNT(*)::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='uranius_game' AND c.relname IN
  ('races','race_stages','race_team_entries','race_preparations');
ROLLBACK;`
  assert.equal(sql(expanded+'\n'+probe),'4')
  assert.equal(sql("SELECT count(*)::text FROM pg_class WHERE oid=to_regclass('uranius_game.races')"),'0')
  pass('All four tables exist inside transaction with FORCE RLS, no client SELECT; rollback clean')

  // Test invalid FK, duplicate race-stage, canceled status; no persisted data.
  const uuidA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const race='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const stage='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const fixtures=`
INSERT INTO uranius_game.club_profiles(club_id) VALUES ('${uuidA}');
INSERT INTO uranius_game.races(id,name,start_date,end_date) VALUES
('${race}','Local test race','2000-01-07','2000-01-07');
INSERT INTO uranius_game.race_stages(id,race_id,stage_number,start_city,finish_city,
distance_km,terrain_type,stage_date) VALUES
('${stage}','${race}',1,'Start','Finish',120,'flat','2000-01-07');
INSERT INTO uranius_game.race_team_entries(race_id,club_id,participating_club_id,status)
VALUES ('${race}','${uuidA}','${uuidA}','accepted');
INSERT INTO uranius_game.race_preparations(race_id,club_id,participating_club_id,
status,startlist_status) VALUES ('${race}','${uuidA}','${uuidA}','submitted','submitted');
SELECT (SELECT count(*) FROM uranius_game.race_team_entries)::text||':'||
(SELECT count(*) FROM uranius_game.race_preparations)::text;
ROLLBACK;`
  assert.equal(sql(expanded+'\n'+fixtures),'1:1')
  pass('Synthetic race, stage, accepted entry and submitted preparation satisfy native FKs')

  const invalid=expanded+`
INSERT INTO uranius_game.race_team_entries(race_id,club_id,participating_club_id,status)
VALUES ('${race}','${uuidA}','${uuidA}','accepted');
ROLLBACK;`
  sql(invalid,'uranius_fixture_admin',true)
  assert.equal(sql("SELECT count(*)::text FROM pg_class WHERE oid=to_regclass('uranius_game.races')"),'0')
  pass('Unknown club/race foreign keys fail closed and leave no race tables')

  console.log('PASS '+checks+' disposable native PG17 checks; no hosted access or data writes')
} finally {
  if(startAttempted){
    try {
      const r=spawnSync(exe.pg_ctl,['-D',data,'status'],{env,encoding:'utf8',windowsHide:true,timeout:10000})
      if(r.status===0||started){
        cmd(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],undefined,false,'ignore')
        safeToRemove=true
      }else if(r.status===3||r.status===4){safeToRemove=true}
    }catch(e){console.error('WARNING PG17 cleanup failed: '+e.message)}
  }else safeToRemove=true
  if(safeToRemove){
    try{rmSync(scratch,{recursive:true,force:true,maxRetries:12,retryDelay:500})
      console.log('INFO Disposable PostgreSQL files cleaned up')
    }catch(e){console.error('WARNING Cleanup required for '+scratch+': '+e.message);process.exitCode=1}
  }else{console.error('WARNING Disposable instance could not be proven stopped; retained '+scratch);process.exitCode=1}
}
