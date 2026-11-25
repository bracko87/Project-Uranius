import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const source=readFileSync(new URL('../src/race-engine/simulation/pelotonChaseEffort.ts',import.meta.url),'utf8')
const js=transformSync(source,{loader:'ts',format:'esm',target:'node20'}).code
const {calculatePelotonChaseEffort:chase}=await import('data:text/javascript,'+encodeURIComponent(js))
const rider=(riderId,energy,teamwork=90,stamina=80)=>({
 riderId,teamId:'team-a',teamwork,stamina,currentEnergy:energy,raceStatus:'racing'})
const order=(riderId,executed=true)=>({riderId,teamId:'team-a',executed,currentKm:40,
 eligibleFromKm:35,eligibleUntilKm:55})
const input=(riders,orders,other={})=>({
 riders,orders,pelotonSpeedKmh:40,breakawayDistanceAheadKm:0.5,
 pelotonSpeedLimitKmh:55,gradientPercent:0,tickSeconds:30,...other})
test('no artificial chase unless a real breakaway gap and executed valid orders',()=>{
 assert.equal(chase(input([rider('a',90)],[order('a')],{breakawayDistanceAheadKm:0})).reason,'no_gap')
 assert.equal(chase(input([rider('a',90)],[])).actualBonusPercent,0)
 assert.equal(chase(input([rider('a',90)],[order('a',false)])).actualBonusPercent,0)
 assert.equal(chase(input([rider('a',90)],[{...order('a'),currentKm:60}])).actualBonusPercent,0)
})
test('rider selection deterministic and at most three funded active pullers',()=>{
 const result=chase(input([rider('b',90),rider('c',90,75),rider('a',90),
  rider('d',90,65)],[order('a'),order('b'),order('c'),order('d')]))
 assert.deepEqual(result.appliedPullerIds,['a','b','c'])
 assert.ok(result.actualBonusPercent>0&&result.actualBonusPercent<=3)
 assert.ok(result.totalEnergySurcharge>0)
 assert.equal(Object.keys(result.energySurchargeByRiderId).length,3)
 assert.ok(Math.abs(result.appliedSpeedKmh-40*(1+result.actualBonusPercent/100))<0.00001)
})
test('low energy and speed limits constrain effort rather than creating free speed',()=>{
 const noEnergy=chase(input([rider('a',5)],[order('a')]))
 assert.equal(noEnergy.actualBonusPercent,0)
 assert.equal(noEnergy.reason,'no_energy')
 const capped=chase(input([rider('a',90)],[order('a')],{pelotonSpeedLimitKmh:40.2}))
 assert.ok(capped.appliedSpeedKmh<=40.200001)
 const nearEmpty=chase(input([rider('a',5.0001)],[order('a')]))
 assert.ok(nearEmpty.totalEnergySurcharge<=0.000101)
})
test('teams, uphill terrain, and poor teamwork affect authorized effort',()=>{
 const good=chase(input([rider('a',90)],[order('a')]))
 const uphill=chase(input([rider('a',90)],[order('a')],{gradientPercent:8}))
 const poor=chase(input([rider('a',90,30)],[order('a')]))
 const wrongTeam=chase(input([rider('a',90)],[{...order('a'),teamId:'team-z'}]))
 assert.ok(uphill.actualBonusPercent<good.actualBonusPercent)
 assert.equal(poor.actualBonusPercent,0)
 assert.equal(wrongTeam.reason,'no_order')
})
test('does not mutate input or enable production movement implicitly',()=>{
 const frozen=Object.freeze(input([Object.freeze(rider('a',90))],[Object.freeze(order('a'))]))
 const original=JSON.stringify(frozen)
 chase(frozen)
 assert.equal(JSON.stringify(frozen),original)
 assert.doesNotMatch(source,/@supabase|fetch\(|https?:\/\/|createClient\(/i)
 const calibrated=readFileSync(new URL('../src/race-engine/simulation/runCalibratedTerrainSeparationStage.ts',import.meta.url),'utf8')
 const integrated=readFileSync(new URL('../src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts',import.meta.url),'utf8')
 assert.match(source,/OFF-by-default experimental/)
 assert.match(calibrated,/experimentalBudgetedPelotonChaseEnabled:\s*options.experimentalBudgetedPelotonChaseEnabled \?\? false/)
 assert.match(integrated,/experimentalBudgetedPelotonChaseEnabled:\s*options.experimentalBudgetedPelotonChaseEnabled === true/)
})
