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

import { projectRaceReplay } from '../database/reconstruction/overview/race-replay-preview.mjs'
import { readFileSync } from 'node:fs'
const packet=clubId=>({clubId,replay:{
 runId:raceA,raceId:raceB,stageId:A,title:'Synthetic test',kind:'syntheticRaceReplay',distanceKm:120,
 classification:Array.from({length:10},(_,i)=>({rank:i+1,rider:'Rider '+(i+1),team:i<5?'Team A':'Team B',seconds:10380})),
 frames:Array.from({length:347},(_,i)=>({second:i*30,km:i*120/346,groups:[{id:'peloton_main',type:'peloton',km:i*120/346,speed:i===346?0:40,gap:0,count:10,active:i!==346}]})),
 events:Array.from({length:12},(_,i)=>({sequence:i+1,second:i*30,km:i,type:'FIXTURE_EVENT'}))
}})
test('Replay projection validates recorded shape and rejects raw private fields',()=>{
 const data=packet(A)
 assert.deepEqual(projectRaceReplay(data),data)
 assert.deepEqual(projectRaceReplay({clubId:A,replay:null}),{clubId:A,replay:null})
 for(const change of [
  x=>{x.replay.classification[0].attributes={sprint:75}},
  x=>{x.replay.events[0].payload={secret:true}},
  x=>{x.replay.frames[0].groups[0].riderIds=[A]},
  x=>{x.replay.frames[1].second=0},
  x=>{x.replay.classification[1].rank=1},
  x=>{x.replay.frames[346].km=121},
  x=>{x.replay.frames.pop()},
  x=>{x.clubId=null}
 ]){const bad=structuredClone(data);change(bad);assert.throws(()=>projectRaceReplay(bad))}
})
test('Replay route requires verified cookie and separately enabled read provider',async()=>{
 await withAdapter({},async({call,login})=>{
  assert.equal((await call('/fixture/race-replay')).status,401)
  assert.equal((await call('/fixture/race-replay',{cookie:await login('A')})).status,503)
 })
})
test('Replay uses verified subject only; invalid methods, origins, logout and unavailable rows fail closed',async()=>{
 const seen=[]
 await withAdapter({readRaceReplay:subject=>{seen.push(subject);return subject===A?packet(A):{clubId:B,replay:null}}},async({call,login})=>{
  const a=await login('A'),b=await login('B')
  const aa=await call('/fixture/race-replay',{cookie:a}),bb=await call('/fixture/race-replay',{cookie:b})
  assert.equal(aa.status,200);assert.equal(aa.data.clubId,A);assert.equal(aa.data.replay.frames.length,347)
  assert.equal(bb.status,200);assert.equal(bb.data.clubId,B);assert.equal(bb.data.replay,null)
  assert.equal((await call('/fixture/race-replay?club_id='+B,{cookie:a})).status,404)
  assert.equal((await call('/fixture/race-replay',{cookie:a,method:'POST'})).status,405)
  assert.equal((await call('/fixture/race-replay',{cookie:a,requestOrigin:'http://127.0.0.1:1'})).status,403)
  assert.deepEqual(seen,[A,B])
  await call('/fixture/logout',{cookie:a,method:'POST'})
  assert.equal((await call('/fixture/race-replay',{cookie:a})).status,401)
 })
})
test('Malformed replay fails closed and SQL does not expose original archive',async()=>{
 await withAdapter({readRaceReplay:()=>({clubId:A,replay:{raw:true}})},async({call,login})=>{
  assert.equal((await call('/fixture/race-replay',{cookie:await login('A')})).status,500)
 })
 const sql=readFileSync(new URL('../database/synthetic-world/hosted-race-replay-read_REVIEW_ONLY.sql',import.meta.url),'utf8')
 assert.match(sql,/BEGIN READ ONLY;/)
 assert.match(sql,/pg_stat_ssl/)
 assert.match(sql,/:'verified_subject'/)
 assert.match(sql,/get_my_club_id\(\)/)
 assert.match(sql,/synthetic_race_replay_preview/)
 assert.match(sql,/ROLLBACK;\s*$/)
 assert.doesNotMatch(sql,/\b(?:input_text|output_text|synthetic_completed_race_runs|SECURITY DEFINER)\b/)
})
