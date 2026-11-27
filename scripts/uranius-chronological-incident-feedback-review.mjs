// 043W bounded causal incident feedback on frozen base-engine ticks. No physical engine mutation.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewIncidentAdjustedReplay} from './uranius-incident-adjusted-replay-review.mjs'
import {projectEngineIncidentReplayWithSource} from './uranius-engine-incident-replay-review.mjs'
import {reviewHistoricalEligibilityTraceWithFeedback} from './uranius-historical-incident-eligibility-review.mjs'
import {reviewHistoricalTeamRescue} from './uranius-historical-team-rescue-review.mjs'
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

const req=(x,m)=>{if(!x)throw Error('043W: '+m)}
const P='synthetic_review_fixture'
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,physicalEngineFeedbackApplied:false,finalClassificationVerified:false,healthWritesPerformed:false})
// Only previously selected incidents are admitted. A rejoin witness is emitted
// once, at the first later racing tick at/after the modeled crossing.
export function applyPriorIncidentFeedback({tick,kmFromStart,prefix,confirmed}){
 const episodes=prefix?.episodes??[],incidents=prefix?.incidents??[]
 const simulation={episodes,episodeByKey:new Map(episodes.map(e=>[e.episodeKey,e]))}
 const byRider=new Map()
 for(const inc of incidents)for(const row of inc.riderConsequences){
  req(!byRider.has(row.riderId),'repeat incident outside bounded review')
  byRider.set(row.riderId,{inc,row})
 }
 req(episodes.every(e=>e.episodeKind==='incident_rider'&&byRider.has(e.riderId)),'team rescue outside bounded review')
 const groups=new Map(),rejoins=[],adjustments=[]
 const riders=tick.riders.map(r=>{
  const d=byRider.get(r.riderId),ep=episodes.find(e=>e.riderId===r.riderId)
  const initial=d?.row.energyLossPoints??0
  const chase=phase10AutonomousChaseEnergyAtKm(simulation,r.riderId,kmFromStart)
  const energy=deterministicRound(Math.max(0,r.energy-initial-chase),6)
  const status=d?.row.statusImpact==='dnf'?'dnf':r.status
  let displayCode=null
  if(status==='racing'){
   if(ep){
    if(confirmed.has(r.riderId))req(ep.actualRejoinKm===confirmed.get(r.riderId),'confirmed rejoin changed by later prefix')
    if(ep.actualRejoinKm!==null&&kmFromStart>=ep.actualRejoinKm-.000001){
     displayCode='P'
     if(!confirmed.has(r.riderId)){
      confirmed.set(r.riderId,ep.actualRejoinKm)
      rejoins.push({riderId:r.riderId,incidentId:d.inc.incidentId,rejoinKm:ep.actualRejoinKm,provenance:'synthetic_rejoin_witness'})
     }
    }else{
     const sample=phase10AutonomousEpisodeSampleAtKm(simulation,ep.episodeKey,kmFromStart)
     req(sample&&sample.displayCode!=='P','missing detached chase sample')
     displayCode=sample.displayCode
    }
   }else{
    req(!d,'surviving incident missing chase episode')
    displayCode=tick.groups.find(g=>g.riderIds.includes(r.riderId))?.displayCode
    req(displayCode==='P','base peloton required')
   }
   if(!groups.has(displayCode))groups.set(displayCode,[])
   groups.get(displayCode).push(r.riderId)
  }
  if(d)adjustments.push({riderId:r.riderId,incidentId:d.inc.incidentId,baseEnergy:r.energy,energy,status,displayCode,initialLoss:initial,chaseEnergy:chase,rejoinKm:confirmed.get(r.riderId)??null})
  return {...r,energy,status}
 })
 return {tick:{...tick,riders,groups:[...groups].map(([displayCode,riderIds])=>({displayCode,aheadOfPeloton:false,riderIds})),rejoins},adjustments}
}
export function reviewChronologicalIncidentFeedback({engine,expectedEvidenceSha256,context}){
 // Reuse accepted 043V evidence validation and independent re-projection.
 const baseOverlay=reviewIncidentAdjustedReplay({engine,expectedEvidenceSha256,context})
 req(context.gcStandings.length===0&&context.plans.every(p=>p.stageRole==='domestique'&&Object.values(p.commands).every(c=>c==='hold')),'no-rescue neutral plans required')
 const e=engine.evidence
 const frames=engine.review.measurements.map(m=>({raceSecond:m.raceSecond,actualKm:m.measuredKm,riders:m.riders,groups:m.groups}))
 const {review,eligibilityEvidence,chaseEvidence}=projectEngineIncidentReplayWithSource({input:engine.input,readinessReceipt:engine.readinessReceipt,runId:e.runId,context,frames,winnerTimeSeconds:e.winnerTimeSeconds})
 req(carryoverDigest(review)===e.reviewSha256,'source projection mismatch')
 let prefix=null,priorCount=0
 const confirmed=new Map(),feedbackAudit=[],prefixReceipts=[]
 const result=reviewHistoricalEligibilityTraceWithFeedback({evidence:eligibilityEvidence,expectedEvidenceSha256:carryoverDigest(eligibilityEvidence)},({tick,raceSecond,kmFromStart,incidents,selectedCheckpoints})=>{
  if(incidents.length!==priorCount){
   req(incidents.length===priorCount+1&&selectedCheckpoints.length===incidents.length,'incident prefix discontinuity')
   const affected=incidents.flatMap(i=>i.incident.affectedRiderIds)
   req(new Set(affected).size===affected.length,'repeat incident selected; chronological repeat modeling not supported')
   const consequences=selectedCheckpoints.map((cp,i)=>{
    const map=new Map(cp.evidence.candidates.flatMap(c=>c.riders).map(r=>[r.riderId,r.teamId]))
    const repairModifiers=[...map].map(([riderId,teamId])=>({riderId,teamId,mechanicalTimeLossMultiplier:engine.readinessReceipt.rows.find(r=>r.riderId===riderId).preparation.modifiers?.mechanicalTimeLossMultiplier??1}))
    const evidence={provenance:P,checkpoint:cp.evidence,expectedCheckpointSha256:cp.expectedEvidenceSha256,repairModifiers,stage:{stageFormat:'road_race',distanceKm:engine.input.distanceKm,kmFromStart:incidents[i].kmFromStart,flatFinish:context.flatSprint,summitFinish:false,sprintZoneKm:null}}
    return {evidence,expectedEvidenceSha256:carryoverDigest(evidence)}
   })
   const evidence={...chaseEvidence,consequences}
   prefix=reviewHistoricalTeamRescue({evidence,expectedEvidenceSha256:carryoverDigest(evidence)})
   req(prefix.teamRescueEvents.length===0,'unexpected rescue in bounded review')
   for(const [id,km] of confirmed)req(prefix.episodes.find(e=>e.riderId===id)?.actualRejoinKm===km,'confirmed rejoin changed by later prefix')
   priorCount=incidents.length
   prefixReceipts.push({asOfRaceSecond:raceSecond,incidentIds:incidents.map(i=>i.incident.incidentId),prefixSha256:carryoverDigest(prefix)})
  }
  if(!prefix)return tick
  const applied=applyPriorIncidentFeedback({tick,kmFromStart,prefix,confirmed})
  feedbackAudit.push({raceSecond,kmFromStart,priorIncidentCount:priorCount,adjustments:applied.adjustments,rejoins:applied.tick.rejoins,groups:applied.tick.groups})
  return applied.tick
 })
 req(priorCount===result.trace.incidents.length,'unprocessed terminal incident')
 return {version:'043W_chronological_incident_feedback_review_v1',engineEvidenceSha256:expectedEvidenceSha256,baseOverlaySha256:carryoverDigest(baseOverlay),trace:result.trace,selectedCheckpoints:result.selectedCheckpoints,chase:prefix,feedbackAudit,prefixReceipts,feedbackSha256:carryoverDigest(feedbackAudit),traceSha256:carryoverDigest(result.trace),candidateFeedbackApplied:true,model:'causal_incident_prefix_on_frozen_base_replay',...flags()}
}
