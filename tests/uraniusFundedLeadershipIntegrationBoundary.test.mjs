import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const movement=read('src/race-engine/simulation/terrainAwareMultiGroupMovement.ts')
const integrated=read('src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts')
const calibrated=read('src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts')
const energy=read('src/race-engine/simulation/applyMultiGroupEnergy.ts')
const leadership=read('src/race-engine/simulation/pelotonLeadershipBudget.ts')
test('funded leaders default OFF and are distinct from original funded chase',()=>{
 assert.match(calibrated,/experimentalFundedPelotonLeadershipEnabled:\s*options.experimentalFundedPelotonLeadershipEnabled \?\? false/)
 assert.match(integrated,/experimentalFundedPelotonLeadershipEnabled:\s*options.experimentalFundedPelotonLeadershipEnabled === true/)
 assert.match(integrated,/funded chase and funded leadership experiments cannot be combined/)
 assert.match(movement,/experimentalFundedPelotonLeadershipEnabled===true/)
 assert.match(movement,/calculateFundedPelotonLeadership\(/)
})
test('authorized same-team chase orders are required for nominated leaders',()=>{
 assert.match(movement,/o.type==='chase'&&o.status==='executed'/)
 assert.match(movement,/r.riderId===o.riderId&&r.teamId===o.teamId/)
 assert.match(movement,/aheadBreakawayDistances.length>0/)
 assert.match(leadership,/eligibleOrderedRiderIds/)
 assert.match(leadership,/surchargeByRiderId/)
})
test('funded speed and its exact puller charges share a single flag',()=>{
 assert.match(movement,/leaderPace\?leadershipSpeedKmh/)
 assert.match(movement,/Object.entries\(entry.leaderPace.surchargeByRiderId\)/)
 assert.match(integrated,/experimentalPullerEnergyCosts:movement.experimentalPullerEnergyCosts/)
 assert.match(energy,/const paidPullerSurcharge=/)
 assert.match(energy,/energyCost:result.energyCost\+paidPullerSurcharge/)
 for(const source of [movement,integrated,calibrated,energy,leadership]){
  const parsed=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
  assert.ok(parsed.code.length>100)
 }
})
test('no direct production or persistence access added',()=>{
 assert.doesNotMatch(movement+leadership,/@supabase|service_role|createClient\(|https?:\/\//i)
})
