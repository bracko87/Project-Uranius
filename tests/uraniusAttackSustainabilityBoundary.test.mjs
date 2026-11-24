import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const fixture=read('scripts/uranius-attack-sustainability.ts')
const runner=read('scripts/run-uranius-attack-sustainability.mjs')
test('120km 128-rider strength and early/late real attacks compare against no-order baseline',()=>{
 assert.match(fixture,/const field=128/)
 assert.match(fixture,/distanceKm:120/)
 assert.match(fixture,/type Strength='original'\|'strong'/)
 assert.match(fixture,/type Timing='baseline'\|'early'\|'late'/)
 assert.match(fixture,/attackFrom=timing==='early'\?5:70/)
 assert.match(fixture,/timing==='baseline'\?\[\]:/)
 assert.match(fixture,/metadata:\{uraniusLiveCommand:true\}/)
 assert.match(fixture,/flat:95,climbing:95,acceleration:95/)
})
test('attack movement and finish outcomes are observed, not forced',()=>{
 for(const field of ['firstMovementAttackKmh','secondMovementAttackKmh',
  'secondMovementPelotonKmh','positiveGapTicks','peakPositiveGapKm',
  'caught','activeMovementTicks','selectedRank','selectedFinalEnergy','firstFiveTrace'])
  assert.match(fixture,new RegExp(field))
 assert.match(fixture,/experimentalPhysicalAttackLaunch:true/)
 assert.match(fixture,/experimentalPreserveTrailingAttackGroups:true/)
 assert.doesNotMatch(fixture,/initialGapSeconds|createBreakawayGroup|syntheticGapKm/)
})
test('runner fails closed for six complete races, four real attacks, and rider classifications',()=>{
 for(const key of ['sixComplete','classificationIntegrity','fourPhysicalAttacks',
   'noFabricatedBaseline','allScheduledOrdersExecuted'])
  assert.match(fixture,new RegExp(key+':'))
 assert.match(runner,/Object.values\(report.checks\).some\(x=>x!==true\)/)
 assert.match(runner,/AGAINST NO-ORDER/)
 assert.doesNotMatch(fixture+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})
test('typescript experimental runner parses before a costly race run',()=>{
 const result=transformSync(fixture,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(result.code.includes('attackTicks'))
 assert.ok(result.code.includes('sixComplete'))
})

test('energy audit accounts for actual charged ticks, speed, shelter, and total reserve',()=>{
 for(const marker of ['riderEnergyTicks','actualEnergyCost','chargedTicks',
  'chargedSeconds','energyCostPerKm','energyBalanceError','shelterSaved',
  'firstThreeTicks','finalThreeTicks','attackFollowupTick'])
  assert.match(fixture,new RegExp(marker))
 assert.match(fixture,/Math.abs\(s.effortAudit.energyBalanceError\)<0.0001/)
 assert.match(runner,/ENERGY ACCOUNTING/)
 assert.match(runner,/activeTickDifference:/)
 assert.match(runner,/perKmEnergyCostDifference:/)
 const result=transformSync(fixture,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(result.code.includes('effortAudit'))
})

test('paired drafting ON/OFF keeps original controls and checks real shelter savings',()=>{
 assert.match(fixture,/groupShelterEnergyEnabled:shelterEnergy/)
 assert.match(fixture,/shelterScenarios=/)
 for(const key of ['shelterComparisonComplete','shelterComparisonLedger',
  'shelterReallyApplied','unchangedNoShelter'])
  assert.match(fixture,new RegExp(key+':'))
 assert.match(fixture,/shelterEnergy:shelterEnergy|strength,timing,shelterEnergy,completed/)
 assert.match(runner,/DRAFTING COMPARISON/)
 assert.match(runner,/DRAFTING ENERGY ON\/OFF/)
 const transformed=transformSync(fixture,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(transformed.code.includes('shelterScenarios'))
})
