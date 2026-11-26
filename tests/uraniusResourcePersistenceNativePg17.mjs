// Local disposable PostgreSQL 17 only. No hosted URLs, passwords or app writes.
import assert from 'node:assert/strict'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,delimiter} from 'node:path'
import {createServer} from 'node:net'
import {spawnSync,spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const args=process.argv.slice(2)
assert.ok(args.length===3&&args[0]==='--disposable-native-pg17'&&args[1]==='--postgres-bin')
const root=fileURLToPath(new URL('../',import.meta.url)),bin=resolve(args[2]),ext=process.platform==='win32'?'.exe':''
const exe=Object.fromEntries(['initdb','pg_ctl','psql'].map(n=>[n,join(bin,n+ext)]))
const env={PATH:bin+delimiter+(process.env.PATH||''),SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}
function run(file,argv,opts={}){
 const r=spawnSync(file,argv,{env:opts.env||env,input:opts.input,encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:12e6,stdio:opts.stdio})
 if(r.error)throw r.error
 if(opts.error){assert.notEqual(r.status,0);assert.match(r.stderr,opts.error);return}
 if(r.status!==0)throw Error((r.stderr||r.stdout||'native command failed').slice(0,2000))
 return (r.stdout||'').trim()
}
for(const f of Object.values(exe)){assert.ok(existsSync(f));assert.match(run(f,['--version']),/\b17\.\d+/)}
const scratch=mkdtempSync(join(tmpdir(),'uranius-043h-disposable-')),data=join(scratch,'data'),admin='uranius_fixture_admin'
const listener=createServer()
await new Promise((yes,no)=>listener.once('error',no).listen(0,'127.0.0.1',yes))
const port=listener.address().port;await new Promise(yes=>listener.close(yes))
const dbEnv={...env,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',PGPORT:String(port),PGDATABASE:'postgres',PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5',PGOPTIONS:'-c statement_timeout=10000'}
const argv=user=>['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-f','-']
const sql=(input,error,user=admin)=>run(exe.psql,argv(user),{env:dbEnv,input,error})
const concurrent=input=>new Promise((yes,no)=>{
 const c=spawn(exe.psql,argv(admin),{env:dbEnv,windowsHide:true})
 let out='',err='';const timer=setTimeout(()=>{c.kill();no(Error('concurrent command timeout'))},20000)
 c.stdout.on('data',x=>out+=x);c.stderr.on('data',x=>err+=x)
 c.on('error',e=>{clearTimeout(timer);no(e)})
 c.on('close',code=>{clearTimeout(timer);code===0?yes(out.trim()):no(Error(err.slice(0,1500)))})
 c.stdin.end(input)
})

const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const sch='uranius_043h_fixture',lit=s=>"'"+String(s).replaceAll("'","''")+"'"
const owner=id(1),other=id(2),bike=id(101),car=id(102),unitA=id(201),unitB=id(202),unitC=id(203)
const stock=(o=owner,k='energy_gels')=>JSON.parse(sql('SELECT to_jsonb(s) FROM '+sch+'.stock s WHERE owner_id='+lit(o)+' AND supply_key='+lit(k)+';'))
const unit=u=>JSON.parse(sql('SELECT to_jsonb(s) FROM '+sch+'.units s WHERE unit_id='+lit(u)+';'))
const wear=u=>JSON.parse(sql('SELECT to_jsonb(s) FROM '+sch+'.wear s WHERE resource_id='+lit(u)+';'))
const effects=r=>JSON.parse(sql("SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY resource_key),'[]') FROM "+sch+".effects e WHERE run_id="+lit(r)+";"))
const snapshot=()=>sql("SELECT jsonb_build_array("+['stock','units','wear','effects','receipts'].map(t=>"(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM "+sch+"."+t+" x)").join(',')+");")
const apply=(r,f=false)=>'SELECT '+sch+'.apply_resources('+lit(r)+','+f+');'
const use=(n,o=owner,k='energy_gels')=>({key:'supply:'+o+':'+k,ownerId:o,kind:'consumable',supplyKey:k,quantityUsed:n})
const damage=(u,kind,loss,o=owner)=>({key:'wear:'+u,ownerId:o,kind:'wear',resourceId:u,assetKind:kind,conditionUsed:loss})
const durable=(u,o=owner)=>({key:'durable:'+u,ownerId:o,kind:'durable',unitId:u,supplyKey:'race_jersey_complete',stageUsesUsed:1})
function seed(n,packet,exact=false,date='2000-01-02'){
 const run=id(n),json=lit(JSON.stringify(packet))+'::jsonb'
 sql('INSERT INTO '+sch+'.jobs SELECT '+[run,id(n+1000),id(n+2000),date].map(lit).join(',')+',120,'+exact+','+json+",encode(sha256(convert_to(("+json+")::text,'UTF8')),'hex');")
 return run
}
let checks=0,started=false;const pass=x=>{checks++;console.log('PASS '+x)}
try{
 run(exe.initdb,['-D',data,'-U',admin,'-A','trust','--no-locale','--no-sync','-E','UTF8'])
 started=true;run(exe.pg_ctl,['-D',data,'-l',join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c fsync=off','-w','start'],{stdio:'ignore'})
 sql(readFileSync(join(root,'database/reconstruction/worker/043H_resource_persistence_native_REVIEW_ONLY.sql'),'utf8'))
 sql('INSERT INTO '+sch+'.owners VALUES ('+lit(owner)+'),('+lit(other)+');')
 sql('INSERT INTO '+sch+'.stock(owner_id,supply_key,quantity) VALUES ('+lit(owner)+",'energy_gels',10),("+lit(owner)+",'race_jersey_complete',3),("+lit(other)+",'energy_gels',8);")
 sql('INSERT INTO '+sch+'.units(unit_id,owner_id,supply_key,remaining,max_uses,status,last_used,created_order) VALUES '+[[unitA,owner,'race_jersey_complete',5,10,'ready','2000-01-02',1],[unitB,owner,'race_jersey_complete',1,10,'assigned','2000-01-01',2],[unitC,owner,'race_jersey_complete',4,10,'ready','2000-01-01',3]].map(a=>'('+a.map(lit).join(',')+')').join(',')+';')
 sql('INSERT INTO '+sch+'.wear(resource_id,owner_id,kind,condition) VALUES ('+lit(bike)+','+lit(owner)+",'equipment',79.80),("+lit(car)+','+lit(owner)+",'team_car',0.10);")
 const first=seed(11,[use(3),damage(bike,'equipment',.42),damage(car,'team_car',.25),durable(unitA),durable(unitC)])
 const pristine=snapshot();sql(apply(first,true),/Injected resource failure/);assert.equal(snapshot(),pristine)
 assert.equal(sql(apply(first)),'applied_fixture')
 assert.equal(stock().quantity,7);assert.equal(stock().total_used,3)
 assert.equal(Number(wear(bike).condition),79.38);assert.equal(Number(wear(car).condition),0);assert.equal(wear(bike).race_days,1);assert.equal(Number(wear(bike).distance_km),120)
 assert.equal(unit(unitA).remaining,5);assert.equal(unit(unitB).remaining,0);assert.equal(unit(unitB).status,'worn_out');assert.equal(unit(unitB).retired,'2000-01-02')
 assert.equal(unit(unitC).remaining,3);assert.equal(unit(unitC).status,'ready');assert.equal(stock(owner,'race_jersey_complete').quantity,2);assert.equal(stock(owner,'race_jersey_complete').total_used,2)
 assert.equal(effects(first).find(x=>x.resource_key==='durable:'+unitA).applied_id,unitB)
 assert.equal(effects(first).find(x=>x.resource_key==='durable:'+unitA).outcome,'rebound')
 pass('043H atomic rollback, locked current wear delta, exact stock and deterministic reserved-unit exclusion/rebound')
 const skip=seed(12,[durable(unitA)])
 assert.equal(sql(apply(skip)),'applied_fixture');assert.equal(effects(skip)[0].outcome,'shortage_skip');assert.equal(effects(skip)[0].effect.stageUsesUsed,0)
 const closed=snapshot(),exact=seed(13,[durable(unitA)],true)
 sql(apply(exact),/Exact durable unavailable/);assert.equal(snapshot(),closed)
 pass('043H unpublished durable shortage recorded without sporting change; exact-only refuses')
 const bad=seed(14,[damage(bike,'equipment',.5),use(99)]),foreign=seed(15,[damage(bike,'equipment',.5,other)]),dup=seed(16,[use(1),use(2)])
 const old=snapshot();sql(apply(bad),/Consumable shortage/);sql(apply(foreign),/Wear owner or asset mismatch/);sql(apply(dup),/Invalid resource identity/);assert.equal(snapshot(),old)
 pass('043H consumable shortage, foreign owner and duplicate keys rejected atomically')
 const j2=seed(21,[use(2),damage(bike,'equipment',.42)],false,'2000-01-03')
 const j3=seed(22,[use(3),damage(bike,'equipment',.42)],false,'2000-01-03')
 const pair=await Promise.all([concurrent('BEGIN;'+apply(j2)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(apply(j3))])
 assert.deepEqual(pair,['applied_fixture','applied_fixture'])
 assert.equal(stock().quantity,2);assert.equal(stock().total_used,8);assert.equal(Number(wear(bike).condition),78.54);assert.equal(wear(bike).race_days,3);assert.equal(Number(wear(bike).distance_km),360)
 pass('043H simultaneous different races sharing owner consume current stock and accumulate wear without lost updates')
 const j4=seed(23,[use(2)]),j5=seed(24,[use(2)])
 const competition=await Promise.allSettled([concurrent(apply(j4)),concurrent(apply(j5))])
 assert.equal(competition.filter(x=>x.status==='fulfilled').length,1);assert.equal(competition.filter(x=>x.status==='rejected').length,1)
 assert.match(competition.find(x=>x.status==='rejected').reason.message,/Consumable shortage/)
 assert.equal(stock().quantity,0);assert.equal(stock().total_used,10)
 pass('043H simultaneous competing stock requests cannot overspend inventory')
 const retry=seed(31,[use(2,other)])
 const twice=await Promise.all([concurrent('BEGIN;'+apply(retry)+'SELECT pg_sleep(0.3);COMMIT;'),concurrent(apply(retry))])
 assert.deepEqual(twice.sort(),['already_applied_fixture','applied_fixture']);assert.equal(stock(other).quantity,6)
 const latest=snapshot();assert.equal(sql(apply(first)),'already_applied_fixture');assert.equal(sql(apply(skip)),'already_applied_fixture');assert.equal(snapshot(),latest)
 sql('UPDATE '+sch+'.effects SET effect=effect||'+lit('{"tampered":true}')+'::jsonb WHERE run_id='+lit(first)+';')
 const altered=snapshot();sql(apply(first),/Immutable receipt changed/);assert.equal(snapshot(),altered)
 pass('043H concurrent same-run retries exactly once; prior receipt stable after later races; tampered effect rejected')
 assert.equal(sql('SELECT count(*) FROM '+sch+'.receipts WHERE official OR hosted_write_allowed OR accounting_allowed;'),'0')
 sql('UPDATE '+sch+'.receipts SET official=true;',/violates check constraint/)
 assert.equal(sql('SELECT count(*) FROM '+sch+'.effects WHERE run_id='+lit(exact)+';'),'0')
 assert.equal(checks,6);pass('043H hard false authority flags; no official persistence')
 console.log('PASS 7/7 resource persistence checks; no hosted connection')
}finally{if(started)run(exe.pg_ctl,['-D',data,'-m','immediate','-w','stop'],{stdio:'ignore'});rmSync(scratch,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO disposable cluster cleaned up')}
