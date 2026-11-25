import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-mountain-terrain-audit.ts')
const runner=read('scripts/run-uranius-mountain-terrain-audit.mjs')
test('compare unchanged rolling fixture with actual steep 128-rider course',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/const elevations=\[100,150,950,1750,2000,1900,1800,2600,3500/)
 assert.match(source,/evaluate\('rolling'\)/)
 assert.match(source,/evaluate\('mountain'\)/)
 assert.match(source,/const stage=runCalibratedTerrainSeparationStage\(createInitialState\(input\)/)
})
test('record actual pressure, eligibility, drops and energy without imposing forced separation',()=>{
 assert.match(source,/tick.pressureEvaluations/)
 assert.match(source,/tick.transitions/)
 assert.match(source,/cannotHoldTicks:/)
 assert.match(source,/sustainedEligibilityTicks:/)
 assert.match(source,/actualDroppedRiderCount:/)
 assert.match(source,/selectedRiderEnergyLoss:/)
 assert.match(source,/genuineMountainGradients:/)
 assert.doesNotMatch(source,/forceDrop|fabricatedGap|minimumDropCount|injectSeparation/i)
})
test('offline fail-closed wrapper transpiles real source',()=>{
 assert.ok(transformSync(source,{loader:'ts',format:'esm',target:'node20'}).code.length>100)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/report.scenarios/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
