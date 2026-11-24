import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const trace=readFileSync(new URL('../scripts/uranius-race-pressure-trace.ts',import.meta.url),'utf8')
const runner=readFileSync(new URL('../scripts/run-uranius-race-pressure-trace.mjs',import.meta.url),'utf8')
test('pressure trace inspects original calibrated runner per-tick fields without modifications',()=>{
 assert.match(trace,/runCalibratedTerrainSeparationStage\(createInitialState\(input\)\)/)
 assert.match(trace,/tick\.pressureEvaluations/)
 assert.match(trace,/e\.hold\.capabilityMargin/)
 assert.match(trace,/nextConsecutiveCannotHoldSeconds/)
 assert.match(trace,/eligibleWindowsSeconds\.includes\(120\)/)
 assert.match(trace,/result\.transitions\.length/)
 assert.match(trace,/NO_SUSTAINED_CANNOT_HOLD/)
 assert.match(trace,/ELIGIBLE_BUT_NO_TRANSITION/)
 assert.match(trace,/DROPPED_TRANSITION_OCCURRED/)
})
test('probe uses two original fictional baselines and one deliberately extreme separate fixture',()=>{
 for(const name of ['flat_baseline_24','mountain_baseline_96','mountain_stress_96'])
  assert.match(trace,new RegExp(name))
 assert.match(trace,/timeTrial:60\+\(index\*13\)%35/)
 assert.match(trace,/raceIq:62\+\(index\*17\)%31/)
 assert.match(trace,/stress\?\{flat:38,climbing:25,stamina:40,resistance:35,recovery:40\}/)
 assert.match(trace,/\[100,1000,300,1300\]/)
})
test('trace launcher is offline, cleans temporary bundle and never touches hosted sources',()=>{
 assert.match(runner,/mkdtempSync/)
 assert.match(runner,/rmSync\(dir,\{recursive:true,force:true/)
 assert.match(runner,/reportVersion!=='uranius-pressure-trace-v1'/)
 assert.doesNotMatch(trace+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role|URANIUS_DATABASE/i)
})

test('traces 29-style dropped transitions through the same-tick reconciliation boundary before any replay',()=>{
 assert.match(trace,/tick\.reconciledBreakaways\.previousState/)
 assert.match(trace,/tick\.reconciledBreakaways\.state/)
 assert.match(trace,/reabsorbedBreakawayGroupIds\.includes\(transition\.targetGroupId\)/)
 assert.match(trace,/transition\.movedRiderIds\.filter/)
 assert.match(trace,/sameTickTransitionReabsorptions/)
 assert.match(trace,/transitionGroupsSurvivingReconcile/)
 assert.match(trace,/ALL_DROPS_REABSORBED_SAME_TICK/)
 assert.match(trace,/DROPS_DISAPPEAR_BEFORE_REPLAY/)
 assert.match(runner,/reabsorbedSameTick/)
 assert.match(runner,/survivingDrops/)
})
