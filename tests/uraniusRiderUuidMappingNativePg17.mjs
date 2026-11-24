// Disposable PostgreSQL 17 rehearsal only. Host = loopback. No Supabase connection.
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs'
import {join,resolve,delimiter,basename} from 'node:path'
import {tmpdir} from 'node:os'
import {createServer} from 'node:net'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const a=process.argv.slice(2)
if(a.length!==3||a[0]!=='--disposable-native-pg17'||a[1]!=='--postgres-bin')
 throw new Error('Usage: node tests/uraniusRiderUuidMappingNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\\path\\to\\postgresql-17.12-portable\\bin"')
const root=fileURLToPath(new URL('../',import.meta.url)),bin=resolve(a[2])
const ext=process.platform==='win32'?'.exe':''
const exe=Object.fromEntries(['initdb','pg_ctl','psql'].map(n=>[n,join(bin,n+ext)]))
for(const p of Object.values(exe))assert.ok(existsSync(p),'Missing PostgreSQL binary '+basename(p))
const env={PATH:bin+delimiter+(process.env.PATH??''),SYSTEMROOT:process.env.SYSTEMROOT??'',
 WINDIR:process.env.WINDIR??'',TEMP:process.env.TEMP??tmpdir(),TMP:process.env.TMP??tmpdir()}
function run(file,argv,options={}){
 const p=spawnSync(file,argv,{env:options.env??env,input:options.input,stdio:options.stdio,
  encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:4e6})
 if(options.reject){assert.ok(p.error||p.status!==0,'Expected PostgreSQL denial');return}
 if(p.error||p.status!==0)throw new Error(basename(file)+' failed: '+(p.stderr||p.error?.message||'unknown').slice(0,1200))
 return (p.stdout??'').trim()
}
for(const p of Object.values(exe))assert.match(run(p,['--version']),/\b17\.\d+/)
const scratch=mkdtempSync(join(tmpdir(),'uranius-rider-014-only-')),data=join(scratch,'data')
const listener=createServer()
await new Promise((yes,no)=>listener.once('error',no).listen(0,'127.0.0.1',yes))
const port=listener.address().port
await new Promise(yes=>listener.close(yes))
const dbEnv={...env,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',
 PGPORT:String(port),PGDATABASE:'postgres',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',
 PGOPTIONS:'-c statement_timeout=10000'}
function sql(input,user='uranius_migrator',reject=false){
 const out=run(exe.psql,['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-f','-'],
  {env:dbEnv,input,reject})
 return reject?undefined:out.split(/\r?\n/).at(-1)
}
const wrap=q=>"BEGIN;\nSELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);\n"+q+"\nCOMMIT;"
const source=readFileSync(join(root,'database/reconstruction/squad/014_synthetic_rider_uuid_REVIEW_ONLY.sql'),'utf8')
const tlsGuard='OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)'
assert.equal(source.split(tlsGuard).length,2,'Expected single exact TLS clause for disposable-only substitution')
const offline=source.replace(tlsGuard,'OR FALSE /* disposable fixture: bypass ONLY TLS */')
let attempted=false,started=false,count=0
const pass=s=>{count++;console.log('PASS '+s)}
try{
 console.log('INFO Starting disposable PostgreSQL 17; loopback only')
 run(exe.initdb,['-D',data,'-U','uranius_fixture_admin','-A','trust','--no-locale','--no-sync','-E','UTF8'])
 attempted=true
 run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o',
  '-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 started=true
 sql("CREATE ROLE uranius_migrator LOGIN NOINHERIT; CREATE ROLE anon NOLOGIN; "+
 "CREATE ROLE authenticated NOLOGIN; CREATE ROLE uranius_smoke_reader LOGIN NOINHERIT; "+
 "CREATE SCHEMA uranius_catalog AUTHORIZATION uranius_migrator; "+
 "CREATE SCHEMA uranius_game AUTHORIZATION uranius_migrator; "+
 "CREATE SCHEMA uranius_private AUTHORIZATION uranius_migrator;",'uranius_fixture_admin')
 const setup=[
 "CREATE TABLE uranius_private.migration_ledger(version text PRIMARY KEY,sha256 text NOT NULL);",
 "INSERT INTO uranius_private.migration_ledger SELECT 'prior_'||n,'disposable-only' FROM generate_series(1,9) n;",
 "INSERT INTO uranius_private.migration_ledger VALUES",
 "('010_overview_race_reader.sql','56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af'),",
 "('013_squad_reader_grant.sql','8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859');",
 "CREATE FUNCTION uranius_private.assert_project() RETURNS void LANGUAGE plpgsql AS $func$ BEGIN",
 "IF current_setting('uranius.approved_project_ref',true) <> 'sdtsivgtcaoaeoihcwzd'",
 "THEN RAISE EXCEPTION 'Unexpected project'; END IF; END $func$;",
 "CREATE TABLE uranius_catalog.riders(rider_id integer PRIMARY KEY,team_id integer NOT NULL,label text);",
 "INSERT INTO uranius_catalog.riders SELECT n,(n-1)/10+1,'Fixture Rider '||n FROM generate_series(1,200) n;",
 "CREATE TABLE uranius_catalog.team_owners(team_id integer PRIMARY KEY,user_id uuid NOT NULL);",
 "INSERT INTO uranius_catalog.team_owners VALUES",
 "(1,'00000000-0000-4000-8000-000000000001'),(2,'00000000-0000-4000-8000-000000000002');",
 "CREATE FUNCTION uranius_catalog.request_uid() RETURNS uuid LANGUAGE sql STABLE AS $f$",
 "SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;",
 "ALTER TABLE uranius_catalog.riders ENABLE ROW LEVEL SECURITY;",
 "GRANT USAGE ON SCHEMA uranius_catalog TO uranius_smoke_reader;",
 "GRANT SELECT (rider_id,label) ON uranius_catalog.riders TO uranius_smoke_reader;",
 "CREATE POLICY riders_read ON uranius_catalog.riders FOR SELECT TO authenticated,uranius_smoke_reader",
 "USING (EXISTS (SELECT 1 FROM uranius_catalog.team_owners owner",
 "WHERE owner.team_id=riders.team_id AND owner.user_id=(SELECT uranius_catalog.request_uid())));"
 ].join('\n')
 sql(wrap(setup))
 assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'11')
 assert.equal(sql("SELECT count(*) FROM uranius_catalog.riders"),'200')
 pass('Disposable 11-ledger, 200-rider baseline initialized')
 sql(wrap(source),'uranius_migrator',true)
 assert.equal(sql("SELECT to_regclass('uranius_game.synthetic_rider_identity') IS NULL"),'t')
 pass('Unmodified 014 candidate refuses local non-TLS without persisting a table')
 sql(wrap(offline),'uranius_fixture_admin',true)
 assert.equal(sql("SELECT to_regclass('uranius_game.synthetic_rider_identity') IS NULL"),'t')
 pass('Administrative wrong execution role rejected')
 sql(wrap(offline))
 pass('Fresh synthetic UUID mapping created only under disposable TLS substitution')
 assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity",'uranius_fixture_admin'),'200')
 assert.equal(sql("SELECT count(DISTINCT rider_uuid) FROM uranius_game.synthetic_rider_identity",'uranius_fixture_admin'),'200')
 assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity WHERE rider_uuid='00000000-0000-0000-0000-000000000000'",'uranius_fixture_admin'),'0')
 pass('200 generated UUID values are unique and not zero')
 assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity m JOIN uranius_catalog.riders r USING(rider_id)",'uranius_fixture_admin'),'200')
 assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity WHERE identity_provenance <> 'uranius_generated_synthetic'",'uranius_fixture_admin'),'0')
 pass('All identities retain exact synthetic rider FK and provenance')
 assert.equal(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='uranius_game.synthetic_rider_identity'::regclass"),'true:true')
 assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity'"),'0')
 pass('New mapping is FORCE RLS with zero SELECT policies')
 for(const role of ['anon','authenticated','uranius_smoke_reader'])
  assert.equal(sql("SELECT has_any_column_privilege('"+role+"','uranius_game.synthetic_rider_identity','SELECT')"),'f')
 sql("SELECT * FROM uranius_game.synthetic_rider_identity",'uranius_smoke_reader',true)
 pass('No anonymous, authenticated or restricted-reader mapping SELECT grants')
 assert.equal(sql("SELECT count(*) FROM uranius_game.synthetic_rider_identity"),'0')
 assert.equal(sql("SELECT count(*) FROM uranius_private.migration_ledger"),'11')
 pass('FORCE RLS protects against table-owner reads; migration ledger unchanged')
 sql(wrap(offline),'uranius_migrator',true)
 pass('Duplicate mapping attempt fails closed')
 console.log('PASS '+count+' disposable PostgreSQL 17 UUID mapping checks; no hosted changes')
}finally{
 let safe=!attempted
 if(attempted){
  const st=spawnSync(exe.pg_ctl,['-D',data,'status'],{env,encoding:'utf8',timeout:5000,windowsHide:true})
  if(st.status===0||started){
   try{run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});safe=true}
   catch(e){console.error('WARNING Disposable PostgreSQL stop not verified: '+e.message)}
  }else if(st.status===3||st.status===4)safe=true
 }
 if(safe){
  try{rmSync(scratch,{recursive:true,force:true,maxRetries:12,retryDelay:500});console.log('INFO Disposable PostgreSQL files cleaned')}
  catch(e){console.error('WARNING PGDATA cleanup incomplete: '+e.message);process.exitCode=1}
 }else{console.error('WARNING Disposable PGDATA not confirmed stopped; retained scratch.');process.exitCode=1}
}
