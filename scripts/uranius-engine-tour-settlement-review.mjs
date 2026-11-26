// 043K: actual legacy simulation output + explicitly synthetic supplemental evidence.
// Never authorizes official results; engine does not generate original Phase9/10 manifests.
import {createHash} from 'node:crypto'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {buildTourSettlement} from './uranius-tour-settlement-review.mjs'
import {projectStageScoring} from './uranius-stage-scoring-review.mjs'
import {reconcileCanonicalMarkerReview} from './uranius-canonical-marker-review.mjs'
const P='synthetic_review_fixture',req=(x,m)=>{if(!x)throw Error('043K: '+m)}
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const eq=(a,b)=>carryoverDigest(a)===carryoverDigest(b)
const allowedEvents=new Set(['SIMULATION_STARTED','RACE_STARTED','SPRINT_STARTED','RIDER_FINISHED','SIMULATION_COMPLETED','RACE_COMPLETED'])
export function buildEngineTourSettlement({fixture,input,markerEvidence,engine,expectedEvidenceSha256}){
 req(fixture?.provenance===P&&fixture.completeSyntheticEvidence===true,'explicit synthetic supplemental evidence required')
 req(!Object.hasOwn(fixture,'job')&&!Object.hasOwn(fixture,'scoringReceipt'),'caller supplied result or scoring refused')
 req(engine?.version==='043F_canonical_engine_scoring_review_v1'&&engine.official===false&&engine.hostedWriteAllowed===false&&engine.accountingAllowed===false&&engine.authoritativeSourceVerified===false,'review engine envelope required')
 const e=engine.evidence,inputText=JSON.stringify(input),outputText=engine.outputText
 req(carryoverDigest(e)===expectedEvidenceSha256&&engine.evidenceSha256===expectedEvidenceSha256,'engine evidence digest mismatch')
 req(e.inputSha256===sha(inputText)&&e.outputSha256===sha(outputText)&&e.raceId===input.raceId&&e.stageId===input.stageId,'engine identity mismatch')
 req(input.stageFormat==='road_race'&&input.orders.length===0&&input.settings.tickSeconds===input.settings.replaySnapshotIntervalSeconds,'no-command per-tick legacy review only')
 const marker=reconcileCanonicalMarkerReview(markerEvidence)
 req(markerEvidence.stageId===input.stageId&&markerEvidence.distanceKm===input.distanceKm&&markerEvidence.stageFormat===input.stageFormat&&e.markerEvidenceSha256===carryoverDigest(markerEvidence)&&e.markerReceiptSha256===marker.sha256&&eq(engine.markers,marker.receipt),'marker evidence mismatch')
 req(e.crossingsSha256===carryoverDigest(engine.competitions)&&e.stageRaceSha256===carryoverDigest(engine.stageRace)&&e.oneDaySha256===carryoverDigest(engine.oneDay),'scoring envelope mismatch')
 req(eq(engine.competitions.map(({pointId,type,km})=>({pointId,type,km})),marker.receipt.traceMarkers),'crossing scope mismatch')
 const output=JSON.parse(outputText)
 req(output.events.every(x=>allowedEvents.has(x.eventType))&&output.snapshots.every(x=>x.groups.every(g=>g.groupType==='peloton'||g.groupType==='finished')),'incident, breakaway or unsupported event requires separate authoritative evidence')
 const job={jobId:e.jobId,stageId:input.stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:e.inputSha256,outputSha256:e.outputSha256}
 const scoringReceipt={provenance:P,completePointDefinitions:true,stageId:input.stageId,inputSha256:e.inputSha256,outputSha256:e.outputSha256,raceFormat:'stage_race',points:marker.receipt.scoringPoints,crossings:engine.competitions.map(c=>({pointId:c.pointId,riderIds:c.crossings.map(x=>x.riderId)}))}
 const scoring=projectStageScoring({job,receipt:scoringReceipt})
 req(eq(scoring,engine.stageRace),'recomputed scoring differs')
 const c=fixture.carryover
 req(c.raceId===input.raceId&&c.stageId===input.stageId&&c.runId===e.jobId&&c.distanceKm===input.distanceKm,'supplemental stage mismatch')
 req(c.workloads.length===0,'caller supplied workload rows refused')
 req(Array.isArray(fixture.readiness)&&fixture.readiness.length===input.riders.length&&new Set(fixture.readiness.map(x=>x.riderId)).size===input.riders.length,'complete synthetic preparation evidence required')
 const workloads=input.riders.map(r=>{
  const state=output.finalRiderStates.find(x=>x.riderId===r.riderId),ready=fixture.readiness.find(x=>x.riderId===r.riderId)
  req(state?.stageStatus==='finished'&&r.condition&&ready&&ready.teamId===r.teamId&&r.condition.availabilityStatus==='fit','missing fit all-finisher readiness')
  req(Object.keys(ready).sort().join(',')==='difficultyCategory,postStageFatigueMultiplier,postStageRecoveryBonusPoints,preparationIncidentRiskMultiplier,riderId,teamId','unexpected readiness fields')
  // Legacy engine energy is already net of its own movement costs. No extra
  // original incident/point costs are fabricated in this no-incident review.
  return {provenance:P,completeWorkloadEvidence:true,riderId:r.riderId,teamId:r.teamId,status:'finished',eligibleToStart:true,effectiveFatigueBeforeStage:r.condition.fatigueBeforeStage,startEnergy:r.condition.startingEnergy,rawFinishEnergy:state.energy,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm:input.distanceKm,difficultyCategory:ready.difficultyCategory,postStageFatigueMultiplier:ready.postStageFatigueMultiplier,postStageRecoveryBonusPoints:ready.postStageRecoveryBonusPoints,recoverySkill:r.attributes.recovery,morale:r.condition.morale,preparationIncidentRiskMultiplier:ready.preparationIncidentRiskMultiplier,incidents:[],breakawaySegments:[]}
 })
 const {readiness,...rest}=fixture
 const settlement=buildTourSettlement({...rest,carryover:{...c,workloads},job,scoringReceipt})
 const receipt={version:'043K_actual_engine_tour_review_v1',engineEvidenceSha256:expectedEvidenceSha256,settlementSha256:settlement.sha256,workloadSha256:carryoverDigest(workloads),supplementalEvidenceSha256:carryoverDigest(fixture),energyRule:'legacy_net_energy_no_additional_original_costs_review_only',actualEngineOutputUsed:true,authoritativePreparationVerified:false,authoritativeIncidentMappingVerified:false,official:false,hostedWriteAllowed:false,accountingAllowed:false}
 return {...settlement,job,receipt,receiptSha256:carryoverDigest(receipt)}
}
