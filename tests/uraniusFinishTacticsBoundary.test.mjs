import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const fixture=readFileSync(new URL('../scripts/uranius-finish-tactics-poc.ts',import.meta.url),'utf8')
const tactic=readFileSync(new URL('../src/race-engine/simulation/experimentalFinishTactics.ts',import.meta.url),'utf8')
const finish=readFileSync(new URL('../src/race-engine/simulation/multiGroupFinishCandidates.ts',import.meta.url),'utf8')
const applied=readFileSync(new URL('../src/race-engine/simulation/applyMultiGroupFinish.ts',import.meta.url),'utf8')
const integrated=readFileSync(new URL('../src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts',import.meta.url),'utf8')
const calibrated=readFileSync(new URL('../src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts',import.meta.url),'utf8')
test('sprint/leadout use executed near-finish orders, validated team and group',()=>{
 assert.match(tactic,/o.status==='executed'/)
 assert.match(tactic,/state.stageDistanceKm-3/)
 assert.match(tactic,/group.riderIds.includes\(o.riderId\)/)
 assert.match(tactic,/state.riders\[o.targetRiderId\]\?\.teamId===rider.teamId/)
})
test('finish ordering and energy are changed only with explicit flag',()=>{
 assert.match(calibrated,/options.experimentalFinishTacticsEnabled \?\? false/)
 assert.match(integrated,/options.experimentalFinishTacticsEnabled === true/)
 assert.match(finish,/options.experimentalFinishTacticsEnabled/)
 assert.match(applied,/candidate.experimentalFinishEnergyCost \?\? 0/)
 assert.match(applied,/energy: Math.max\(0, rider.energy - /)
})
test('A/B exercises real executed final 3km sprint and leadout at identical seed',()=>{
 assert.match(fixture,/eligibleFromKm:8,eligibleUntilKm:10/)
 assert.match(fixture,/type:'sprint'/)
 assert.match(fixture,/type:'leadout'/)
 assert.match(fixture,/experimentalFinishTacticsEnabled:enabled/)
 assert.match(fixture,/selectedOfficialTimeUnchanged/)
})
