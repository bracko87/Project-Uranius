// Offline 043BD adapter: shared movement and energy witnesses.
// Not connected to the accepted physical race runner.
import type {StageWeatherInput} from '../domain/StageInput'
import {integrateCourseWindTick} from './integrateCourseWindTick'
import {calculateCourseWindEnergy} from './calculateCourseWindEnergy'
type RiderWorkload=Parameters<typeof calculateCourseWindEnergy>[0]
export interface WindGroupInput {
 readonly groupId:string
 readonly startKm:number
 readonly neutralSpeedKmh:number
 readonly maximumSpeedKmh:number
 readonly riders:readonly {riderId:string;workload:RiderWorkload;supplyMultiplier:number}[]
}
export function reviewCourseWindGroupTick(
 weather:StageWeatherInput,stageDistanceKm:number,tickSeconds:number,raceSecond:number,
 groups:readonly WindGroupInput[],
){
 if(weather.source!=='synthetic_review_fixture'||!weather.courseBearingSegments||
 !Number.isFinite(raceSecond)||raceSecond<0||!groups.length)
 throw Error('explicit synthetic group wind review required')
 const groupIds=new Set<string>(),riderIds=new Set<string>()
 const results=groups.slice().sort((a,b)=>a.groupId.localeCompare(b.groupId)).map(g=>{
  if(!g.groupId||groupIds.has(g.groupId)||!g.riders.length||
   !Number.isFinite(g.neutralSpeedKmh)||g.neutralSpeedKmh<0||
   !Number.isFinite(g.maximumSpeedKmh)||g.maximumSpeedKmh<=0||
   g.startKm>=stageDistanceKm)
   throw Error('invalid active wind group')
  groupIds.add(g.groupId)
  const movement=integrateCourseWindTick(weather,stageDistanceKm,g.startKm,tickSeconds,
   factor=>Math.min(g.maximumSpeedKmh,g.neutralSpeedKmh*factor))
  const riders=g.riders.slice().sort((a,b)=>a.riderId.localeCompare(b.riderId)).map(r=>{
   if(!r.riderId||riderIds.has(r.riderId))throw Error('duplicate wind rider')
   riderIds.add(r.riderId)
   return {riderId:r.riderId,...calculateCourseWindEnergy(r.workload,movement.slices,r.supplyMultiplier)}
  })
  return {groupId:g.groupId,movement,riders,finishTimeSeconds:movement.finished?raceSecond+movement.elapsedSeconds:null}
 })
 return {groups:results,official:false,hostedWriteAllowed:false}
}
