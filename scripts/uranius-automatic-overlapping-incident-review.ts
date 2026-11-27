// 043AC offline overlapping independent incident batches; pre-finish only.
import {getStageTerrainSample} from '../src/race-engine/simulation/stageProfile'
import {calculateStageProfileCategory} from '../src/race-engine/simulation/stageProfileCategory'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {simulateMultiGroupTick} from '../src/race-engine/simulation/simulateMultiGroupTick'
import {runMultiGroupStage} from '../src/race-engine/simulation/runMultiGroupStage'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {resolvePreparedPhysicalWeather,applyOptionalPreparedWeatherEnergy} from './uranius-prepared-physical-weather-review'
import {resolveResourceEnergyReview} from './uranius-resource-energy-review'
import {resolveEquipmentPerformanceReview} from './uranius-equipment-performance-review'
import {resolveResourceMechanicalReview} from './uranius-resource-mechanical-review.mjs'
import {bindLegacyReadiness,bindMixedStageReadiness,bindTourStageReadiness} from './uranius-frozen-readiness-review.mjs'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewHistoricalEligibilityTraceWithPhysicalFeedback,reviewHistoricalTerrainTraceWithPhysicalFeedback} from './uranius-historical-incident-eligibility-review.mjs'
import {reviewHistoricalCheckpointConsequences} from './uranius-historical-incident-consequences-review.mjs'
import {extendMultiRiderIncident,multiRiderIncidentTick} from './uranius-multi-rider-incident-motion-review'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AC: '+m)}
const round=(x:number)=>Math.round((x+Number.EPSILON)*1e6)/1e6
export function reviewAutomaticOverlappingIncident(args:any){return review(args,false)}
// Explicit isolated continuation only; accepted 043AC result shape stays identical.
export function captureAutomaticOverlappingFinishPrefix(args:any){return review(args,true)}
export function captureMixedStageFinishPrefix(args:any){return review(args,true,true)}
export function captureTourStageFinishPrefix(args:any){return review(args,true,true,true)}
function review({input:raw,source,context,expectedSourceSha256,expectedContextSha256,resourceMechanicalEvidence,expectedResourceMechanicalSha256,resourceEnergyEvidence,expectedResourceEnergySha256,equipmentPerformanceEvidence,expectedEquipmentPerformanceSha256,terrainCapability=false,physicalWeather,expectedPhysicalWeatherSha256}:any,capture:boolean,mixed=false,tour=false){
 req(carryoverDigest(context)===expectedContextSha256,'context digest mismatch')
 const bound=(tour?bindTourStageReadiness:mixed?bindMixedStageReadiness:bindLegacyReadiness)({source,expectedSourceSha256,input:raw}),input=bound.input
 req(input.stageFormat==='road_race'&&input.orders.length===0&&input.settings.tickSeconds===30,'bounded road no-command scope')
 req(terrainCapability===true||terrainCapability===false,'explicit terrain mode required')
 if(terrainCapability){
  req(['hilly','mountain'].includes(context.terrainType)&&calculateStageProfileCategory(input).category===context.terrainType&&context.flatSprint===false,'nonflat terrain context mismatch')
  req(input.profilePoints[0].kilometre===0&&input.profilePoints.at(-1).kilometre===input.distanceKm&&input.profilePoints.every((p,i,a)=>Number.isFinite(p.elevationMetres)&&(!i||p.kilometre>a[i-1].kilometre)),'complete ordered elevation profile required')
  req(!equipmentPerformanceEvidence||equipmentPerformanceEvidence.terrainProfile===context.terrainType,'terrain equipment profile mismatch')
 }else{
  req(context.terrainType==='flat','bounded flat no-command scope')
  req(input.profilePoints.every(p=>p.elevationMetres===input.profilePoints[0].elevationMetres),'flat profile required')
 }
 const mechanical=resourceMechanicalEvidence?resolveResourceMechanicalReview({evidence:resourceMechanicalEvidence,expectedEvidenceSha256:expectedResourceMechanicalSha256,ready:bound.receipt}):null
 const equipmentPerformance=equipmentPerformanceEvidence?resolveEquipmentPerformanceReview({evidence:equipmentPerformanceEvidence,expectedEvidenceSha256:expectedEquipmentPerformanceSha256,ready:bound.receipt,input,mechanical}):null
 const capabilityAdjustments=equipmentPerformance?.adjustments
 const baseline=runMultiGroupStage(createInitialState(input),{maximumTickCount:1440,...(terrainCapability?{experimentalTerrainCapability:true}:{}),...(capabilityAdjustments?{experimentalEquipmentCapabilityAdjustments:capabilityAdjustments}:{})})
 const winnerTimeSeconds=baseline.finalState.raceSecond
 req(baseline.finalState.completed&&Object.values(baseline.finalState.riders).every(r=>r.stageStatus==='finished'),'all-finisher baseline required')
 const supply=resourceEnergyEvidence?resolveResourceEnergyReview({evidence:resourceEnergyEvidence,expectedEvidenceSha256:expectedResourceEnergySha256,ready:bound.receipt}):null
 const weather=physicalWeather===undefined?undefined:resolvePreparedPhysicalWeather(raw,context,physicalWeather)
 if(weather)req(carryoverDigest(physicalWeather)===expectedPhysicalWeatherSha256&&supply&&mechanical&&equipmentPerformance&&!terrainCapability,'frozen flat physical weather and complete preparation required')
 const measured=terrainCapability||!!weather&&!weather.neutral
 const multipliers=supply?Object.fromEntries(supply.rows.map(r=>[r.riderId,r.roadEnergyMultiplier])):undefined
 const energyAudit=[]
 const roster=input.riders.map(r=>{
  const ready=bound.receipt.rows.find(x=>x.riderId===r.riderId),p=ready?.preparation.modifiers
  req(ready?.startStatus==='starter'&&(ready.condition.availabilityStatus==='fit'||mixed&&ready.condition.availabilityStatus==='not_fully_fit'),'fit starters required')
  const m=mechanical?.rows.find(x=>x.riderId===r.riderId)
  return {riderId:r.riderId,teamId:r.teamId,eligibleToStart:true,startingEnergy:r.condition.startingEnergy,effectiveFatigue:r.condition.fatigueBeforeStage,resistance:r.attributes.resistance,raceIq:r.attributes.raceIq,riderSupport:p?.incidentRiskMultiplier??1,teamSupport:1,equipmentConditionPercent:m?.equipmentConditionPercent??p?.equipmentConditionPercent??100,mechanicalRisk:m?.mechanicalRisk??p?.mechanicalIncidentRiskMultiplier??1}
 })
 req(context.plans.length===roster.length&&new Set(context.plans.map(p=>p.riderId)).size===roster.length&&roster.every(r=>context.plans.some(p=>p.riderId===r.riderId)),'complete plans required')
 const measuredGroupsOf=s=>Object.values(s.groups).filter((g:any)=>g.active).map((g:any)=>({displayCode:g.groupType==='peloton'?'P':g.groupId,distanceKm:g.distanceKm,speedKmh:g.speedKmh,gradientPercent:getStageTerrainSample(input,g.distanceKm).gradientPercent,...(weather?.weather.courseBearingSegments?{weatherMultiplier:Math.min(2.5,calculateWeatherPerformanceEffects(weather.weather,g.distanceKm).incidentProbabilityMultiplier)}:{})}))
 const tickOf=(s,rejoins=[])=>({raceSecond:s.raceSecond,gradientPercent:measured?(measuredGroupsOf(s).find(g=>g.displayCode==='P')?.gradientPercent??0):0,riders:Object.values(s.riders).map((r:any)=>({riderId:r.riderId,status:r.stageStatus,energy:r.energy,commandIntensity:1})),groups:Object.values(s.groups).filter((g:any)=>g.active).map((g:any)=>({displayCode:g.groupType==='peloton'?'P':g.groupId,aheadOfPeloton:false,riderIds:g.riderIds})),rejoins})
 // Baseline supplies the fixed review horizon and historical average-speed reference only.
 // Every evaluated observation is replaced by the advancing physical state.
 const evidence={provenance:'synthetic_review_fixture',raceId:input.raceId,stageId:input.stageId,runId:source.runId,seed:input.seed,stage:{distanceKm:input.distanceKm,terrainType:context.terrainType,weatherCondition:context.weatherCondition,precipitationMm:context.precipitationMm,rainProbabilityPct:context.rainProbabilityPct},winnerTimeSeconds,weatherMultiplier:context.weatherMultiplier,severeWeather:context.severeWeather,flatSprint:context.flatSprint,roster,ticks:baseline.ticks.map(t=>tickOf(t.state))}
 let state=createInitialState(input),episodes:ReturnType<typeof extendMultiRiderIncident>['episodes']=[],targetId:string|null=null,handled=0
 if(weather&&!weather.neutral)state={...state,input:{...state.input,weather:weather.weather},weatherPerformanceEffectsEnabled:true}
 const applications=[],observations=[],admissions=[]
 const incidentByGroup=new Map<string,string>()
 const result=(measured?reviewHistoricalTerrainTraceWithPhysicalFeedback:reviewHistoricalEligibilityTraceWithPhysicalFeedback)({evidence,expectedEvidenceSha256:carryoverDigest(evidence)},({raceSecond,incidents,selectedCheckpoints})=>{
  req(state.raceSecond===raceSecond-30,'physical clock mismatch')
  if(incidents.length>handled){
   req(incidents.length===handled+1,'selection sequence')
   const selected=incidents[handled],cp=selectedCheckpoints[handled]
   const ids=new Map(cp.evidence.candidates.flatMap(c=>c.riders).map(r=>[r.riderId,r.teamId]))
   const ce={provenance:'synthetic_review_fixture',checkpoint:cp.evidence,expectedCheckpointSha256:cp.expectedEvidenceSha256,repairModifiers:[...ids].map(([riderId,teamId])=>({riderId,teamId,mechanicalTimeLossMultiplier:mechanical?.rows.find(r=>r.riderId===riderId)?.mechanicalTimeLoss??bound.receipt.rows.find(r=>r.riderId===riderId).preparation.modifiers?.mechanicalTimeLossMultiplier??1})),stage:{stageFormat:'road_race',distanceKm:input.distanceKm,kmFromStart:selected.kmFromStart,flatFinish:context.flatSprint,summitFinish:false,sprintZoneKm:null}}
   const consequence=reviewHistoricalCheckpointConsequences({evidence:ce,expectedEvidenceSha256:carryoverDigest(ce)}).incident
   req(consequence?.incidentId===selected.incident.incidentId,'selected consequence mismatch')
   const affected=new Set(consequence.riderConsequences.map(r=>r.riderId)),reserved=new Set()
   const rows=[]
   for(const row of [...consequence.riderConsequences].sort((a,b)=>a.riderId.localeCompare(b.riderId))){
    const r=state.riders[row.riderId]
    req(r.stageStatus==='racing'&&state.groups[r.currentGroupId].groupType==='peloton','incident source not racing peloton')
    let helper=null,repairSeconds=0
    if(row.statusImpact!=='dnf'){
     if(!row.movedToLaterGroup)return {stopReason:'nonseparating_incident_outside_scope'}
     const plan=context.plans.find(p=>p.riderId===r.riderId),rank=context.gcStandings.find(g=>g.riderId===r.riderId)?.rank
     const protectedLeader=rank===1||plan?.stageRole==='team_leader_gc'||(rank<=10&&plan?.stageRole==='protected_rider')
     if(protectedLeader)helper=Object.values(state.riders).filter((h:any)=>!affected.has(h.riderId)&&!reserved.has(h.riderId)&&h.teamId===r.teamId&&h.stageStatus==='racing'&&h.currentGroupId===r.currentGroupId).map((h:any)=>h.riderId).sort().find(id=>{
      const p=context.plans.find(x=>x.riderId===id)
      return p?.commands['phase'+selected.phase]==='protect_leader'||(rank===1&&p?.stageRole==='free_role')
     })??null
     if(helper)reserved.add(helper)
     repairSeconds=Math.ceil(consequence.timeLossSeconds/30)*30
    }
    rows.push({riderId:r.riderId,helper,repairSeconds,energyLossPoints:row.energyLossPoints,statusImpact:row.statusImpact})
   }
   const before=state
   if(Object.values(state.groups).find((g:any)=>g.active&&g.groupType==='peloton').riderIds.length<=affected.size+reserved.size)return {stopReason:'empty_target_outside_scope'}
   const priorActive=episodes.filter(e=>e.phase!=='joined').map(e=>({groupId:e.groupId,affected:e.affected,helper:e.helper,incidentId:incidentByGroup.get(e.groupId)}))
   const priorCount=episodes.length
   const started=extendMultiRiderIncident(state,rows,episodes)
   state=started.state;episodes=started.episodes;targetId=started.targetId
   for(const e of episodes.slice(priorCount)){req(!incidentByGroup.has(e.groupId),'duplicate episode identity');incidentByGroup.set(e.groupId,consequence.incidentId)}
   admissions.push({incidentId:consequence.incidentId,raceSecond:state.raceSecond,priorActive,newGroups:episodes.slice(priorCount).map(e=>e.groupId)})
   for(const row of rows)applications.push({incidentId:consequence.incidentId,kind:consequence.kind,raceSecond:state.raceSecond,riderId:row.riderId,helper:row.helper,repairSeconds:row.repairSeconds,timeLossSeconds:consequence.timeLossSeconds,initialEnergyLoss:row.energyLossPoints,beforeEnergy:before.riders[row.riderId].energy,afterEnergy:state.riders[row.riderId].energy,statusImpact:row.statusImpact,checkpointSha256:cp.expectedEvidenceSha256})
   handled++
  }
  if(state.currentKm>=input.distanceKm-input.settings.maximumSpeedKmh*30/3600-.01)return {stopReason:'pre_finish_boundary'}
  let pickups=[],joined=[],rejoins=[],movementProposals=[]
  if(targetId){
   const moved=multiRiderIncidentTick(state,episodes,targetId,multipliers,capabilityAdjustments,terrainCapability,weather);movementProposals=moved.movement.proposals;if(supply)energyAudit.push(...moved.energy.map(a=>({raceSecond:moved.state.raceSecond,riderId:a.riderId,previousEnergy:a.previousEnergy,nextEnergy:a.nextEnergy,neutralCost:a.result.grossEnergyCost*a.result.efficiencyMultiplier,multiplier:multipliers[a.riderId],...(weather&&!weather.neutral?{weatherMultiplier:a.experimentalWeatherEnergyMultiplier??weather.energyMultiplier,runtimeFatigueGain:a.runtimeFatigueGain??0,...(a.experimentalWeatherStartKm!==undefined?{weatherStartKm:a.experimentalWeatherStartKm}:{})}:{})})));state=moved.state;episodes=moved.episodes;pickups=moved.pickups;joined=moved.rejoins
   rejoins=joined.map(riderId=>{
    const ep=episodes.find(e=>e.affected===riderId&&e.phase==='joined'&&moved.movement.proposals.some(p=>p.groupId===e.groupId))
    req(ep&&incidentByGroup.has(ep.groupId),'missing rejoin identity')
    return {riderId,incidentId:incidentByGroup.get(ep.groupId),rejoinKm:round(state.currentKm),provenance:'synthetic_rejoin_witness'}
   })
  }else{
   const tick=simulateMultiGroupTick(state,capabilityAdjustments,terrainCapability,!!weather&&!weather.neutral)
   movementProposals=tick.movement.proposals
   if(supply){
    req(!tick.state.completed&&Object.values(tick.state.groups).filter(g=>g.active).length===1,'supply tick outside single peloton prefix')
    const adjusted=applyOptionalPreparedWeatherEnergy(tick.appliedEnergy,multipliers,weather,tick.state)
    energyAudit.push(...adjusted.applications.map(a=>({raceSecond:adjusted.state.raceSecond,riderId:a.riderId,previousEnergy:a.previousEnergy,nextEnergy:a.nextEnergy,neutralCost:a.result.grossEnergyCost*a.result.efficiencyMultiplier,multiplier:multipliers[a.riderId],...(weather&&!weather.neutral?{weatherMultiplier:a.experimentalWeatherEnergyMultiplier??weather.energyMultiplier,runtimeFatigueGain:a.runtimeFatigueGain??0,...(a.experimentalWeatherStartKm!==undefined?{weatherStartKm:a.experimentalWeatherStartKm}:{})}:{})})))
    state=adjusted.state
   }else state=tick.state
  }
  const tick=tickOf(state,rejoins)
  const excludedRiderIds=Object.values(state.riders).filter((r:any)=>r.stageStatus==='racing'&&state.groups[r.currentGroupId].groupType!=='peloton').map((r:any)=>r.riderId)
  const measuredGroups=measured?measuredGroupsOf(state):null
  observations.push({...(measured?{measuredGroups,movementProposals}:{}),raceSecond:state.raceSecond,measuredKm:state.currentKm,tick,excludedRiderIds,pickups,joined,activeEpisodes:episodes.filter(e=>e.phase!=='joined').map(e=>({...e,incidentId:incidentByGroup.get(e.groupId)})),positions:Object.values(state.riders).map((r:any)=>({riderId:r.riderId,distanceKm:r.distanceKm,energy:r.energy,status:r.stageStatus,groupId:r.currentGroupId}))})
  return {tick,excludedRiderIds,measuredKm:state.currentKm,...(measured?{measuredGroups}:{})}
 })
 return {version:'043AC_automatic_overlapping_review_v1',...(terrainCapability?{terrainCapability:true}:{}),...(weather?{physicalWeather:weather}:{}),trace:result.trace,selectedCheckpoints:result.selectedCheckpoints,applications,admissions,observations,observationSha256:carryoverDigest(observations),finalState:state,baselineWinnerTimeSeconds:winnerTimeSeconds,physicalFeedbackApplied:applications.length>0,...(mechanical?{resourceMechanical:mechanical}:{}),...(equipmentPerformance?{equipmentPerformance}:{}),...(supply?{resourceEnergy:supply,energyAudit}:{}),...(mixed?{mixedStageBinding:{readinessSha256:bound.readinessSha256,excluded:bound.excluded,roster}}:{}),...(capture?{finishPrefix:{episodes,targetId,handled,incidentByGroup:Object.fromEntries(incidentByGroup)}}:{}),official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false}
}
