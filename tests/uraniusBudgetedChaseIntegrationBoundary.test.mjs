import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const move=read('src/race-engine/simulation/terrainAwareMultiGroupMovement.ts')
const energy=read('src/race-engine/simulation/applyMultiGroupEnergy.ts')
const integrated=read('src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts')
const calibrated=read('src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts')
const helper=read('src/race-engine/simulation/pelotonChaseEffort.ts')
test('budgeted pursuit is opt-in throughout movement, rider charges and calibrated stage',()=>{
 for(const s of [move,integrated,calibrated])
  assert.match(s,/experimentalBudgetedPelotonChaseEnabled/)
 assert.match(move,/experimentalBudgetedPelotonChaseEnabled===true/)
 assert.match(integrated,/experimentalBudgetedPelotonChaseEnabled === true/)
 assert.match(calibrated,/experimentalBudgetedPelotonChaseEnabled \?\? false/)
 assert.match(integrated,/experimentalPullerEnergyCosts:movement.experimentalPullerEnergyCosts/)
 assert.match(energy,/input.experimentalPullerEnergyCosts\?\.\[riderId\]/)
})
test('actual peloton movement uses separately funded explicit chase effort',()=>{
 assert.match(move,/calculatePelotonChaseEffort\(/)
 assert.match(move,/pullerChase\?pullerChase.appliedSpeedKmh/)
 assert.match(move,/experimentalPullerEnergyCosts:Object.fromEntries/)
 assert.match(helper,/energySurchargeByRiderId/)
 assert.match(energy,/const finalResult:RiderEnergyCostResult=/)
 assert.match(energy,/energyCost:result.energyCost\+paidPullerSurcharge/)
 assert.match(energy,/energy:\s*finalResult.nextEnergy/)
 assert.match(energy,/energyCost:\s*finalResult.energyCost/)
})
test('changed TypeScript runtime modules parse before offline race test',()=>{
 for(const source of [move,energy,integrated,calibrated,helper]){
  const compiled=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
  assert.ok(compiled.code.length>100)
 }
})
test('guard no production/persistence wiring or synthetic catch and gap',()=>{
 for(const source of [move,energy,helper])
  assert.doesNotMatch(source,/@supabase|service_role|createClient\(|https?:\/\//i)
 assert.doesNotMatch(helper,/forceCatch|fabricatedGap|teleport/i)
})
