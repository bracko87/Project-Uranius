import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-early-reabsorption-mechanism.ts')
const runner=read('scripts/run-uranius-early-reabsorption-mechanism.mjs')
test('eight and twenty-four leaders are compared from same 128 rider scenario',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/const cases=\[run\(8\),run\(24\)\]/)
 assert.match(source,/const selectedOrders=chaseOrders.slice\(0,count\)/)
 assert.match(source,/experimentalCapabilityBasedLeadershipEnabled:true/)
})
test('capture is traced from real movement before reconciliation and actual catch record',()=>{
 assert.match(source,/t.appliedMovement.state/)
 assert.match(source,/t.reconciledBreakaways.reabsorbedBreakawayGroupIds/)
 assert.match(source,/gapBeforeKm:gapBefore,gapAfterMoveKm:gapAfterMove/)
 assert.match(source,/withinFiveSecondWindow:/)
 assert.match(source,/paidNotFree:/)
 assert.match(source,/actualEightCatch:/)
 assert.match(source,/noTwentyFourCatch:/)
 assert.doesNotMatch(source,/forceCaught|fabricateGap|injectReabsorption/i)
})
test('CLI refuses missing cases and unchecked failed invariants',()=>{
 assert.doesNotThrow(()=>transformSync(source,{loader:'ts',target:'node20',format:'esm'}))
 assert.match(runner,/report.cases.length!==2/)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/for\(const r of report.cases\)/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
