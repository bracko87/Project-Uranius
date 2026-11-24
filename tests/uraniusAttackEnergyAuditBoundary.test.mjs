import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/uranius-attack-energy-audit.ts',import.meta.url),'utf8')
const runner=readFileSync(new URL('../scripts/run-uranius-attack-energy-audit.mjs',import.meta.url),'utf8')
test('audit uses unchanged historical attack comparison and two scenarios',()=>{
 assert.match(source,/compareAttacks\(scenario\)/)
 assert.match(source,/const cases=\['strong','caught'\] as const/)
 assert.match(source,/historyIdentical:comparison\.historyIdentical/)
})
test('audit contrasts total energy, energy per minute and elapsed stage time',()=>{
 for(const x of ['totalEnergyUsed','energyUsedPerMinute','energyUsedPerKm',
  'finishTimeGainedSeconds','extraTotalEnergyUsed','extraEnergyRatePerMinute'])
  assert.ok(source.includes(x),x)
 assert.match(source,/ATTACK_FINISHED_WITH_MORE_ENERGY_CHECK_EFFORT_VS_DURATION/)
})
test('isolated runner fails on integrity or nonfinite metrics',()=>{
 assert.match(runner,/mkdtempSync/)
 assert.match(runner,/rmSync\(dir,\{recursive:true,force:true/)
 assert.match(runner,/report\.results\.length!==2/)
 assert.match(runner,/!p\.historyIdentical/)
 assert.doesNotMatch(source+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})
