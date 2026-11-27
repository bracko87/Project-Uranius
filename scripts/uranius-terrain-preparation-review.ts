// Offline controlled road completion only. No automatic terrain incidents or surface model.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {bindLegacyReadiness} from './uranius-frozen-readiness-review.mjs'
import {resolveEquipmentPerformanceReview} from './uranius-equipment-performance-review'
import {resolveResourceMechanicalReview} from './uranius-resource-mechanical-review.mjs'
import {resolveResourceEnergyReview} from './uranius-resource-energy-review'
import {reviewHistoricalIncidentProbability} from './uranius-historical-incident-probability-review.mjs'
import {reviewIndividualEquipmentWear} from './uranius-individual-equipment-wear-review'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {finishPhysicalIncidentStage} from './uranius-physical-incident-finish-review'
import {getStageTerrainSample} from '../src/race-engine/simulation/stageProfile'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AR: '+m)}
export function reviewTerrainPreparation({packet,expectedPacketSha256}:any){
 req(packet?.provenance==='synthetic_review_fixture'&&carryoverDigest(packet)===expectedPacketSha256,'frozen terrain packet required')
 const {source,input,terrainProfile,mechanicalEvidence,performanceRows,energyEvidence,weatherMultiplier}=packet
 req(['flat','hilly','mountain','cobbled'].includes(terrainProfile)&&input.stageFormat==='road_race'&&input.orders.length===0&&input.settings.tickSeconds===30&&Number.isFinite(weatherMultiplier)&&weatherMultiplier>=.7&&weatherMultiplier<=2.5,'controlled road terrain scope required')
 req(input.profilePoints[0].kilometre===0&&input.profilePoints.at(-1).kilometre===input.distanceKm&&input.profilePoints.every((p,i,a)=>Number.isFinite(p.elevationMetres)&&(!i||p.kilometre>a[i-1].kilometre)),'complete ordered elevation profile required')
 const bound=bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input})
 const ready=bound.receipt
 const mechanical=resolveResourceMechanicalReview({evidence:mechanicalEvidence,expectedEvidenceSha256:carryoverDigest(mechanicalEvidence),ready})
 const pe={provenance:packet.provenance,stageId:input.stageId,terrainProfile,rows:performanceRows}
 const equipment=resolveEquipmentPerformanceReview({evidence:pe,expectedEvidenceSha256:carryoverDigest(pe),ready,input:bound.input,mechanical})
 if(energyEvidence)req(carryoverDigest(energyEvidence.resources)===carryoverDigest(mechanicalEvidence.resources)&&carryoverDigest(energyEvidence.requests)===carryoverDigest(mechanicalEvidence.requests),'preparation ledger mismatch')
 const energy=energyEvidence?resolveResourceEnergyReview({evidence:energyEvidence,expectedEvidenceSha256:carryoverDigest(energyEvidence),ready}):null
 const multipliers=energy?Object.fromEntries(energy.rows.map(r=>[r.riderId,r.roadEnergyMultiplier])):undefined
 const initial=createInitialState(bound.input),target=Object.values(initial.groups).find(g=>g.active)
 req(target,'missing physical group')
 const localTerrain=terrainProfile==='hilly'||terrainProfile==='mountain'
 const finish=finishPhysicalIncidentStage(initial,[],target!.groupId,1440,multipliers,equipment.adjustments,localTerrain)
 const wear=reviewIndividualEquipmentWear({finish,ready,mechanicalEvidence,expectedMechanicalSha256:carryoverDigest(mechanicalEvidence),sportingRows:finish.classification})
 // Measured proposals, not an automatic incident sampler. Use explicitly
 // frozen opening fatigue as a reference, not a claim of runtime fatigue parity.
 const observations=finish.ticks.map(t=>{
  const p=t.movement.proposals[0],sample=getStageTerrainSample(input,p.previousDistanceKm)
  req(t.movement.proposals.length===1&&p.gradientPercent===sample.gradientPercent,'terrain measurement mismatch')
  const rider=ready.rows[0],a=input.riders.find(x=>x.riderId===rider.riderId).attributes,m=mechanical.rows.find(x=>x.riderId===rider.riderId)
  const riskInput={incidentKind:'technical_incident',tickSeconds:30,weatherMultiplier,currentSpeedKmh:p.appliedSpeedKmh,gradientPercent:p.gradientPercent,groupSize:p.riderIds.length,runtimeFatigue:rider.condition.fatigueBeforeStage,resistance:a.resistance,raceIq:a.raceIq,preparationSupportMultiplier:rider.preparation.modifiers?.incidentRiskMultiplier??1,commandIntensityMultiplier:1,raceSituationMultiplier:1,equipmentConditionPercent:m.equipmentConditionPercent,mechanicalIncidentRiskMultiplier:m.mechanicalRisk}
  return {raceSecond:t.state.raceSecond,km:p.previousDistanceKm,gradientPercent:p.gradientPercent,baseSpeedKmh:p.baseSpeedKmh,speedKmh:p.appliedSpeedKmh,terrainMultiplier:p.terrainMultiplier,riskInput,risk:reviewHistoricalIncidentProbability(riskInput)}
 })
 return {version:'043AR_controlled_terrain_preparation_v1',packetSha256:expectedPacketSha256,terrainProfile,localTerrainCapability:localTerrain,equipment,mechanical,energy,finish,wear,observations,observationsSha256:carryoverDigest(observations),surfacePhysicsVerified:false,automaticIncidentSelectionVerified:false,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}
}
