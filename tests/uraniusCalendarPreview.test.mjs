import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { createClubDashboardAdapter } from '../database/synthetic-world/club-dashboard-adapter.mjs'

const A='00000000-0000-4000-8000-000000000001'
const B='00000000-0000-4000-8000-000000000002'
const raceA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const raceB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

async function withAdapter(options, check) {
  let origin
  const subjects=[]
  const adapter=createClubDashboardAdapter({
    secureCookie:false,origin:()=>origin,
    verifyLogin:async email=>({id:email==='A'?A:email==='B'?B:null,
      expiresAt:Date.now()+60000,close(){}}),
    readDashboard:subject=>({subject}),
    ...options,
  })
  const server=createServer(async(req,res)=>{if(!await adapter(req,res)) res.writeHead(404).end()})
  await new Promise((ok,no)=>server.once('error',no).listen(0,'127.0.0.1',ok))
  origin='http://127.0.0.1:'+server.address().port
  const call=async(path,{cookie,method='GET',requestOrigin,body}={})=>{
    const r=await fetch(origin+path,{method,headers:{
      Origin:requestOrigin||origin,...(cookie?{Cookie:cookie}:{}),
      ...(body?{'Content-Type':'application/json'}:{})
    },...(body?{body:JSON.stringify(body)}:{})})
    const value=await r.text()
    return {status:r.status,data:value?JSON.parse(value):null,
      cookie:r.headers.get('set-cookie')}
  }
  const login=async(name)=>{
    const r=await call('/fixture/login',{method:'POST',body:{email:name,password:'fixture'}})
    assert.equal(r.status,200)
    return r.cookie.split(';')[0]
  }
  try{await check({call,login,subjects})}
  finally{await adapter.close();await new Promise(ok=>server.close(ok))}
}

import { projectCalendar } from '../database/reconstruction/overview/calendar-preview.mjs'
import { readFileSync } from 'node:fs'
const packet=(subject)=>({clubId:subject,gameDate:'2000-01-01',stages:[
 {raceId:raceA,title:'Fixture A',category:'uncategorized',countryCode:'DE',raceStatus:'scheduled',
  stageNumber:1,stageDate:'2000-01-02',stageFormat:'road_race',ownAccepted:subject===A},
 {raceId:raceB,title:'Fixture B',category:'uncategorized',countryCode:'AT',raceStatus:'scheduled',
  stageNumber:1,stageDate:'2000-01-03',stageFormat:'road_race',ownAccepted:subject===B}
]})
test('Calendar requires a valid bounded packet and does not accept hidden fields',()=>{
 const data=packet(A)
 assert.deepEqual(projectCalendar(data),data)
 assert.ok(Object.isFrozen(projectCalendar(data).stages))
 for(const bad of [
  {...data,clubId:null},{...data,gameDate:'2000-02-30'},
  {...data,stages:[{...data.stages[0],otherClubId:B}]},
  {...data,stages:[{...data.stages[0],ownAccepted:'true'}]},
  {...data,stages:[{...data.stages[0],stageDate:'2000-01-31'}]},
  {...data,stages:[data.stages[0],data.stages[0]]},
  {...data,stages:Array(501).fill(data.stages[0])}
 ])assert.throws(()=>projectCalendar(bad))
})
test('Calendar unavailable without verified session or approved provider',async()=>{
 await withAdapter({},async({call,login})=>{
  assert.equal((await call('/fixture/calendar')).status,401)
  const a=await login('A')
  assert.equal((await call('/fixture/calendar',{cookie:a})).status,503)
 })
})
test('Calendar world rows shared, private accepted indicator comes from verified subject',async()=>{
 const seen=[]
 await withAdapter({readCalendar:subject=>{seen.push(subject);return packet(subject)}},async({call,login})=>{
  const a=await login('A'),b=await login('B')
  const aa=await call('/fixture/calendar',{cookie:a}),bb=await call('/fixture/calendar',{cookie:b})
  assert.equal(aa.status,200);assert.equal(bb.status,200)
  assert.equal(aa.data.clubId,A);assert.equal(bb.data.clubId,B)
  assert.deepEqual(aa.data.stages.map(r=>r.raceId),bb.data.stages.map(r=>r.raceId))
  assert.deepEqual(aa.data.stages.map(r=>r.ownAccepted),[true,false])
  assert.deepEqual(bb.data.stages.map(r=>r.ownAccepted),[false,true])
  assert.equal((await call('/fixture/calendar?club_id='+B,{cookie:a})).status,404)
  assert.equal((await call('/fixture/calendar',{cookie:a,method:'POST'})).status,405)
  assert.equal((await call('/fixture/calendar',{cookie:a,requestOrigin:'http://127.0.0.1:1'})).status,403)
  assert.deepEqual(seen,[A,B])
  await call('/fixture/logout',{cookie:a,method:'POST'})
  assert.equal((await call('/fixture/calendar',{cookie:a})).status,401)
  assert.equal((await call('/fixture/calendar',{cookie:b})).status,200)
 })
})
test('Malformed Calendar packet fails closed',async()=>{
 await withAdapter({readCalendar:()=>({stages:[]})},async({call,login})=>{
  assert.equal((await call('/fixture/calendar',{cookie:await login('A')})).status,500)
 })
})
test('Calendar SQL is read-only and owner-scoped with existing 010 grants',()=>{
 const sql=readFileSync(new URL('../database/synthetic-world/hosted-calendar-read_REVIEW_ONLY.sql',import.meta.url),'utf8')
 assert.match(sql,/BEGIN READ ONLY;/)
 assert.match(sql,/current_user <> 'uranius_smoke_reader'/)
 assert.match(sql,/pg_stat_ssl/)
 assert.match(sql,/:'verified_subject'/)
 assert.match(sql,/get_my_club_id\(\)/)
 assert.match(sql,/e\.club_id=i\.club_id AND e\.status='accepted'/)
 assert.match(sql,/LIMIT 501/)
 assert.match(sql,/ROLLBACK;\s*$/)
 const uncommented=sql.replace(/^\s*--[^\r\n]*/gm,'')
 assert.doesNotMatch(uncommented,/\b(?:INSERT INTO|UPDATE|DELETE FROM|GRANT|SECURITY DEFINER)\b/i)
 assert.doesNotMatch(uncommented,/\b(?:participating_club_id|rider_count|distance_km|terrain_type|finance_transaction_id)\b/i)
})
