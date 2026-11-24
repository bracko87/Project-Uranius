import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {test} from 'node:test'
import {createClubDashboardAdapter} from '../database/synthetic-world/club-dashboard-adapter.mjs'
const A='00000000-0000-4000-8000-000000000001'
const B='00000000-0000-4000-8000-000000000002'
const clubs={ [A]:'00000000-0000-4000-8000-000000000011',[B]:'00000000-0000-4000-8000-000000000022'}
const missing=['assigned_role','age_years','overall','availability_status','fatigue',
 'country_code','birth_date','morale','potential','contract']
const packet=(id)=>({kind:'syntheticSquadPreview',clubId:clubs[id],
 riders:[{syntheticRiderId:id===A?1:11,label:id===A?'Manager A rider':'Manager B rider',
 flat:70,climbing:75,stamina:78,resistance:80}],missingOriginalFields:[...missing]})
async function withServer(readSquad,run){
 let origin
 const seen=[]
 const adapter=createClubDashboardAdapter({
  origin:()=>origin,secureCookie:false,
  verifyLogin:async email=>({id:email==='A'?A:email==='B'?B:null,
    expiresAt:Date.now()+60000,close(){}}),
  readDashboard:id=>({id}),readSquad:readSquad && (id=>{seen.push(id);return readSquad(id)})
 })
 const server=createServer(async(req,res)=>{
  if(!await adapter(req,res))res.writeHead(404).end()
 })
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve))
 origin='http://127.0.0.1:'+server.address().port
 const call=async (path,options={})=>{
  const response=await fetch(origin+path,{
   method:options.method??'GET',
   headers:{Origin:options.requestOrigin??origin,
      ...(options.cookie?{Cookie:options.cookie}:{}),
      ...(options.body?{'Content-Type':'application/json'}:{})},
   ...(options.body?{body:JSON.stringify(options.body)}:{})
  })
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')}
 }
 const login=async name=>{
  const response=await call('/fixture/login',{method:'POST',body:{email:name,password:'offline'}})
  assert.equal(response.status,200)
  return response.cookie.split(';')[0]
 }
 try{await run({call,login,seen})}
 finally{await adapter.close();await new Promise(resolve=>server.close(resolve))}
}
test('Squad route refuses unsigned session, backend disabled and wrong methods',async()=>{
 await withServer(undefined,async({call,login})=>{
  assert.equal((await call('/fixture/squad')).status,401)
  const cookie=await login('A')
  assert.deepEqual((await call('/fixture/squad',{cookie})).body,{error:'Squad preview not connected'})
  assert.equal((await call('/fixture/squad',{cookie})).status,503)
  assert.equal((await call('/fixture/squad',{cookie,method:'POST'})).status,405)
 })
})
test('Squad route resolves manager A/B solely from session; wrong-origin and scope injection denied',async()=>{
 await withServer(id=>packet(id),async({call,login,seen})=>{
  const a=await login('A'),b=await login('B')
  const aa=await call('/fixture/squad',{cookie:a}),bb=await call('/fixture/squad',{cookie:b})
  assert.equal(aa.status,200);assert.equal(bb.status,200)
  assert.equal(aa.body.clubId,clubs[A]);assert.equal(bb.body.clubId,clubs[B])
  assert.deepEqual(aa.body.riders.map(x=>x.syntheticRiderId),[1])
  assert.deepEqual(bb.body.riders.map(x=>x.syntheticRiderId),[11])
  assert.deepEqual(seen,[A,B])
  assert.equal((await call('/fixture/squad?clubId='+clubs[A],{cookie:b})).status,404)
  assert.equal((await call('/fixture/squad',{cookie:b,requestOrigin:'http://127.0.0.1:1'})).status,403)
  assert.deepEqual(seen,[A,B])
  assert.equal((await call('/fixture/logout',{cookie:b,method:'POST'})).status,200)
  assert.equal((await call('/fixture/squad',{cookie:b})).status,401)
  assert.equal((await call('/fixture/squad',{cookie:a})).status,200)
 })
})
test('Malformed or fictional fields fail closed rather than emitting a Squad',async()=>{
 await withServer(id=>({...packet(id),riders:[{...packet(id).riders[0],overall:99}]}),
  async({call,login})=>{
   const cookie=await login('A')
   assert.deepEqual(await call('/fixture/squad',{cookie}),{
    status:500,body:{error:'Dashboard smoke request failed'},cookie:null
   })
  })
})
test('Unknown manager cannot sign in to read Squad',async()=>{
 await withServer(id=>packet(id),async({call,seen})=>{
  assert.equal((await call('/fixture/login',{method:'POST',body:{email:'unknown',password:'test'}})).status,401)
  assert.equal((await call('/fixture/squad')).status,401)
  assert.deepEqual(seen,[])
 })
})
