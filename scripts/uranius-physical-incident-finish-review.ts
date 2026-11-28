// Offline only. Extend the accepted physical prefix through all terminal states.
import type {SimulationState} from '../src/race-engine/domain/SimulationState'
import type {StageResult} from '../src/race-engine/domain/SimulationOutput'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
import {applyMultiGroupMovement} from '../src/race-engine/simulation/applyMultiGroupMovement'
import {applyMultiGroupEnergy} from '../src/race-engine/simulation/applyMultiGroupEnergy'
import {detectMultiGroupFinishCandidates} from '../src/race-engine/simulation/multiGroupFinishCandidates'
import {applyMultiGroupFinish} from '../src/race-engine/simulation/applyMultiGroupFinish'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {captureAutomaticOverlappingFinishPrefix} from './uranius-automatic-overlapping-incident-review'
import {multiRiderIncidentTick} from './uranius-multi-rider-incident-motion-review'
import type {EnergyMultipliers} from './uranius-resource-energy-review'
import {reviewCourseWindGroupTick} from '../src/race-engine/simulation/reviewCourseWindGroupTick'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {applyOptionalPreparedWeatherEnergy,type PreparedWeather} from './uranius-prepared-physical-weather-review'
type Episode=Parameters<typeof multiRiderIncidentTick>[1][number]
type FinalEpisode=Omit<Episode,'phase'>&{phase:Episode['phase']|'finished'}
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AD: '+m)}
export function physicalFinishTick(state:SimulationState,episodes:readonly FinalEpisode[],targetId:string,multipliers?:EnergyMultipliers,capabilityAdjustments?:Readonly<Record<string,number>>,terrainCapability=false,weather?:PreparedWeather,exactCourseWind=false){
 req(!state.completed&&state.input.orders.length===0,'active no-command state required')
 const segmented=weather?.weather.courseBearingSegments!==undefined
 const base=calculateMultiGroupMovement(state,capabilityAdjustments,terrainCapability,!exactCourseWind&&!!weather&&!weather.neutral),dt=base.tickSeconds/3600
 const target=base.proposals.find(p=>p.groupId===targetId)
 req(target||(!state.groups[targetId]?.active&&state.currentKm===state.stageDistanceKm),'missing live or finished target')
 const active=episodes.filter(e=>e.phase!=='joined'&&e.phase!=='finished')
 const ids=active.flatMap(e=>[e.groupId,...(e.helperGroupId?[e.helperGroupId]:[])])
 req(new Set(ids).size===ids.length&&active.every(e=>e.targetId===targetId)&&base.proposals.every(p=>p.groupId===targetId||ids.includes(p.groupId))&&ids.every(id=>base.proposals.some(p=>p.groupId===id)),'untracked group')
 const limit=state.stageDistanceKm
 // First opt-in runtime slice: ordinary incident-free continuation only.
 // Pursuit/contact constraints and post-stage workload consumers are not yet admitted.
 if(exactCourseWind)req(segmented&&weather&&weather.weather.source==='synthetic_review_fixture'&&
  state.weatherPerformanceEffectsEnabled===true&&JSON.stringify(state.input.weather)===JSON.stringify(weather.weather)&&
  weather.effects.fatigueGainMultiplier===1&&multipliers&&active.length===0&&
  !state.groupShelterEnergyEnabled&&!state.experimentalAbsoluteSpeedEffortEnabled,
  'exact course wind requires incident-free synthetic wind-only workload')
 const exact=exactCourseWind?reviewCourseWindGroupTick(weather!.weather,limit,base.tickSeconds,state.raceSecond,
  base.proposals.map(p=>({groupId:p.groupId,startKm:p.previousDistanceKm,neutralSpeedKmh:p.appliedSpeedKmh,
   maximumSpeedKmh:state.input.settings.maximumSpeedKmh,riders:p.riderIds.map(riderId=>{
    const r=state.riders[riderId]
    return {riderId,supplyMultiplier:multipliers![riderId],workload:{currentEnergy:r.energy,
     baseSpeedKmh:p.baseSpeedKmh,gradientPercent:p.gradientPercent,stamina:r.attributes.stamina,
     resistance:r.attributes.resistance,recovery:r.attributes.recovery}}
   })}))) : undefined
 const preliminary=base.proposals.map(p=>{
  if(exact){
   const m=exact.groups.find(g=>g.groupId===p.groupId)!.movement
   return {...p,nextDistanceKm:m.nextDistanceKm,distanceAdvancedKm:m.nextDistanceKm-p.previousDistanceKm,
    appliedSpeedKmh:m.averageSpeedKmh}
  }
  const ep=active.find(e=>e.groupId===p.groupId||e.helperGroupId===p.groupId)
  const speedFactor=segmented?calculateWeatherPerformanceEffects(weather!.weather,p.previousDistanceKm).speedMultiplier:weather?.effects.speedMultiplier??1
  const differentLocalWind=segmented&&!!target&&speedFactor!==calculateWeatherPerformanceEffects(weather!.weather,target.previousDistanceKm).speedMultiplier
  let speed=p.appliedSpeedKmh,cap=limit
  if(ep){
   const repair=state.raceSecond<ep.repairUntil
   speed=p.groupId===ep.groupId?(repair?0:target?Math.min(state.input.settings.maximumSpeedKmh,(terrainCapability||differentLocalWind?p.appliedSpeedKmh+8*p.terrainMultiplier*speedFactor:Math.max(p.appliedSpeedKmh,target.appliedSpeedKmh+8*speedFactor))):p.appliedSpeedKmh):(repair?(terrainCapability||differentLocalWind?p.appliedSpeedKmh:(target?.appliedSpeedKmh??p.appliedSpeedKmh))*.25:0)
   // Before the finish tick retain target contact cap; never merge into a finished target.
   if(target&&target.nextDistanceKm<limit)cap=target.nextDistanceKm
   if(!repair&&p.groupId===ep.groupId&&ep.helperGroupId)cap=Math.min(cap,state.groups[ep.helperGroupId].distanceKm)
  }
  const next=Math.min(cap,p.previousDistanceKm+speed*dt)
  req(next>=p.previousDistanceKm-1e-10,'backward distance')
  // Keep actual projected speed for sub-tick finish timing. Only non-finish
  // contact caps reduce effective speed; finish-line clamping is not braking.
  const appliedSpeedKmh=next===limit?speed:(next-p.previousDistanceKm)/dt
  return {...p,nextDistanceKm:next,distanceAdvancedKm:next-p.previousDistanceKm,appliedSpeedKmh}
 })
 const leader=preliminary.slice().sort((a,b)=>b.nextDistanceKm-a.nextDistanceKm||a.groupId.localeCompare(b.groupId))[0]
 const leaderDistanceKm=Math.max(state.currentKm,leader.nextDistanceKm)
 const previousWinners=Object.values(state.riders).filter(r=>r.stageStatus==='finished').map(r=>r.finishTimeSeconds!)
 const elapsed=previousWinners.length?Math.max(0,state.raceSecond+base.tickSeconds-Math.min(...previousWinners)):0
 const movement={...base,leaderGroupId:leader.groupId,leaderDistanceKm,proposals:preliminary.map(p=>({...p,gapFromLeaderSeconds:Math.max(0,leaderDistanceKm-p.nextDistanceKm)*3600/Math.max(1,leader.appliedSpeedKmh)+elapsed}))}
 const moved=applyMultiGroupMovement({state,movement}).state
 const baselineEnergy=applyMultiGroupEnergy({state:moved,movement})
 const energy=exact?(()=>{
  const riders={...moved.riders}
  const applications=baselineEnergy.applications.map(a=>{
   const workload=exact.groups.find(g=>g.groupId===a.groupId)!.riders.find(r=>r.riderId===a.riderId)!
   riders[a.riderId]={...riders[a.riderId],energy:workload.nextEnergy}
   // Single-speed gross metadata is not a segmented workload witness.
   // Carry the exact per-slice receipt separately; consumers must use it.
   return {...a,nextEnergy:workload.nextEnergy,energyCost:workload.energyCost,
    result:{...a.result,nextEnergy:workload.nextEnergy,energyCost:workload.energyCost},
    exactCourseWindWorkload:workload}
  })
  return {state:{...moved,riders},applications}
 })():applyOptionalPreparedWeatherEnergy(baselineEnergy,multipliers,weather)
 let next=energy.state
 const pickups:string[]=[],rejoins:string[]=[]
 const merge=(fromId:string,toId:string)=>{
  const from=next.groups[fromId],to=next.groups[toId]
  req(from.active&&to.active&&to.distanceKm<limit&&Math.abs(from.distanceKm-to.distanceKm)<1e-8,'pre-line physical contact required')
  const riders={...next.riders}
  for(const id of from.riderIds)riders[id]={...riders[id],currentGroupId:toId,distanceKm:to.distanceKm,speedKmh:to.speedKmh}
  next={...next,riders,groups:{...next.groups,[fromId]:{...from,active:false,riderIds:[]},[toId]:{...to,riderIds:[...to.riderIds,...from.riderIds].sort()}}}
 }
 let updated=episodes.map(e=>{
  const ep={...e}
  if(ep.phase==='joined'||ep.phase==='finished'||state.raceSecond<ep.repairUntil)return ep
  ep.phase='chase'
  if(ep.helperGroupId&&next.groups[ep.helperGroupId].distanceKm<limit&&Math.abs(next.groups[ep.groupId].distanceKm-next.groups[ep.helperGroupId].distanceKm)<1e-8){
   merge(ep.helperGroupId,ep.groupId);ep.helperGroupId=null;pickups.push(ep.affected)
  }
  if(!ep.helperGroupId&&next.groups[targetId].active&&next.groups[targetId].distanceKm<limit&&Math.abs(next.groups[ep.groupId].distanceKm-next.groups[targetId].distanceKm)<1e-8){
   merge(ep.groupId,targetId);ep.phase='joined';rejoins.push(ep.affected)
  }
  return ep
 })
 const detection=detectMultiGroupFinishCandidates(next,{movement,subTickInterpolationEnabled:true})
 const applied=detection.candidates.length?applyMultiGroupFinish({state:next,detection}):null
 if(applied)next=applied.state
 updated=updated.map(e=>{
  const ep={...e}
  if(ep.phase!=='joined'&&next.riders[ep.affected].stageStatus==='finished')ep.phase='finished'
  if(ep.helperGroupId&&!next.groups[ep.helperGroupId].active)ep.helperGroupId=null
  return ep
 })
 validateSimulationState(next)
 return {state:next,episodes:updated,pickups,rejoins,movement,energy:energy.applications,results:applied?.newResults??[],crossings:detection.candidates,...(exact?{exactCourseWind:exact}:{}),official:false,hostedWriteAllowed:false}
}
export function finishPhysicalIncidentStage(initial:SimulationState,initialEpisodes:readonly Episode[],targetId:string,maximumTicks=1440,multipliers?:EnergyMultipliers,capabilityAdjustments?:Readonly<Record<string,number>>,terrainCapability=false,weather?:PreparedWeather,exactCourseWind=false){
 req(!initial.completed&&Number.isSafeInteger(maximumTicks)&&maximumTicks>0&&maximumTicks<=1440,'invalid continuation scope')
 req(Object.values(initial.riders).every(r=>r.stageStatus==='racing'||r.stageStatus==='dnf'),'pre-finish prefix required')
 let state=initial,episodes:readonly FinalEpisode[]=initialEpisodes
 const ticks:ReturnType<typeof physicalFinishTick>[]=[],results:StageResult[]=[]
 while(!state.completed){
  req(ticks.length<maximumTicks,'finish horizon exceeded')
  const t=physicalFinishTick(state,episodes,targetId,multipliers,capabilityAdjustments,terrainCapability,weather,exactCourseWind);state=t.state;episodes=t.episodes;ticks.push(t);results.push(...t.results)
 }
 const finishers=Object.values(state.riders).filter(r=>r.stageStatus==='finished'),withdrawn=Object.values(state.riders).filter(r=>r.stageStatus==='dnf').sort((a,b)=>a.riderId.localeCompare(b.riderId))
 req(finishers.length>0&&finishers.length+withdrawn.length===Object.keys(state.riders).length&&new Set(results.map(r=>r.riderId)).size===finishers.length&&results.length===finishers.length,'terminal coverage')
 const winner=results[0].elapsedSeconds
 for(const [i,r] of results.entries()){
  req(r.rank===i+1&&r.elapsedSeconds!==null&&r.elapsedSeconds>=winner&&(!i||r.elapsedSeconds>=results[i-1].elapsedSeconds)&&state.riders[r.riderId].finishPosition===r.rank&&state.riders[r.riderId].finishTimeSeconds===r.elapsedSeconds,'classification mismatch')
 }
 const classification=[...results,...withdrawn.map(r=>({riderId:r.riderId,teamId:r.teamId,status:'dnf',rank:null,elapsedSeconds:null,gapSeconds:null}))]
 return {version:'043AD_physical_finish_review_v1',state,episodes,ticks,classification,classificationSha256:carryoverDigest(classification),physicalClassificationComputed:true,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false}
}
export function reviewAutomaticPhysicalFinish(args:any){
 const prefix=captureAutomaticOverlappingFinishPrefix(args),p=prefix.finishPrefix!
 req(prefix.trace.stopReason==='pre_finish_boundary'&&p.handled===prefix.trace.incidents.length,'only fully applied pre-finish selection prefix admitted')
 const targetId=p.targetId??Object.values(prefix.finalState.groups).find((g:any)=>g.active&&g.groupType==='peloton')?.groupId
 req(targetId,'missing finish target')
 const multipliers=prefix.resourceEnergy?Object.fromEntries(prefix.resourceEnergy.rows.map(r=>[r.riderId,r.roadEnergyMultiplier])):undefined
 const finish=finishPhysicalIncidentStage(prefix.finalState,p.episodes,targetId,1440,multipliers,prefix.equipmentPerformance?.adjustments,prefix.terrainCapability===true,prefix.physicalWeather)
 return {prefix,finish,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false}
}
