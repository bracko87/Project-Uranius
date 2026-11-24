import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {test} from 'node:test'
import {createClubDashboardAdapter} from '../database/synthetic-world/club-dashboard-adapter.mjs'
import {projectSyntheticSquadUuidPreview} from '../database/reconstruction/squad/synthetic-squad-uuid-preview.mjs'

const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002'
const clubs={[A]:'00000000-0000-4000-8000-000000000011',[B]:'00000000-0000-4000-8000-000000000022'}
const missing=['assigned_role','age_years','overall','availability_status','fatigue','country_code','birth_date','morale','potential','contract']
const rider=(id,uuid)=>({syntheticRiderId:id,syntheticRiderUuid:uuid,label:'Synthetic '+id,flat:55,climbing:64,stamina:70,resistance:61})
const aa='f00ba000-0000-4000-8000-000000000001',bb='f00ba000-0000-4000-8000-000000000011'
const packet=id=>({kind:'syntheticSquadUuidPreview',clubId:clubs[id],missingOriginalFields:missing,
 riders:[rider(id===A?1:11,id===A?aa:bb)]})
test('strict UUID Squad projector rejects invented identity, duplicate UUID, hidden fields and unverified owner',()=>{
 const good=packet(A)
 assert.throws(()=>projectSyntheticSquadUuidPreview(good),/Verified/)
 const projected=projectSyntheticSquadUuidPreview(good,{ownerVerified:true})
 assert.equal(projected.riders[0].syntheticRiderUuid,aa)
 assert.ok(Object.isFrozen(projected.riders[0]))
 const bad=[
  {...good,riders:[{...good.riders[0],syntheticRiderUuid:null}]},
  {...good,riders:[{...good.riders[0],syntheticRiderUuid:'00000000-0000-0000-0000-000000000000'}]},
  {...good,riders:[rider(1,aa),rider(2,aa)]},
  {...good,riders:[{...good.riders[0],identity_provenance:'fake'}]},
  {...good,riders:[{...good.riders[0],overall:99}]},
  {...good,clubId:clubs[B],riders:[{...good.riders[0],syntheticRiderUuid:''}]},
 ]
 for(const value of bad)assert.throws(()=>projectSyntheticSquadUuidPreview(value,{ownerVerified:true}))
})
async function serverTest(readSquadUuid,run){
 let origin
 const seen=[]
 const adapter=createClubDashboardAdapter({
  origin:()=>origin,secureCookie:false,
  verifyLogin:async(email)=>({id:email==='A'?A:email==='B'?B:null,expiresAt:Date.now()+60000,close(){}}),
  readDashboard:id=>({id}),
  readSquadUuid:readSquadUuid&& (id=>{seen.push(id);return readSquadUuid(id)})
 })
 const server=createServer(async(req,res)=>{if(!await adapter(req,res))res.writeHead(404).end()})
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve))
 origin='http://127.0.0.1:'+server.address().port
 const call=async(path,{cookie,method='GET',body,originOverride}={})=>{
  const res=await fetch(origin+path,{method,headers:{Origin:originOverride??origin,
    ...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})})
  const raw=await res.text()
  return {status:res.status,body:raw?JSON.parse(raw):null,cookie:res.headers.get('set-cookie')}
 }
 const login=async x=>{
  const result=await call('/fixture/login',{method:'POST',body:{email:x,password:'test'}})
  assert.equal(result.status,200);return result.cookie.split(';')[0]
 }
 try{await run({call,login,seen})}finally{await adapter.close();await new Promise(done=>server.close(done))}
}
test('UUID route rejects unverified and disabled sessions, wrong method and query injection',async()=>{
 await serverTest(undefined,async({call,login})=>{
  assert.equal((await call('/fixture/squad-uuid')).status,401)
  const a=await login('A')
  assert.equal((await call('/fixture/squad-uuid',{cookie:a})).status,503)
  assert.equal((await call('/fixture/squad-uuid',{cookie:a,method:'POST'})).status,405)
  assert.equal((await call('/fixture/squad-uuid?teamId=1',{cookie:a})).status,404)
 })
})
test('UUID route uses only session-owned A/B club scope and revokes on logout',async()=>{
 await serverTest(packet,async({call,login,seen})=>{
  const a=await login('A'),b=await login('B')
  const ra=await call('/fixture/squad-uuid',{cookie:a}),rb=await call('/fixture/squad-uuid',{cookie:b})
  assert.equal(ra.status,200);assert.equal(rb.status,200)
  assert.deepEqual(ra.body.riders.map(r=>r.syntheticRiderUuid),[aa])
  assert.deepEqual(rb.body.riders.map(r=>r.syntheticRiderUuid),[bb])
  assert.deepEqual(seen,[A,B])
  assert.equal((await call('/fixture/squad-uuid',{cookie:a,originOverride:'http://evil.invalid'})).status,403)
  assert.equal((await call('/fixture/logout',{cookie:b,method:'POST'})).status,200)
  assert.equal((await call('/fixture/squad-uuid',{cookie:b})).status,401)
 })
})
test('UUID route rejects malformed or unauthorized fields rather than revealing an unfiltered roster',async()=>{
 await serverTest(id=>({...packet(id),riders:[{...packet(id).riders[0],team_id:999}]}),async({call,login})=>{
  const a=await login('A')
  assert.equal((await call('/fixture/squad-uuid',{cookie:a})).status,500)
 })
})
