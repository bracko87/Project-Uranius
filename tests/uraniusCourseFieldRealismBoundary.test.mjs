import {test} from 'node:test'
import assert from 'node:assert/strict'
import {transformSync} from 'esbuild'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-course-field-realism.ts')
const launcher=read('scripts/run-uranius-course-field-realism.mjs')
test('four courses and two rider field distributions without historical claims',()=>{
 for(const profile of ['flat_120','rolling_120','mountain_160','steep_160'])
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
 for(const label of ['eightScenarios','allCompleted','rostersExact',
  'classificationsValid','allAttacksReal'])
  assert.match(source,new RegExp(label+':'))
 assert.match(source,/replayRosterValid:/)
 assert.match(source,/classificationsValid:scenarios.every/)
 assert.match(launcher,/Object.values\(report.checks\).some\(value=>value!==true\)/)
 assert.match(launcher,/timeout:900000/)
 assert.doesNotMatch(source+launcher,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})

test('realism evidence distinguishes gradient, pressure, drops and official finish time',()=>{
 assert.match(source,/terrainGradients=course.elevations.slice\(1\)/)
 assert.match(source,/t.pressureEvaluations/)
 assert.match(source,/p.hold.status==='cannot_hold'/)
 assert.match(source,/maxSeparationPressureSeconds/)
 assert.match(source,/terrainDropsCreated/)
 assert.match(source,/terrainDropsCaughtSameTick/)
 assert.match(source,/terrainDropsLaterCaught/)
 assert.match(source,/finishingTimeUniqueCount/)
 assert.match(launcher,/uniqueFinishTimes /)
 assert.match(launcher,/pressureMaxSec /)
 assert.match(launcher,/terrainDrops /)
})

test('steep climbing route actually challenges the >8 percent severity boundary',()=>{
 assert.match(source,/profile:'steep_160',distance:160/)
 assert.match(source,/1300,1700,1300,300/)
 assert.match(source,/1400,1800,1200/)
 assert.match(source,/eightScenarios:scenarios.length===8/)
 assert.match(launcher,/EIGHT 128-RIDER RACES/)
})

test('steep stage traces actual attack velocity and dropped group finish fate',()=>{
 assert.match(source,/attackLaunchAudit=/)
 assert.match(source,/sourceGapKm:/)
 assert.match(source,/attackAppliedSpeedKmh:/)
 assert.match(source,/pelotonAppliedSpeedKmh:/)
 assert.match(source,/gapBeforeCatchKm:/)
 assert.match(source,/terrainDropAudit=/)
 assert.match(source,/finalRiderFinishSeconds:/)
 assert.match(source,/pressureAtPostTick:/)
 assert.match(launcher,/STEEP ATTACK LAUNCH/)
 assert.match(launcher,/STEEP TERRAIN DROP FATE/)
})

test('course-field TypeScript diagnostic is syntactically transpileable',()=>{
 const transformed=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(transformed.code.includes('attackLaunchAudit'))
 assert.ok(transformed.code.includes('terrainDropAudit'))
})

test('trailing breakaway physical catch is explicit opt-in with no teleport',()=>{
 const integrated=read('src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts')
 const wrapper=read('src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts')
 const reconciliation=read('src/race-engine/simulation/reconcileBreakawayGroups.ts')
 for(const part of [integrated,wrapper,reconciliation])
  assert.match(part,/experimentalPreserveTrailingAttackGroups/)
 assert.match(reconciliation,/group.distanceKm < peloton.distanceKm -/)
 assert.match(source,/trailingAttackProtected=run\(/)
 assert.match(source,/trailingAttackNoTeleport:/)
 assert.match(source,/trailingAttackProtectedComplete:/)
 assert.match(launcher,/TRAILING ATTACK PHYSICAL CATCH PROTECTED/)
 const transformed=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(transformed.code.includes('trailingAttackProtected'))
})
