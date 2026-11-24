import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const root=new URL('../',import.meta.url)
const read=p=>readFileSync(new URL(p,root),'utf8')
const helper=read('src/race-engine/simulation/experimentalChasePace.ts')
const terrain=read('src/race-engine/simulation/terrainAwareMultiGroupMovement.ts')
const integrated=read('src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts')
const calibrated=read('src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts')
const probe=read('scripts/uranius-chase-order-poc.ts')
const runner=read('scripts/run-uranius-chase-order-poc.mjs')
test('chase only eligible with real leading breakaway, valid rider and executed order',()=>{
 assert.match(helper,/groupType!=='peloton'/)
 assert.match(helper,/other.groupType==='breakaway'&&other.distanceKm>group.distanceKm/)
 assert.match(helper,/gapSeconds<5/)
 assert.match(helper,/order.type==='chase'&&order.status==='executed'/)
 assert.match(helper,/state.riders\[order.riderId\]\?\.teamId===order.teamId/)
})
test('reuse cooperation model with bounded pace; default-off integrated flag',()=>{
 assert.match(helper,/calculateGroupCooperationPace/)
 assert.match(helper,/Math.min\(0.015,cooperation.paceBonusPercent\/100\)/)
 assert.match(calibrated,/options.experimentalChaseOrdersEnabled \?\? false/)
 assert.match(integrated,/options.experimentalChaseOrdersEnabled === true/)
 assert.match(terrain,/options.experimentalChaseOrdersEnabled/)
 assert.match(terrain,/chaseAdjustedAppliedSpeedKmh/)
})
test('isolated chase A/B uses real breakaway and same fixture and checks energy and gap',()=>{
 assert.match(probe,/createBreakawayGroup/)
 assert.match(probe,/initialGapSeconds:30/)
 assert.match(probe,/experimentalChaseOrdersEnabled:enabled/)
 assert.match(probe,/gapReduced:/)
 assert.match(probe,/moreEnergyConsumed:/)
 assert.match(probe,/noOrderNeutral:/)
 assert.doesNotMatch(helper+probe,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})

test('offline chase fixture resolves actual engine-created peloton ID',()=>{
 assert.match(probe,/Object.values\(initial.groups\).filter\(g=>g.active&&g.groupType==='peloton'\)/)
 assert.match(probe,/sourceGroupId:pelotons\[0\]\.groupId/)
 assert.doesNotMatch(probe,/sourceGroupId:'peloton'/)
 assert.match(probe,/createPhysicalBreakaway\(\{\.\.\.input,orders:\[\]\}\)/)
})

test('eight-tick chase traces real positions and consumes energy without forced catch',()=>{
 assert.match(probe,/function runRepeated\(enabled:boolean, startingState=baseline, steps=8\)/)
 assert.match(probe,/currentBreakaway.distanceKm-currentPeloton.distanceKm/)
 assert.match(probe,/tick.state.riders\[actor.riderId\].energy/)
 assert.match(probe,/sustainedGapReduction:/)
 assert.match(probe,/sustainedEnergyCost:/)
 assert.match(probe,/noOrderNeutralEveryTick:/)
 assert.match(probe,/allRidersConserved:/)
 assert.match(runner,/Multi-tick chase physical\/energy\/negative-control check failed/)
})
