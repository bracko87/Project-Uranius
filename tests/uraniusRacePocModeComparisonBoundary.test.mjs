import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const src=readFileSync(new URL('../scripts/uranius-race-poc-mode-comparison.ts',import.meta.url),'utf8')
const cli=readFileSync(new URL('../scripts/run-uranius-race-poc-mode-comparison.mjs',import.meta.url),'utf8')
test('lane comparison uses two existing engine modes with precisely identical per-pair StageInput',()=>{
 assert.match(src,/seed:base\.seed\+'-'\+seed/)
 assert.match(src,/riders:base\.riders\.map/)
 assert.match(src,/timeTrial:60\+\(index\*13\)%35/)
 assert.match(src,/raceIq:62\+\(index\*17\)%31/)
 assert.match(src,/runDeterministicRoadRace\(input,\{simulationMode:lane\}\)/)
 assert.match(src,/examine\(terrain,size,seed,'existing_v1'\)/)
 assert.match(src,/examine\(terrain,size,seed,'terrain_separation_calibrated_v1'\)/)
 assert.match(src,/meaningfulSeparation/)
})
test('paired samples include flat hilly mountain and two 96-rider seeds',()=>{
 for(const x of ["['flat',24,'same-seed']","['hilly',48,'same-seed']",
 "['mountain',96,'same-seed']","['flat',96,'same-seed']","['mountain',96,'other-seed']"])
  assert.ok(src.includes(x),x)
 assert.match(src,/finishSpreadSeconds/)
 assert.match(src,/maxActiveGroups/)
 assert.match(src,/exactRoster/)
})
test('comparison remains offline, does not enable any hosted worker and does not silently claim sporting GO',()=>{
 assert.doesNotMatch(src,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
 assert.doesNotMatch(cli,/URANIUS_DATABASE|SUPABASE|createConnection|fetch\(|https?:\/\//i)
 assert.match(cli,/mkdtempSync/)
 assert.match(cli,/rmSync\(dir,\{recursive:true,force:true/)
 assert.match(src,/PROMISING_CALIBRATED_LANE_REQUIRES_SPORTING_REVIEW/)
 assert.match(src,/BOTH_LANES_LACK_SEPARATION_ON_TEST_FIXTURES/)
 assert.match(src,/A group split or finish spread is necessary but not sufficient for realism/)
})
