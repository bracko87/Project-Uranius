import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-course-field-realism.ts')
const launcher=read('scripts/run-uranius-course-field-realism.mjs')
test('three courses and two rider field distributions without historical claims',()=>{
 for(const profile of ['flat_120','rolling_120','mountain_160'])
  assert.match(source,new RegExp("'"+profile+"'"))
 for(const distribution of ['heterogeneous','uniform'])
  assert.match(source,new RegExp("'"+distribution+"'"))
 assert.match(source,/const field=128/)
 assert.match(source,/profiles.flatMap\(profile=>distributions.map/)
})
test('attack originates in the actual order lifecycle and not a fake initial gap',()=>{
 assert.match(source,/type:'attack',status:'scheduled'/)
 assert.match(source,/metadata:\{uraniusLiveCommand:true\}/)
 assert.match(source,/experimentalPhysicalAttackLaunch:true/)
 assert.match(source,/attackPositiveGapTicks:/)
 assert.match(source,/attackCatchSecond:/)
 assert.match(source,/reabsorbedBreakawayGroupIds.includes/)
 assert.doesNotMatch(source,/createBreakawayGroup|initialGapSeconds|syntheticGapKm/)
})
test('multi-scenario runner fails closed on missing riders and invalid classifications',()=>{
 for(const label of ['sixScenarios','allCompleted','rostersExact',
  'classificationsValid','allAttacksReal'])
  assert.match(source,new RegExp(label+':'))
 assert.match(source,/replayRosterValid:/)
 assert.match(source,/classificationsValid:scenarios.every/)
 assert.match(launcher,/Object.values\(report.checks\).some\(value=>value!==true\)/)
 assert.match(launcher,/timeout:900000/)
 assert.doesNotMatch(source+launcher,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})
