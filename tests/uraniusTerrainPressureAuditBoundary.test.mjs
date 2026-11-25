import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-terrain-pressure-audit.ts')
const runner=read('scripts/run-uranius-terrain-pressure-audit.mjs')
const groupHold=read('src/race-engine/simulation/groupHold.ts')
const separation=read('src/race-engine/simulation/groupSeparationEligibility.ts')
test('real 120km 128 rider no-order run observes rather than synthesizes drops',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/buildInput\(86,'baseline'\)/)
 assert.match(source,/runCalibratedTerrainSeparationStage\(createInitialState\(input\)\)/)
 assert.match(source,/tick.pressureEvaluations/)
 assert.match(source,/tick.transitions/)
 assert.doesNotMatch(source,/forceDrop|fabricatedGroup|createDroppedGroup/i)
})
test('hold thresholds and sustained separation windows remain unchanged',()=>{
 assert.match(groupHold,/const DROP_MARGIN = -8/)
 assert.match(groupHold,/const COMFORTABLE_MARGIN = 5/)
 assert.match(separation,/DEFAULT_SEPARATION_WINDOWS_SECONDS/)
 assert.match(source,/ticksWithCannotHold/)
 assert.match(source,/actualDropTransitions/)
})
test('runtime audit fail-closed offline and TypeScript syntax valid',()=>{
 assert.ok(transformSync(source,{loader:'ts',format:'esm',target:'node20'}).code.length>100)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/TERRAIN PRESSURE TOTALS/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
