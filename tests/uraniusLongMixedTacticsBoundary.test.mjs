import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const fixture=read('scripts/uranius-long-mixed-tactics-poc.ts')
const runner=read('scripts/run-uranius-long-mixed-tactics-poc.mjs')
test('120km 128 riders and all four tactical orders scheduled in distinct windows',()=>{
 assert.match(fixture,/const field=128/)
 assert.match(fixture,/distanceKm:120/)
 for(const type of ['attack','chase','leadout','sprint'])
  assert.match(fixture,new RegExp("type:'"+type+"'"))
 assert.match(fixture,/eligibleFromKm:118,eligibleUntilKm:120/)
 assert.match(fixture,/eligibleFromKm:35,eligibleUntilKm:42/)
})
test('real already-established escape is explicitly separate from simulated attack',()=>{
 assert.match(fixture,/createBreakawayGroup/)
 assert.match(fixture,/sourceGroupId:peloton\[0\]\.groupId/)
 assert.match(fixture,/initialGapSeconds:90/)
 assert.match(fixture,/metadata:\{uraniusLiveCommand:true\}/)
 assert.match(fixture,/gap\/Math.max\(group.speedKmh,0.000001\)\*3600>=5/)
})
test('both experimental variants retain finish and order invariants with no forced result',()=>{
 for(const flag of ['experimentalPhysicalAttackLaunch',
  'experimentalChaseOrdersEnabled','experimentalFinishTacticsEnabled'])
  assert.match(fixture,new RegExp(flag+':enabled'))
 assert.match(fixture,/const control=run\(false\)/)
 assert.match(fixture,/const experiment=run\(true\)/)
 for(const key of ['bothFinished','classificationIntegrity','allFourExecuted',
  'physicalAttackEvents','realChaseOpportunity'])
  assert.match(fixture,new RegExp(key+':'))
 assert.match(runner,/Object.values\(report.checks\).some\(value=>value!==true\)/)
 assert.doesNotMatch(fixture+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})

test('long-race diagnostics distinguish valid gaps from actual sustained chase boost and sprint group context',()=>{
 assert.match(fixture,/calculateExperimentalChaseMultiplier/)
 assert.match(fixture,/actualChaseBoostTicks:/)
 assert.match(fixture,/actualChaseBoostTicksAfterExpiry:/)
 assert.match(fixture,/if\(!enabled\|\|multiplier<=1\)return null/)
 assert.match(runner,/report.experiment.actualChaseBoostTicksAfterExpiry!==0/)
 assert.match(runner,/report.control.actualChaseBoostTicks!==0/)
 assert.match(fixture,/beyondScheduledOrderWindow:/)
 assert.match(fixture,/sprinterWithinGroupPosition/)
 assert.match(fixture,/sprinterFinishGroupSize/)
 assert.match(runner,/LONG CHASE DURATION/)
 assert.match(runner,/SPRINT FINISH CONTEXT/)
})

test('actual finish-candidate scores explain sprint result within the finishing group',()=>{
 assert.match(fixture,/finishDetection.candidates/)
 assert.match(fixture,/sprintFinishAudit/)
 assert.match(fixture,/sameFinishGroupRivalsWithHigherSprintScore/)
 assert.match(fixture,/awardedSprintScoreBonus:/)
 assert.match(fixture,/sameFinishGroupRank:/)
 assert.match(runner,/SPRINT SCORE AUDIT/)
})

test('controlled high sprint skill scenario changes only one rider sprint attribute',()=>{
 assert.match(fixture,/function makeInput\(strongSprinter:boolean\):StageInput/)
 assert.match(fixture,/r.riderId===sprinter.riderId/)
 assert.match(fixture,/attributes:\{\.\.\.r.attributes,sprint:94\}/)
 assert.match(fixture,/const strongerControl=run\(false,true\)/)
 assert.match(fixture,/const strongerExperiment=run\(true,true\)/)
 assert.match(fixture,/sprintSkillsControlled:/)
 assert.match(fixture,/strongerComparisonsValid:/)
 assert.match(fixture,/strongerChaseLifetimeValid:/)
 assert.match(runner,/SPRINT SKILL SENSITIVITY/)
 assert.match(runner,/STRONGER SPRINTER/)
})

test('same long race isolates 0, 4, 8, 12 point finishing tactics with no engine rule changes',()=>{
 assert.match(fixture,/type FinishOrders='both'\|'sprint_only'\|'leadout_only'\|'neither'/)
 assert.match(fixture,/const strongNeither=run\(true,true,'neither'\)/)
 assert.match(fixture,/const strongSprintOnly=run\(true,true,'sprint_only'\)/)
 assert.match(fixture,/const strongLeadoutOnly=run\(true,true,'leadout_only'\)/)
 assert.match(fixture,/strongFactorialCompleted:/)
 assert.match(fixture,/strongFactorialChaseBounded:/)
 assert.match(fixture,/strongFactorialScoreExpected:/)
 assert.match(fixture,/strongLeadoutOnly.sprintFinishAudit.awardedSprintScoreBonus===4/)
 assert.match(fixture,/strongSprintOnly.sprintFinishAudit.awardedSprintScoreBonus===8/)
 assert.match(runner,/STRONG SPRINTER FACTORIAL/)
 assert.match(runner,/FINISH ORDERS /)
})
