// 043V offline post-processing, NOT chronological engine feedback or official result.
import {createHash} from 'node:crypto'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {projectEngineIncidentReplay} from './uranius-engine-incident-replay-review.mjs'
// Exact historical sample/energy interpolation from pinned original blob 39e35c6ed69563ce82cb663d6c3f9088c61df886.
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}
function deterministicRound(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}
function phase10AutonomousEpisodeSampleAtKm(
  simulation,
  episodeKey,
  kmFromStart,
) {
  const episode = simulation.episodeByKey.get(episodeKey)
  if (!episode || kmFromStart < episode.activationKm - 0.000001) return null
  if (
    episode.actualRejoinKm !== null &&
    kmFromStart >= episode.actualRejoinKm - 0.000001
  ) {
    return null
  }
  const exactSample = episode.samples
    .filter((sample) => Math.abs(sample.kmFromStart - kmFromStart) <= 0.000001)
    .at(-1)
  if (exactSample) return exactSample
  let previous = episode.samples[0] ?? null
  let next = null
  for (const sample of episode.samples) {
    if (sample.kmFromStart <= kmFromStart + 0.000001) previous = sample
    if (sample.kmFromStart >= kmFromStart - 0.000001) {
      next = sample
      break
    }
  }
  if (!previous) return null
  if (
    !next ||
    Math.abs(next.kmFromStart - previous.kmFromStart) <= 0.000001 ||
    previous.displayCode !== next.displayCode ||
    previous.targetDisplayCode !== next.targetDisplayCode
  ) {
    return previous
  }
  const fraction = clamp(
    (kmFromStart - previous.kmFromStart) /
      Math.max(0.000001, next.kmFromStart - previous.kmFromStart),
    0,
    1,
  )
  return {
    ...previous,
    kmFromStart: deterministicRound(kmFromStart, 6),
    gapToTargetSeconds: deterministicRound(
      previous.gapToTargetSeconds +
        (next.gapToTargetSeconds - previous.gapToTargetSeconds) * fraction,
      6,
    ),
    cumulativeChaseEnergyCostPoints: deterministicRound(
      previous.cumulativeChaseEnergyCostPoints +
        (next.cumulativeChaseEnergyCostPoints -
          previous.cumulativeChaseEnergyCostPoints) *
          fraction,
      6,
    ),
  }
}
function phase10AutonomousChaseEnergyAtKm(
  simulation,
  riderId,
  kmFromStart,
) {
  return deterministicRound(
    simulation.episodes
      .filter((episode) => episode.riderId === riderId && episode.activationKm <= kmFromStart + 0.000001)
      .reduce((sum, episode) => {
        const activeSample = phase10AutonomousEpisodeSampleAtKm(
          simulation,
          episode.episodeKey,
          kmFromStart,
        )
        if (activeSample) return sum + activeSample.cumulativeChaseEnergyCostPoints
        if (
          episode.actualRejoinKm !== null &&
          kmFromStart >= episode.actualRejoinKm - 0.000001
        ) {
          return sum + episode.chaseEnergyCostPoints
        }
        const lastSample = episode.samples.at(-1)
        return sum + (lastSample?.cumulativeChaseEnergyCostPoints ?? 0)
      }, 0),
    6,
  )
}
const req=(x,m)=>{if(!x)throw Error('043V: '+m)}
const num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const eq=(a,b)=>carryoverDigest(a)===carryoverDigest(b)
const P='synthetic_review_fixture'
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,incidentFeedbackApplied:false,finalClassificationVerified:false,healthWritesPerformed:false})
export function historicalRoadTimeLimit(terrainType){
 req(['flat','hilly','mountain','cobbled'].includes(terrainType),'unsupported terrain')
 return {flat:18,hilly:20,mountain:25,cobbled:22}[terrainType]
}
export function reviewProtectedSourceTime(sourceRiderIds,affectedRiderIds,baseRows){
 const affected=new Set(affectedRiderIds),counts=new Map()
 for(const id of sourceRiderIds){
  if(affected.has(id))continue
  const row=baseRows.find(r=>r.riderId===id)
  if(row?.status!=='finished'||!num(row.baseTimeSeconds,0,86400))continue
  const t=deterministicRound(row.baseTimeSeconds,6);counts.set(t,(counts.get(t)??0)+1)
 }
 return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??null
}
// Original rank score is absent in legacy runner; preserve base rank as diagnostic
// tie-break and flag all equal physical-time groups containing injury penalties.
export function reviewProvisionalClassification(rows,terrainType){
 const limit=historicalRoadTimeLimit(terrainType)
 req(Array.isArray(rows)&&rows.length>0&&new Set(rows.map(r=>r.riderId)).size===rows.length&&new Set(rows.map(r=>r.baseRank)).size===rows.length,'complete unique base rows required')
 const preliminary=rows.map(r=>{
  req(num(r.baseTimeSeconds,1,86400)&&Number.isSafeInteger(r.baseRank)&&r.baseRank>=1&&typeof r.dnf==='boolean'&&num(r.timePenaltySeconds,0,86400)&&num(r.finishPerformancePenaltyPoints,0,100)&&(r.protectedTimeSeconds===null||num(r.protectedTimeSeconds,1,86400)),'invalid provisional row')
  const physical=r.dnf?null:deterministicRound(r.baseTimeSeconds+r.timePenaltySeconds,6)
  return {...r,status:r.dnf?'dnf':'finished',physicalTimeSeconds:physical,provisionalTimeSeconds:r.dnf?null:r.protectedTimeSeconds??physical,rank:null,gapSeconds:null,sameTimeAsPrevious:false,finishScoreTieUnresolved:false}
 })
 const times=preliminary.filter(r=>r.status==='finished').map(r=>r.provisionalTimeSeconds)
 const cutoff=times.length?deterministicRound(Math.min(...times)*(1+limit/100),6):null
 for(const r of preliminary)if(r.status==='finished'&&r.provisionalTimeSeconds>cutoff+.000001)r.status='otl'
 const finish=preliminary.filter(r=>r.status==='finished').sort((a,b)=>a.physicalTimeSeconds-b.physicalTimeSeconds||a.baseRank-b.baseRank||a.riderId.localeCompare(b.riderId))
 const winner=finish[0]??null
 finish.forEach((r,i)=>{
  r.rank=i+1;r.gapSeconds=deterministicRound(r.provisionalTimeSeconds-winner.provisionalTimeSeconds,6);r.sameTimeAsPrevious=i>0&&r.provisionalTimeSeconds===finish[i-1].provisionalTimeSeconds
  const tied=finish.filter(x=>x.physicalTimeSeconds===r.physicalTimeSeconds)
  r.finishScoreTieUnresolved=tied.length>1&&tied.some(x=>x.finishPerformancePenaltyPoints>0)
 })
 return {timeLimitPercentage:limit,cutoffTimeSeconds:cutoff,provisionalWinnerRiderId:winner?.riderId??null,winnerTieUnresolved:winner?.finishScoreTieUnresolved??false,classification:[...finish,...preliminary.filter(r=>r.status!=='finished').sort((a,b)=>a.status.localeCompare(b.status)||a.riderId.localeCompare(b.riderId))],rankRule:'physical_time_then_legacy_base_rank_diagnostic_only',...flags()}
}
export function reviewIncidentAdjustedReplay({engine,expectedEvidenceSha256,context}){
 req(engine?.version==='043U_actual_engine_incident_review_v1'&&engine.actualEngineOutputUsed===true&&['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified'].every(k=>engine[k]===false),'offline 043U envelope required')
 const e=engine.evidence,input=engine.input,review=engine.review
 req(carryoverDigest(e)===expectedEvidenceSha256&&engine.evidenceSha256===expectedEvidenceSha256&&sha(JSON.stringify(input))===e.inputSha256&&sha(engine.outputText)===e.outputSha256&&carryoverDigest(review)===e.reviewSha256&&carryoverDigest(context)===e.contextSha256&&carryoverDigest(engine.readinessReceipt)===e.readinessSha256,'frozen engine/context digest mismatch')
 req(e.raceId===input.raceId&&e.stageId===input.stageId&&e.runId===engine.readinessReceipt.runId,'stage scope mismatch')
 const frames=review.measurements.map(m=>({raceSecond:m.raceSecond,actualKm:m.measuredKm,riders:m.riders,groups:m.groups}))
 req(eq(projectEngineIncidentReplay({input,readinessReceipt:engine.readinessReceipt,runId:e.runId,context,frames,winnerTimeSeconds:e.winnerTimeSeconds}),review),'reprojected incident evidence differs')
 const output=JSON.parse(engine.outputText)
 req(output.raceId===e.raceId&&output.stageId===e.stageId&&output.seed===input.seed&&output.finalRiderStates.length===input.riders.length&&new Set(output.finalRiderStates.map(r=>r.riderId)).size===input.riders.length,'base result scope mismatch')
 req(frames.length===e.actualEngineTickCount+1&&output.snapshots.length===frames.length,'base replay coverage')
 for(let i=0;i<frames.length;i++){
  const f=frames[i],s=output.snapshots[i]
  req(f.raceSecond===s.raceSecond&&f.actualKm===s.km&&eq(f.groups,s.groups.map(g=>({groupId:g.groupId,groupType:g.groupType,active:g.active,riderIds:g.riderIds,distanceKm:g.distanceKm,gapFromLeaderSeconds:g.gapFromLeaderSeconds})).sort((a,b)=>f.groups.findIndex(x=>x.groupId===a.groupId)-f.groups.findIndex(x=>x.groupId===b.groupId))),'base snapshot mismatch')
 }
 const baseRows=output.finalRiderStates.map(r=>{
  const f=frames.at(-1).riders.find(x=>x.riderId===r.riderId)
  req(f?.teamId===r.teamId&&f.energy===r.energy&&f.distanceKm===r.distanceKm&&r.stageStatus==='finished'&&f.status==='finished'&&num(r.finishTimeSeconds,1,86400)&&Number.isSafeInteger(r.finishPosition),'base terminal mismatch')
  return {riderId:r.riderId,teamId:r.teamId,status:'finished',baseRank:r.finishPosition,baseTimeSeconds:r.finishTimeSeconds,baseFinishEnergy:r.energy}
 })
 const episodes=review.chase?.episodes??[],incidents=review.chase?.incidents??[],simulation={episodes,episodeByKey:new Map(episodes.map(x=>[x.episodeKey,x]))}
 req(incidents.length===review.trace.incidents.length&&new Set(episodes.map(x=>x.riderId)).size===episodes.length&&simulation.episodeByKey.size===episodes.length,'unsupported overlapping episode')
 const details=new Map(baseRows.map(r=>[r.riderId,{incidentIds:[],initialEnergyLossPoints:0,chaseEnergyCostPoints:0,timePenaltySeconds:0,finishPerformancePenaltyPoints:0,dnf:false,withdrawalKm:null,protectedTimeSeconds:null,sprintZoneProtectionApplied:false}]))
 for(const incident of incidents){
  const frame=review.measurements.find(m=>m.raceSecond===incident.raceSecond)
  const sourceGroup=frame?.groups.find(g=>g.groupType==='peloton'&&g.active)
  req(sourceGroup,'incident source group absent')
  const protectedTime=reviewProtectedSourceTime(sourceGroup.riderIds,incident.affectedRiderIds,baseRows)
  for(const row of incident.riderConsequences){
   const d=details.get(row.riderId)
   req(d&&d.incidentIds.length===0&&num(row.energyLossPoints,0,100)&&num(row.healthOutcome.currentStagePerformancePenaltyPoints,0,100),'invalid or repeated incident consequence')
   d.incidentIds.push(incident.incidentId);d.initialEnergyLossPoints=row.energyLossPoints;d.dnf=row.statusImpact==='dnf';d.withdrawalKm=d.dnf?incident.kmFromStart:null
   d.finishPerformancePenaltyPoints=row.healthOutcome.currentStagePerformancePenaltyPoints
   if(!d.dnf){req(num(row.finalTimePenaltySeconds,0,86400),'missing chase consequence');d.timePenaltySeconds=row.finalTimePenaltySeconds}
   if(!d.dnf&&row.sprintZoneEligible&&protectedTime!==null){d.protectedTimeSeconds=protectedTime;d.sprintZoneProtectionApplied=true}
  }
 }
 for(const ep of episodes){
  const d=details.get(ep.riderId)
  req(d&&!d.dnf&&num(ep.chaseEnergyCostPoints,0,1000)&&num(ep.finalGapToTargetSeconds,0,86400),'invalid chase episode')
  d.chaseEnergyCostPoints=ep.chaseEnergyCostPoints
  if(ep.episodeKind==='team_rescue_helper'){req(d.incidentIds.length===0,'overlapping helper');d.timePenaltySeconds=ep.actualRejoinKm===null?Math.max(0,Math.round(ep.finalGapToTargetSeconds)):0}
  else req(ep.episodeKind==='incident_rider'&&d.incidentIds.length===1,'missing incident episode')
 }
 const adjusted=reviewProvisionalClassification(baseRows.map(r=>({...r,...details.get(r.riderId),adjustedFinishEnergy:deterministicRound(Math.max(0,r.baseFinishEnergy-details.get(r.riderId).initialEnergyLossPoints-details.get(r.riderId).chaseEnergyCostPoints),6)})),context.terrainType)
 const classification=new Map(adjusted.classification.map(r=>[r.riderId,r]))
 const replay=review.measurements.map((m,i)=>({raceSecond:m.raceSecond,historicalKm:m.historicalKm,measuredKm:m.measuredKm,riders:m.riders.map(r=>{
  const d=details.get(r.riderId),inc=incidents.find(x=>x.incidentId===d.incidentIds[0]),ep=episodes.find(x=>x.riderId===r.riderId)
  const occurred=inc&&m.historicalKm>=inc.kmFromStart-.000001
  const sample=ep?phase10AutonomousEpisodeSampleAtKm(simulation,ep.episodeKey,m.historicalKm):null
  const chaseEnergy=phase10AutonomousChaseEnergyAtKm(simulation,r.riderId,m.historicalKm)
  const initialLoss=occurred?d.initialEnergyLossPoints:0
  const status=i===review.measurements.length-1?classification.get(r.riderId).status:occurred&&d.dnf?'dnf':r.status
  return {riderId:r.riderId,teamId:r.teamId,status,baseEnergy:r.energy,adjustedEnergy:deterministicRound(Math.max(0,r.energy-initialLoss-chaseEnergy),6),initialLoss,chaseEnergy,modeledDisplayCode:status==='dnf'||status==='otl'?null:sample?.displayCode??'P',modeledGapToTargetSeconds:sample?.gapToTargetSeconds??null,rank:i===review.measurements.length-1?classification.get(r.riderId).rank:null}
 })}))
 for(const r of adjusted.classification)req(replay.at(-1).riders.find(x=>x.riderId===r.riderId).adjustedEnergy===r.adjustedFinishEnergy,'terminal energy overlay mismatch')
 return {version:'043V_incident_adjusted_replay_v1',engineEvidenceSha256:expectedEvidenceSha256,baseOutputSha256:e.outputSha256,classification:adjusted,replay,replaySha256:carryoverDigest(replay),classificationSha256:carryoverDigest(adjusted),model:'historical_postprocessing_no_physical_feedback',...flags()}
}
