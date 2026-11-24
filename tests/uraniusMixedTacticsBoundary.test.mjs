import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const fixture=read('scripts/uranius-mixed-tactics-integration.ts')
const runner=read('scripts/run-uranius-mixed-tactics-integration.mjs')
test('four legal scheduled tactical orders and no synthetic attack gap',()=>{
 for(const type of ['attack','chase','leadout','sprint'])
  assert.match(fixture,new RegExp("type:'"+type+"'"))
 assert.match(fixture,/metadata:\{uraniusLiveCommand:true\}/)
 assert.match(fixture,/distanceKm:24/)
 assert.match(fixture,/seed:'mixed-tactics-fixed-seed'/)
 assert.equal((fixture.match(/maximumFollowers:null/g)||[]).length,4)
})
test('same-input default-off versus all-explicitly-opted-in experiment',()=>{
 assert.match(fixture,/function run\(enabled:boolean\)/)
 for(const option of ['experimentalPhysicalAttackLaunch',
  'experimentalChaseOrdersEnabled','experimentalFinishTacticsEnabled'])
  assert.match(fixture,new RegExp(option+':enabled'))
 assert.match(fixture,/const off=run\(false\)/)
 assert.match(fixture,/const on=run\(true\)/)
})
test('classification and order checks fail closed without inventing a race winner',()=>{
 for(const check of ['bothRacesCompleted','allRidersConserved','validFinishTimes',
  'allFourOrdersExecuted','realAttackInBoth','physicalLaunchApplied'])
  assert.match(fixture,new RegExp(check+':'))
 assert.match(fixture,/chaseHadEligibleMovement:/)
 assert.match(fixture,/classificationChanged:/)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.doesNotMatch(fixture+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})
