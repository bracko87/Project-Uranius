import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/uranius-long-stage-diagnostic.ts',import.meta.url),'utf8')
const launcher=readFileSync(new URL('../scripts/run-uranius-long-stage-diagnostic.mjs',import.meta.url),'utf8')
test('long stage scenarios use 120km / 128 riders and 160km / 160 riders',()=>{
 assert.match(source,/name:'rolling_120'.*distance:120.*field:128/)
 assert.match(source,/name:'mountain_160'.*distance:160.*field:160/)
 assert.match(source,/const seeds=\['alpha','beta'\]/)
 assert.match(source,/const riders=Array\.from\(\{length:course\.field\}/)
 assert.match(source,/profilePoints:course\.elevations\.map/)
})
test('default-off and explicit opt-in use the same StageInput for each pair',()=>{
 assert.match(source,/experimentalPreserveBirthTickDroppedGroups:experiment!=='default_off'/)
 assert.match(source,/for\(const experiment of \['default_off','birth_tick_protected','receding_drop_protected'\]/)
 assert.match(source,/makeInput\(course,seed\)/)
 assert.doesNotMatch(source,/Math\.random\(/)
})
test('observes complete results, replay roster and sporting gaps without changing rules',()=>{
 for(const name of ['rosterExact','classificationsValid','replayMembershipErrors',
 'peakGapKm','finishSpreadSeconds','winnerAverageKmh','finalEnergyRange','technicalIssues'])
  assert.ok(source.includes(name),name)
 assert.match(source,/runCalibratedTerrainSeparationStage\(createInitialState\(input\)/)
})
test('launcher is local only and fail-closes on corrupt results',()=>{
 assert.match(launcher,/mkdtempSync/)
 assert.match(launcher,/rmSync\(dir,\{recursive:true,force:true/)
 assert.match(launcher,/report\.results\.length!==12/)
 assert.match(launcher,/report\.results\.some\(p=>p\.error\|\|p\.technicalIssues\.length\)/)
 assert.doesNotMatch(source+launcher,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role|URANIUS_DATABASE/i)
})

test('per-tick evidence distinguishes birth groups, physical movement and later catches',()=>{
 for(const name of ['tick.reconciledBreakaways.previousState',
  'tick.reconciledBreakaways.state','reabsorbedSameTick',
  'survivingNewDropTransitions','laterReabsorbedGroups',
  'multiGroupTicks','positiveGapTicks','peakTickSpatialGapKm',
  'earliestMultiGroupSecond','latestMultiGroupSecond','reabsorptionSamples'])
  assert.ok(source.includes(name),name)
 assert.match(launcher,/positiveGapTicks/)
 assert.match(launcher,/laterCaught/)
})

test('records first post-birth movement before the catch decision',()=>{
 for(const name of ['pendingBirths','firstMovementSamples','preCatchGroupSpeedKmh',
  'preCatchPelotonSpeedKmh','preCatchGapKm','positivePreCatchGapTicks','nonzeroRelativeSpeedTicks'])
  assert.ok(source.includes(name),name)
 assert.match(launcher,/preCatchPositiveGapTicks/)
 assert.match(launcher,/relativeSpeedTicks/)
})

test('new receding-drop comparison is explicitly opted in, leaving existing modes untouched',()=>{
 assert.match(source,/experimentalPreserveRecedingDroppedGroups:experiment==='receding_drop_protected'/)
 assert.match(source,/experimentalPreserveBirthTickDroppedGroups:experiment!=='default_off'/)
 assert.match(launcher,/report\.results\.length!==12/)
})

test('physical receding safeguard is confined to explicit experimental options',()=>{
 const reconcile=readFileSync(new URL('../src/race-engine/simulation/reconcileBreakawayGroups.ts',import.meta.url),'utf8')
 const integrated=readFileSync(new URL('../src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts',import.meta.url),'utf8')
 const calibrated=readFileSync(new URL('../src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts',import.meta.url),'utf8')
 assert.match(reconcile,/options\.experimentalPreserveRecedingDroppedGroups === true/)
 assert.match(reconcile,/group\.distanceKm < peloton\.distanceKm/)
 assert.match(reconcile,/group\.speedKmh < peloton\.speedKmh/)
 assert.match(integrated,/experimentalPreserveRecedingDroppedGroups/)
 assert.match(calibrated,/options\.experimentalPreserveRecedingDroppedGroups \?\? false/)
})
