// 043S: bounded historical single-incident autonomous chase. No rescues/mergers.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewHistoricalCheckpointConsequences} from './uranius-historical-incident-consequences-review.mjs'
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}
function deterministicRound(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}
function phase10AutonomousChaseSkillScore(
  rider,
  gradientPercent,
) {
  if (gradientPercent >= 2) {
    return (
      rider.climbing * 0.45 +
      rider.endurance * 0.25 +
      rider.resistance * 0.15 +
      rider.teamwork * 0.1 +
      rider.raceIQ * 0.05
    )
  }
  if (gradientPercent <= -2) {
    return (
      rider.resistance * 0.35 +
      rider.raceIQ * 0.25 +
      rider.flat * 0.2 +
      rider.endurance * 0.1 +
      rider.teamwork * 0.1
    )
  }
  return (
    rider.flat * 0.35 +
    rider.endurance * 0.25 +
    rider.resistance * 0.2 +
    rider.teamwork * 0.1 +
    rider.raceIQ * 0.1
  )
}
function phase10PhaseForFraction(fraction) {
  if (fraction <= 0.25) return 1
  if (fraction <= 0.5) return 2
  if (fraction <= 0.7) return 3
  return 4
}
function phase10GradientAtKm(
  stage,
  kmFromStart,
) {
  const points = stage.profilePoints
  if (points.length < 2) return 0
  const km = clamp(kmFromStart, 0, stage.distanceKm)
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1]
    const right = points[index]
    if (km <= right.km + 0.000001) {
      const distance = Math.max(0.001, right.km - left.km)
      return deterministicRound(
        ((right.elevationM - left.elevationM) / (distance * 1000)) * 100,
        6,
      )
    }
  }
  return 0
}
function phase10ReplayGapAtKm(
  timeline,
  displayCode,
  kmFromStart,
) {
  let previous = null
  let next = null
  for (const checkpoint of timeline.checkpoints) {
    const gap = checkpoint.gaps.find((row) => row.displayCode === displayCode)
    if (!gap) continue
    const km = checkpoint.raceProgress.kmFromStart
    if (km <= kmFromStart + 0.000001) previous = { km, gap: gap.gapSeconds }
    if (km >= kmFromStart - 0.000001) {
      next = { km, gap: gap.gapSeconds }
      break
    }
  }
  if (previous && next) {
    if (Math.abs(next.km - previous.km) <= 0.000001) return previous.gap
    const fraction = clamp(
      (kmFromStart - previous.km) / Math.max(0.000001, next.km - previous.km),
      0,
      1,
    )
    return deterministicRound(
      previous.gap + (next.gap - previous.gap) * fraction,
      6,
    )
  }
  return previous?.gap ?? next?.gap ?? null
}
function phase10ReplayRiderEnergyAtKm(
  timeline,
  riderId,
  kmFromStart,
) {
  let previous = null
  let next = null
  for (const checkpoint of timeline.checkpoints) {
    const state = checkpoint.riderStates.find((row) => row.riderId === riderId)
    if (!state) continue
    const km = checkpoint.raceProgress.kmFromStart
    if (km <= kmFromStart + 0.000001) previous = { km, energy: state.energy }
    if (km >= kmFromStart - 0.000001) {
      next = { km, energy: state.energy }
      break
    }
  }
  if (previous && next) {
    if (Math.abs(next.km - previous.km) <= 0.000001) return previous.energy
    const fraction = clamp(
      (kmFromStart - previous.km) / Math.max(0.000001, next.km - previous.km),
      0,
      1,
    )
    return deterministicRound(
      Math.max(0, previous.energy + (next.energy - previous.energy) * fraction),
      6,
    )
  }
  return deterministicRound(Math.max(0, previous?.energy ?? next?.energy ?? 0), 6)
}
function phase10AutonomousGroupClosureSecondsPerKm({
  input,
  baseReplayTimeline,
  riderReadiness,
  group,
  fromKm,
  toKm,
  flatSprintFinish,
}) {
  const distanceKm = Math.max(0.000001, toKm - fromKm)
  const midKm = (fromKm + toKm) / 2
  const phase = phase10PhaseForFraction(
    midKm / Math.max(0.000001, input.stage.distanceKm),
  )
  const gradient = phase10GradientAtKm(input.stage, midKm)
  const riderById = new Map(input.riders.map((row) => [row.riderId, row]))
  const readinessById = new Map(riderReadiness.map((row) => [row.riderId, row]))
  const memberRows = group.members
    .map((member) => riderById.get(member.riderId))
    .filter((row) => Boolean(row))
  const groupSize = Math.max(1, memberRows.length)
  const averageSkill =
    memberRows.reduce(
      (sum, rider) => sum + phase10AutonomousChaseSkillScore(rider, gradient),
      0,
    ) / groupSize
  const averageBaseEnergy =
    group.members.reduce(
      (sum, member) =>
        sum + phase10ReplayRiderEnergyAtKm(baseReplayTimeline, member.riderId, midKm),
      0,
    ) / groupSize
  const averageStartEnergy =
    group.members.reduce(
      (sum, member) =>
        sum + (readinessById.get(member.riderId)?.fatigueBalance.startEnergy ?? 100),
      0,
    ) / groupSize
  const averageEnergyFraction = clamp(
    averageBaseEnergy / Math.max(1, averageStartEnergy),
    0,
    1.2,
  )
  const averageStartFatigue =
    memberRows.reduce((sum, rider) => sum + rider.fatigueBeforeStage, 0) / groupSize
  const targetGapStart =
    phase10ReplayGapAtKm(baseReplayTimeline, group.targetDisplayCode, fromKm) ??
    phase10ReplayGapAtKm(baseReplayTimeline, 'P', fromKm) ??
    0
  const targetGapEnd =
    phase10ReplayGapAtKm(baseReplayTimeline, group.targetDisplayCode, toKm) ??
    phase10ReplayGapAtKm(baseReplayTimeline, 'P', toKm) ??
    targetGapStart
  const targetClosureSecondsPerKm = deterministicRound(
    (targetGapStart - targetGapEnd) / distanceKm,
    6,
  )

  const phaseBaseClosure = {
    1: 4.8,
    2: 3.2,
    3: 0.4,
    4: -1.2,
  }
  const draftingBonus = Math.min(3.6, Math.log2(groupSize) * 1.8)
  const skillAdjustment = clamp((averageSkill - 60) * 0.065, -2.4, 2.6)
  const energyAdjustment = clamp((averageEnergyFraction - 0.55) * 4, -1.6, 1.2)
  const fatiguePenalty = clamp((averageStartFatigue - 30) * 0.018, 0, 1.1)
  const targetPressurePenalty =
    Math.max(0, targetClosureSecondsPerKm) * 0.9 -
    Math.min(0, targetClosureSecondsPerKm) * 0.15
  const progressFraction = midKm / Math.max(0.000001, input.stage.distanceKm)
  const targetIsPeloton = group.targetDisplayCode === 'P'
  const hardPhase4Peloton =
    targetIsPeloton && phase === 4 && targetClosureSecondsPerKm > 0.5
  const lateFlatSprint =
    targetIsPeloton &&
    phase === 4 &&
    input.stage.terrainType === 'flat' &&
    flatSprintFinish &&
    progressFraction >= 0.9
  const phase4PressurePenalty = hardPhase4Peloton
    ? groupSize === 1
      ? 2.4
      : 1.2
    : 0
  const sprintPressurePenalty = lateFlatSprint
    ? groupSize === 1
      ? 3.2
      : 2
    : 0

  const closureSecondsPerKm = deterministicRound(
    clamp(
      phaseBaseClosure[phase] +
        draftingBonus +
        skillAdjustment +
        energyAdjustment -
        fatiguePenalty -
        targetPressurePenalty -
        phase4PressurePenalty -
        sprintPressurePenalty,
      -8,
      8,
    ),
    6,
  )
  const draftingCostMultiplier = clamp(1 - Math.min(0.42, (groupSize - 1) * 0.09), 0.58, 1)
  const chaseEnergyCostPerKm = deterministicRound(
    clamp(
      (0.09 +
        phase * 0.015 +
        Math.max(0, targetClosureSecondsPerKm) * 0.018 +
        (hardPhase4Peloton ? 0.04 : 0) +
        (lateFlatSprint ? 0.05 : 0) +
        (groupSize === 1 ? 0.035 : 0)) *
        draftingCostMultiplier,
      0.04,
      0.3,
    ),
    6,
  )
  return { closureSecondsPerKm, chaseEnergyCostPerKm }
}
const req=(x,m)=>{if(!x)throw Error('043S: '+m)}
const fields=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...ks].sort().join(',')
const num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b
const uniq=(a,f)=>Array.isArray(a)&&new Set(a.map(f)).size===a.length
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,physicalCheckpointVerified:false,incidentAuthorityVerified:false,finishTimeVerified:false,completeChaseModelVerified:false})
export function reviewHistoricalClosure(p){
 return phase10AutonomousGroupClosureSecondsPerKm(p)
}
export function reviewHistoricalSingleIncidentChase({evidence,expectedEvidenceSha256}){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256,'frozen synthetic chase evidence required')
 req(fields(evidence,['provenance','consequenceEvidence','expectedConsequenceSha256','riders','profilePoints','terrainType','timeline','teamRescuePolicy','flatSprintFinish']),'unexpected chase evidence fields')
 req(evidence.teamRescuePolicy==='explicit_no_rescue_eligible_fixture','team rescue or multiple incident scope unsupported')
 const c=reviewHistoricalCheckpointConsequences({evidence:evidence.consequenceEvidence,expectedEvidenceSha256:evidence.expectedConsequenceSha256})
 const incident=c.incident,stage=evidence.consequenceEvidence.stage,distanceKm=stage.distanceKm,start=stage.kmFromStart
 const {riders,profilePoints,terrainType,timeline,flatSprintFinish}=evidence
 req(['flat','hilly','mountain','cobbled'].includes(terrainType)&&typeof flatSprintFinish==='boolean'&&flatSprintFinish===stage.flatFinish,'stage terrain or finish mismatch')
 req(Array.isArray(profilePoints)&&profilePoints.length>=2&&profilePoints[0].km===0&&profilePoints.at(-1).km===distanceKm&&profilePoints.every((p,i)=>fields(p,['km','elevationM'])&&num(p.km,0,distanceKm)&&num(p.elevationM,-500,9000)&&(i===0||p.km>profilePoints[i-1].km)),'complete route profile required')
 const ids=['riderId','teamId','flat','climbing','endurance','resistance','teamwork','raceIQ','fatigueBeforeStage','startEnergy']
 req(uniq(riders,r=>r.riderId)&&riders.every(r=>fields(r,ids)&&ids.slice(2).every(k=>num(r[k],0,100))),'explicit frozen chase rider attributes required')
 const roster=new Map(riders.map(r=>[r.riderId,r])),cp=evidence.consequenceEvidence.checkpoint
 const expectedRoster=new Map(cp.candidates.flatMap(x=>x.riders).map(r=>[r.riderId,r.teamId]))
 req(roster.size===expectedRoster.size&&riders.every(r=>expectedRoster.get(r.riderId)===r.teamId),'chase roster mismatch')
 req(Array.isArray(timeline)&&timeline.length>=2&&timeline[0].km===0&&timeline.at(-1).km===distanceKm,'complete base timeline required')
 for(let i=0;i<timeline.length;i++){
  const t=timeline[i]
  req(fields(t,['km','gaps','energies'])&&num(t.km,0,distanceKm)&&(i===0||t.km>timeline[i-1].km)&&uniq(t.gaps,g=>g.displayCode)&&t.gaps.some(g=>g.displayCode==='P')&&t.gaps.every(g=>fields(g,['displayCode','gapSeconds'])&&typeof g.displayCode==='string'&&num(g.gapSeconds,-86400,86400))&&uniq(t.energies,r=>r.riderId)&&t.energies.length===roster.size&&t.energies.every(r=>fields(r,['riderId','energy'])&&roster.has(r.riderId)&&num(r.energy,0,100)),'invalid base checkpoint coverage')
 }
 const baseReplayTimeline={checkpoints:timeline.map(t=>({raceProgress:{kmFromStart:t.km},gaps:t.gaps,riderStates:t.energies}))}
 const input={stage:{distanceKm,terrainType,profilePoints},riders},riderReadiness=riders.map(r=>({riderId:r.riderId,fatigueBalance:{startEnergy:r.startEnergy}}))
 if(!incident)return {version:'043S_single_incident_chase_v1',evidenceSha256:expectedEvidenceSha256,incident:null,episodes:[],...flags()}
 const moving=incident.riderConsequences.filter(r=>r.movedToLaterGroup&&r.statusImpact==='finished')
 if(!moving.length)return {version:'043S_single_incident_chase_v1',evidenceSha256:expectedEvidenceSha256,incident,episodes:[],...flags()}
 let target=moving[0].recoveryTargetDisplayCode??'P'
 req(moving.every(r=>r.recoveryTargetDisplayCode===target),'multiple targets unsupported')
 if(target!=='P'&&phase10ReplayGapAtKm(baseReplayTimeline,target,start)===null)target='P'
 const group={targetDisplayCode:target,gapToTargetSeconds:incident.timeLossSeconds,members:moving.map(r=>({riderId:r.riderId}))}
 const episodes=moving.map(r=>({riderId:r.riderId,teamId:r.teamId,activationKm:start,actualRejoinKm:null,finalGapToTargetSeconds:incident.timeLossSeconds,chaseEnergyCostPoints:0,samples:[]}))
 const append=km=>episodes.forEach(e=>e.samples.push({kmFromStart:deterministicRound(km,6),gapToTargetSeconds:deterministicRound(group.gapToTargetSeconds,6),targetDisplayCode:group.targetDisplayCode,cumulativeChaseEnergyCostPoints:e.chaseEnergyCostPoints}))
 append(start)
 const points=new Set([distanceKm]);for(let km=Math.ceil(start/.5)*.5;km<=distanceKm+.000001;km+=.5)if(km>start+.000001)points.add(deterministicRound(Math.min(km,distanceKm),6))
 let currentKm=start
 for(const nextKm of [...points].sort((a,b)=>a-b)){
  if(nextKm<=currentKm+.000001)continue
  const intervalDistance=nextKm-currentKm
  if(group.targetDisplayCode!=='P'&&phase10ReplayGapAtKm(baseReplayTimeline,group.targetDisplayCode,nextKm)===null){
   const peloton=phase10ReplayGapAtKm(baseReplayTimeline,'P',currentKm)??0
   group.gapToTargetSeconds=deterministicRound((phase10ReplayGapAtKm(baseReplayTimeline,group.targetDisplayCode,currentKm)??peloton)+group.gapToTargetSeconds-peloton,6)
   group.targetDisplayCode='P'
  }
  const previousGap=group.gapToTargetSeconds,{closureSecondsPerKm,chaseEnergyCostPerKm}=phase10AutonomousGroupClosureSecondsPerKm({input,baseReplayTimeline,riderReadiness,group,fromKm:currentKm,toKm:nextKm,flatSprintFinish})
  const projectedGap=deterministicRound(previousGap-closureSecondsPerKm*intervalDistance,6)
  let fraction=1,rejoin=null
  if(previousGap>5+.000001&&projectedGap<=5+.000001){
   const denominator=previousGap-projectedGap
   fraction=clamp(denominator<=0?1:(previousGap-5)/denominator,0,1)
   rejoin=deterministicRound(currentKm+intervalDistance*fraction,6);group.gapToTargetSeconds=5
  }else group.gapToTargetSeconds=projectedGap
  for(const episode of episodes){
   const skill=phase10AutonomousChaseSkillScore(roster.get(episode.riderId),phase10GradientAtKm(input.stage,(currentKm+nextKm)/2))
   const multiplier=clamp(1+(60-skill)*.004,.85,1.18)
   episode.chaseEnergyCostPoints=deterministicRound(episode.chaseEnergyCostPoints+intervalDistance*fraction*chaseEnergyCostPerKm*multiplier,6)
   episode.finalGapToTargetSeconds=Math.max(0,deterministicRound(group.gapToTargetSeconds,6))
  }
  append(rejoin??nextKm)
  if(rejoin!==null){for(const e of episodes){e.actualRejoinKm=rejoin;e.finalGapToTargetSeconds=0}break}
  currentKm=nextKm
 }
 const consequences=incident.riderConsequences.map(r=>{
  const e=episodes.find(e=>e.riderId===r.riderId)
  return e?{...r,actualRejoinKm:e.actualRejoinKm,finalGapSeconds:e.finalGapToTargetSeconds,finalTimePenaltySeconds:e.actualRejoinKm!==null?0:Math.max(0,Math.round(e.finalGapToTargetSeconds)),chaseEnergyCostPoints:e.chaseEnergyCostPoints,temporarySeparation:e.actualRejoinKm!==null,sprintZoneProtectionApplied:null}:r
 })
 return {version:'043S_single_incident_chase_v1',evidenceSha256:expectedEvidenceSha256,incident:{...incident,riderConsequences:consequences},episodes,...flags()}
}
