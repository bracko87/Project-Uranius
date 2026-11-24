import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const fixture=read('scripts/uranius-long-mixed-tactics-poc.ts')
const runner=read('scripts/run-uranius-long-mixed-tactics-poc.mjs')
test('120km 128 riders and all four tactical orders scheduled in distinct windows',()=>{
 assert.match(fixture,/const field=128/)
 assert.match(fixture,/distanceKm:120/)
 for(const type of ['attack','chase','leadout','sprint'])
  assert.match(fixture,new RegExp("type:'"+type+"'"))
 assert.match(fixture,/eligibleFromKm:118,eligibleUntilKm:120/)
 assert.match(fixture,/eligibleFromKm:35,eligibleUntilKm:42/)
})
test('real already-established escape is explicitly separate from simulated attack',()=>{
 assert.match(fixture,/createBreakawayGroup/)
 assert.match(fixture,/sourceGroupId:peloton\[0\]\.groupId/)
 assert.match(fixture,/initialGapSeconds:90/)
 assert.match(fixture,/metadata:\{uraniusLiveCommand:true\}/)
 assert.match(fixture,/gap\/Math.max\(group.speedKmh,0.000001\)\*3600>=5/)
})
test('both experimental variants retain finish and order invariants with no forced result',()=>{
 for(const flag of ['experimentalPhysicalAttackLaunch',
  'experimentalChaseOrdersEnabled','experimentalFinishTacticsEnabled'])
  assert.match(fixture,new RegExp(flag+':enabled'))
 assert.match(fixture,/const control=run\(false\)/)
 assert.match(fixture,/const experiment=run\(true\)/)
 for(const key of ['bothFinished','classificationIntegrity','allFourExecuted',
  'physicalAttackEvents','realChaseOpportunity'])
  assert.match(fixture,new RegExp(key+':'))
 assert.match(runner,/Object.values\(report.checks\).some\(value=>value!==true\)/)
 assert.doesNotMatch(fixture+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})
