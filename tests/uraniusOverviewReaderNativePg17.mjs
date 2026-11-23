// Disposable-only native PostgreSQL 17 integration test of 010 schema + 012 permissions + 011 schedule.
// Never uses a hosted DSN. Creates a fresh loopback PGDATA and removes it after shutdown.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, delimiter, join, resolve } from 'node:path'
import { createServer } from 'node:net'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
if (args.length !== 3 || args[0] !== '--disposable-native-pg17' || args[1] !== '--postgres-bin')
  throw new Error('Usage: node tests/uraniusOverviewReaderNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\\path\\to\\postgresql-17.12-portable\\bin"')
const root=fileURLToPath(new URL('../',import.meta.url))
const bin=resolve(args[2]),ext=process.platform==='win32'?'.exe':''
const exe=Object.fromEntries(['initdb','pg_ctl','psql'].map(x=>[x,join(bin,x+ext)]))
for(const v of Object.values(exe)) if(!existsSync(v))throw new Error('Missing PG17 binary: '+v)
const env={PATH:bin+delimiter+(process.env.PATH||''),SYSTEMROOT:process.env.SYSTEMROOT||'',
  WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}
function run(file,argv,{input,db=false,reject=false,stdio}={}){
  const result=spawnSync(file,argv,{encoding:'utf8',env:db?dbEnv:env,input,windowsHide:true,
    stdio,timeout:30000,maxBuffer:4000000})
  if(result.error)throw result.error
  if(reject){assert.notEqual(result.status,0,'Expected PostgreSQL rejection');return ''}
  if(result.status!==0)throw new Error(basename(file)+' failed: '+(result.stderr||result.stdout||'unknown').slice(0,2200))
  return (result.stdout||'').trim().split(/\r?\n/).at(-1)
}
for(const v of Object.values(exe))assert.match(run(v,['--version']),/17\.\d+/)
const scratch=mkdtempSync(join(tmpdir(),'uranius-012-reader-'))
const pgdata=join(scratch,'data')
const listener=createServer()
await new Promise((ok,no)=>listener.once('error',no).listen(0,'127.0.0.1',ok))
const port=listener.address().port
await new Promise(ok=>listener.close(ok))
const dbEnv={...env,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',
 PGPORT:String(port),PGDATABASE:'postgres',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',
 PGOPTIONS:'-c statement_timeout=12000'}
const sql=(input,{reject=false}={})=>run(exe.psql,
  ['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U','uranius_fixture_admin','-f','-'],
  {input,db:true,reject})
const read=path=>readFileSync(join(root,path),'utf8')
const schema=read('database/reconstruction/overview/010_race_schema_DISPOSABLE_REVIEW_ONLY.sql')
const policies=read('database/reconstruction/overview/012_owner_schedule_reader_DISPOSABLE_REVIEW_ONLY.sql')
const schedule=read('database/reconstruction/overview/011_overview_schedule_REVIEW_ONLY.sql')
const expand=source=>source.replace(/\nROLLBACK;\s*$/,'')
for(const src of [schema,policies]){assert.match(src,/ROLLBACK;\s*$/);assert.doesNotMatch(src,/\bCOMMIT\s*;/i)}
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const rA='11111111-1111-4111-8111-111111111111'
const rB='22222222-2222-4222-8222-222222222222'
const rToday='33333333-3333-4333-8333-333333333333'
let startAttempted=false,started=false,safeToRemove=false,checks=0
const pass=msg=>{checks++;console.log('PASS '+msg)}
const session=(club,query=schedule)=>{
  const prefix='BEGIN READ ONLY; SET LOCAL ROLE uranius_smoke_reader;'+
    "SELECT set_config('uranius.fixture_owner', '"+club+"', true);\n"
  // PG role permission identity comes from the mock invoker resolver in this disposable fixture only.
  const output=sql(prefix+query+'\nROLLBACK;')
  return JSON.parse(output)
}
try{
  console.log('INFO Creating isolated PG17 test database on loopback only')
  run(exe.initdb,['-D',pgdata,'-U','uranius_fixture_admin','-A','trust','--no-locale','--no-sync','-E','UTF8'])
  startAttempted=true
  run(exe.pg_ctl,['-D',pgdata,'-l',join(scratch,'postgres.log'),
    '-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
  started=true
  sql(`CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE uranius_smoke_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE SCHEMA uranius_game;
CREATE TABLE uranius_game.club_profiles (club_id uuid PRIMARY KEY);
CREATE TABLE uranius_game.game_state (
id boolean PRIMARY KEY DEFAULT true,
season_number integer NOT NULL,month_number smallint NOT NULL,day_number smallint NOT NULL,
is_paused boolean NOT NULL);
INSERT INTO uranius_game.game_state VALUES (true,1,1,1,true);
CREATE FUNCTION uranius_game.get_my_club_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
RETURN nullif(current_setting('uranius.fixture_owner',true),'')::uuid;`)
  pass('Local synthetic owner resolver and paused game clock provisioned')

  sql(schema)
  assert.equal(sql("SELECT count(*) FROM pg_tables WHERE schemaname='uranius_game' AND tablename='races'"),'0')
  pass('Exact unmodified 010 rollback-only candidate does not persist objects')

  // Commit is confined to this disposable database only; the original source ends with ROLLBACK.
  sql(expand(schema)+'\nCOMMIT;')
  sql(policies)
  assert.equal(sql("SELECT count(*) FROM pg_policy WHERE polrelid='uranius_game.race_preparations'::regclass"),'0')
  pass('Exact unmodified 012 permission rehearsal rolls back')

  sql(expand(policies)+'\nCOMMIT;')
  sql(`GRANT USAGE ON SCHEMA uranius_game TO uranius_smoke_reader;
GRANT EXECUTE ON FUNCTION uranius_game.get_my_club_id() TO uranius_smoke_reader;
ALTER TABLE uranius_game.game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY uranius_fixture_clock ON uranius_game.game_state FOR SELECT TO uranius_smoke_reader USING (true);
GRANT SELECT (id,season_number,month_number,day_number,is_paused)
 ON uranius_game.game_state TO uranius_smoke_reader;
INSERT INTO uranius_game.club_profiles VALUES ('${a}'),('${b}');
INSERT INTO uranius_game.races(id,name,start_date,end_date) VALUES
('${rA}','Team A race','2000-01-01','2000-01-01'),
('${rB}','Team B race','2000-01-01','2000-01-01'),
('${rToday}','World race','2000-01-01','2000-01-01');
INSERT INTO uranius_game.race_stages(race_id,stage_number,stage_date,start_city,finish_city,distance_km,terrain_type)
VALUES ('${rA}',1,'2000-01-01','Start','Finish',100,'flat'),
('${rB}',1,'2000-01-01','Start','Finish',100,'flat'),
('${rToday}',1,'2000-01-01','Start','Finish',100,'flat');
INSERT INTO uranius_game.race_preparations(race_id,club_id,participating_club_id,status,startlist_status)
VALUES ('${rA}','${a}','${a}','submitted','submitted'),
('${rB}','${b}','${b}','submitted','submitted');
INSERT INTO uranius_game.race_team_entries(race_id,club_id,participating_club_id,status)
VALUES ('${rA}','${a}','${a}','accepted'),
('${rB}','${b}','${b}','accepted');`)
  pass('Source-backed races, stages, entries and preparations seeded only locally')

  for(const [club,own,other] of [[a,rA,rB],[b,rB,rA]]){
    const response=session(club)
    assert.equal(response.upcomingSchedule.length,1)
    assert.equal(response.upcomingSchedule[0].id,own)
    assert.equal(response.todayRaces.length,3)
    assert.ok(response.todayRaces.some(x=>x.id.startsWith(other+':')))
    const entryCount=sql(`BEGIN READ ONLY; SET LOCAL ROLE uranius_smoke_reader;
SELECT set_config('uranius.fixture_owner','${club}',true);
SELECT count(*) FROM uranius_game.race_team_entries; ROLLBACK;`)
    assert.equal(entryCount,'1')
  }
  pass('A/B identities see only own upcoming preparations and entries; world-day cards remain global')

  for(const role of ['anon','authenticated']){
    const selectSql="BEGIN READ ONLY; SET LOCAL ROLE "+role+"; SELECT id FROM uranius_game.race_preparations; ROLLBACK;"
    sql(selectSql,{reject:true})
  }
  pass('Anonymous and ordinary authenticated roles denied private race preparation SELECT')

  const forbidden="BEGIN; SET LOCAL ROLE uranius_smoke_reader; UPDATE uranius_game.races SET name='tampered'; ROLLBACK;"
  sql(forbidden,{reject:true})
  pass('Restricted server reader cannot update race records')

  // This is the disposable test's only PostgreSQL instance. No remote connections are made.
  console.log('PASS '+checks+' native PostgreSQL 17 schedule/RLS checks; disposable fixture only')
} finally {
 if(startAttempted){
   try{
     const r=spawnSync(exe.pg_ctl,['-D',pgdata,'status'],{env,encoding:'utf8',windowsHide:true,timeout:10000})
     if(r.status===0||started){
       run(exe.pg_ctl,['-D',pgdata,'-m','immediate','-w','stop'],{stdio:'ignore'})
       safeToRemove=true
     }else if(r.status===3||r.status===4)safeToRemove=true
   }catch(error){console.error('WARNING cleanup failed: '+error.message)}
 }else safeToRemove=true
 if(safeToRemove){
   try{rmSync(scratch,{recursive:true,force:true,maxRetries:12,retryDelay:500})
      console.log('INFO Disposable PostgreSQL files cleaned up')}
   catch(e){console.error('WARNING Cleanup required for '+scratch+': '+e.message);process.exitCode=1}
 }else{console.error('WARNING Disposable PG17 not proven stopped: '+scratch);process.exitCode=1}
}
