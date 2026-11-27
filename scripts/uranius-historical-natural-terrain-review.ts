// Offline isolated adapter: historical selection, calibrated terrain pressure.
import {resolvePreparedPhysicalWeather,applyPreparedWeatherEnergy} from './uranius-prepared-physical-weather-review'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {bindLegacyReadiness,bindTourStageReadiness} from './uranius-frozen-readiness-review.mjs'
import {resolveResourceMechanicalReview} from './uranius-resource-mechanical-review.mjs'
import {resolveEquipmentPerformanceReview} from './uranius-equipment-performance-review'
import {resolveResourceEnergyReview,applyReviewEnergyMultiplier} from './uranius-resource-energy-review'
import {reviewNaturalTerrainSeparation} from './uranius-natural-terrain-separation-review'
import {reviewHistoricalTerrainTraceWithPhysicalFeedback} from './uranius-historical-incident-eligibility-review.mjs'
import {reviewHistoricalCheckpointConsequences} from './uranius-historical-incident-consequences-review.mjs'
import {getStageTerrainSample} from '../src/race-engine/simulation/stageProfile'
import {simulateIntegratedTerrainSeparationTick} from '../src/race-engine/simulation/runIntegratedTerrainSeparationStage'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
import type {SimulationState} from '../src/race-engine/domain/SimulationState'
import type {TerrainAwareMultiGroupMovementResult} from '../src/race-engine/simulation/terrainAwareMultiGroupMovement'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AU: '+m)}
type Episode={incidentId:string,riderId:string,groupId:string,targetId:string|null,repairUntil:number,phase:'repair'|'chase'|'joined'|'finished'}
const round=(x:number)=>Math.round(x*1e6)/1e6
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false})
const display=(g:any)=>g.groupType==='peloton'?'P':g.groupId
const active=(s:SimulationState)=>Object.values(s.groups).filter(g=>g.active)
export function applyHistoricalTerrainIncident(state:SimulationState,consequence:any,episodes:readonly Episode[]){
 const affected=new Set(consequence.riderConsequences.map(r=>r.riderId))
 req(affected.size>0&&affected.size===consequence.riderConsequences.length,'unique incident riders required')
 const groups={...state.groups},riders={...state.riders},pressure={...state.separationPressureSecondsByRiderId},nextEpisodes=[...episodes],applications=[]
 for(const row of consequence.riderConsequences){
  const r=state.riders[row.riderId],g=state.groups[r?.currentGroupId]
  req(r?.stageStatus==='racing'&&g?.active&&g.riderIds.includes(r.riderId)&&!episodes.some(e=>e.riderId===r.riderId&&(e.phase==='repair'||e.phase==='chase')),'invalid incident source')
  req(['finished','dnf'].includes(row.statusImpact)&&Number.isFinite(row.energyLossPoints)&&row.energyLossPoints>=0,'invalid historical consequence')
  const remaining=groups[g.groupId].riderIds.filter(id=>id!==r.riderId)
  groups[g.groupId]={...groups[g.groupId],riderIds:remaining,active:remaining.length>0}
  const groupId='historical_'+state.raceSecond+'_'+r.riderId,terminal=row.statusImpact==='dnf'
  req(!groups[groupId]&&(terminal||row.movedToLaterGroup&&consequence.timeLossSeconds>0),'unsupported incident consequence')
  groups[groupId]={...g,groupId,groupType:'dropped',riderIds:[r.riderId],active:!terminal,speedKmh:0,createdAtKm:g.distanceKm,createdAtRaceSecond:state.raceSecond}
  riders[r.riderId]={...r,currentGroupId:groupId,speedKmh:0,energy:Math.max(0,r.energy-row.energyLossPoints),...(terminal?{stageStatus:'dnf' as const}:{})}
  pressure[r.riderId]=0
  if(!terminal)nextEpisodes.push({incidentId:consequence.incidentId,riderId:r.riderId,groupId,targetId:g.riderIds.some(id=>!affected.has(id))?g.groupId:null,repairUntil:state.raceSecond+Math.ceil(consequence.timeLossSeconds/30)*30,phase:'repair'})
  applications.push({incidentId:consequence.incidentId,riderId:r.riderId,sourceGroupId:g.groupId,sourceGroupType:g.groupType,groupId,raceSecond:state.raceSecond,distanceKm:g.distanceKm,beforeEnergy:r.energy,afterEnergy:riders[r.riderId].energy,statusImpact:row.statusImpact,timeLossSeconds:consequence.timeLossSeconds})
 }
 const next={...state,groups,riders,separationPressureSecondsByRiderId:pressure}
 validateSimulationState(next)
 return {state:next,episodes:nextEpisodes,applications}
}
export function historicalRepairMovement(state:SimulationState,base:TerrainAwareMultiGroupMovementResult,episodes:readonly Episode[]){
 const dt=base.movement.tickSeconds/3600,limit=state.stageDistanceKm
 const tracked=episodes.filter(e=>e.phase==='repair'||e.phase==='chase')
 if(!tracked.length)return base
 const proposals=base.movement.proposals.map(p=>{
  const e=tracked.find(e=>e.groupId===p.groupId)
  if(!e)return p
  const repair=state.raceSecond<e.repairUntil,target=base.movement.proposals.find(x=>x.groupId===e.targetId)
  const speed=repair?0:target?Math.min(state.input.settings.maximumSpeedKmh,p.appliedSpeedKmh+8*p.terrainMultiplier*(state.weatherPerformanceEffectsEnabled?calculateWeatherPerformanceEffects(state.input.weather,p.previousDistanceKm).speedMultiplier:1)):p.appliedSpeedKmh
  let next=Math.min(limit,p.previousDistanceKm+speed*dt)
  if(!repair&&target&&target.previousDistanceKm>=p.previousDistanceKm&&target.nextDistanceKm<limit)next=Math.min(next,target.nextDistanceKm)
  req(next>=p.previousDistanceKm,'backward repair motion')
  return {...p,nextDistanceKm:next,distanceAdvancedKm:next-p.previousDistanceKm,appliedSpeedKmh:next===limit?speed:(next-p.previousDistanceKm)/dt}
 })
 const leader=proposals.slice().sort((a,b)=>b.nextDistanceKm-a.nextDistanceKm||a.groupId.localeCompare(b.groupId))[0]
 const leaderKm=Math.max(state.currentKm,leader.nextDistanceKm)
 const times=Object.values(state.riders).filter(r=>r.stageStatus==='finished').map(r=>r.finishTimeSeconds!)
 const elapsed=times.length?Math.max(0,state.raceSecond+base.movement.tickSeconds-Math.min(...times)):0
 return {...base,movement:{...base.movement,leaderGroupId:leader.groupId,leaderDistanceKm:leader.nextDistanceKm,proposals:proposals.map(p=>({...p,gapFromLeaderSeconds:(leaderKm-p.nextDistanceKm)*3600/Math.max(.000001,leader.appliedSpeedKmh)+elapsed}))}}
}
export function reviewHistoricalNaturalTerrain({packet,expectedPacketSha256}:any){
 req(packet?.provenance==='synthetic_review_fixture'&&carryoverDigest(packet)===expectedPacketSha256,'frozen combined terrain packet required')
 const {input,source,context}=packet
 req(context&&context.flatSprint===false&&Number.isFinite(context.weatherMultiplier)&&context.weatherMultiplier>=.7&&context.weatherMultiplier<=2.5&&typeof context.severeWeather==='boolean','explicit incident context required')
 const baselinePacket={provenance:packet.provenance,input,source,nativeIncidents:false}
 const baseline=reviewNaturalTerrainSeparation({packet:baselinePacket,expectedPacketSha256:carryoverDigest(baselinePacket)})
 req(baseline.profile.category===context.terrainType,'terrain context mismatch')
 let state=baseline.stage.initialState,episodes:Episode[]=[],handled=0
 const preparation=packet.preparation
 const weather=packet.physicalWeather===undefined?null:resolvePreparedPhysicalWeather(input,context,packet.physicalWeather)
 req(!weather||preparation,'physical weather requires complete preparation')
 if(weather&&!weather.neutral){state={...state,input:{...state.input,weather:weather.weather},weatherPerformanceEffectsEnabled:true};validateSimulationState(state)}
 const bound=preparation?(source.stageNumber>1?bindTourStageReadiness:bindLegacyReadiness)({source,expectedSourceSha256:carryoverDigest(source),input}):null
 const mechanical=preparation?resolveResourceMechanicalReview({evidence:preparation.mechanical,expectedEvidenceSha256:carryoverDigest(preparation.mechanical),ready:bound!.receipt}):null
 if(preparation){req(preparation.performance.terrainProfile===context.terrainType,'terrain equipment profile mismatch');req(carryoverDigest(preparation.energy.resources)===carryoverDigest(preparation.mechanical.resources)&&carryoverDigest(preparation.energy.requests)===carryoverDigest(preparation.mechanical.requests),'preparation ledger mismatch')}
 const equipment=preparation?resolveEquipmentPerformanceReview({evidence:preparation.performance,expectedEvidenceSha256:carryoverDigest(preparation.performance),ready:bound!.receipt,input:bound!.input,mechanical}):null
 const supply=preparation?resolveResourceEnergyReview({evidence:preparation.energy,expectedEvidenceSha256:carryoverDigest(preparation.energy),ready:bound!.receipt}):null
 const multipliers=supply?Object.fromEntries(supply.rows.map(r=>[r.riderId,r.roadEnergyMultiplier])):undefined
 const ready=new Map(source.riderRows.map(r=>[r.rider_id,r]))
 const modifiers=new Map(source.modifierRows.map(r=>[r.rider_id,r]))
 const roster=Object.values(state.riders).map(r=>{
  const row:any=ready.get(r.riderId),p:any=modifiers.get(r.riderId)
  req(row&&p,'complete rider incident evidence required')
  return {riderId:r.riderId,teamId:r.teamId,eligibleToStart:true,startingEnergy:r.energy,effectiveFatigue:row.fatigue_before_stage,resistance:r.attributes.resistance,raceIq:r.attributes.raceIq,riderSupport:p.health_incident_risk_multiplier,teamSupport:1,equipmentConditionPercent:mechanical?.rows.find(x=>x.riderId===r.riderId)?.equipmentConditionPercent??p.equipment_condition_factor*100,mechanicalRisk:mechanical?.rows.find(x=>x.riderId===r.riderId)?.mechanicalRisk??p.mechanical_incident_risk_multiplier}
 })
 const tickOf=(s:SimulationState,rejoins:any[]=[])=>({raceSecond:s.raceSecond,gradientPercent:active(s).find(g=>g.groupType==='peloton')?getStageTerrainSample(input,active(s).find(g=>g.groupType==='peloton')!.distanceKm).gradientPercent:0,riders:Object.values(s.riders).map(r=>({riderId:r.riderId,status:r.stageStatus,energy:r.energy,commandIntensity:1})),groups:active(s).map(g=>({displayCode:display(g),aheadOfPeloton:false,riderIds:g.riderIds})),rejoins})
 const evidence={provenance:packet.provenance,raceId:input.raceId,stageId:input.stageId,runId:source.runId,seed:input.seed,stage:{distanceKm:input.distanceKm,terrainType:context.terrainType,weatherCondition:context.weatherCondition,precipitationMm:context.precipitationMm,rainProbabilityPct:context.rainProbabilityPct},winnerTimeSeconds:baseline.stage.finalState.raceSecond,weatherMultiplier:context.weatherMultiplier,severeWeather:context.severeWeather,flatSprint:false,roster,ticks:baseline.stage.ticks.map(t=>tickOf(t.state))}
 const observations=[],applications=[],results=[],ticks=[]
 const advance=()=>{
  const tracked=episodes.filter(e=>e.phase==='repair'||e.phase==='chase')
  const before=state
  const t=simulateIntegratedTerrainSeparationTick(state,{
   terrainCapabilityInfluence:.5,separationWindowSeconds:120,droppedWaveConsolidationEnabled:false,droppedTransitionEventsEnabled:true,
   steepGradientSeverityEnabled:true,steepGradientSeverityModel:'progressive_resilience',steepGradientMovementSeverityEnabled:true,steepGradientMovementSeverityModel:'progressive_resilience',
   subTickFinishInterpolationEnabled:true,experimentalRequirePhysicalDroppedCatch:true,experimentalIndependentRepairGroupIds:tracked.map(e=>e.groupId),
   experimentalRepairMotion:(s,m)=>historicalRepairMovement(s,m,tracked),
   ...(equipment?{experimentalEquipmentCapabilityAdjustments:equipment.adjustments}:{}),
   ...(supply?{experimentalPreparationEnergy:e=>weather&&!weather.neutral?applyPreparedWeatherEnergy(e,multipliers!,weather):applyReviewEnergyMultiplier(e,multipliers)}:{})
  })
  state=t.state;results.push(...(t.appliedFinish?.newResults??[]))
  const contacts=[],rejoins=[]
  episodes=episodes.map(e=>{
   if(e.phase==='joined'||e.phase==='finished')return e
   if(state.riders[e.riderId].stageStatus==='finished')return {...e,phase:'finished'}
   if(before.raceSecond<e.repairUntil)return e
   let targetId=e.targetId
   if(targetId&&t.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(targetId))targetId=t.reconciledBreakaways.pelotonGroupId
   const target=targetId?state.groups[targetId]:null,g=state.groups[e.groupId]
   if(target?.active&&g.active&&target.distanceKm<input.distanceKm&&Math.abs(target.distanceKm-g.distanceKm)<1e-8){
    state={...state,riders:{...state.riders,[e.riderId]:{...state.riders[e.riderId],currentGroupId:target.groupId,distanceKm:target.distanceKm,speedKmh:target.speedKmh}},groups:{...state.groups,[g.groupId]:{...g,active:false,riderIds:[]},[target.groupId]:{...target,riderIds:[...target.riderIds,e.riderId].sort()}},separationPressureSecondsByRiderId:{...state.separationPressureSecondsByRiderId,[e.riderId]:0}}
    contacts.push({incidentId:e.incidentId,riderId:e.riderId,groupId:g.groupId,targetId:target.groupId,distanceKm:g.distanceKm,targetDistanceKm:target.distanceKm,raceSecond:state.raceSecond})
    // Historical gate uses global leader-progress coordinates; actual contact
    // position is separately recorded above, never invented from global km.
    rejoins.push({riderId:e.riderId,incidentId:e.incidentId,rejoinKm:round(state.currentKm),provenance:'synthetic_rejoin_witness'})
    return {...e,targetId,phase:'joined'}
   }
   return {...e,targetId,phase:'chase'}
  })
  validateSimulationState(state)
  const measuredGroups=active(state).map(g=>({displayCode:display(g),groupId:g.groupId,groupType:g.groupType,distanceKm:g.distanceKm,speedKmh:g.speedKmh,gradientPercent:getStageTerrainSample(input,g.distanceKm).gradientPercent,...(weather?.weather.courseBearingSegments?{weatherMultiplier:Math.min(2.5,calculateWeatherPerformanceEffects(weather.weather,g.distanceKm).incidentProbabilityMultiplier)}:{})}))
  const tick=tickOf(state,rejoins)
  const excludedRiderIds=episodes.filter(e=>e.phase==='repair'||e.phase==='chase').map(e=>e.riderId)
  observations.push({raceSecond:state.raceSecond,measuredKm:state.currentKm,tick,measuredGroups,excludedRiderIds,contacts,episodes:episodes.map(e=>({...e})),transitions:t.transitions.map(x=>({sourceGroupId:x.sourceGroupId,targetGroupId:x.targetGroupId,movedRiderIds:x.movedRiderIds,kilometre:x.kilometre})),pressure:t.pressureEvaluations.map(e=>({riderId:e.riderId,groupId:e.groupId,status:e.hold.status,seconds:e.eligibility.nextConsecutiveCannotHoldSeconds})),movement:t.movement.movement.proposals})
  ticks.push(t)
  return {tick,measuredGroups,excludedRiderIds,measuredKm:state.currentKm}
 }
 const historical=reviewHistoricalTerrainTraceWithPhysicalFeedback({evidence,expectedEvidenceSha256:carryoverDigest(evidence)},({raceSecond,incidents,selectedCheckpoints})=>{
  req(state.raceSecond===raceSecond-30,'physical clock mismatch')
  if(handled<incidents.length){
   req(incidents.length===handled+1,'incident sequence')
   const selected=incidents[handled],cp=selectedCheckpoints[handled],ids=new Map(cp.evidence.candidates.flatMap(c=>c.riders).map(r=>[r.riderId,r.teamId]))
   const ce={provenance:packet.provenance,checkpoint:cp.evidence,expectedCheckpointSha256:cp.expectedEvidenceSha256,repairModifiers:[...ids].map(([riderId,teamId])=>({riderId,teamId,mechanicalTimeLossMultiplier:mechanical?.rows.find(r=>r.riderId===riderId)?.mechanicalTimeLoss??(modifiers.get(riderId) as any).mechanical_time_loss_multiplier})),stage:{stageFormat:'road_race',distanceKm:input.distanceKm,kmFromStart:selected.kmFromStart,flatFinish:false,summitFinish:false,sprintZoneKm:null}}
   const consequence=reviewHistoricalCheckpointConsequences({evidence:ce,expectedEvidenceSha256:carryoverDigest(ce)}).incident
   req(consequence?.incidentId===selected.incident.incidentId,'selected consequence mismatch')
   const next=applyHistoricalTerrainIncident(state,consequence,episodes)
   state=next.state;episodes=next.episodes;applications.push(...next.applications);handled++
  }
  if(state.currentKm>=input.distanceKm-input.settings.maximumSpeedKmh*30/3600-.01)return {stopReason:'pre_finish_boundary'}
  return advance()
 })
 req(historical.trace.stopReason==='pre_finish_boundary'&&handled===historical.trace.incidents.length,'incomplete historical prefix')
 const prefixTicks=observations.length
 while(!state.completed){req(observations.length<1440,'terminal horizon exceeded');advance()}
 const classification=[...results,...Object.values(state.riders).filter(r=>r.stageStatus==='dnf').sort((a,b)=>a.riderId.localeCompare(b.riderId)).map(r=>({riderId:r.riderId,teamId:r.teamId,status:'dnf',rank:null,elapsedSeconds:null,gapSeconds:null}))]
 req(classification.length===roster.length&&new Set(classification.map(r=>r.riderId)).size===roster.length&&results.length>0,'terminal coverage')
 return {version:'043AU_historical_natural_terrain_v1',packetSha256:expectedPacketSha256,trace:historical.trace,selectedCheckpoints:historical.selectedCheckpoints,applications,observations,observationsSha256:carryoverDigest(observations),prefixTicks,classification,classificationSha256:carryoverDigest(classification),finalState:state,episodes,ticks,...(weather?{physicalWeather:weather}:{}),...(preparation?{preparation:{ready:bound!.receipt,mechanical,equipment,supply}}:{}),...flags()}
}
