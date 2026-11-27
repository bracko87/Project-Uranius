// Isolated 043BD integration primitive. Not connected to runtime authority.
import type {StageWeatherInput} from '../domain/StageInput'
import {validateCourseBearingSegments} from './directionalWindEffects'
import {calculateWeatherPerformanceEffects} from './weatherPerformanceEffects'

export interface WindTickSlice {
 readonly fromKm:number
 readonly toKm:number
 readonly seconds:number
 readonly speedKmh:number
 readonly energyMultiplier:number
}
export function integrateCourseWindTick(
 weather:StageWeatherInput, stageDistanceKm:number, startKm:number,
 tickSeconds:number, speedAt:(speedMultiplier:number)=>number,
){
 if(![stageDistanceKm,startKm,tickSeconds].every(Number.isFinite)||
 stageDistanceKm<=0||startKm<0||startKm>stageDistanceKm||tickSeconds<=0)
 throw Error('invalid wind integration bounds')
 validateCourseBearingSegments(weather,stageDistanceKm)
 const slices:WindTickSlice[]=[]
 let position=startKm, remaining=tickSeconds
 const boundaries=weather.courseBearingSegments?.map(s=>s.toKm)??[stageDistanceKm]
 for(const boundary of boundaries){
  if(remaining<=0||position>=stageDistanceKm)break
  if(boundary<=position)continue
  const effects=calculateWeatherPerformanceEffects(weather,position)
  const speed=speedAt(effects.speedMultiplier)
  if(!Number.isFinite(speed)||speed<0)throw Error('invalid wind integration speed')
  // A stationary group cannot reach a positive-distance boundary.
  const duration=speed===0?Infinity:(boundary-position)*3600/speed
  const reachesBoundary=duration<=remaining
  const seconds=reachesBoundary?duration:remaining
  const end=reachesBoundary?boundary:Math.min(boundary,position+speed*seconds/3600)
  slices.push({fromKm:position,toKm:end,seconds,speedKmh:speed,
   energyMultiplier:Math.max(effects.energyConsumptionMultiplier,effects.staminaConsumptionMultiplier)})
  position=end
  remaining=Math.max(0,remaining-seconds)
 }
 const elapsedSeconds=tickSeconds-remaining
 return {slices,nextDistanceKm:position,elapsedSeconds,
  finished:position===stageDistanceKm,
  averageSpeedKmh:elapsedSeconds>0?(position-startKm)*3600/elapsedSeconds:0}
}
