// 043T bounded historical multi-incident chase and team rescue. Original pinned blob 39e35c6ed69563ce82cb663d6c3f9088c61df886.
// Original functions below are TS-to-JS transcriptions; adapter validates synthetic inputs separately.
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

const PHASE10_AUTONOMOUS_CHASE_STEP_KM=.5,PHASE5_GROUP_MERGE_TOLERANCE_SECONDS=5
const getPreStageGeneralStandings=input=>input.preStageGeneralStandings

function phase10EpisodeKey(incidentId, riderId) {
  return `${incidentId}|${riderId}`
}
function phase10AppendAutonomousEpisodeSample(
  episode,
  group,
  kmFromStart,
) {
  const previous = episode.samples.at(-1)
  const sample = {
    kmFromStart: deterministicRound(kmFromStart, 6),
    gapToTargetSeconds: deterministicRound(group.gapToTargetSeconds, 6),
    displayCode: group.displayCode,
    targetDisplayCode: group.targetDisplayCode,
    groupRiderIds: group.members.map((row) => row.riderId).sort(),
    cumulativeChaseEnergyCostPoints: deterministicRound(
      episode.chaseEnergyCostPoints,
      6,
    ),
  }
  if (
    previous &&
    Math.abs(previous.kmFromStart - sample.kmFromStart) <= 0.000001 &&
    previous.displayCode === sample.displayCode &&
    previous.targetDisplayCode === sample.targetDisplayCode
  ) {
    episode.samples[episode.samples.length - 1] = sample
  } else {
    episode.samples.push(sample)
  }
}
function phase10ReplayRiderStateAtKm(
  timeline,
  riderId,
  kmFromStart,
) {
  let selected = null
  for (const checkpoint of timeline.checkpoints) {
    if (checkpoint.raceProgress.kmFromStart > kmFromStart + 0.000001) break
    selected =
      checkpoint.riderStates.find((row) => row.riderId === riderId) ?? selected
  }
  return selected
}
function phase10TeamRescuePickupKm(
  incident,
  gradientPercent,
  stageDistanceKm,
) {
  const elapsedHours = Math.max(1 / 60, incident.raceSecond / 3600)
  const averageRoadSpeedKmh = clamp(incident.kmFromStart / elapsedHours, 22, 58)
  const waitingSpeedFraction = gradientPercent >= 4 ? 0.45 : 0.25
  const helperWaitingSpeedKmh = averageRoadSpeedKmh * waitingSpeedFraction
  const relativeSpeedKmh = Math.max(6, averageRoadSpeedKmh - helperWaitingSpeedKmh)
  const separationDistanceKm =
    (averageRoadSpeedKmh * Math.max(0, incident.timeLossSeconds)) / 3600
  const pickupHours = separationDistanceKm / relativeSpeedKmh
  const targetTravelKm = averageRoadSpeedKmh * pickupHours
  return deterministicRound(
    clamp(incident.kmFromStart + targetTravelKm, incident.kmFromStart + 0.05, stageDistanceKm),
    6,
  )
}
function phase10BuildAutonomousIncidentChase({
  input,
  riderReadiness,
  baseReplayTimeline,
  baseFinishResolution,
  incidents,
}) {
  if (input.stage.stageFormat !== 'road_race' || incidents.length === 0) {
    const summary = {
      active: input.stage.stageFormat === 'road_race',
      modelVersion: 'autonomous_incident_team_rescue_v2',
      simulationStepKm: PHASE10_AUTONOMOUS_CHASE_STEP_KM,
      mergeToleranceSeconds: PHASE5_GROUP_MERGE_TOLERANCE_SECONDS,
      riderEpisodeCount: 0,
      rejoinedEpisodeCount: 0,
      nonRejoinedEpisodeCount: 0,
      groupMergeCount: 0,
      groupMergeKms: [],
      exactRejoinKms: [],
      totalChaseEnergyCostPoints: 0,
      teamRescueEventCount: 0,
      teamRescueHelperCount: 0,
      teamRescueHelpers: [],
    }
    return {
      active: summary.active,
      episodes: [],
      episodeByKey: new Map(),
      mergeEvents: [],
      teamRescueEvents: [],
      summary,
    }
  }

  const episodeByKey = new Map()
  const activeGroups = []
  const mergeEvents = []
  const teamRescueEvents = []
  const riderById = new Map(input.riders.map((row) => [row.riderId, row]))
  const planByRiderId = new Map(
    input.stagePlans.flatMap((teamPlan) =>
      teamPlan.riders.map((riderPlan) => [riderPlan.riderId, riderPlan]),
    ),
  )
  const gcRankByRiderId = new Map(
    getPreStageGeneralStandings(input).map((row) => [row.riderId, row.rank]),
  )
  const incidentIndexById = new Map(
    incidents.map((incident, index) => [incident.incidentId, index]),
  )
  const incidentsByKm = new Map()
  incidents.forEach((incident) => {
    const key = incident.kmFromStart.toFixed(6)
    const bucket = incidentsByKm.get(key) ?? []
    bucket.push(incident)
    incidentsByKm.set(key, bucket)
  })

  const reservedRescueHelperIds = new Set()
  const plannedTeamRescues = []
  incidents
    .slice()
    .sort((a, b) => a.kmFromStart - b.kmFromStart || a.incidentId.localeCompare(b.incidentId))
    .forEach((incident) => {
      if (incident.sourceDisplayCode === null || incident.sourceDisplayCode.startsWith('C')) return
      const protectedRows = incident.riderConsequences.filter(
        (row) => row.movedToLaterGroup && row.statusImpact === 'finished',
      )
      protectedRows.forEach((protectedRow) => {
        const targetPlan = planByRiderId.get(protectedRow.riderId)
        const gcRank = gcRankByRiderId.get(protectedRow.riderId) ?? null
        const priority =
          gcRank === 1
            ? 'race_leader'
            : gcRank !== null && gcRank <= 10 &&
                (targetPlan?.stageRole === 'team_leader_gc' || targetPlan?.stageRole === 'protected_rider')
              ? 'gc_top10'
              : targetPlan?.stageRole === 'team_leader_gc'
                ? 'team_leader'
                : null
        if (priority === null) return
        const phase = phase10PhaseForFraction(incident.progressFraction)
        const gradient = phase10GradientAtKm(input.stage, incident.kmFromStart)
        const steepClimb = gradient >= 4
        const sourceDisplayCode = incident.sourceDisplayCode ?? 'P'
        const helperIds = input.riders
          .filter((rider) => rider.teamId === protectedRow.teamId && rider.riderId !== protectedRow.riderId)
          .filter((rider) => !reservedRescueHelperIds.has(rider.riderId))
          .filter((rider) => {
            const state = phase10ReplayRiderStateAtKm(baseReplayTimeline, rider.riderId, incident.kmFromStart)
            if (!state || state.status !== 'racing' || state.displayCode !== sourceDisplayCode) return false
            if (incidents.some((other) =>
              other.kmFromStart <= incident.kmFromStart + 0.000001 &&
              other.riderIds.includes(rider.riderId) &&
              other.riderConsequences.some((row) => row.riderId === rider.riderId && row.statusImpact === 'dnf'),
            )) return false
            const plan = planByRiderId.get(rider.riderId)
            if (!plan) return false
            const command = plan.commands[`phase${phase}`]
            const explicitProtect = command === 'protect_leader'
            if (steepClimb) return explicitProtect
            if (priority === 'race_leader') {
              return explicitProtect || plan.stageRole === 'free_role'
            }
            return explicitProtect
          })
          .map((rider) => rider.riderId)
          .sort()
        if (helperIds.length === 0) return
        helperIds.forEach((id) => reservedRescueHelperIds.add(id))
        const pickupKm = phase10TeamRescuePickupKm(incident, gradient, input.stage.distanceKm)
        if (pickupKm >= input.stage.distanceKm - 0.000001) return
        plannedTeamRescues.push({
          eventId: `phase10-team-rescue:${plannedTeamRescues.length + 1}`,
          incidentId: incident.incidentId,
          teamId: protectedRow.teamId,
          protectedRiderId: protectedRow.riderId,
          helperRiderIds: helperIds,
          pickupKm,
        })
      })
    })
  const plannedRescuesByKm = new Map()
  plannedTeamRescues.forEach((event) => {
    const key = event.pickupKm.toFixed(6)
    plannedRescuesByKm.set(key, [...(plannedRescuesByKm.get(key) ?? []), event])
  })

  const appendAllGroupSamples = (group, km) => {
    group.members.forEach((member) => {
      const episode = episodeByKey.get(member.episodeKey)
      if (episode) phase10AppendAutonomousEpisodeSample(episode, group, km)
    })
  }

  const removeMemberFromActiveGroup = (riderId) => {
    for (let index = activeGroups.length - 1; index >= 0; index -= 1) {
      const group = activeGroups[index]
      const memberIndex = group.members.findIndex((row) => row.riderId === riderId)
      if (memberIndex < 0) continue
      const pelotonGap = phase10ReplayGapAtKm(baseReplayTimeline, 'P', currentKm) ?? 0
      const targetGap =
        phase10ReplayGapAtKm(baseReplayTimeline, group.targetDisplayCode, currentKm) ??
        pelotonGap
      const absoluteGap = targetGap + group.gapToTargetSeconds
      const gapToPeloton = deterministicRound(absoluteGap - pelotonGap, 6)
      group.members.splice(memberIndex, 1)
      if (group.members.length === 0) activeGroups.splice(index, 1)
      else appendAllGroupSamples(group, currentKm)
      return gapToPeloton
    }
    return null
  }


  const mergeIncidentGroupsAtCurrentKm = () => {
    // Incident groups that physically meet within the existing five-second
    // tolerance become one autonomous chase group and share drafting/cooperation.
    let merged = true
    while (merged) {
      merged = false
      const candidates = activeGroups
        .slice()
        .sort(
          (left, right) =>
            left.targetDisplayCode.localeCompare(right.targetDisplayCode) ||
            left.gapToTargetSeconds - right.gapToTargetSeconds ||
            left.createdOrder - right.createdOrder,
        )
      for (let index = 0; index < candidates.length - 1; index += 1) {
        const left = candidates[index]
        const right = candidates[index + 1]
        if (left.targetDisplayCode !== right.targetDisplayCode) continue
        if (
          Math.abs(left.gapToTargetSeconds - right.gapToTargetSeconds) >
          PHASE5_GROUP_MERGE_TOLERANCE_SECONDS + 0.000001
        ) {
          continue
        }
        const keep = left.createdOrder <= right.createdOrder ? left : right
        const absorb = keep === left ? right : left
        const combinedMembers = [...keep.members, ...absorb.members]
        const weightedGap =
          (keep.gapToTargetSeconds * keep.members.length +
            absorb.gapToTargetSeconds * absorb.members.length) /
          Math.max(1, combinedMembers.length)
        keep.members = combinedMembers
        keep.gapToTargetSeconds = deterministicRound(weightedGap, 6)
        const absorbIndex = activeGroups.indexOf(absorb)
        if (absorbIndex >= 0) activeGroups.splice(absorbIndex, 1)
        appendAllGroupSamples(keep, currentKm)
        const riderIds = keep.members.map((row) => row.riderId).sort()
        mergeEvents.push({
          eventId: `phase10-autonomous-merge:${mergeEvents.length + 1}`,
          kmFromStart: currentKm,
          displayCode: keep.displayCode,
          targetDisplayCode: keep.targetDisplayCode,
          riderIds,
          teamIds: Array.from(
            new Set(
              riderIds
                .map((riderId) => riderById.get(riderId)?.teamId)
                .filter((teamId) => Boolean(teamId)),
            ),
          ).sort(),
        })
        merged = true
        break
      }
    }
  }

  let currentKm = Math.min(
    ...incidents.map((incident) => incident.kmFromStart),
  )

  const processIncidentsAtCurrentKm = () => {
    const rows = incidentsByKm.get(currentKm.toFixed(6)) ?? []
    rows.forEach((incident) => {
      const movingConsequences = incident.riderConsequences.filter(
        (row) => row.movedToLaterGroup && row.statusImpact === 'finished',
      )
      if (movingConsequences.length === 0) return
      const incidentIndex = (incidentIndexById.get(incident.incidentId) ?? 0) + 1
      const existingGaps = movingConsequences.map(
        (row) => removeMemberFromActiveGroup(row.riderId) ?? 0,
      )
      let targetDisplayCode = incident.sourceDisplayCode ?? 'P'
      if (
        targetDisplayCode !== 'P' &&
        phase10ReplayGapAtKm(baseReplayTimeline, targetDisplayCode, currentKm) === null
      ) {
        targetDisplayCode = 'P'
      }
      const initialGap = deterministicRound(
        Math.max(incident.timeLossSeconds, ...existingGaps.map((gap) => gap + incident.timeLossSeconds)),
        6,
      )
      const group = {
        createdOrder: incidentIndex,
        displayCode: `I${incidentIndex}`,
        targetDisplayCode,
        gapToTargetSeconds: initialGap,
        members: [],
      }
      movingConsequences.forEach((row) => {
        const episodeKey = phase10EpisodeKey(incident.incidentId, row.riderId)
        const episode = {
          episodeKey,
          incidentId: incident.incidentId,
          riderId: row.riderId,
          teamId: row.teamId,
          incidentKm: incident.kmFromStart,
          activationKm: incident.kmFromStart,
          episodeKind: 'incident_rider',
          protectedRiderId: null,
          samples: [],
          actualRejoinKm: null,
          finalGapToTargetSeconds: initialGap,
          chaseEnergyCostPoints: 0,
        }
        episodeByKey.set(episodeKey, episode)
        group.members.push({ episodeKey, riderId: row.riderId })
      })
      activeGroups.push(group)
      appendAllGroupSamples(group, currentKm)
    })
  }

  const processTeamRescuesAtCurrentKm = () => {
    const events = plannedRescuesByKm.get(currentKm.toFixed(6)) ?? []
    events.forEach((event) => {
      const targetGroup = activeGroups.find((group) =>
        group.members.some((member) => member.riderId === event.protectedRiderId),
      )
      if (!targetGroup) return
      const activeRiderIds = new Set(
        activeGroups.flatMap((group) => group.members.map((member) => member.riderId)),
      )
      const attachedHelpers = event.helperRiderIds.filter((helperRiderId) => !activeRiderIds.has(helperRiderId))
      if (attachedHelpers.length === 0) return
      attachedHelpers.forEach((helperRiderId) => {
        const rider = riderById.get(helperRiderId)
        if (!rider) return
        const episodeKey = phase10EpisodeKey(event.incidentId, helperRiderId)
        const episode = {
          episodeKey,
          incidentId: event.incidentId,
          riderId: helperRiderId,
          teamId: rider.teamId,
          incidentKm: event.pickupKm,
          activationKm: event.pickupKm,
          episodeKind: 'team_rescue_helper',
          protectedRiderId: event.protectedRiderId,
          samples: [],
          actualRejoinKm: null,
          finalGapToTargetSeconds: targetGroup.gapToTargetSeconds,
          chaseEnergyCostPoints: 0,
        }
        episodeByKey.set(episodeKey, episode)
        targetGroup.members.push({ episodeKey, riderId: helperRiderId })
      })
      appendAllGroupSamples(targetGroup, currentKm)
      teamRescueEvents.push({ ...event, helperRiderIds: attachedHelpers })
    })
  }

  processIncidentsAtCurrentKm()
  processTeamRescuesAtCurrentKm()
  mergeIncidentGroupsAtCurrentKm()

  const pointSet = new Set()
  const firstGridPoint = Math.ceil(currentKm / PHASE10_AUTONOMOUS_CHASE_STEP_KM) * PHASE10_AUTONOMOUS_CHASE_STEP_KM
  for (
    let km = firstGridPoint;
    km <= input.stage.distanceKm + 0.000001;
    km += PHASE10_AUTONOMOUS_CHASE_STEP_KM
  ) {
    if (km > currentKm + 0.000001) pointSet.add(deterministicRound(Math.min(km, input.stage.distanceKm), 6))
  }
  incidents.forEach((incident) => {
    if (incident.kmFromStart > currentKm + 0.000001) pointSet.add(incident.kmFromStart)
  })
  plannedTeamRescues.forEach((event) => {
    if (event.pickupKm > currentKm + 0.000001) pointSet.add(event.pickupKm)
  })
  pointSet.add(input.stage.distanceKm)
  const points = [...pointSet].sort((a, b) => a - b)
  const flatSprintFinish = baseFinishResolution.finishMode === 'flat_sprint'

  for (const nextKmRaw of points) {
    const nextKm = deterministicRound(nextKmRaw, 6)
    if (nextKm <= currentKm + 0.000001) continue
    const intervalDistance = nextKm - currentKm

    for (let groupIndex = activeGroups.length - 1; groupIndex >= 0; groupIndex -= 1) {
      const group = activeGroups[groupIndex]
      if (
        group.targetDisplayCode !== 'P' &&
        phase10ReplayGapAtKm(baseReplayTimeline, group.targetDisplayCode, nextKm) === null
      ) {
        const pelotonGap = phase10ReplayGapAtKm(baseReplayTimeline, 'P', currentKm) ?? 0
        const targetGap =
          phase10ReplayGapAtKm(baseReplayTimeline, group.targetDisplayCode, currentKm) ??
          pelotonGap
        group.gapToTargetSeconds = deterministicRound(
          targetGap + group.gapToTargetSeconds - pelotonGap,
          6,
        )
        group.targetDisplayCode = 'P'
      }

      const previousGap = group.gapToTargetSeconds
      const { closureSecondsPerKm, chaseEnergyCostPerKm } =
        phase10AutonomousGroupClosureSecondsPerKm({
          input,
          baseReplayTimeline,
          riderReadiness,
          group,
          fromKm: currentKm,
          toKm: nextKm,
          flatSprintFinish,
        })
      const projectedGap = deterministicRound(
        previousGap - closureSecondsPerKm * intervalDistance,
        6,
      )
      let riddenFraction = 1
      let rejoinKm = null
      if (
        previousGap > PHASE5_GROUP_MERGE_TOLERANCE_SECONDS + 0.000001 &&
        projectedGap <= PHASE5_GROUP_MERGE_TOLERANCE_SECONDS + 0.000001
      ) {
        const denominator = previousGap - projectedGap
        riddenFraction = clamp(
          denominator <= 0
            ? 1
            : (previousGap - PHASE5_GROUP_MERGE_TOLERANCE_SECONDS) / denominator,
          0,
          1,
        )
        rejoinKm = deterministicRound(
          currentKm + intervalDistance * riddenFraction,
          6,
        )
        group.gapToTargetSeconds = PHASE5_GROUP_MERGE_TOLERANCE_SECONDS
      } else {
        group.gapToTargetSeconds = projectedGap
      }

      const riddenDistance = intervalDistance * riddenFraction
      group.members.forEach((member) => {
        const episode = episodeByKey.get(member.episodeKey)
        const rider = riderById.get(member.riderId)
        if (!episode || !rider) return
        const skill = phase10AutonomousChaseSkillScore(
          rider,
          phase10GradientAtKm(input.stage, (currentKm + nextKm) / 2),
        )
        const riderCostMultiplier = clamp(1 + (60 - skill) * 0.004, 0.85, 1.18)
        episode.chaseEnergyCostPoints = deterministicRound(
          episode.chaseEnergyCostPoints +
            riddenDistance * chaseEnergyCostPerKm * riderCostMultiplier,
          6,
        )
        episode.finalGapToTargetSeconds = Math.max(
          0,
          deterministicRound(group.gapToTargetSeconds, 6),
        )
      })

      if (rejoinKm !== null) {
        appendAllGroupSamples(group, rejoinKm)
        group.members.forEach((member) => {
          const episode = episodeByKey.get(member.episodeKey)
          if (!episode) return
          episode.actualRejoinKm = rejoinKm
          episode.finalGapToTargetSeconds = 0
        })
        activeGroups.splice(groupIndex, 1)
      } else {
        appendAllGroupSamples(group, nextKm)
      }
    }

    currentKm = nextKm

    mergeIncidentGroupsAtCurrentKm()

    processIncidentsAtCurrentKm()
    processTeamRescuesAtCurrentKm()
    mergeIncidentGroupsAtCurrentKm()
  }

  activeGroups.forEach((group) => {
    group.members.forEach((member) => {
      const episode = episodeByKey.get(member.episodeKey)
      if (!episode) return
      episode.finalGapToTargetSeconds = Math.max(
        0,
        deterministicRound(group.gapToTargetSeconds, 6),
      )
    })
  })

  const episodes = [...episodeByKey.values()].sort(
    (left, right) =>
      left.incidentKm - right.incidentKm ||
      left.riderId.localeCompare(right.riderId),
  )
  const exactRejoinKms = episodes
    .map((episode) => episode.actualRejoinKm)
    .filter((km) => km !== null)
    .sort((a, b) => a - b)
  const teamRescueHelpers = episodes
    .filter((episode) => episode.episodeKind === 'team_rescue_helper' && episode.protectedRiderId !== null)
    .map((episode) => ({
      incidentId: episode.incidentId,
      protectedRiderId: episode.protectedRiderId,
      helperRiderId: episode.riderId,
      teamId: episode.teamId,
      pickupKm: episode.activationKm,
      actualRejoinKm: episode.actualRejoinKm,
      finalGapToTargetSeconds: deterministicRound(Math.max(0, episode.finalGapToTargetSeconds), 6),
      chaseEnergyCostPoints: deterministicRound(episode.chaseEnergyCostPoints, 6),
    }))
    .sort((a, b) => a.pickupKm - b.pickupKm || a.helperRiderId.localeCompare(b.helperRiderId))
  const summary = {
    active: true,
    modelVersion: 'autonomous_incident_team_rescue_v2',
    simulationStepKm: PHASE10_AUTONOMOUS_CHASE_STEP_KM,
    mergeToleranceSeconds: PHASE5_GROUP_MERGE_TOLERANCE_SECONDS,
    riderEpisodeCount: episodes.length,
    rejoinedEpisodeCount: episodes.filter((episode) => episode.actualRejoinKm !== null).length,
    nonRejoinedEpisodeCount: episodes.filter((episode) => episode.actualRejoinKm === null).length,
    groupMergeCount: mergeEvents.length,
    groupMergeKms: mergeEvents.map((event) => event.kmFromStart),
    exactRejoinKms,
    totalChaseEnergyCostPoints: deterministicRound(
      episodes.reduce((sum, episode) => sum + episode.chaseEnergyCostPoints, 0),
      6,
    ),
    teamRescueEventCount: teamRescueEvents.length,
    teamRescueHelperCount: teamRescueHelpers.length,
    teamRescueHelpers,
  }
  return {
    active: true,
    episodes,
    episodeByKey,
    mergeEvents,
    teamRescueEvents,
    summary,
  }
}
const req=(x,m)=>{if(!x)throw Error('043T: '+m)}
const fields=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...ks].sort().join(',')
const num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b
const uniq=(a,f)=>Array.isArray(a)&&new Set(a.map(f)).size===a.length
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,physicalCheckpointVerified:false,incidentAuthorityVerified:false,finishTimeVerified:false,completeChaseModelVerified:false})
export function reviewHistoricalRescuePickup(incident,gradient,distanceKm){
 req(fields(incident,['raceSecond','kmFromStart','timeLossSeconds'])&&num(incident.raceSecond,1,43200)&&num(incident.kmFromStart,0,distanceKm)&&num(incident.timeLossSeconds,0,220)&&num(gradient,-100,100)&&num(distanceKm,1,500),'pickup scope')
 return phase10TeamRescuePickupKm(incident,gradient,distanceKm)
}
export function reviewHistoricalTeamRescue({evidence,expectedEvidenceSha256}){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256,'frozen synthetic rescue evidence required')
 req(fields(evidence,['provenance','consequences','riders','plans','gcStandings','profilePoints','terrainType','timeline','flatSprintFinish']),'unexpected rescue fields')
 const {consequences,riders,plans,gcStandings,profilePoints,terrainType,timeline,flatSprintFinish}=evidence
 req(Array.isArray(consequences)&&consequences.length>=1&&consequences.length<=7,'bounded incident list required')
 const first=consequences[0].evidence,base=first.stage,cp0=first.checkpoint,distanceKm=base.distanceKm
 req(['flat','hilly','mountain','cobbled'].includes(terrainType)&&typeof flatSprintFinish==='boolean'&&flatSprintFinish===base.flatFinish,'stage terrain/finish scope')
 req(Array.isArray(profilePoints)&&profilePoints.length>=2&&profilePoints[0].km===0&&profilePoints.at(-1).km===distanceKm&&profilePoints.every((p,i)=>fields(p,['km','elevationM'])&&num(p.km,0,distanceKm)&&num(p.elevationM,-500,9000)&&(i===0||p.km>profilePoints[i-1].km)),'route profile required')
 const keys=['riderId','teamId','flat','climbing','endurance','resistance','teamwork','raceIQ','fatigueBeforeStage','startEnergy']
 req(uniq(riders,r=>r.riderId)&&riders.length>=2&&riders.every(r=>fields(r,keys)&&uuid(r.riderId)&&uuid(r.teamId)&&keys.slice(2).every(k=>num(r[k],0,100))),'complete frozen rider attributes required')
 const roster=new Map(riders.map(r=>[r.riderId,r]))
 req(uniq(plans,r=>r.riderId)&&plans.length===riders.length&&plans.every(p=>fields(p,['riderId','stageRole','commands'])&&roster.has(p.riderId)&&['team_leader_gc','protected_rider','free_role','domestique','sprinter','leadout','breakaway_rider','climber','time_trialist'].includes(p.stageRole)&&fields(p.commands,['phase1','phase2','phase3','phase4'])&&Object.values(p.commands).every(c=>typeof c==='string'&&c.length>0)),'explicit complete frozen plans required')
 req(uniq(gcStandings,r=>r.riderId)&&uniq(gcStandings,r=>r.rank)&&gcStandings.every(r=>fields(r,['riderId','rank'])&&roster.has(r.riderId)&&Number.isSafeInteger(r.rank)&&r.rank>0),'invalid GC standings')
 req(Array.isArray(timeline)&&timeline.length>=2&&timeline[0].km===0&&timeline.at(-1).km===distanceKm,'complete base timeline required')
 for(let i=0;i<timeline.length;i++){
  const t=timeline[i]
  req(fields(t,['km','gaps','states'])&&num(t.km,0,distanceKm)&&(i===0||t.km>timeline[i-1].km)&&uniq(t.gaps,g=>g.displayCode)&&t.gaps.some(g=>g.displayCode==='P')&&t.gaps.every(g=>fields(g,['displayCode','gapSeconds'])&&typeof g.displayCode==='string'&&num(g.gapSeconds,-86400,86400))&&uniq(t.states,r=>r.riderId)&&t.states.length===roster.size&&t.states.every(r=>fields(r,['riderId','energy','status','displayCode'])&&roster.has(r.riderId)&&num(r.energy,0,100)&&['racing','finished','dns','dnf','otl'].includes(r.status)&&typeof r.displayCode==='string'),'invalid base checkpoint coverage')
 }
 const baseReplayTimeline={checkpoints:timeline.map(t=>({raceProgress:{kmFromStart:t.km},gaps:t.gaps,riderStates:t.states}))}
 const input={stage:{stageFormat:'road_race',distanceKm,terrainType,profilePoints},riders,stagePlans:[{riders:plans}],preStageGeneralStandings:gcStandings}
 const riderReadiness=riders.map(r=>({riderId:r.riderId,fatigueBalance:{startEnergy:r.startEnergy}})),incidents=[],affected=new Set()
 for(let i=0;i<consequences.length;i++){
  const c=consequences[i]
  req(fields(c,['evidence','expectedEvidenceSha256']),'invalid consequence wrapper')
  const e=c.evidence,cp=e.checkpoint
  req(cp.raceId===cp0.raceId&&cp.stageId===cp0.stageId&&cp.runId===cp0.runId&&cp.seed===cp0.seed&&cp.priorIncidentCount===i&&e.stage.distanceKm===distanceKm&&e.stage.stageFormat==='road_race'&&e.stage.flatFinish===base.flatFinish&&e.stage.summitFinish===base.summitFinish&&e.stage.sprintZoneKm===base.sprintZoneKm,'cross-incident scope mismatch')
  req(e.stage.kmFromStart===deterministicRound(e.stage.kmFromStart,6)&&e.stage.kmFromStart>0&&e.stage.kmFromStart<distanceKm&&(i===0||(e.stage.kmFromStart>incidents[i-1].kmFromStart&&cp.raceSecond>=incidents[i-1].raceSecond+120)),'incident chronology/cooldown mismatch')
  const result=reviewHistoricalCheckpointConsequences(c),inc=result.incident
  req(inc,'selected incident required')
  for(const candidate of cp.candidates)for(const r of candidate.riders)req(roster.get(r.riderId)?.teamId===r.teamId,'candidate roster mismatch')
  const selected=cp.candidates.find(x=>x.entityId===cp.candidates.find(z=>z.probabilityInput.incidentKind===inc.kind&&inc.affectedRiderIds.every(id=>z.riders.some(r=>r.riderId===id)))?.entityId&&x.probabilityInput.incidentKind===inc.kind)
  req(selected,'selected source group missing')
  for(const r of inc.riderConsequences){
   req(!affected.has(r.riderId),'repeat incident rider outside bounded review')
   affected.add(r.riderId)
   const state=phase10ReplayRiderStateAtKm(baseReplayTimeline,r.riderId,e.stage.kmFromStart)
   req(state?.status==='racing'&&state.displayCode===selected.displayCode,'incident source state mismatch')
  }
  incidents.push({...inc,kmFromStart:e.stage.kmFromStart,progressFraction:e.stage.kmFromStart/distanceKm,raceSecond:cp.raceSecond,sourceDisplayCode:selected.displayCode,riderIds:inc.affectedRiderIds})
 }
 const result=phase10BuildAutonomousIncidentChase({input,riderReadiness,baseReplayTimeline,baseFinishResolution:{finishMode:flatSprintFinish?'flat_sprint':'other'},incidents})
 // Original planner may reserve future incident riders as helpers. Refuse overlapping episodes rather than assert valid physical provenance.
 req(uniq(result.episodes,e=>e.riderId),'overlapping incident/rescue rider outside bounded review')
 const updated=incidents.map(inc=>({...inc,riderConsequences:inc.riderConsequences.map(r=>{
  const ep=result.episodeByKey.get(phase10EpisodeKey(inc.incidentId,r.riderId))
  return ep?{...r,actualRejoinKm:ep.actualRejoinKm,finalGapSeconds:ep.finalGapToTargetSeconds,finalTimePenaltySeconds:ep.actualRejoinKm!==null?0:Math.max(0,Math.round(ep.finalGapToTargetSeconds)),chaseEnergyCostPoints:ep.chaseEnergyCostPoints,temporarySeparation:ep.actualRejoinKm!==null}:r
 })}))
 return {version:'043T_historical_team_rescue_v1',evidenceSha256:expectedEvidenceSha256,incidents:updated,episodes:result.episodes,mergeEvents:result.mergeEvents,teamRescueEvents:result.teamRescueEvents,summary:result.summary,...flags()}
}
