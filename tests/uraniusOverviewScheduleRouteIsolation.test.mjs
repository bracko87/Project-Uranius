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
test('Overview schedule is denied without session and backend approval',async()=>{
  await withAdapter({},async({call,login})=>{
    assert.equal((await call('/fixture/overview-schedule')).status,401)
    const a=await login('A')
    assert.deepEqual(await call('/fixture/overview-schedule',{cookie:a}),{
      status:503,data:{error:'Overview schedule not connected'},cookie:null
    })
    assert.equal((await call('/fixture/dashboard',{cookie:a})).status,200)
  })
})
test('Overview schedule callback receives only verified A/B subjects',async()=>{
  const seen=[]
  await withAdapter({readSchedule:async subject=>{
    seen.push(subject)
    return {upcomingSchedule:[{id:subject===A?raceA:raceB,title:'Assigned race',
      href:'#/dashboard/races/'+(subject===A?raceA:raceB)}],todayRaces:[]}
  }},async({call,login})=>{
    const a=await login('A'),b=await login('B')
    const aa=await call('/fixture/overview-schedule',{cookie:a})
    const bb=await call('/fixture/overview-schedule',{cookie:b})
    assert.equal(aa.status,200)
    assert.equal(bb.status,200)
    assert.equal(aa.data.upcomingSchedule[0].id,raceA)
    assert.equal(bb.data.upcomingSchedule[0].id,raceB)
    assert.deepEqual(seen,[A,B])
    assert.equal((await call('/fixture/overview-schedule?club_id='+raceA,{cookie:b})).status,404)
    assert.deepEqual(seen,[A,B])
    assert.equal((await call('/fixture/overview-schedule',{cookie:b,method:'POST'})).status,405)
    assert.equal((await call('/fixture/overview-schedule',{cookie:b,
      requestOrigin:'http://127.0.0.1:1'})).status,403)
    assert.deepEqual(seen,[A,B])
    assert.equal((await call('/fixture/logout',{cookie:b,method:'POST'})).status,200)
    assert.equal((await call('/fixture/overview-schedule',{cookie:b})).status,401)
    assert.equal((await call('/fixture/overview-schedule',{cookie:a})).status,200)
  })
})
test('Malformed backend schedule fails closed, not converted to empty calendar',async()=>{
  await withAdapter({readSchedule:async()=>({})},async({call,login})=>{
    const a=await login('A')
    const r=await call('/fixture/overview-schedule',{cookie:a})
    assert.equal(r.status,500)
    assert.deepEqual(r.data,{error:'Dashboard smoke request failed'})
  })
})
