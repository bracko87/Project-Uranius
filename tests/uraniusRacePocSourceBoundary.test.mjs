import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const evalSource=readFileSync(new URL('../scripts/uranius-race-poc-evaluate.ts',import.meta.url),'utf8')
const runner=readFileSync(new URL('../scripts/run-uranius-race-poc.mjs',import.meta.url),'utf8')
test('POC loads only original isolated race engine, local fixture, and isolated attack comparison',()=>{
 assert.match(evalSource,/runDeterministicRoadRace/)
 assert.match(evalSource,/createSyntheticFullFieldStage/)
 assert.match(evalSource,/compareAttacks/)
 assert.match(evalSource,/engineMode:'existing_v1'/)
 assert.doesNotMatch(evalSource,/supabase\/|@supabase|fetch\(|https?:\/\/|createClient\(|service_role|production/i)
})
test('POC covers representative flat, hilly and mountain fields with seed repeat and two attacks',()=>{
 for(const term of ["evaluate('flat',24,'baseline')","evaluate('hilly',48,'baseline')",
 "evaluate('mountain',96,'baseline')","evaluate('flat',96,'baseline')",
 "evaluate('flat',96,'alternate-seed')","evaluate('mountain',96,'alternate-seed')",
 "attack('strong')","attack('caught')"])assert.ok(evalSource.includes(term),term)
 assert.match(evalSource,/digest!==repeatedDigest/)
 assert.match(evalSource,/finished.length!==fieldSize/)
 assert.match(evalSource,/new Set\(finishTimes\)\.size/)
 assert.match(evalSource,/previousHistoryIdentical/)
})
test('POC reports measured sporting flags rather than claiming validated game realism',()=>{
 for(const label of ['ALL_RIDERS_SAME_FINISH_TIME_REVIEW','NO_GROUP_SEPARATION_REVIEW',
 'GROUP_SPEED_ABOVE_CONFIGURED_MAX_REVIEW','UNUSUAL_STAGE_AVERAGE_SPEED_REVIEW',
 'FASTER_ATTACK_WITH_LESS_ENERGY_USED_REVIEW','TECHNICAL_GO_SPORTING_UNVALIDATED',
 'TECHNICAL_GO_SPORTING_IMPROVEMENT_REQUIRED'])assert.ok(evalSource.includes(label),label)
 assert.match(evalSource,/No real race benchmark/)
 assert.match(evalSource,/30 km fictional/)
})
test('offline runner compiles temporary node bundle without any service credentials and cleans it up',()=>{
 assert.match(runner,/mkdtempSync\(join\(tmpdir\(\)/)
 assert.match(runner,/platform:'node',format:'esm'/)
 assert.match(runner,/spawnSync\(process\.execPath/)
 assert.match(runner,/timeout:180000/)
 assert.match(runner,/report\.scenarios\.length!==6/)
 assert.match(runner,/report\.attacks\.length!==2/)
 assert.match(runner,/rmSync\(scratch,\{recursive:true,force:true/)
 assert.doesNotMatch(runner,/https?:\/\/|URANIUS_DATABASE|SUPABASE|fetch\(|createConnection|child_process\.exec\(/i)
})
