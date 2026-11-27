import assert from 'node:assert/strict'
import {calculateCourseWindEnergy as energy} from '../src/race-engine/simulation/calculateCourseWindEnergy'
import {calculateRiderEnergyCost} from '../src/race-engine/simulation/energyCost'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const rider={currentEnergy:80,baseSpeedKmh:40,gradientPercent:4,stamina:80,resistance:70,recovery:60}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
const a={fromKm:0,toKm:.1,seconds:10,speedKmh:36,energyMultiplier:1.15}
const b={fromKm:.1,toKm:.3,seconds:16,speedKmh:45,energyMultiplier:.925}
const expected=(s:typeof a)=>{const c=calculateRiderEnergyCost({...rider,speedKmh:s.speedKmh,tickSeconds:1});return c.grossEnergyCost*c.efficiencyMultiplier*s.seconds*s.energyMultiplier*.95}
const r=energy(rider,[a,b],.95)
near(r.uncappedCost,expected(a)+expected(b));near(r.energyCost,r.uncappedCost);near(r.elapsedSeconds,26)
assert.deepEqual(r,energy(rider,[a,b],.95))
console.log('PASS 043BD local speed, duration, weather and supply workload')
const low=energy({...rider,currentEnergy:.001},[a,b],.95)
near(low.uncappedCost,r.uncappedCost);near(low.nextEnergy,0);near(low.energyCost,.001)
console.log('PASS 043BD uncapped accumulation and single reserve cap')
const fractional={fromKm:0,toKm:36*2.5/3600,seconds:2.5,speedKmh:36,energyMultiplier:1}
const f=energy(rider,[fractional],1)
const whole=calculateRiderEnergyCost({...rider,speedKmh:36,tickSeconds:10})
near(f.energyCost,whole.energyCost/4)
const stationary=energy(rider,[{fromKm:0,toKm:0,seconds:30,speedKmh:0,energyMultiplier:1}],1)
near(stationary.energyCost,calculateRiderEnergyCost({...rider,speedKmh:0,tickSeconds:30}).energyCost)
console.log('PASS 043BD fractional workload and stationary canonical parity')
assert.throws(()=>energy(rider,[],1))
assert.throws(()=>energy(rider,[a,{...b,fromKm:.11}],1))
assert.throws(()=>energy(rider,[{...a,speedKmh:0}],1))
assert.throws(()=>energy(rider,[{...a,energyMultiplier:NaN}],1))
assert.throws(()=>energy(rider,[a],1.1))
console.log('PASS 043BD malformed workload evidence rejected')
console.log('PASS 4/4 isolated course wind energy checks; no hosted connection')
