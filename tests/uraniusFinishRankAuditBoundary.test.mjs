import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('scripts/uranius-finish-rank-audit.ts')
const runner=read('scripts/run-uranius-finish-rank-audit.mjs')
const candidates=read('src/race-engine/simulation/multiGroupFinishCandidates.ts')
const finish=read('src/race-engine/simulation/applyMultiGroupFinish.ts')
test('real no-order control uses full 128 rider stage without fake outcomes',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/buildInput\(strength,'baseline'\)/)
 assert.match(source,/const first=audit\(76\)/)
 assert.match(source,/const second=audit\(94\)/)
 assert.match(source,/runCalibratedTerrainSeparationStage\(initial\)/)
 assert.doesNotMatch(source,/fabricatedGap|forceWinner|manualFinishTime/i)
})
test('audit distinguish shared-group time from deterministic finish positions',()=>{
 assert.match(source,/groupTimeEquality:/)
 assert.match(source,/groupRankComparator:/)
 assert.match(source,/globalRankComparator:/)
 assert.match(source,/deliberateSprintUnchanged:/)
 assert.match(candidates,/candidateB.sprintScore -/)
 assert.match(candidates,/candidateB.accelerationScore -/)
 assert.match(finish,/candidate\s*\.finishTimeSeconds/)
})
test('fail closed and offline only with parseable TypeScript',()=>{
 assert.ok(transformSync(source,{loader:'ts',format:'esm',target:'node20'}).code.length>100)
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/report.scenarios/)
 assert.doesNotMatch(source+runner,/@supabase|service_role|createClient\(|fetch\(|https?:\/\//i)
})
