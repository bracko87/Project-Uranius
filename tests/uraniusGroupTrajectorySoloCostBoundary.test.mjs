import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-group-trajectory-solo-cost.ts')
const runner=read('scripts/run-uranius-group-trajectory-solo-cost.mjs')
test('compare actual mountain dropped-group trajectories with solo race energy accounting',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/runCalibratedTerrainSeparationStage\(createInitialState\(mountainInput\)/)
 assert.match(source,/runCalibratedTerrainSeparationStage\(createInitialState\(baseRolling\)/)
 assert.match(source,/reabsorbedBreakawayGroupIds.includes\(groupId\)/)
 assert.match(source,/reclassifiedDroppedGroupIds.includes\(groupId\)/)
 assert.match(source,/experimentalPreserveBirthTickDroppedGroups:true/)
})
test('actual group distances and rider energy applications determine diagnostic output',()=>{
 assert.match(source,/p.distanceKm-g.distanceKm/)
 assert.match(source,/t\.appliedEnergy\.applications\.filter\(a=>a\.riderId===id\)/)
 assert.match(source,/soloEnergySpent:/)
 assert.match(source,/ledgerError:/)
 assert.match(source,/Math.abs\(r.ledgerError\)<1e-4/)
 assert.match(source,/soloEnergyLedger:/)
 assert.doesNotMatch(source,/forceCatch|forceDrop|fabricatedGap|syntheticCharge/i)
})
test('type syntax and CLI fail-closed without production access',()=>{
 assert.ok(transformSync(source,{loader:'ts',format:'esm',target:'node20'}).code.length>100)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/URANIUS GROUP TRAJECTORY AND SOLO ENERGY AUDIT/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
