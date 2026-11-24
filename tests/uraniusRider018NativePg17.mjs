// Project Uranius 018: OFFLINE disposable PostgreSQL 17 only; loopback PGDATA is removed.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {join,resolve,delimiter,basename} from 'node:path'
import {tmpdir} from 'node:os'
import {createServer} from 'node:net'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const args=process.argv.slice(2)
if(args.length!==3||args[0]!=='--disposable-native-pg17'||args[1]!=='--postgres-bin')
 throw new Error('Usage: node tests/uraniusRider018NativePg17.mjs --disposable-native-pg17 --postgres-bin <PostgreSQL 17 bin folder>')
const root=fileURLToPath(new URL('../',import.meta.url)),bin=resolve(args[2]),ext=process.platform==='win32'?'.exe':''
const ex=Object.fromEntries(['initdb','pg_ctl','psql'].map(k=>[k,join(bin,k+ext)]))
for(const p of Object.values(ex))if(!existsSync(p))throw new Error('Missing PostgreSQL 17 executable: '+p)
const env={PATH:bin+delimiter+(process.env.PATH||''),SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}
function run(file,args,{e=env,input,reject=false,stdio}={}){
 const r=spawnSync(file,args,{env:e,input,stdio,encoding:'utf8',timeout:40000,windowsHide:true,maxBuffer:4e6})
 if(reject){assert.ok(r.error||r.status!==0,'Expected PostgreSQL rejection');return null}
 if(r.error||r.status!==0)throw new Error(basename(file)+' failed: '+(r.stderr||r.error?.message||r.stdout||'unknown').slice(0,1300))
 return (r.stdout||'').trim()
}
for(const p of Object.values(ex))assert.match(run(p,['--version']),/\b17\.\d+/)
const dir=mkdtempSync(join(tmpdir(),'uranius-018-disposable-')),data=join(dir,'data')
const listener=createServer()
await new Promise((ok,fail)=>listener.once('error',fail).listen(0,'127.0.0.1',ok))
const port=listener.address().port
await new Promise(ok=>listener.close(ok))
const db={...env,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',PGPORT:String(port),PGDATABASE:'postgres',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5'}
function sql(q,user='uranius_migrator',reject=false){
 const out=run(ex.psql,['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-f','-'],{e:db,input:q,reject})
 return reject?null:out.split(/\r?\n/).at(-1)
}
const wrap=q=>"BEGIN;\nSELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);\n"+q+"\nCOMMIT;"
const candidate=readFileSync(join(root,'database/reconstruction/squad/018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql'),'utf8')
const tls='OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)'
assert.equal(candidate.split(tls).length,2,'Expected one exact TLS guard, replaced only in disposable fixture')
const offline=candidate.replace(tls,'OR FALSE /* LOCAL DISPOSABLE ONLY */')
let attempted=false,started=false,count=0
const pass=s=>{count++;console.log('PASS '+s)}
try{
 console.log('INFO Starting scratch PostgreSQL 17 on 127.0.0.1; no hosted connection')
 run(ex.initdb,['-D',data,'-U','uranius_fixture_admin','-A','trust','--no-locale','--no-sync','-E','UTF8'])
 attempted=true
 run(ex.pg_ctl,['-D',data,'-l',join(dir,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 started=true
 const setup=[
 "CREATE ROLE uranius_migrator LOGIN NOINHERIT;",
 "CREATE ROLE uranius_smoke_reader LOGIN NOINHERIT;",
 "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;",
 "GRANT CREATE ON DATABASE postgres TO uranius_migrator;",
 "CREATE SCHEMA uranius_catalog AUTHORIZATION uranius_migrator;",
 "CREATE SCHEMA uranius_game AUTHORIZATION uranius_migrator;",
 "CREATE SCHEMA uranius_private AUTHORIZATION uranius_migrator;",
 "SET ROLE uranius_migrator;",
 "CREATE TABLE uranius_private.migration_ledger(version text PRIMARY KEY,sha256 text NOT NULL);",
 "INSERT INTO uranius_private.migration_ledger SELECT 'fixture_'||n,'test-only' FROM generate_series(1,12)n;",
 "INSERT INTO uranius_private.migration_ledger VALUES ('015_rider_uuid_owner_read.sql','71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e');",
 "CREATE FUNCTION uranius_private.assert_project() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN",
 "IF current_setting('uranius.approved_project_ref',true)<>'sdtsivgtcaoaeoihcwzd' THEN RAISE EXCEPTION 'Wrong fixture project'; END IF; END $f$;",
 "CREATE TABLE uranius_catalog.team_owners(team_id integer PRIMARY KEY,user_id uuid NOT NULL);",
 "INSERT INTO uranius_catalog.team_owners VALUES (1,'00000000-0000-4000-8000-000000000001'),(2,'00000000-0000-4000-8000-000000000002');",
 "CREATE TABLE uranius_catalog.riders(rider_id integer PRIMARY KEY,team_id integer NOT NULL,label text NOT NULL,flat smallint NOT NULL,climbing smallint NOT NULL,stamina smallint NOT NULL,resistance smallint NOT NULL);",
 "INSERT INTO uranius_catalog.riders SELECT n,(n-1)/10+1,'Fixture Rider '||n,(50+n%40)::smallint,(60+n%35)::smallint,(55+n%42)::smallint,(54+n%39)::smallint FROM generate_series(1,200)n;",
 "ALTER TABLE uranius_catalog.riders ENABLE ROW LEVEL SECURITY;",
 "CREATE FUNCTION uranius_catalog.request_uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;",
 "GRANT USAGE ON SCHEMA uranius_catalog,uranius_game TO uranius_smoke_reader;",
 "GRANT SELECT (rider_id,label,flat,climbing,stamina,resistance) ON uranius_catalog.riders TO uranius_smoke_reader;",
 "GRANT SELECT ON uranius_catalog.team_owners TO uranius_smoke_reader;",
 "CREATE POLICY riders_read ON uranius_catalog.riders FOR SELECT TO uranius_smoke_reader USING (EXISTS(SELECT 1 FROM uranius_catalog.team_owners own WHERE own.team_id=riders.team_id AND own.user_id=uranius_catalog.request_uid()));",
 "CREATE TABLE uranius_game.synthetic_rider_identity(rider_id integer PRIMARY KEY REFERENCES uranius_catalog.riders(rider_id) ON DELETE RESTRICT,rider_uuid uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid() UNIQUE);",
 "INSERT INTO uranius_game.synthetic_rider_identity(rider_id) SELECT rider_id FROM uranius_catalog.riders;",
 "ALTER TABLE uranius_game.synthetic_rider_identity ENABLE ROW LEVEL SECURITY;",
 "ALTER TABLE uranius_game.synthetic_rider_identity FORCE ROW LEVEL SECURITY;",
 "CREATE POLICY synthetic_rider_uuid_owner_read ON uranius_game.synthetic_rider_identity FOR SELECT TO uranius_smoke_reader USING (EXISTS(SELECT 1 FROM uranius_catalog.riders r WHERE r.rider_id=synthetic_rider_identity.rider_id));",
 "GRANT SELECT (rider_id,rider_uuid) ON uranius_game.synthetic_rider_identity TO uranius_smoke_reader;",
 "RESET ROLE;"
 ].join('\n')
 sql(setup,'uranius_fixture_admin')
 assert.equal(sql('SELECT count(*) FROM uranius_private.migration_ledger'),'13')
 pass('Scratch baseline 200 synthetic riders and 13 ledger entries (fixture only, not full history)')
 const name='uranius_game.synthetic_rider_attributes'
 sql(wrap(candidate),'uranius_migrator',true)
 assert.equal(sql("SELECT to_regclass('"+name+"') IS NULL"),'t')
 pass('Exact 018 source refuses non-TLS execution')
 sql(wrap(offline),'uranius_fixture_admin',true)
 assert.equal(sql("SELECT to_regclass('"+name+"') IS NULL"),'t')
 pass('Wrong-role administrative execution refused')
 sql("BEGIN; SELECT set_config('uranius.approved_project_ref','wrong',true);\n"+offline+"\nROLLBACK;",'uranius_migrator',true)
 pass('Wrong isolated project reference refused')
 sql(wrap("UPDATE uranius_private.migration_ledger SET sha256='bad' WHERE version='015_rider_uuid_owner_read.sql';"))
 sql(wrap(offline),'uranius_migrator',true)
 sql(wrap("UPDATE uranius_private.migration_ledger SET sha256='71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e' WHERE version='015_rider_uuid_owner_read.sql';"))
 pass('Altered installed 015 digest refused')
 sql(wrap(offline))
 pass('018 candidate runs in scratch fixture under deliberate TLS-only substitution')
 assert.equal(sql('SELECT count(*) FROM '+name,'uranius_fixture_admin'),'200')
 assert.equal(sql("SELECT count(*) FROM "+name+" WHERE sprint IS NOT NULL OR time_trial IS NOT NULL OR endurance IS NOT NULL OR recovery IS NOT NULL OR race_iq IS NOT NULL OR teamwork IS NOT NULL",'uranius_fixture_admin'),'0')
 assert.equal(sql("SELECT count(*) FROM "+name+" WHERE flat_source='isolated_catalog' AND climbing_source='isolated_catalog' AND resistance_source='isolated_catalog'",'uranius_fixture_admin'),'200')
 assert.equal(sql('SELECT count(*) FROM '+name+' a JOIN uranius_catalog.riders r USING(rider_id) WHERE a.climbing=r.climbing AND a.flat=r.flat AND a.resistance=r.resistance','uranius_fixture_admin'),'200')
 pass('Three observed original skill values copied exactly; six unknown values remain NULL')
 assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='"+name+"'::regclass"),'true:true')
 assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_attributes'"),'0')
 for(const role of ['anon','authenticated','uranius_smoke_reader'])
  assert.equal(sql("SELECT has_any_column_privilege('"+role+"','"+name+"','SELECT')"),'f')
 pass('FORCE RLS, no policy, zero public/authenticated/reader SELECT permissions')
 for(const verb of ['SELECT rider_id FROM ','INSERT INTO ','UPDATE ','DELETE FROM ']){
  const q=verb==='INSERT INTO '?verb+name+'(rider_id) VALUES (1)':verb==='UPDATE '?verb+name+' SET flat=1 WHERE rider_id=1':verb==='DELETE FROM '?verb+name+' WHERE rider_id=1':verb+name+' LIMIT 1'
  sql(q,'uranius_smoke_reader',true)
 }
 pass('Restricted reader SELECT/INSERT/UPDATE/DELETE denied')
 const fail=q=>sql('BEGIN;\n'+q+'\nROLLBACK;','uranius_fixture_admin',true)
 fail('UPDATE '+name+' SET sprint=44 WHERE rider_id=1;')
 fail("UPDATE "+name+" SET sprint=44,sprint_source='isolated_catalog' WHERE rider_id=1;")
 fail("UPDATE "+name+" SET sprint=101,sprint_source='approved_synthetic_fixture' WHERE rider_id=1;")
 fail('UPDATE '+name+' SET climbing_source=NULL WHERE rider_id=1;')
 fail("UPDATE "+name+" SET endurance=12,endurance_source='isolated_catalog' WHERE rider_id=1;")
 fail('INSERT INTO '+name+'(rider_id) VALUES (999999);')
 pass('SQL rejects forged provenance, NULL-source mismatch, out-of-bounds and orphan rider')
 sql("BEGIN; UPDATE "+name+" SET sprint=44,sprint_source='approved_synthetic_fixture' WHERE rider_id=1; ROLLBACK;",'uranius_fixture_admin')
 assert.equal(sql('SELECT sprint IS NULL FROM '+name+' WHERE rider_id=1','uranius_fixture_admin'),'t')
 pass('Explicit synthetic fixture provenance can be tested and rolled back without lasting value')
 sql(wrap(offline),'uranius_migrator',true)
 assert.equal(sql('SELECT count(*) FROM uranius_private.migration_ledger'),'13')
 pass('Duplicate candidate refused; original synthetic ledger count preserved')
 console.log('RESULT '+count+'/'+count+' PASS — temporary database will be destroyed')
}finally{
 if(started)try{run(ex.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'})}catch(e){console.error('Scratch PG shutdown failed: '+e.message)}
 try{rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:250});console.log('INFO Disposable PGDATA removed')}
 catch(e){console.error('IMPORTANT: scratch folder cleanup failed: '+e.message)}
}
