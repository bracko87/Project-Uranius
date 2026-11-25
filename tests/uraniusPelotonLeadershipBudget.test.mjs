import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import {fileURLToPath} from 'node:url'
const path=fileURLToPath(new URL('../src/race-engine/simulation/pelotonLeadershipBudget.ts',import.meta.url))
const bundled=buildSync({entryPoints:[path],bundle:true,format:'esm',platform:'node',write:false,target:'node20'}).outputFiles[0].text
const {calculateFundedPelotonLeadership:fund}=await import('data:text/javascript,'+encodeURIComponent(bundled))
const rider=(i,flat,energy=90)=>({riderId:'r'+i,teamId:'t',stageStatus:'racing',energy,
 attributes:{flat,stamina:flat,resistance:flat,recovery:flat,teamwork:flat}})
const run=(riders,ids,extra={})=>fund({riders,eligibleOrderedRiderIds:ids,
 minimumSpeedKmh:32,maximumSpeedKmh:56,raceSecond:0,tickSeconds:30,...extra})
test('no automatic leadership advantage without an authorized pace-setting rider',()=>{
 const riders=[rider(1,40),rider(2,60),rider(3,85),rider(4,90)]
 const zero=run(riders,[])
 assert.equal(zero.reason,'no_orders')
 assert.equal(zero.fundedBonusPercent,0)
 assert.equal(zero.totalSurcharge,0)
 const unqualified=run(riders,['r1'])
 assert.equal(unqualified.reason,'no_capable_leaders')
 assert.equal(unqualified.totalSurcharge,0)
})
test('strong ordered leader contributes real bounded speed only with energy cost',()=>{
 const riders=[rider(1,40),rider(2,50),rider(3,80),rider(4,90)]
 const original=JSON.stringify(riders)
 const x=run(riders,['r4'])
 assert.equal(x.reason,'funded')
 assert.deepEqual(x.selectedRiderIds,['r4'])
 assert.ok(x.fundedBonusPercent>0&&x.fundedBonusPercent<=3)
 assert.ok(x.fundedSpeedKmh>x.baseSpeedKmh)
 assert.ok(x.totalSurcharge>0&&x.totalSurcharge<=85)
 assert.equal(Object.keys(x.surchargeByRiderId).length,1)
 assert.equal(JSON.stringify(riders),original)
})
test('weak and depleted leader cannot create unfunded speed',()=>{
 const riders=[rider(1,40),rider(2,60),rider(3,85),rider(4,90,5)]
 const result=run(riders,['r4'])
 assert.equal(result.fundedBonusPercent,0)
 assert.equal(result.totalSurcharge,0)
 const uniform=run([rider(1,75),rider(2,75),rider(3,75)],['r1','r2','r3'])
 assert.equal(uniform.totalSurcharge,0)
 assert.equal(uniform.fundedBonusPercent,0)
})
test('selection and funding remain deterministic and capped',()=>{
 const riders=[rider(1,40),rider(2,80),rider(3,85),rider(4,90)]
 const a=run(riders,['r3','r4'])
 const b=run(riders,['r4','r3'])
 assert.deepEqual(a,b)
 assert.ok(a.fundedSpeedKmh<=56)
 assert.ok(a.totalSurcharge>0)
})

test('authorized leaders are filtered BEFORE rotation, avoiding empty-puller ticks',()=>{
 const riders=Array.from({length:12},(_,i)=>rider(i+1,65+i*2))
 const nominated=['r10','r11','r12']
 const initial=run(riders,nominated)
 assert.equal(initial.reason,'funded')
 assert.ok(initial.selectedRiderIds.every(id=>nominated.includes(id)))
 for(let tick=0;tick<60;tick++){
  const x=run(riders,nominated,{raceSecond:tick*30})
  assert.equal(x.reason,'funded',`tick ${tick} lost funded leader despite authorized candidates`)
  assert.ok(x.totalSurcharge>0)
  assert.ok(x.selectedRiderIds.length>0)
  assert.ok(x.selectedRiderIds.every(id=>nominated.includes(id)))
 }
 const noAuthorized=run(riders,['not-in-peloton'],{raceSecond:300})
 assert.equal(noAuthorized.fundedBonusPercent,0)
 assert.equal(noAuthorized.totalSurcharge,0)
})
