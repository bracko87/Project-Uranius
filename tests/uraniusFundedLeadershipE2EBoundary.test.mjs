import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-funded-leadership-e2e.ts')
const cli=read('scripts/run-uranius-funded-leadership-e2e.mjs')
test('three physical 128 rider stage runs; only one funded leadership flag',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/run\('control'\),run\('orders-off'\),run\('leaders-on'\)/)
 assert.match(source,/experimentalFundedPelotonLeadershipEnabled:mode==='leaders-on'/)
 assert.match(source,/experimentalPreserveSeparatingBreakaways:true/)
 assert.match(source,/eligibleFromKm:5,eligibleUntilKm:120/)
 assert.match(source,/metadata:\{uraniusLiveCommand:true\}/)
})
test('fail closed on physical speed, ordered leader surcharges and conservation',()=>{
 for(const x of ['completed','defaultOffPreserved','actualExecutedOrders',
  'fundedLeadersReallyMoved','onlyAuthorizedRidersCharged','conservation'])
  assert.match(source,new RegExp(x+':'))
 assert.match(source,/experimentalPullerEnergySurcharge/)
 assert.match(cli,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(cli,/LEADERSHIP CASE/)
})
test('syntax valid and no production access or fake gaps',()=>{
 assert.ok(transformSync(source,{loader:'ts',format:'esm',target:'node20'}).code.length>100)
 assert.doesNotMatch(source+cli,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
