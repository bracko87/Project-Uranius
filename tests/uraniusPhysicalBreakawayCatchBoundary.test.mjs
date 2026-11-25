import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const reconcile=read('src/race-engine/simulation/reconcileBreakawayGroups.ts')
const integrated=read('src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts')
const calibrated=read('src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts')
const scenario=read('scripts/uranius-physical-breakaway-catch.ts')
const runner=read('scripts/run-uranius-physical-breakaway-catch.mjs')
test('ahead breakaway is preserved only for explicit physical-only counterfactual',()=>{
 assert.match(reconcile,/experimentalRequirePhysicalBreakawayCatch\?: boolean/)
 assert.match(reconcile,/options.experimentalRequirePhysicalBreakawayCatch === true &&/)
 assert.match(reconcile,/group.groupType === 'breakaway' &&/)
 assert.match(reconcile,/group.distanceKm > peloton.distanceKm/)
 assert.match(integrated,/experimentalRequirePhysicalBreakawayCatch:/)
 assert.match(calibrated,/experimentalRequirePhysicalBreakawayCatch:\s*options.experimentalRequirePhysicalBreakawayCatch \?\? false/)
})
test('same 8 and 24 chasers compare existing and physically overtaken policies',()=>{
 assert.match(scenario,/const cases=\[run\(8,'proximity'\),run\(24,'proximity'\),run\(8,'physical'\),run\(24,'physical'\)\]/)
 assert.match(scenario,/experimentalRequirePhysicalBreakawayCatch:mode==='physical'/)
 assert.match(scenario,/oldCaptureFingerprint:/)
 assert.match(scenario,/oldTwentyFourFingerprint:/)
 assert.match(scenario,/noPrematureEightCatch:/)
 assert.match(scenario,/noUnauthorizedCharges:/)
 assert.match(scenario,/noOverDebit:/)
 assert.doesNotMatch(scenario,/fakeGap|forceCatch|fabricatedWinner/i)
})
test('offline four-race runner rejects failed checks and unrecognized result shape',()=>{
 for(const module of [reconcile,integrated,calibrated,scenario])
  assert.doesNotThrow(()=>transformSync(module,{loader:'ts',format:'esm',target:'node20'}))
 assert.match(runner,/report.cases.length!==4/)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/for\(const r of report.cases\)/)
 assert.doesNotMatch(runner,/report.races/)
 assert.doesNotMatch(scenario+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
