import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/inspect-uranius-seed-sensitivity.mjs',import.meta.url),'utf8')
test('seed audit reads previously saved offline JSON and does not resimulate',()=>{
 assert.match(source,/readFileSync\(path,'utf8'\)/)
 assert.match(source,/race-long-stage-local\.json/)
 assert.doesNotMatch(source,/runCalibratedTerrainSeparationStage|runDeterministicRoadRace|createClient\(|fetch\(|https?:\/\//)
})
test('compares input and final classification across alpha beta per scenario',()=>{
 assert.match(source,/alpha\.inputDigest!==beta\.inputDigest/)
 assert.match(source,/alpha\.classificationDigest!==beta\.classificationDigest/)
 assert.match(source,/NO_CLASSIFICATION_VARIATION_FROM_SEED_ON_THIS_FIXTURE/)
 assert.match(source,/pairs\.some\(p=>!p\.differentInputDigests\)/)
})
