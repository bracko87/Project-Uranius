import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/uranius-long-stage-diagnostic.ts',import.meta.url),'utf8')
const launcher=readFileSync(new URL('../scripts/run-uranius-long-stage-diagnostic.mjs',import.meta.url),'utf8')
test('long stage scenarios use 120km / 128 riders and 160km / 160 riders',()=>{
 assert.match(source,/name:'rolling_120'.*distance:120.*field:128/)
 assert.match(source,/name:'mountain_160'.*distance:160.*field:160/)
 assert.match(source,/const seeds=\['alpha','beta'\]/)
 assert.match(source,/const riders=Array\.from\(\{length:course\.field\}/)
 assert.match(source,/profilePoints:course\.elevations\.map/)
})
test('default-off and explicit opt-in use the same StageInput for each pair',()=>{
 assert.match(source,/experiment==='birth_tick_protected'/)
 assert.match(source,/for\(const experiment of \['default_off','birth_tick_protected'\]/)
 assert.match(source,/makeInput\(course,seed\)/)
 assert.doesNotMatch(source,/Math\.random\(/)
})
test('observes complete results, replay roster and sporting gaps without changing rules',()=>{
 for(const name of ['rosterExact','classificationsValid','replayMembershipErrors',
 'peakGapKm','finishSpreadSeconds','winnerAverageKmh','finalEnergyRange','technicalIssues'])
  assert.ok(source.includes(name),name)
 assert.match(source,/runCalibratedTerrainSeparationStage\(createInitialState\(input\)/)
})
test('launcher is local only and fail-closes on corrupt results',()=>{
 assert.match(launcher,/mkdtempSync/)
 assert.match(launcher,/rmSync\(dir,\{recursive:true,force:true/)
 assert.match(launcher,/report\.results\.length!==8/)
 assert.match(launcher,/report\.results\.some\(p=>p\.error\|\|p\.technicalIssues\.length\)/)
 assert.doesNotMatch(source+launcher,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role|URANIUS_DATABASE/i)
})
