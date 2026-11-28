import assert from 'node:assert/strict'
import type {StageWeatherInput} from '../src/race-engine/domain/StageInput'
import {reviewCourseWindGroupTick as run,type WindGroupInput} from '../src/race-engine/simulation/reviewCourseWindGroupTick'
import {calculateRiderEnergyCost} from '../src/race-engine/simulation/energyCost'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const w:StageWeatherInput={authority:'stage_weather_snapshot',source:'synthetic_review_fixture',condition:'clear',summary:null,averageTemperatureC:20,minimumTemperatureC:20,maximumTemperatureC:20,windSpeedKmh:40,precipitationMm:0,hostCity:null,countryCode:null,directionalWind:{scope:'synthetic_constant_bearing',courseBearingDegrees:0,windFromDegrees:0},courseBearingSegments:[{fromKm:0,toKm:.1,courseBearingDegrees:0},{fromKm:.1,toKm:.2,courseBearingDegrees:90},{fromKm:.2,toKm:1,courseBearingDegrees:180}]}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
const workload={currentEnergy:80,baseSpeedKmh:36,gradientPercent:4,stamina:80,resistance:70,recovery:60}
const rider=(riderId:string,currentEnergy=80,supplyMultiplier=.95)=>({riderId,workload:{...workload,currentEnergy},supplyMultiplier})
const groups:WindGroupInput[]=[
 {groupId:'A',startKm:0,neutralSpeedKmh:36,maximumSpeedKmh:60,riders:[rider('a'),rider('b',.001)]},
 {groupId:'B',startKm:.1,neutralSpeedKmh:0,maximumSpeedKmh:60,riders:[rider('c')]},
 {groupId:'C',startKm:.95,neutralSpeedKmh:36,maximumSpeedKmh:36,riders:[rider('d',80,1)]}
]
const result=run(w,1,30,120,groups)
const [a,b,c]=result.groups
const t1=10/.925,t2=10/.9625,t3=30-t1-t2
assert.deepEqual(a.movement.slices.map(s=>s.energyMultiplier),[1.15,1.075,.925])
near(a.movement.nextDistanceKm,.2+36*1.05*t3/3600)
near(b.movement.nextDistanceKm,.1);near(b.movement.elapsedSeconds,30)
assert.equal(b.movement.slices.length,1);near(b.movement.slices[0].energyMultiplier,1.075)
assert.equal(a.finishTimeSeconds,null);assert.equal(b.finishTimeSeconds,null)
console.log('PASS 043BD simultaneous group exposure, multiple corners and stationary repair')
near(c.movement.nextDistanceKm,1);near(c.movement.elapsedSeconds,5);near(c.finishTimeSeconds!,125)
near(c.riders[0].elapsedSeconds,5);near(c.movement.slices[0].speedKmh,36)
console.log('PASS 043BD fractional finish time, capped speed and terminal workload')
for(const g of result.groups)for(const r of g.riders){
 const input=groups.find(x=>x.groupId===g.groupId)!.riders.find(x=>x.riderId===r.riderId)!
 const expected=g.movement.slices.reduce((sum,s)=>{
  const cost=calculateRiderEnergyCost({...input.workload,speedKmh:s.speedKmh,tickSeconds:1})
  return sum+cost.grossEnergyCost*cost.efficiencyMultiplier*s.seconds*s.energyMultiplier*input.supplyMultiplier
 },0)
 near(r.uncappedCost,expected);near(r.energyCost,Math.min(input.workload.currentEnergy,expected))
 near(r.nextEnergy,input.workload.currentEnergy-r.energyCost);near(r.elapsedSeconds,g.movement.elapsedSeconds)
}
near(a.riders[1].nextEnergy,0)
console.log('PASS 043BD shared movement-energy witnesses and conserved reserve')
assert.deepEqual(result,run(w,1,30,120,groups.slice().reverse().map(g=>({...g,riders:g.riders.slice().reverse()}))))
assert.equal(result.official,false);assert.equal(result.hostedWriteAllowed,false)
assert.throws(()=>run(w,1,30,120,[groups[0],groups[0]]))
assert.throws(()=>run(w,1,30,120,[groups[0],{...groups[1],riders:[rider('a')]}]))
assert.throws(()=>run(w,1,30,120,[{...groups[0],startKm:1}]))
assert.throws(()=>run(w,1,30,-1,groups))
assert.throws(()=>run({...w,courseBearingSegments:undefined},1,30,120,groups))
console.log('PASS 043BD deterministic ordering, invalid group evidence and authority guards')
console.log('PASS 4/4 combined course wind group checks; no hosted connection')
