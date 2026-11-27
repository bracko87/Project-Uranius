// 043X sequential causal incident feedback on frozen base-engine ticks. No physical engine mutation.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewIncidentAdjustedReplay} from './uranius-incident-adjusted-replay-review.mjs'
import {projectEngineIncidentReplayWithSource} from './uranius-engine-incident-replay-review.mjs'
import {reviewHistoricalEligibilityTraceWithFeedback} from './uranius-historical-incident-eligibility-review.mjs'
import {reviewHistoricalSequentialRescue} from './uranius-historical-team-rescue-review.mjs'
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

const req=(x,m)=>{if(!x)throw Error('043X: '+m)}
const P='synthetic_review_fixture'
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,physicalEngineFeedbackApplied:false,finalClassificationVerified:false,healthWritesPerformed:false})
// This helper accepts only already-selected prefixes from the review adapter;
// its standalone tests use explicit synthetic episode records.
export function applySequentialFeedback({tick,kmFromStart,prefix,confirmed}){
 const episodes=prefix?.episodes??[],incidents=prefix?.incidents??[]
 const simulation={episodes,episodeByKey:new Map(episodes.map(e=>[e.episodeKey,e]))}
 req(simulation.episodeByKey.size===episodes.length,'duplicate episode key')
 const byRider=new Map(),groups=new Map(),rejoins=[],adjustments=[],excludedRiderIds=[]
 for(const inc of incidents)for(const row of inc.riderConsequences){
  req(inc.raceSecond<tick.raceSecond&&inc.kmFromStart<=kmFromStart+.000001,'future incident in prior prefix')
  const list=byRider.get(row.riderId)??[]
  req(!list.some(x=>x.row.statusImpact==='dnf'),'incident after withdrawal')
  if(list.length){
   const prev=list.at(-1),key=prev.inc.incidentId+':'+row.riderId
   const ep=episodes.find(e=>e.incidentId===prev.inc.incidentId&&e.riderId===row.riderId&&e.episodeKind==='incident_rider')
   req(inc.raceSecond>=prev.inc.raceSecond+900&&ep&&ep.actualRejoinKm!==null&&ep.actualRejoinKm<=inc.kmFromStart-.000001,'repeat incident before rejoin/cooldown')
  }
  list.push({inc,row});byRider.set(row.riderId,list)
 }
 for(const ep of episodes){
  req(['incident_rider','team_rescue_helper'].includes(ep.episodeKind)&&incidents.some(i=>i.incidentId===ep.incidentId),'unbound chase episode')
  if(confirmed.has(ep.episodeKey))req(ep.actualRejoinKm===confirmed.get(ep.episodeKey),'confirmed rejoin changed')
 }
 const riders=tick.riders.map(r=>{
  const ds=byRider.get(r.riderId)??[],es=episodes.filter(e=>e.riderId===r.riderId&&e.activationKm<=kmFromStart+.000001).sort((a,b)=>a.activationKm-b.activationKm)
  for(let i=1;i<es.length;i++)req(es[i-1].actualRejoinKm!==null&&es[i-1].actualRejoinKm<=es[i].activationKm-.000001,'overlapping chase episodes')
  const latest=ds.at(-1),initial=deterministicRound(ds.reduce((s,d)=>s+d.row.energyLossPoints,0),6)
  const chase=phase10AutonomousChaseEnergyAtKm(simulation,r.riderId,kmFromStart)
  const energy=ds.length||es.length?deterministicRound(Math.max(0,r.energy-initial-chase),6):r.energy
  const status=ds.some(d=>d.row.statusImpact==='dnf')?'dnf':r.status
  let displayCode=null
  if(status==='racing'){
   for(const ep of es)if(ep.actualRejoinKm!==null&&kmFromStart>=ep.actualRejoinKm-.000001&&!confirmed.has(ep.episodeKey)){
    confirmed.set(ep.episodeKey,ep.actualRejoinKm)
    if(ep.episodeKind==='incident_rider'){
     req(latest?.inc.incidentId===ep.incidentId,'missing earlier rejoin confirmation')
     rejoins.push({riderId:r.riderId,incidentId:ep.incidentId,rejoinKm:ep.actualRejoinKm,provenance:'synthetic_rejoin_witness'})
    }
   }
   const active=es.filter(ep=>ep.actualRejoinKm===null||kmFromStart<ep.actualRejoinKm-.000001)
   req(active.length<=1,'overlapping active chase')
   if(active.length){
    const sample=phase10AutonomousEpisodeSampleAtKm(simulation,active[0].episodeKey,kmFromStart)
    req(sample&&sample.displayCode!=='P','missing detached chase sample')
    displayCode=sample.displayCode;excludedRiderIds.push(r.riderId)
   }else{
    req(!latest||es.some(ep=>ep.episodeKind==='incident_rider'&&ep.incidentId===latest.inc.incidentId),'surviving incident missing chase episode')
    displayCode=tick.groups.find(g=>g.riderIds.includes(r.riderId))?.displayCode
    req(displayCode==='P','base peloton required')
   }
   if(!groups.has(displayCode))groups.set(displayCode,[])
   groups.get(displayCode).push(r.riderId)
  }else req(!es.some(ep=>status==='dnf'&&(ep.actualRejoinKm===null||ep.actualRejoinKm>latest.inc.kmFromStart-.000001)),'active episode after withdrawal')
  if(ds.length||es.length)adjustments.push({riderId:r.riderId,incidentIds:ds.map(d=>d.inc.incidentId),episodeKeys:es.map(e=>e.episodeKey),baseEnergy:r.energy,energy,status,displayCode,initialLoss:initial,chaseEnergy:chase})
  return {...r,energy,status}
 })
 return {tick:{...tick,riders,groups:[...groups].map(([displayCode,riderIds])=>({displayCode,aheadOfPeloton:false,riderIds})),rejoins},adjustments,excludedRiderIds}
}
export function reviewSequentialIncidentFeedback({engine,expectedEvidenceSha256,context}){
 // Reuse accepted 043V evidence validation and independent re-projection.
 const baseOverlay=reviewIncidentAdjustedReplay({engine,expectedEvidenceSha256,context})

 const e=engine.evidence
 const frames=engine.review.measurements.map(m=>({raceSecond:m.raceSecond,actualKm:m.measuredKm,riders:m.riders,groups:m.groups}))
 const {review,eligibilityEvidence,chaseEvidence}=projectEngineIncidentReplayWithSource({input:engine.input,readinessReceipt:engine.readinessReceipt,runId:e.runId,context,frames,winnerTimeSeconds:e.winnerTimeSeconds})
 req(carryoverDigest(review)===e.reviewSha256,'source projection mismatch')
 let prefix=null,priorCount=0
 const confirmed=new Map(),feedbackAudit=[],prefixReceipts=[]
 const result=reviewHistoricalEligibilityTraceWithFeedback({evidence:eligibilityEvidence,expectedEvidenceSha256:carryoverDigest(eligibilityEvidence)},({tick,raceSecond,kmFromStart,incidents,selectedCheckpoints})=>{
  if(incidents.length!==priorCount){
   req(incidents.length===priorCount+1&&selectedCheckpoints.length===incidents.length,'incident prefix discontinuity')
   const consequences=selectedCheckpoints.map((cp,i)=>{
    const map=new Map(cp.evidence.candidates.flatMap(c=>c.riders).map(r=>[r.riderId,r.teamId]))
    const repairModifiers=[...map].map(([riderId,teamId])=>({riderId,teamId,mechanicalTimeLossMultiplier:engine.readinessReceipt.rows.find(r=>r.riderId===riderId).preparation.modifiers?.mechanicalTimeLossMultiplier??1}))
    const evidence={provenance:P,checkpoint:cp.evidence,expectedCheckpointSha256:cp.expectedEvidenceSha256,repairModifiers,stage:{stageFormat:'road_race',distanceKm:engine.input.distanceKm,kmFromStart:incidents[i].kmFromStart,flatFinish:context.flatSprint,summitFinish:false,sprintZoneKm:null}}
    return {evidence,expectedEvidenceSha256:carryoverDigest(evidence)}
   })
   const evidence={...chaseEvidence,consequences}
   prefix=reviewHistoricalSequentialRescue({evidence,expectedEvidenceSha256:carryoverDigest(evidence)})
   for(const [key,km] of confirmed)req(prefix.episodes.find(e=>e.episodeKey===key)?.actualRejoinKm===km,'confirmed rejoin changed by later prefix')
   // No retroactive debit or group change allowed when extending the prefix.
   const replayConfirmed=new Map()
   for(const old of feedbackAudit){
    const prior={incidents:prefix.incidents.filter(x=>x.raceSecond<old.raceSecond),episodes:prefix.episodes.filter(x=>prefix.incidents.find(y=>y.incidentId===x.incidentId)?.raceSecond<old.raceSecond)}
    const sourceTick=eligibilityEvidence.ticks[old.raceSecond/30-1]
    const replay=applySequentialFeedback({tick:sourceTick,kmFromStart:old.kmFromStart,prefix:prior,confirmed:replayConfirmed})
    req(carryoverDigest({adjustments:replay.adjustments,rejoins:replay.tick.rejoins,groups:replay.tick.groups,excludedRiderIds:replay.excludedRiderIds})===carryoverDigest({adjustments:old.adjustments,rejoins:old.rejoins,groups:old.groups,excludedRiderIds:old.excludedRiderIds}),'new prefix changed prior observed feedback')
   }
   for(const event of prefix.teamRescueEvents){
    const inc=prefix.incidents.find(x=>x.incidentId===event.incidentId),old=feedbackAudit.find(x=>x.raceSecond===inc.raceSecond)
    if(old)req(event.helperRiderIds.every(id=>old.groups.some(g=>g.displayCode==='P'&&g.riderIds.includes(id))),'helper was not in source group at incident')
   }
   priorCount=incidents.length
   prefixReceipts.push({asOfRaceSecond:raceSecond,incidentIds:incidents.map(i=>i.incident.incidentId),prefixSha256:carryoverDigest(prefix)})
  }
  if(!prefix)return tick
  const applied=applySequentialFeedback({tick,kmFromStart,prefix,confirmed})
  feedbackAudit.push({raceSecond,kmFromStart,priorIncidentCount:priorCount,adjustments:applied.adjustments,rejoins:applied.tick.rejoins,groups:applied.tick.groups,excludedRiderIds:applied.excludedRiderIds})
  return {tick:applied.tick,excludedRiderIds:applied.excludedRiderIds}
 })
 req(priorCount===result.trace.incidents.length,'unprocessed terminal incident')
 return {version:'043X_sequential_incident_feedback_review_v1',engineEvidenceSha256:expectedEvidenceSha256,baseOverlaySha256:carryoverDigest(baseOverlay),trace:result.trace,selectedCheckpoints:result.selectedCheckpoints,chase:prefix,feedbackAudit,prefixReceipts,feedbackSha256:carryoverDigest(feedbackAudit),traceSha256:carryoverDigest(result.trace),candidateFeedbackApplied:true,model:'sequential_incident_prefix_on_frozen_base_replay',...flags()}
}
