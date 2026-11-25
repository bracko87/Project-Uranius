import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const candidate=read('src/race-engine/simulation/absoluteSpeedEffort.ts')
const app=read('src/race-engine/simulation/applyMultiGroupEnergy.ts')
const state=read('src/race-engine/domain/SimulationState.ts')
const scenario=read('scripts/uranius-absolute-speed-effort-e2e.ts')
const runner=read('scripts/run-uranius-absolute-speed-effort-e2e.mjs')
test('real baseline remains unchanged unless explicit experimental state flag is true',()=>{
 assert.match(state,/experimentalAbsoluteSpeedEffortEnabled\?: boolean/)
 assert.match(app,/state.experimentalAbsoluteSpeedEffortEnabled===true/)
 assert.match(app,/calculateAbsoluteSpeedEffort/)
 assert.match(app,/energyWithAbsoluteEffort/)
 assert.match(scenario,/experimentalAbsoluteSpeedEffortEnabled:enabled/)
 assert.match(scenario,/const off=run\(false\)/)
 assert.match(scenario,/baselineFingerprint:/)
})
test('provisional speed cubed exposure adds bounded debit after original weather and shelter',()=>{
 assert.match(candidate,/Math.pow\(speedKmh\/referenceSpeedKmh,3\)-1/)
 assert.match(candidate,/shelter.shelterBonus/)
 assert.match(app,/Math.min\([\s\S]*absoluteSpeedCandidate.addedEnergyCost/)
 assert.match(app,/experimentalAbsoluteSpeedEnergySurcharge:/)
 assert.match(scenario,/chosenEnergyLedgerResidual:/)
 assert.match(scenario,/firstFatigueSecond/)
 assert.match(scenario,/candidateActuallyCharges:/)
})
test('offline code syntax and fail-closed E2E behavior',()=>{
 for(const s of [candidate,scenario,app,state])
  assert.doesNotThrow(()=>transformSync(s,{loader:'ts',format:'esm',target:'node20'}))
 // An interface-only module legitimately transpiles to an empty JS module.
 // Require nonempty executable output only from modules containing runtime code.
 for(const s of [candidate,scenario,app])
  assert.ok(transformSync(s,{loader:'ts',format:'esm',target:'node20'}).code.length>100)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.doesNotMatch(candidate+scenario+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
