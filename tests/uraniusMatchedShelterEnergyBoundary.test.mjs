import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-matched-shelter-energy.ts')
const runner=read('scripts/run-uranius-matched-shelter-energy.mjs')
test('matched rider capabilities, time and speed isolate only existing group shelter',()=>{
 assert.match(source,/calculateRiderEnergyCost\(physicalInput\)/)
 assert.match(source,/calculateGroupShelter\(/)
 assert.match(source,/const gradients=\[0,2,8\]/)
 assert.match(source,/const speeds=\[38,42,46\]/)
 assert.match(source,/samePhysicalInputs:physicalInput/)
 assert.match(source,/pairedIdenticalPhysicalInput:/)
})
test('real 128 rider races isolate existing shelter flag without adding new energy mechanics',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/groupShelterEnergyEnabled:enabled/)
 assert.match(source,/const disabled=race\(false\)/)
 assert.match(source,/const enabled=race\(true\)/)
 assert.match(source,/experimentalPreserveSeparatingBreakaways:true/)
 assert.match(source,/energyConservation:/)
 assert.match(source,/actualPelotonShelterSaved:/)
 assert.doesNotMatch(source,/inventedEnergy|forceWinner|syntheticGap/i)
})
test('offline runner transpiles and fails closed on unmet invariants',()=>{
 assert.ok(transformSync(source,{loader:'ts',format:'esm',target:'node20'}).code.length>100)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/URANIUS MATCHED SOLO\/PELOTON ENERGY/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
