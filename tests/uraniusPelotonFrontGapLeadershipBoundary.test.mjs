import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-peloton-front-gap-leadership.ts')
const runner=read('scripts/run-uranius-peloton-front-gap-leadership.mjs')
test('real matched 128 rider races distinguish first peloton finisher from field spread',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/const cases=\[run\('control'\),run\('orders-off'\),run\('leaders-on'\)\]/)
 assert.match(source,/firstPelotonFinishSeconds:/)
 assert.match(source,/soloToFirstPelotonSeconds:/)
 assert.match(source,/finishTimeSeconds-selected.finishTimeSeconds/)
 assert.match(source,/firstPelotonFinisherFound:/)
})
test('compare authentic group average to authorized leadership and funded energy',()=>{
 assert.match(source,/calculatePelotonPaceLeadership\(/)
 assert.match(source,/calculatePelotonBasePace\(/)
 assert.match(source,/eligibleOrderedRiderIds:chaseRiders.map/)
 assert.match(source,/experimentalFundedPelotonLeadershipEnabled:mode==='leaders-on'/)
 assert.match(source,/experimentalPullerEnergySurcharge/)
 assert.match(source,/on.executedOrders===24/)
 assert.doesNotMatch(source,/forceGap|fakeGap|overrideFinish|syntheticSpeed/i)
})
test('type syntax and offline fail closed executable',()=>{
 assert.doesNotThrow(()=>transformSync(source,{loader:'ts',format:'esm',target:'node20'}))
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/URANIUS REAL SOLO-TO-PELOTON GAP/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
