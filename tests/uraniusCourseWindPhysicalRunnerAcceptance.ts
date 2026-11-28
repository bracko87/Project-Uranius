import assert from 'node:assert/strict'
import type {StageInput,StageWeatherInput} from '../src/race-engine/domain/StageInput'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {calculateRiderEnergyCost} from '../src/race-engine/simulation/energyCost'
import {finishPhysicalIncidentStage,physicalFinishTick} from '../scripts/uranius-physical-incident-finish-review'
import {resolvePreparedPhysicalWeather} from '../scripts/uranius-prepared-physical-weather-review'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const teams=[id(11),id(12)]
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:75,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:75,recovery:75,teamwork:75,timeTrial:75,raceIq:75}}))
const input={raceId:id(100),stageId:id(101),stageName:'043BD exact course wind runtime',stageFormat:'road_race',distanceKm:20,seed:'043BD-exact-runner',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:40,maximumSpeedKmh:60},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:20,elevationMetres:50}],orders:[]} as StageInput
const bounds=[0,.1,.2,5,10,19.95,20],bearings=[0,90,180,270,0,180]
const w:StageWeatherInput={authority:'stage_weather_snapshot',source:'synthetic_review_fixture',condition:'clear',summary:null,averageTemperatureC:20,minimumTemperatureC:20,maximumTemperatureC:20,windSpeedKmh:40,precipitationMm:0,hostCity:null,countryCode:null,directionalWind:{scope:'synthetic_constant_bearing',courseBearingDegrees:0,windFromDegrees:0},courseBearingSegments:bearings.map((courseBearingDegrees,i)=>({fromKm:bounds[i],toKm:bounds[i+1],courseBearingDegrees}))}
const weather=resolvePreparedPhysicalWeather(input,{weatherCondition:'clear',precipitationMm:0,weatherMultiplier:Math.min(2.5,Math.max(...bounds.slice(0,-1).map(k=>calculateWeatherPerformanceEffects(w,k).incidentProbabilityMultiplier)))},w)
const opening=createInitialState(input)
const initial={...opening,input:{...opening.input,weather:w},weatherPerformanceEffectsEnabled:true}
const supply=Object.fromEntries(roster.map(r=>[r.riderId,.95]))
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
const run=()=>finishPhysicalIncidentStage(initial,[],'peloton_main',1440,supply,undefined,false,weather,true)
const finish=run()
assert.ok(finish.state.completed);assert.equal(finish.classification.length,24)
let previous=initial,cornerTicks=0
for(const tick of finish.ticks){
 const exact=tick.exactCourseWind!
 assert.ok(exact);assert.equal(exact.official,false);assert.equal(exact.hostedWriteAllowed,false)
 const group=exact.groups[0],movement=group.movement,proposal=tick.movement.proposals[0]
 const neutral=calculateMultiGroupMovement(previous,undefined,false,false).proposals[0]
 if(movement.slices.length>1)cornerTicks++
 near(proposal.nextDistanceKm,movement.nextDistanceKm)
 for(const s of movement.slices){
  const e=calculateWeatherPerformanceEffects(w,s.fromKm)
  near(s.speedKmh,Math.min(60,neutral.appliedSpeedKmh*e.speedMultiplier))
  near(s.energyMultiplier,e.energyConsumptionMultiplier)
  near(s.toKm-s.fromKm,s.speedKmh*s.seconds/3600)
 }
 near(movement.slices.reduce((n,s)=>n+s.seconds,0),movement.elapsedSeconds)
 for(const a of tick.energy){
  const rider=previous.riders[a.riderId]
  const cost=movement.slices.reduce((n,s)=>{
   const c=calculateRiderEnergyCost({currentEnergy:rider.energy,speedKmh:s.speedKmh,baseSpeedKmh:proposal.baseSpeedKmh,gradientPercent:proposal.gradientPercent,tickSeconds:1,stamina:rider.attributes.stamina,resistance:rider.attributes.resistance,recovery:rider.attributes.recovery})
   return n+c.grossEnergyCost*c.efficiencyMultiplier*s.seconds*s.energyMultiplier*.95
  },0)
  near(a.nextEnergy,Math.max(0,rider.energy-cost));near(a.energyCost,rider.energy-a.nextEnergy)
  near(tick.state.riders[a.riderId].energy,a.nextEnergy)
 }
 previous=tick.state
}
assert.ok(cornerTicks>0)
console.log('PASS 043BD actual physical runner course boundaries and conserved rider energy; cornerTicks='+cornerTicks)
const last=finish.ticks.at(-1)!,terminal=last.exactCourseWind!.groups[0]
assert.ok(terminal.movement.finished&&terminal.movement.elapsedSeconds>0&&terminal.movement.elapsedSeconds<=30)
for(const crossing of last.crossings)near(crossing.finishTimeSeconds!,terminal.finishTimeSeconds!)
for(const r of finish.classification)near(r.elapsedSeconds!,terminal.finishTimeSeconds!)
console.log('PASS 043BD actual fractional finish and complete classification')
const repeated=run()
assert.equal(repeated.classificationSha256,finish.classificationSha256)
assert.deepEqual(repeated.ticks,finish.ticks)
console.log('PASS 043BD complete race deterministic replay')
const legacy=physicalFinishTick(initial,[],'peloton_main',supply,undefined,false,weather)
assert.deepEqual(legacy,physicalFinishTick(initial,[],'peloton_main',supply,undefined,false,weather,false))
assert.equal(legacy.exactCourseWind,undefined)
assert.throws(()=>physicalFinishTick(initial,[],'peloton_main',undefined,undefined,false,weather,true))
assert.throws(()=>physicalFinishTick(initial,[],'peloton_main',supply,undefined,false,undefined,true))
assert.equal(finish.official,false);assert.equal(finish.hostedWriteAllowed,false)
console.log('PASS 043BD legacy default and explicit offline authority guards')
console.log('PASS 4/4 exact course wind physical runner checks; no hosted connection')
