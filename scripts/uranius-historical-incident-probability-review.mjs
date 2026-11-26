// 043P: historical Phase10 probability and single checkpoint candidate selection.
// Pinned original runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886.
// Candidate exposure is synthetic, not actual physical checkpoint evidence.
import {createHash} from 'node:crypto'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewHistoricalPhase10Handoff} from './uranius-historical-phase10-handoff-review.mjs'
const PHASE10_BASE_PROBABILITY_PER_30_SECONDS={individual_crash:.00008,group_crash:.00008,technical_incident:.00012,exhaustion:.003}
const PHASE10_MAXIMUM_PROBABILITY={individual_crash:.08,group_crash:.04,technical_incident:.05,exhaustion:.015}
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}
function deterministicRound(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}
function calculateUniversalFatigueIncidentRiskMultiplier(
  fatigue,
) {
  const clampedFatigue = clamp(fatigue, 0, 100)
  const excessFatigue = Math.max(0, clampedFatigue - 20)

  return deterministicRound(
    clamp(1 + excessFatigue * 0.015625, 1, 2.25),
    6,
  )
}
function phase10EquipmentConditionRiskMultiplier(conditionPercent) {
  const condition = clamp(conditionPercent, 0, 100)
  if (condition >= 90) return 1
  if (condition >= 75) return 1.05
  if (condition >= 50) return 1.15
  if (condition >= 25) return 1.3
  return 1.5
}
function calculateUniversalPhase10IncidentProbability(
  input,
) {
  const baseProbabilityPer30Seconds =
    PHASE10_BASE_PROBABILITY_PER_30_SECONDS[input.incidentKind]
  const maximumProbability = PHASE10_MAXIMUM_PROBABILITY[input.incidentKind]
  const tickDurationMultiplier = clamp(input.tickSeconds / 30, 0, 4)
  const weatherMultiplier = clamp(input.weatherMultiplier, 0.7, 2.5)
  const speedThreshold = input.incidentKind === 'group_crash' ? 35 : 40
  const speedMultiplier = input.incidentKind === 'exhaustion'
    ? 1
    : clamp(
        1 + Math.max(0, input.currentSpeedKmh - speedThreshold) * 0.04,
        1,
        3,
      )
  const descentMultiplier =
    input.incidentKind !== 'exhaustion' && input.gradientPercent < 0
      ? clamp(1 + Math.abs(input.gradientPercent) * 0.12, 1, 3.5)
      : 1
  const densityMultiplier =
    input.incidentKind === 'technical_incident' || input.incidentKind === 'exhaustion'
      ? 1
      : input.incidentKind === 'individual_crash'
        ? clamp(1 + Math.max(0, input.groupSize - 10) * 0.03, 1, 2)
        : clamp(1 + Math.max(0, input.groupSize - 6) * 0.08, 1, 5)
  const fatigueMultiplier = calculateUniversalFatigueIncidentRiskMultiplier(
    input.runtimeFatigue,
  )
  const riderControl = (clamp(input.resistance, 0, 100) + clamp(input.raceIq, 0, 100)) / 2
  const riderControlMultiplier = clamp(
    1 - ((riderControl - 50) / 50) * 0.4,
    0.6,
    1.4,
  )
  const preparationSupportMultiplier = clamp(
    input.preparationSupportMultiplier,
    0.7,
    1.4,
  )
  const commandIntensityMultiplier = clamp(
    input.commandIntensityMultiplier,
    0.82,
    1.45,
  )
  const raceSituationMultiplier = clamp(
    input.raceSituationMultiplier ?? 1,
    0.6,
    6,
  )
  const equipmentConditionMultiplier =
    input.incidentKind === 'technical_incident'
      ? phase10EquipmentConditionRiskMultiplier(
          input.equipmentConditionPercent ?? 100,
        )
      : 1
  const mechanicalSupportMultiplier =
    input.incidentKind === 'technical_incident'
      ? clamp(input.mechanicalIncidentRiskMultiplier ?? 1, 0.78, 1.5)
      : 1
  const uncappedProbability =
    baseProbabilityPer30Seconds *
    tickDurationMultiplier *
    weatherMultiplier *
    speedMultiplier *
    descentMultiplier *
    densityMultiplier *
    fatigueMultiplier *
    riderControlMultiplier *
    preparationSupportMultiplier *
    commandIntensityMultiplier *
    raceSituationMultiplier *
    equipmentConditionMultiplier *
    mechanicalSupportMultiplier
  const finalProbability = deterministicRound(
    clamp(uncappedProbability, 0, maximumProbability),
    12,
  )

  return {
    incidentKind: input.incidentKind,
    baseProbabilityPer30Seconds,
    tickDurationMultiplier: deterministicRound(tickDurationMultiplier, 6),
    weatherMultiplier: deterministicRound(weatherMultiplier, 6),
    speedMultiplier: deterministicRound(speedMultiplier, 6),
    descentMultiplier: deterministicRound(descentMultiplier, 6),
    densityMultiplier: deterministicRound(densityMultiplier, 6),
    fatigueMultiplier: deterministicRound(fatigueMultiplier, 6),
    riderControlMultiplier: deterministicRound(riderControlMultiplier, 6),
    preparationSupportMultiplier: deterministicRound(
      preparationSupportMultiplier,
      6,
    ),
    commandIntensityMultiplier: deterministicRound(commandIntensityMultiplier, 6),
    raceSituationMultiplier: deterministicRound(raceSituationMultiplier, 6),
    equipmentConditionMultiplier: deterministicRound(
      equipmentConditionMultiplier,
      6,
    ),
    mechanicalSupportMultiplier: deterministicRound(mechanicalSupportMultiplier, 6),
    uncappedProbability: deterministicRound(uncappedProbability, 12),
    maximumProbability,
    finalProbability,
  }
}
function phase10DeterministicRoll(hash) {
  const numerator = Number.parseInt(hash.slice(0, 13), 16)
  return deterministicRound(numerator / 0x10000000000000, 12)
}
function phase10IntegerFromHash(hash, minimum, maximum) {
  const roll = phase10DeterministicRoll(hash)
  return minimum + Math.floor(roll * (maximum - minimum + 1))
}
function phase10CrashSeverity(
  incidentKind,
  probability,
  hash,
  causes,
) {
  const roll = phase10DeterministicRoll(hash)
  const ratio = Math.min(
    1,
    probability.finalProbability /
      (incidentKind === 'group_crash' ? 0.04 : 0.08),
  )
  let serious = incidentKind === 'group_crash' ? 0.08 : 0.05
  let moderate = incidentKind === 'group_crash' ? 0.35 : 0.25
  serious += ratio * (incidentKind === 'group_crash' ? 0.08 : 0.05)
  moderate += ratio * 0.1
  if (causes.includes('wet_road') && causes.includes('descending')) {
    serious += 0.05
    moderate += 0.1
  }
  if (causes.includes('runtime_fatigue')) {
    // Fatigue still raises crash severity, but it must not turn a long stage
    // race into an attrition cascade by itself.
    serious += 0.01
    moderate += 0.03
  }
  if (causes.includes('high_speed')) {
    serious += 0.02
    moderate += 0.05
  }
  serious = Math.min(0.3, serious)
  moderate = Math.min(0.55, moderate)
  if (roll < serious) return 'serious'
  if (roll < serious + moderate) return 'moderate'
  return 'minor'
}
function phase10TechnicalSeverity(
  probability,
  hash,
  causes,
  equipmentConditionPercent,
) {
  const roll = phase10DeterministicRoll(hash)
  const ratio = Math.min(1, probability.finalProbability / 0.05)
  let serious = 0.07 + ratio * 0.13
  let moderate = 0.32 + ratio * 0.18
  if (equipmentConditionPercent < 50) {
    serious += 0.1
    moderate += 0.08
  } else if (equipmentConditionPercent < 75) {
    serious += 0.04
    moderate += 0.08
  }
  if (causes.includes('runtime_fatigue')) {
    serious += 0.03
    moderate += 0.05
  }
  serious = Math.min(0.35, serious)
  moderate = Math.min(0.58, moderate)
  if (roll < serious) return 'serious'
  if (roll < serious + moderate) return 'moderate'
  return 'minor'
}
const md5=x=>createHash('md5').update(x,'utf8').digest('hex')
const req=(x,m)=>{if(!x)throw Error('043P: '+m)}
const kinds=['individual_crash','group_crash','technical_incident','exhaustion']
const keys=['tickSeconds','weatherMultiplier','currentSpeedKmh','gradientPercent','groupSize','runtimeFatigue','resistance','raceIq','preparationSupportMultiplier','commandIntensityMultiplier','raceSituationMultiplier','equipmentConditionPercent','mechanicalIncidentRiskMultiplier']
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const fields=(x,ks)=>x&&Object.keys(x).sort().join(',')===[...ks].sort().join(',')
const flags=()=>({incidentAuthorityVerified:false,physicalCheckpointVerified:false,completeOccurrenceVerified:false,official:false,hostedWriteAllowed:false,accountingAllowed:false})
export function reviewHistoricalIncidentProbability(p){
 req(fields(p,['incidentKind',...keys])&&kinds.includes(p.incidentKind)&&keys.every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&p.tickSeconds>=0&&Number.isSafeInteger(p.groupSize)&&p.groupSize>=1,'complete explicit numeric probability input required')
 return calculateUniversalPhase10IncidentProbability(p)
}
export function reviewHistoricalCheckpoint({evidence,expectedEvidenceSha256}){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256,'frozen synthetic checkpoint required')
 req(fields(evidence,['provenance','raceId','stageId','runId','seed','raceSecond','priorIncidentCount','candidates']),'unexpected checkpoint fields')
 const {raceId,stageId,runId,seed,raceSecond,priorIncidentCount,candidates}=evidence
 req([raceId,stageId,runId].every(uuid)&&typeof seed==='string'&&seed.length>0&&!seed.includes('|')&&Number.isSafeInteger(raceSecond)&&raceSecond>60&&raceSecond%30===0&&Number.isSafeInteger(priorIncidentCount)&&priorIncidentCount>=0&&priorIncidentCount<7&&Array.isArray(candidates),'checkpoint scope')
 const seen=new Set()
 const rows=candidates.map(c=>{
  req(fields(c,['entityId','displayCode','riders','probabilityInput','causes','exposureEligibility'])&&c.exposureEligibility==='explicit_synthetic_eligible'&&Array.isArray(c.riders)&&new Set(c.riders.map(r=>r.riderId)).size===c.riders.length&&c.riders.every(r=>fields(r,['riderId','teamId','equipmentConditionPercent'])&&uuid(r.riderId)&&uuid(r.teamId)&&typeof r.equipmentConditionPercent==='number'&&Number.isFinite(r.equipmentConditionPercent)&&r.equipmentConditionPercent>=0&&r.equipmentConditionPercent<=100),'explicit candidate roster required')
  const probability=reviewHistoricalIncidentProbability(c.probabilityInput),kind=probability.incidentKind
  req(c.probabilityInput.tickSeconds===30,'historical checkpoint tick is 30 seconds')
  req(Array.isArray(c.causes)&&c.causes.every(x=>typeof x==='string')&&new Set(c.causes).size===c.causes.length,'explicit causes required')
  if(kind==='group_crash'){
   req(c.riders.length>=6&&c.probabilityInput.groupSize===c.riders.length&&typeof c.displayCode==='string'&&/^[A-Za-z0-9_-]+$/.test(c.displayCode)&&c.entityId===c.displayCode+':'+c.riders.map(r=>r.riderId).sort().join(','),'group entity scope')
  }else req(c.riders.length===1&&c.entityId===c.riders[0].riderId&&c.probabilityInput.equipmentConditionPercent===c.riders[0].equipmentConditionPercent,'individual entity scope')
  const key=kind+'|'+c.entityId;req(!seen.has(key),'duplicate candidate');seen.add(key)
  const hash=md5([seed,raceId,stageId,'phase10',kind,priorIncidentCount,raceSecond,c.entityId].join('|'))
  return {...c,kind,probability,hash,roll:phase10DeterministicRoll(hash)}
 })
 const qualified=rows.filter(c=>c.roll<c.probability.finalProbability).sort((a,b)=>a.roll/Math.max(a.probability.finalProbability,1e-12)-b.roll/Math.max(b.probability.finalProbability,1e-12)||a.kind.localeCompare(b.kind)||a.entityId.localeCompare(b.entityId))
 const selected=qualified[0]
 let incident=null
 if(selected){
  const s=selected,hash=s.hash,kind=s.kind
  const count=kind==='group_crash'?phase10IntegerFromHash(md5(hash+'|affected_count'),2,Math.min(6,s.riders.length)):1
  req(count<=s.riders.length&&count<=(kind==='group_crash'?6:1),'historical member count out of bounds')
  const affected=s.riders.slice().sort((a,b)=>md5(hash+'|member|'+a.riderId).localeCompare(md5(hash+'|member|'+b.riderId))||a.riderId.localeCompare(b.riderId)).slice(0,count).sort((a,b)=>a.riderId.localeCompare(b.riderId))
  const severity=kind==='exhaustion'?'serious':kind==='technical_incident'?phase10TechnicalSeverity(s.probability,md5(hash+'|severity'),s.causes,s.probabilityInput.equipmentConditionPercent):phase10CrashSeverity(kind,s.probability,md5(hash+'|severity'),s.causes)
  const handoffs=affected.map(r=>{
   const e={provenance:'synthetic_review_fixture',raceId,stageId,runId,riderId:r.riderId,teamId:r.teamId,stageFormat:'road_race',incidentKind:kind,incidentSeverity:severity,deterministicHash:hash,equipmentConditionPercent:r.equipmentConditionPercent}
   return reviewHistoricalPhase10Handoff({evidence:e,expectedEvidenceSha256:carryoverDigest(e)})
  })
  incident={incidentId:stageId+':phase10:'+(priorIncidentCount+1)+':'+hash.slice(0,12),kind,severity,entityId:s.entityId,hash,roll:s.roll,probability:s.probability,affectedRiderIds:affected.map(r=>r.riderId),handoffs}
 }
 return {version:'043P_historical_checkpoint_review_v1',evidenceSha256:expectedEvidenceSha256,qualifiedCount:qualified.length,candidateCount:rows.length,incident,...flags()}
}
