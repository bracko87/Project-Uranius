// 043R: historical incident initial consequences; no chase or publication.
// Original source blob 39e35c6ed69563ce82cb663d6c3f9088c61df886.
import {createHash} from 'node:crypto'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewHistoricalCheckpoint} from './uranius-historical-incident-probability-review.mjs'
import {reviewHistoricalPhase10Handoff} from './uranius-historical-phase10-handoff-review.mjs'
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}
function deterministicRound(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}
function phase10DeterministicRoll(hash) {
  const numerator = Number.parseInt(hash.slice(0, 13), 16)
  return deterministicRound(numerator / 0x10000000000000, 12)
}
function phase10IntegerFromHash(hash, minimum, maximum) {
  const roll = phase10DeterministicRoll(hash)
  return minimum + Math.floor(roll * (maximum - minimum + 1))
}
function phase10TechnicalType(
  hash,
  equipmentConditionPercent,
) {
  const condition = clamp(equipmentConditionPercent, 0, 100)
  const weighted =
    condition < 25
      ? [
          { type: 'dropped_chain', weight: 5 },
          { type: 'puncture', weight: 20 },
          { type: 'wheel_damage', weight: 20 },
          { type: 'drivetrain_failure', weight: 25 },
          { type: 'bike_change', weight: 30 },
        ]
      : condition < 50
        ? [
            { type: 'dropped_chain', weight: 10 },
            { type: 'puncture', weight: 25 },
            { type: 'wheel_damage', weight: 20 },
            { type: 'drivetrain_failure', weight: 25 },
            { type: 'bike_change', weight: 20 },
          ]
        : condition < 75
          ? [
              { type: 'dropped_chain', weight: 15 },
              { type: 'puncture', weight: 30 },
              { type: 'wheel_damage', weight: 20 },
              { type: 'drivetrain_failure', weight: 22 },
              { type: 'bike_change', weight: 13 },
            ]
          : condition < 90
            ? [
                { type: 'dropped_chain', weight: 25 },
                { type: 'puncture', weight: 35 },
                { type: 'wheel_damage', weight: 15 },
                { type: 'drivetrain_failure', weight: 17 },
                { type: 'bike_change', weight: 8 },
              ]
            : [
                { type: 'dropped_chain', weight: 35 },
                { type: 'puncture', weight: 45 },
                { type: 'wheel_damage', weight: 10 },
                { type: 'drivetrain_failure', weight: 8 },
                { type: 'bike_change', weight: 2 },
              ]
  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0)
  const target = phase10DeterministicRoll(hash) * totalWeight
  let cursor = 0
  for (const row of weighted) {
    cursor += row.weight
    if (target < cursor) return row.type
  }
  return weighted[weighted.length - 1].type
}
function phase10TimeLossRange(
  kind,
  severity,
  technicalType,
) {
  if (kind === 'exhaustion') return [0, 0]
  if (kind === 'individual_crash') {
    return severity === 'minor' ? [15, 35] : severity === 'moderate' ? [36, 90] : [91, 180]
  }
  if (kind === 'group_crash') {
    return severity === 'minor' ? [20, 45] : severity === 'moderate' ? [46, 100] : [101, 210]
  }
  const ranges = {
    dropped_chain: { minor: [8, 18], moderate: [19, 35], serious: [36, 60] },
    puncture: { minor: [20, 35], moderate: [36, 60], serious: [61, 95] },
    wheel_damage: { minor: [35, 55], moderate: [56, 90], serious: [91, 140] },
    drivetrain_failure: { minor: [25, 50], moderate: [51, 95], serious: [96, 160] },
    bike_change: { minor: [60, 90], moderate: [91, 140], serious: [141, 220] },
  }
  return ranges[technicalType ?? 'puncture'][severity]
}
function phase10IncidentEnergyLoss(
  kind,
  timeLossSeconds,
) {
  if (kind === 'exhaustion') return 0
  const kindFactor =
    kind === 'technical_incident' ? 0.5 : kind === 'group_crash' ? 0.85 : 1
  return deterministicRound(
    clamp((timeLossSeconds / 30) * kindFactor, 0.5, 8),
    6,
  )
}
const md5=x=>createHash('md5').update(x,'utf8').digest('hex')
const req=(x,m)=>{if(!x)throw Error('043R: '+m)}
const num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b
const fields=(x,k)=>x&&Object.keys(x).sort().join(',')===[...k].sort().join(',')
const kinds=['individual_crash','group_crash','technical_incident','exhaustion'],severities=['minor','moderate','serious']
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,physicalCheckpointVerified:false,incidentAuthorityVerified:false,finishTimeVerified:false,chaseResolved:false})
export function reviewHistoricalInitialLoss({kind,severity,hash,equipmentConditionPercent,mechanicalTimeLossMultiplier}){
 req(kinds.includes(kind)&&severities.includes(severity)&&typeof hash==='string'&&/^[a-f0-9]{32}$/.test(hash)&&num(equipmentConditionPercent,0,100)&&num(mechanicalTimeLossMultiplier,.82,1),'explicit historical loss inputs required')
 const technicalType=kind==='technical_incident'?phase10TechnicalType(md5(hash+'|technical_type'),equipmentConditionPercent):null
 const timeLossRange=phase10TimeLossRange(kind,severity,technicalType)
 const rawTimeLossSeconds=phase10IntegerFromHash(md5(hash+'|time_loss'),...timeLossRange)
 req(rawTimeLossSeconds>=timeLossRange[0]&&rawTimeLossSeconds<=timeLossRange[1],'historical loss draw outside range')
 const timeLossSeconds=kind==='technical_incident'?Math.max(1,Math.round(rawTimeLossSeconds*mechanicalTimeLossMultiplier)):rawTimeLossSeconds
 return {technicalType,timeLossRange,rawTimeLossSeconds,timeLossSeconds,baseEnergyLossPoints:phase10IncidentEnergyLoss(kind,timeLossSeconds)}
}
export function reviewHistoricalCheckpointConsequences({evidence,expectedEvidenceSha256}){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256,'frozen synthetic consequence evidence required')
 req(fields(evidence,['provenance','checkpoint','expectedCheckpointSha256','repairModifiers','stage']),'unexpected consequence fields')
 const {checkpoint,expectedCheckpointSha256,repairModifiers,stage}=evidence
 req(fields(stage,['stageFormat','distanceKm','kmFromStart','flatFinish','summitFinish','sprintZoneKm'])&&stage.stageFormat==='road_race'&&num(stage.distanceKm,1,500)&&num(stage.kmFromStart,0,stage.distanceKm)&&typeof stage.flatFinish==='boolean'&&typeof stage.summitFinish==='boolean'&&(stage.sprintZoneKm===null||num(stage.sprintZoneKm,0,5)),'road stage scope required')
 req(Array.isArray(repairModifiers)&&new Set(repairModifiers.map(r=>r.riderId)).size===repairModifiers.length&&repairModifiers.every(r=>fields(r,['riderId','teamId','mechanicalTimeLossMultiplier'])&&num(r.mechanicalTimeLossMultiplier,.82,1)),'explicit unique repair modifiers required')
 const reviewed=reviewHistoricalCheckpoint({evidence:checkpoint,expectedEvidenceSha256:expectedCheckpointSha256})
 const roster=new Map()
 for(const c of checkpoint.candidates)for(const r of c.riders){const prior=roster.get(r.riderId);req(!prior||(prior.teamId===r.teamId&&prior.equipmentConditionPercent===r.equipmentConditionPercent),'inconsistent checkpoint rider');roster.set(r.riderId,r)}
 req(repairModifiers.length===roster.size&&repairModifiers.every(r=>roster.get(r.riderId)?.teamId===r.teamId),'repair modifier coverage mismatch')
 const selected=reviewed.incident
 if(!selected)return {version:'043R_initial_consequences_v1',evidenceSha256:expectedEvidenceSha256,incident:null,...flags()}
 const candidate=checkpoint.candidates.find(c=>c.entityId===selected.entityId&&c.probabilityInput.incidentKind===selected.kind)
 req(candidate,'selected candidate unavailable')
 const condition=candidate.probabilityInput.equipmentConditionPercent
 const modifier=selected.kind==='technical_incident'?repairModifiers.find(r=>r.riderId===selected.affectedRiderIds[0]).mechanicalTimeLossMultiplier:1
 const loss=reviewHistoricalInitialLoss({kind:selected.kind,severity:selected.severity,hash:selected.hash,equipmentConditionPercent:condition,mechanicalTimeLossMultiplier:modifier})
 const zone=stage.flatFinish&&!stage.summitFinish?(stage.sprintZoneKm??3):0
 const zoneEligible=zone>0&&stage.distanceKm-stage.kmFromStart<=zone+.000001
 const riderConsequences=selected.handoffs.map(h=>{
  const r=roster.get(h.riderId),source={provenance:'synthetic_review_fixture',raceId:checkpoint.raceId,stageId:checkpoint.stageId,runId:checkpoint.runId,riderId:r.riderId,teamId:r.teamId,stageFormat:'road_race',incidentKind:selected.kind,incidentSeverity:selected.severity,deterministicHash:selected.hash,equipmentConditionPercent:r.equipmentConditionPercent}
  const verified=reviewHistoricalPhase10Handoff({evidence:source,expectedEvidenceSha256:carryoverDigest(source)})
  req(carryoverDigest(verified)===carryoverDigest(h),'historical handoff mismatch')
  const moved=verified.statusImpact==='finished'&&loss.timeLossSeconds>5
  return {riderId:r.riderId,teamId:r.teamId,statusImpact:verified.statusImpact,healthOutcome:verified.healthOutcome,energyLossPoints:deterministicRound(loss.baseEnergyLossPoints+verified.healthOutcome.additionalEnergyLossPoints,6),provisionalTimePenaltySeconds:moved?loss.timeLossSeconds:0,movedToLaterGroup:moved,recoveryTargetDisplayCode:moved?(candidate.displayCode??'P'):null,initialGapSeconds:moved?loss.timeLossSeconds:0,actualRejoinKm:null,finalGapSeconds:null,finalTimePenaltySeconds:null,sprintZoneEligible:zoneEligible,sprintZoneProtectionApplied:null}
 })
 return {version:'043R_initial_consequences_v1',evidenceSha256:expectedEvidenceSha256,incident:{incidentId:selected.incidentId,kind:selected.kind,severity:selected.severity,hash:selected.hash,affectedRiderIds:selected.affectedRiderIds,...loss,riderConsequences},...flags()}
}
