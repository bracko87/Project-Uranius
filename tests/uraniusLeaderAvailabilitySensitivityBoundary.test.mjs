import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-leader-availability-sensitivity.ts')
const runner=read('scripts/run-uranius-leader-availability-sensitivity.mjs')
test('same 128-rider course varies only authorized leaders and their available energy',()=>{
 assert.match(source,/const field=128/)
 for(const [name,count,energy] of [['no-orders',0,100],['one-leader',1,100],['three-leaders',3,100],['eight-leaders',8,100],['twenty-four-leaders',24,100],['depleted-twenty-four',24,12]])
  assert.ok(source.includes(`name:'${name}',leaderCount:${count},initialLeaderEnergy:${energy}`))
 assert.match(source,/const selectedOrders=chaseOrders.slice\(0,scenario.leaderCount\)/)
 assert.match(source,/energy:scenario.initialLeaderEnergy/)
 assert.match(source,/experimentalConservedEnergyLedgerEnabled:scenario.initialLeaderEnergy===12/)
 assert.match(source,/experimentalCapabilityBasedLeadershipEnabled:scenario.enabled/)
})
test('energy, authorization, finish gap and regression fingerprints fail closed',()=>{
 assert.match(source,/previousDynamicFingerprint:/)
 assert.match(source,/baselineFingerprint:/)
 assert.match(source,/onlyAuthorizedCharged:/)
 assert.match(source,/riderEnergyConserved:/)
 assert.match(source,/lowEnergyIsNotUnlimited:/)
 assert.match(source,/soloReabsorbedSecond/)
 assert.match(source,/eightLeaderCatchIsObserved:/)
 assert.match(source,/notAnUnpaidReabsorption:/)
 assert.match(source,/soloToPelotonSeconds:/)
 assert.match(source,/selectedOrders.filter\(o=>result.finalState.orders/)
 assert.doesNotMatch(source,/fakeGap|forceWinner|fakeCharges|forcedCatch/i)
})
test('runner consumes exactly six cases and rejects failed checks',()=>{
 assert.doesNotThrow(()=>transformSync(source,{loader:'ts',format:'esm',target:'node20'}))
 assert.match(source,/checks,cases,/)
 assert.match(runner,/report.cases.length!==6/)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/for\(const r of report.cases\)/)
 assert.doesNotMatch(runner,/report.races/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})

test('exhausted rider debits are strictly conserved only under offline opt-in',()=>{
 const state=read('src/race-engine/domain/SimulationState.ts')
 const energy=read('src/race-engine/simulation/applyMultiGroupEnergy.ts')
 assert.match(state,/experimentalConservedEnergyLedgerEnabled\?: boolean/)
 assert.match(energy,/state.experimentalConservedEnergyLedgerEnabled===true/)
 assert.match(energy,/energyCost:Math.max\(0,rider.energy-energyWithAbsoluteEffort.nextEnergy\)/)
 assert.match(energy,/energyCost:\s*recordedResult.energyCost/)
 assert.match(energy,/result:recordedResult/)
 assert.doesNotMatch(energy,/experimentalConservedEnergyLedgerEnabled!==false/)
})
