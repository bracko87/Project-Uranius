import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const fixture=read('scripts/uranius-chase-lifecycle.ts')
const launcher=read('scripts/run-uranius-chase-lifecycle.mjs')
test('two explicitly contrasted escape abilities, same inputs per control and chase',()=>{
 assert.match(fixture,/type EscapeAbility='weaker'\|'stronger'/)
 assert.match(fixture,/simulate\('weaker',false\)/)
 assert.match(fixture,/simulate\('weaker',true\)/)
 assert.match(fixture,/simulate\('stronger',false\)/)
 assert.match(fixture,/simulate\('stronger',true\)/)
 assert.match(fixture,/experimentalChaseOrdersEnabled:enabled/)
})
test('pursuit lifecycle catches must originate from reconciliation and physical distance',()=>{
 assert.match(fixture,/reabsorbedBreakawayGroupIds.includes\(start.breakawayId\)/)
 assert.match(fixture,/beforeCatch.distanceKm<=pelotonBeforeCatch.distanceKm/)
 assert.match(fixture,/escapeNowInPeloton:/)
 assert.match(fixture,/initialGapSeconds/)
 assert.doesNotMatch(fixture,/\.active\s*=\s*false/)
})
test('offline launcher fails on invariant violation without demanding a fabricated catch',()=>{
 for(const key of ['allRidersConserved','realExecutedOrders','noFabricatedCatch',
  'sameScenarioTickHorizon','validRecordedGaps'])
  assert.match(fixture,new RegExp(key+':'))
 assert.match(launcher,/Object.values\(data.checks\).some\(x=>x!==true\)/)
 assert.doesNotMatch(fixture+launcher,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})
