import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildSync} from 'esbuild'
import {fileURLToPath} from 'node:url'
const src=new URL('../src/race-engine/simulation/pelotonPaceLeadership.ts',import.meta.url)
const source=readFileSync(src,'utf8')
const bundle=buildSync({entryPoints:[fileURLToPath(src)],bundle:true,platform:'node',
 format:'esm',write:false,target:'node20'}).outputFiles[0].text
const {calculatePelotonPaceLeadership:lead}=await import('data:text/javascript,'+encodeURIComponent(bundle))
const rider=(i,flat,energy=90)=>({
 riderId:'r'+i,stageStatus:'racing',energy,
 attributes:{flat,stamina:flat,resistance:flat,teamwork:flat,recovery:flat}
})
const options=(riders,raceSecond=0,other={})=>({
 riders,minimumSpeedKmh:32,maximumSpeedKmh:56,
 raceSecond,tickSeconds:30,...other})
test('capability leaders outperform whole-group mean without modifying rider attributes',()=>{
 const riders=[rider(1,40),rider(2,50),rider(3,65),rider(4,80),rider(5,90)]
 const original=JSON.stringify(riders)
 const result=lead(options(riders))
 assert.equal(result.eligibleRiderCount,5)
 assert.ok(result.potentialLeaderBaseKmh>result.groupMeanBaseKmh)
 assert.ok(result.designatedRiderIds.every(id=>['r3','r4','r5'].includes(id)))
 assert.equal(JSON.stringify(riders),original)
})
test('candidate choice and ordered rotation are deterministic',()=>{
 const riders=[rider(1,80),rider(2,80),rider(3,80),rider(4,80)]
 const a=lead(options(riders))
 const b=lead(options(riders))
 const later=lead(options(riders,30))
 assert.deepEqual(a,b)
 assert.notDeepEqual(a.designatedRiderIds,later.designatedRiderIds)
 assert.deepEqual(a.designatedRiderIds,['r1','r2','r3'])
 assert.deepEqual(later.designatedRiderIds,['r2','r3','r4'])
})
test('fatigued nominal leader is excluded and leader selection capped',()=>{
 const riders=[rider(1,95,4),rider(2,80),rider(3,70),rider(4,30)]
 const result=lead(options(riders))
 assert.ok(!result.designatedRiderIds.includes('r1'))
 assert.ok(result.designatedRiderIds.length<=3)
 assert.throws(()=>lead(options(riders,0,{maximumActiveLeaders:6})),/leaders must be/)
})
test('uniform riders do not gain artificial leadership speed',()=>{
 const riders=Array.from({length:10},(_,i)=>rider(i,75))
 const result=lead(options(riders))
 assert.ok(Math.abs(result.groupMeanBaseKmh-result.potentialLeaderBaseKmh)<1e-10)
 assert.equal(result.potentialGainKmh,0)
})
test('standalone leadership model never automatically changes production physics',()=>{
 assert.doesNotMatch(source,/runIntegratedTerrainSeparationStage|applyMultiGroupEnergy|createClient\(/)
 assert.match(source,/No movement, mutations, free catch or production integration/)
})

test('explicit authorized pool rotates only eligible riders and never falls back',()=>{
 const riders=[rider(1,50),rider(2,60),rider(3,80),rider(4,90),rider(5,95)]
 const authorized=['r4','r5']
 for(let tick=0;tick<12;tick++){
  const x=lead(options(riders,tick*30,{eligibleOrderedRiderIds:authorized,maximumActiveLeaders:1}))
  assert.equal(x.designatedRiderIds.length,1)
  assert.ok(authorized.includes(x.designatedRiderIds[0]))
 }
 const blocked=lead(options(riders,0,{eligibleOrderedRiderIds:['r1']}))
 assert.deepEqual(blocked.designatedRiderIds,[])
 assert.equal(blocked.potentialGainKmh,0)
 const none=lead(options(riders,0,{eligibleOrderedRiderIds:[]}))
 assert.deepEqual(none.designatedRiderIds,[])
 assert.equal(none.potentialLeaderBaseKmh,none.groupMeanBaseKmh)
})
