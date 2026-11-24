import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/uranius-rolling-tactical-sensitivity.ts',import.meta.url),'utf8')
const runner=readFileSync(new URL('../scripts/run-uranius-rolling-tactical-sensitivity.mjs',import.meta.url),'utf8')
test('rolling 120km tactical A/B uses same fixed seed and two 128 rider inputs',()=>{
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/seed:'tactical-same-seed'/)
 assert.match(source,/summarize\(false\)/)
 assert.match(source,/summarize\(true\)/)
})
test('attack uses supported player order with zero forced initial gap',()=>{
 assert.match(source,/type:'attack',status:'scheduled'/)
 assert.match(source,/eligibleFromKm:35,eligibleUntilKm:42/)
 assert.match(source,/maximumFollowers:null,targetRiderId:null/)
 assert.match(source,/metadata:\{uraniusLiveCommand:true\}/)
 assert.match(source,/experimentalPreserveRecedingDroppedGroups:true/)
 assert.match(source,/ATTACK_STARTED/)
 assert.match(source,/changedFinalState/)
})
test('offline launcher enforces actual executed tactical event and integrity',()=>{
 assert.match(runner,/report\.baseline\.valid/)
 assert.match(runner,/report\.attacked\.valid/)
 assert.match(runner,/!report\.comparison\.attackWasExecuted/)
 assert.doesNotMatch(source+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})

test('synthetic attack order matches nullable follower contract of state validator',()=>{
 const validator=readFileSync(new URL('../src/race-engine/validation/validateSimulationState.ts',import.meta.url),'utf8')
 assert.match(validator,/order\.maximumFollowers !== null/)
 assert.match(source,/maximumFollowers:null/)
})
