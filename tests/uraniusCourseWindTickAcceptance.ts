import assert from 'node:assert/strict'
import type {StageWeatherInput} from '../src/race-engine/domain/StageInput'
import {integrateCourseWindTick as integrate} from '../src/race-engine/simulation/integrateCourseWindTick'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const w:StageWeatherInput={authority:'stage_weather_snapshot',source:'synthetic_review_fixture',condition:'clear',summary:null,averageTemperatureC:20,minimumTemperatureC:20,maximumTemperatureC:20,windSpeedKmh:40,precipitationMm:0,hostCity:null,countryCode:null,directionalWind:{scope:'synthetic_constant_bearing',courseBearingDegrees:0,windFromDegrees:0},courseBearingSegments:[{fromKm:0,toKm:.1,courseBearingDegrees:0},{fromKm:.1,toKm:.2,courseBearingDegrees:90},{fromKm:.2,toKm:1,courseBearingDegrees:180}]}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
const speed=(m:number)=>36*m
const r=integrate(w,1,0,30,speed)
const t1=10/.925,t2=10/.9625,t3=30-t1-t2
assert.equal(r.slices.length,3)
near(r.slices[0].seconds,t1);near(r.slices[1].seconds,t2);near(r.slices[2].seconds,t3)
near(r.nextDistanceKm,.2+36*1.05*t3/3600)
assert.deepEqual(r.slices.map(s=>s.energyMultiplier),[1.15,1.075,.925])
near(r.elapsedSeconds,30)
assert.deepEqual(r,integrate(w,1,0,30,speed))
console.log('PASS 043BD multiple boundary integration and deterministic local exposure')
const f=integrate(w,1,.95,30,speed)
assert.equal(f.finished,true);near(f.elapsedSeconds,.05*3600/37.8)
near(f.nextDistanceKm,1)
const exact=integrate(w,1,.1,30,()=>0)
assert.equal(exact.slices.length,1);near(exact.slices[0].energyMultiplier,1.075)
near(exact.elapsedSeconds,30);near(exact.nextDistanceKm,.1)
console.log('PASS 043BD fractional finish, exact boundary and stationary repair')
const {courseBearingSegments:ignored,...constant}=w
const a=integrate(constant,1,0,30,speed)
const b=integrate({...constant,courseBearingSegments:[{fromKm:0,toKm:1,courseBearingDegrees:0}]},1,0,30,speed)
assert.deepEqual(a,b);near(a.nextDistanceKm,36*.925*30/3600)
const capped=integrate(w,1,.2,30,m=>Math.min(36,36*m))
near(capped.nextDistanceKm,.5)
console.log('PASS 043BD constant-bearing identity and caller speed cap')
assert.throws(()=>integrate(w,2,0,30,speed))
assert.throws(()=>integrate(w,1,-1,30,speed))
assert.throws(()=>integrate(w,1,0,0,speed))
assert.throws(()=>integrate(w,1,0,30,()=>NaN))
assert.throws(()=>integrate(w,1,0,30,()=>-1))
console.log('PASS 043BD invalid evidence rejected')
console.log('PASS 4/4 isolated course wind integration checks; no hosted connection')
