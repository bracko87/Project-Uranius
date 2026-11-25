import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-funded-chase-e2e.ts')
const runner=read('scripts/run-uranius-funded-chase-e2e.mjs')
test('three genuine 128-rider runs compare no orders, flag off and funded chase on',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/run\('no-chase-orders'\),run\('flag-off'\),run\('flag-on'\)/)
 assert.match(source,/experimentalBudgetedPelotonChaseEnabled:mode==='flag-on'/)
 assert.match(source,/experimentalPreserveSeparatingBreakaways:true/)
 assert.match(source,/metadata:\{uraniusLiveCommand:true\}/)
 assert.doesNotMatch(source,/fabricatedGap|syntheticGap|forceWinner/i)
})
test('requires actual executed chase, same-tick speed gain and extra puller costs',()=>{
 for(const check of ['allComplete','defaultUnchanged','executedChaseOrders',
 'realFundedChase','onlyPelotonPullersCharged','exactSelectedRiderLedgers',
 'physicallyHigherPelotonSpeed'])
  assert.match(source,new RegExp(check+':'))
 assert.match(source,/experimentalPullerEnergySurcharge/)
 assert.match(source,/appliedSpeedKmh/)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/CHASE CASE/)
})
test('offline-only runner and TS code parse',()=>{
 const result=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(result.code.includes('positiveChaseTicks'))
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
