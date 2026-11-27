// Offline review of the existing calibrated engine, NOT the 043AS Phase10 adapter.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {bindLegacyReadiness} from './uranius-frozen-readiness-review.mjs'
import {calculateStageProfileCategory} from '../src/race-engine/simulation/stageProfileCategory'
import {runIntegratedTerrainSeparationStage} from '../src/race-engine/simulation/runIntegratedTerrainSeparationStage'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AT: '+m)}
export function reviewNaturalTerrainSeparation({packet,expectedPacketSha256}:any){
 req(packet?.provenance==='synthetic_review_fixture'&&carryoverDigest(packet)===expectedPacketSha256,'frozen natural separation packet required')
 const {input,source,nativeIncidents}=packet
 req(input.stageFormat==='road_race'&&input.orders.length===0&&input.settings.tickSeconds===30&&input.weather===undefined&&typeof nativeIncidents==='boolean','bounded weather-free no-command review required')
 req(input.distanceKm>=10&&input.distanceKm<=200&&input.riders.length>=6&&input.riders.length<=128&&input.profilePoints[0].kilometre===0&&input.profilePoints.at(-1).kilometre===input.distanceKm&&input.profilePoints.every((p,i,a)=>Number.isFinite(p.elevationMetres)&&(!i||p.kilometre>a[i-1].kilometre)),'complete bounded course required')
 const profile=calculateStageProfileCategory(input)
 req(profile.category==='mountain'||profile.category==='hilly','nonflat profile required')
 const bound=bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input})
 const initial=createInitialState(bound.input)
 const stage=runIntegratedTerrainSeparationStage(initial,{
  terrainCapabilityInfluence:.5,separationWindowSeconds:120,
  droppedWaveConsolidationEnabled:false,droppedTransitionEventsEnabled:true,
  steepGradientSeverityEnabled:true,steepGradientSeverityModel:'progressive_resilience',
  steepGradientMovementSeverityEnabled:true,steepGradientMovementSeverityModel:'progressive_resilience',
  subTickFinishInterpolationEnabled:true,experimentalRequirePhysicalDroppedCatch:true,
  maximumTickCount:1440,
  ...(nativeIncidents?{raceIncidentIntegration:{globalCooldownSeconds:120,riderCooldownSeconds:900,maximumIncidentsPerStage:3}}:{})
 })
 req(stage.completed&&stage.finalState.completed,'terminal stage required')
 const observations=stage.ticks.map(t=>({
  raceSecond:t.state.raceSecond,
  groups:Object.values(t.state.groups).filter(g=>g.active).map(g=>({groupId:g.groupId,groupType:g.groupType,distanceKm:g.distanceKm,speedKmh:g.speedKmh,riderIds:g.riderIds})),
  pressure:t.pressureEvaluations.map(e=>({riderId:e.riderId,groupId:e.groupId,gradientPercent:e.gradientPercent,hold:e.hold.status,seconds:e.eligibility.nextConsecutiveCannotHoldSeconds})),
  transitions:t.transitions.map(x=>({sourceGroupId:x.sourceGroupId,targetGroupId:x.targetGroupId,movedRiderIds:x.movedRiderIds,kilometre:x.kilometre,raceSecond:x.raceSecond})),
  reabsorbed:t.reconciledBreakaways.reabsorbedBreakawayGroupIds,
  selectedNativeIncident:t.raceIncident?.selectedIncidentKind??null
 }))
 return {version:'043AT_natural_terrain_separation_v1',packetSha256:expectedPacketSha256,profile,stage,observations,observationsSha256:carryoverDigest(observations),nativeIncidentMode:nativeIncidents,historicalPhase10IntegrationVerified:false,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false}
}
