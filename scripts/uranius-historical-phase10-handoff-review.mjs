// 043O: historical pinned Phase10 post-incident health handoff, offline only.
// Separate from disabled 043L/M candidate mapping. Does not generate incidents.
// Adapted from original runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886.
import {createHash} from 'node:crypto'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
const md5Hex=value=>createHash('md5').update(value,'utf8').digest('hex')
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
function phase10CrashHealthOutcome(
  incidentKind,
  crashSeverity,
  deterministicHash,
  riderId,
) {
  const noInjury = (roll) => ({
    injuryOccurred: false,
    caseCode: null,
    severity: null,
    bodyPart: null,
    currentStageContinuation: 'unaffected',
    selectionBlockedAfterStage: false,
    currentStagePerformancePenaltyPoints: 0,
    additionalEnergyLossPoints: 0,
    deterministicRoll: roll,
    persistentAction: 'none',
    source: 'universal_phase10_crash_health_handoff_v1',
  })
  if (incidentKind === 'technical_incident' || incidentKind === 'exhaustion') {
    return noInjury(phase10DeterministicRoll(md5Hex(`${deterministicHash}:health:${riderId}`)))
  }

  const injuryRoll = phase10DeterministicRoll(
    md5Hex(`${deterministicHash}:health:${riderId}:injury`),
  )
  const injuryProbability =
    crashSeverity === 'minor'
      ? 0.12
      : crashSeverity === 'moderate'
        ? 0.3
        : 0.75
  if (injuryRoll >= injuryProbability) return noInjury(injuryRoll)

  const severityRoll = phase10DeterministicRoll(
    md5Hex(`${deterministicHash}:health:${riderId}:severity`),
  )
  let healthSeverity
  if (crashSeverity === 'serious' && incidentKind === 'individual_crash') {
    healthSeverity =
      severityRoll < 0.7
        ? 'major'
        : severityRoll < 0.95
          ? 'moderate'
          : 'minor'
  } else if (crashSeverity === 'serious') {
    healthSeverity =
      severityRoll < 0.3
        ? 'major'
        : severityRoll < 0.75
          ? 'moderate'
          : 'minor'
  } else if (crashSeverity === 'moderate') {
    healthSeverity =
      severityRoll < 0.02
        ? 'major'
        : severityRoll < 0.37
          ? 'moderate'
          : 'minor'
  } else {
    // Minor crashes should overwhelmingly be transient race incidents.
    healthSeverity = severityRoll < 0.05 ? 'moderate' : 'minor'
  }

  const caseRoll = phase10DeterministicRoll(
    md5Hex(`${deterministicHash}:health:${riderId}:case`),
  )
  let caseCode
  let bodyPart
  if (healthSeverity === 'major') {
    if (caseRoll < 0.72) {
      caseCode = 'fracture'
      const parts = ['collarbone', 'wrist', 'ribs', 'hip']
      bodyPart = parts[phase10IntegerFromHash(
        md5Hex(`${deterministicHash}:health:${riderId}:body`),
        0,
        parts.length - 1,
      )]
    } else {
      caseCode = 'concussion'
      bodyPart = 'head'
    }
  } else if (healthSeverity === 'moderate') {
    const choices = ['wrist_sprain', 'ankle_sprain', 'muscle_strain']
    caseCode = choices[phase10IntegerFromHash(
      md5Hex(`${deterministicHash}:health:${riderId}:case-moderate`),
      0,
      choices.length - 1,
    )]
    bodyPart =
      caseCode === 'wrist_sprain'
        ? 'wrist'
        : caseCode === 'ankle_sprain'
          ? 'ankle'
          : ['thigh', 'shoulder', 'lower back'][phase10IntegerFromHash(
              md5Hex(`${deterministicHash}:health:${riderId}:body-moderate`),
              0,
              2,
            )]
  } else {
    caseCode = caseRoll < 0.8 ? 'road_rash' : 'muscle_strain'
    bodyPart =
      caseCode === 'road_rash'
        ? ['elbow', 'hip', 'knee', 'shoulder'][phase10IntegerFromHash(
            md5Hex(`${deterministicHash}:health:${riderId}:body-minor`),
            0,
            3,
          )]
        : ['thigh', 'shoulder'][phase10IntegerFromHash(
            md5Hex(`${deterministicHash}:health:${riderId}:body-minor-strain`),
            0,
            1,
          )]
  }

  const major = healthSeverity === 'major'
  return {
    injuryOccurred: true,
    caseCode,
    severity: healthSeverity,
    bodyPart,
    currentStageContinuation: major ? 'dnf' : 'continues_injured',
    selectionBlockedAfterStage: major,
    currentStagePerformancePenaltyPoints:
      healthSeverity === 'minor' ? 2.5 : healthSeverity === 'moderate' ? 8 : 100,
    additionalEnergyLossPoints:
      healthSeverity === 'minor' ? 0.75 : healthSeverity === 'moderate' ? 2.5 : 0,
    deterministicRoll: injuryRoll,
    persistentAction: 'create_health_case_after_finalization',
    source: 'universal_phase10_crash_health_handoff_v1',
  }
}
const req=(x,m)=>{if(!x)throw Error('043O: '+m)}
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
export function reviewHistoricalPhase10Handoff({evidence,expectedEvidenceSha256}){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256,'explicit frozen synthetic incident required')
 req(Object.keys(evidence).sort().join(',')==='deterministicHash,equipmentConditionPercent,incidentKind,incidentSeverity,provenance,raceId,riderId,runId,stageFormat,stageId,teamId','unexpected incident evidence')
 const {incidentKind,incidentSeverity,deterministicHash,riderId,teamId,raceId,stageId,runId,stageFormat,equipmentConditionPercent}=evidence
 req([riderId,teamId,raceId,stageId,runId].every(uuid)&&typeof deterministicHash==='string'&&/^[a-f0-9]{32}$/.test(deterministicHash),'incident identity or hash')
 req(['individual_crash','group_crash','technical_incident','exhaustion'].includes(incidentKind)&&['minor','moderate','serious'].includes(incidentSeverity)&&stageFormat==='road_race','unsupported historical incident or format')
 req(typeof equipmentConditionPercent==='number'&&Number.isFinite(equipmentConditionPercent)&&equipmentConditionPercent>=0&&equipmentConditionPercent<=100,'equipment condition required')
 const healthOutcome=phase10CrashHealthOutcome(incidentKind,incidentSeverity,deterministicHash,riderId)
 // Preserve source rounding/index behavior but refuse an undefined selected part.
 req(!healthOutcome.injuryOccurred||(typeof healthOutcome.caseCode==='string'&&typeof healthOutcome.bodyPart==='string'),'historical hash selection out of bounds')
 const healthDnf=healthOutcome.currentStageContinuation==='dnf'
 const mechanicalDnf=incidentKind==='technical_incident'&&incidentSeverity==='serious'&&equipmentConditionPercent<25&&phase10DeterministicRoll(md5Hex(deterministicHash+':irreparable-mechanical:'+riderId))<.3
 const statusImpact=healthDnf||mechanicalDnf||incidentKind==='exhaustion'?'dnf':'finished'
 return {version:'043O_historical_phase10_handoff_v1',evidenceSha256:expectedEvidenceSha256,raceId,stageId,runId,riderId,teamId,healthOutcome,healthDnf,mechanicalDnf,statusImpact,incidentGenerated:false,incidentAuthorityVerified:false,disabledCandidateMappingApplied:false,healthCaseCreated:false,runtimeAllowed:false,official:false,hostedWriteAllowed:false,accountingAllowed:false}
}
