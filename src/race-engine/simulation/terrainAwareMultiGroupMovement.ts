/**
 * terrainAwareMultiGroupMovement.ts
 *
 * Pure deterministic candidate multi-group movement using groupTerrainPace.
 *
 * This is the terrain-aware movement calculator used by the calibrated
 * deterministic runner.
 *
 * It does not mutate SimulationState, create events, apply rider energy,
 * finish riders, or persist production output.
 *
 * When the calibrated wrapper enables weather performance, the final
 * terrain-aware applied speed is multiplied directly by the canonical weather
 * speed multiplier. The terrain pace calculation, steep-gradient severity,
 * group-type handling, physical gap ordering, and finish-gap semantics remain
 * unchanged. A multiplier of exactly 1 preserves the original speed value.
 */

import {calculateExperimentalChaseMultiplier} from './experimentalChasePace'
import {calculatePelotonChaseEffort} from './pelotonChaseEffort'
import {calculateFundedPelotonLeadership} from './pelotonLeadershipBudget'
import type {
  GroupState,
} from '../domain/GroupState'
import type {
  RiderState,
} from '../domain/RiderState'
import type {
  SimulationState,
} from '../domain/SimulationState'
import type {
  MultiGroupMovementProposal,
  MultiGroupMovementResult,
} from './multiGroupMovement'
import {
  calculateGroupTerrainPace,
  type GroupTerrainPaceResult,
} from './groupTerrainPace'
import {
  getStageTerrainSample,
} from './stageProfile'
import {
  calculateWeatherPerformanceEffects,
} from './weatherPerformanceEffects'
import type {
  SteepGradientSeverityModel,
} from './steepGradientTerrainSeverity'

export const TERRAIN_AWARE_MULTI_GROUP_MOVEMENT_VERSION =
  'phase_8g5c_latest_weather_direct_v1'

export interface TerrainAwareGroupMovementDiagnostic {
  readonly groupId: string
  readonly pace:
    GroupTerrainPaceResult
}

export interface TerrainAwareMultiGroupMovementResult {
  readonly movement:
    MultiGroupMovementResult
  readonly groupDiagnostics:
    readonly TerrainAwareGroupMovementDiagnostic[]
  /** Present only for opt-in budgeted puller pursuit. */
  readonly experimentalPullerEnergyCosts?: Readonly<Record<string,number>>
}

export interface TerrainAwareMultiGroupMovementOptions {
  /**
   * Disabled by default. When disabled, movement remains exactly equivalent to
   * the existing Phase 7B.7 terrain-aware calculation.
   */
  /** OFFLINE POC ONLY: attack speeds for orders executed in THIS movement tick. */
  readonly experimentalLaunchSpeedByGroupId?: Readonly<Record<string, number>>
  /** OFFLINE POC ONLY: executed chase can modestly raise actual peloton speed. */
  readonly experimentalChaseOrdersEnabled?: boolean
  /** OFFLINE only: explicit pullers and paid pursuit. */
  readonly experimentalBudgetedPelotonChaseEnabled?: boolean
  /** OFFLINE only: authorized pace leadership with rider-specific energy. */
  readonly experimentalFundedPelotonLeadershipEnabled?: boolean
  /** OFFLINE: alternative to 3% funded leader model, defaults OFF. */
  readonly experimentalCapabilityBasedLeadershipEnabled?: boolean
  /** OFFLINE optional rider-stable rotation (requires capability-funded leadership). */
  readonly experimentalStableLeaderRotationEnabled?: boolean
  readonly steepGradientSeverityEnabled?: boolean
  readonly steepGradientSeverityModel?:
    SteepGradientSeverityModel
}

function getRacingGroupRiders(
  state: SimulationState,
  group: GroupState,
): RiderState[] {
  return group.riderIds
    .slice()
    .sort(
      (left, right) =>
        left.localeCompare(
          right,
        ),
    )
    .map(
      (riderId) => {
        const rider =
          state.riders[
            riderId
          ]

        if (!rider) {
          throw new Error(
            `calculateTerrainAwareMultiGroupMovement: group ${group.groupId} references missing rider ${riderId}.`,
          )
        }

        if (
          rider.currentGroupId !==
          group.groupId
        ) {
          throw new Error(
            `calculateTerrainAwareMultiGroupMovement: rider ${riderId} membership does not match group ${group.groupId}.`,
          )
        }

        return rider
      },
    )
    .filter(
      (rider) =>
        rider.stageStatus ===
        'racing',
    )
}

/**
 * Calculates one candidate movement proposal for every active group.
 *
 * Physical replay-gap semantics:
 * - every active group in the same tick uses one common reference speed;
 * - groups ordered by distance therefore have non-decreasing leader gaps;
 * - after a winner exists, elapsed time since the winner is added equally to
 *   every remaining active group.
 *
 * Using each trailing group's own speed after the winner finished produced
 * predicted finish deficits rather than physical replay gaps. A closer but
 * slower group could receive a larger gap than a group physically behind it,
 * which violated the authoritative replay group-order contract.
 */
export function calculateTerrainAwareMultiGroupMovement(
  state: SimulationState,
  terrainCapabilityInfluence: number,
  options:
    TerrainAwareMultiGroupMovementOptions = {},
): TerrainAwareMultiGroupMovementResult {
  if (state.completed) {
    throw new Error(
      'calculateTerrainAwareMultiGroupMovement: cannot calculate movement for a completed simulation.',
    )
  }

  const tickSeconds =
    state.input.settings
      .tickSeconds

  if (
    !Number.isInteger(
      tickSeconds,
    ) ||
    tickSeconds <= 0
  ) {
    throw new Error(
      'calculateTerrainAwareMultiGroupMovement: tickSeconds must be a positive integer.',
    )
  }

  const weatherEffects =
    state
      .weatherPerformanceEffectsEnabled ===
      true
      ? calculateWeatherPerformanceEffects(
          state.input.weather,
        )
      : calculateWeatherPerformanceEffects(
          undefined,
        )

  const activeGroups =
    Object.values(
      state.groups,
    )
      .filter(
        (group) =>
          group.active,
      )
      .slice()
      .sort(
        (left, right) =>
          left.groupId.localeCompare(
            right.groupId,
          ),
      )

  if (
    activeGroups.length === 0
  ) {
    throw new Error(
      'calculateTerrainAwareMultiGroupMovement: at least one active group is required.',
    )
  }

  const preliminary =
    activeGroups.map(
      (group) => {
        const riders =
          getRacingGroupRiders(
            state,
            group,
          )

        if (
          riders.length === 0
        ) {
          throw new Error(
            `calculateTerrainAwareMultiGroupMovement: active group ${group.groupId} has no racing riders.`,
          )
        }

        const terrainSample =
          getStageTerrainSample(
            state.input,
            group.distanceKm,
          )

        const pace =
          calculateGroupTerrainPace({
            riders,
            gradientPercent:
              terrainSample
                .gradientPercent,
            minimumSpeedKmh:
              state.input.settings
                .minimumSpeedKmh,
            maximumSpeedKmh:
              state.input.settings
                .maximumSpeedKmh,
            terrainCapabilityInfluence,
            groupType:
              group.groupType,
            steepGradientSeverityEnabled:
              options
                .steepGradientSeverityEnabled,
            steepGradientSeverityModel:
              options
                .steepGradientSeverityModel,
          })

        // POC: one-tick physical launch impulse. This same applied speed feeds
        // distance, replay gaps, finish detection, and energy consumption.
        const launchSpeedKmh =
          options.experimentalLaunchSpeedByGroupId?.[group.groupId]
        if (
          launchSpeedKmh !== undefined &&
          (!Number.isFinite(launchSpeedKmh) ||
            launchSpeedKmh < 0 ||
            launchSpeedKmh > state.input.settings.maximumSpeedKmh)
        ) {
          throw new Error(
            'calculateTerrainAwareMultiGroupMovement: experimental launch speed is invalid.',
          )
        }
        const physicalAppliedSpeedKmh =
          launchSpeedKmh === undefined
            ? pace.appliedSpeedKmh
            : Math.min(
                state.input.settings.maximumSpeedKmh,
                Math.max(pace.appliedSpeedKmh, launchSpeedKmh),
              )
        const aheadBreakawayDistances=group.groupType==='peloton'
          ?Object.values(state.groups).filter(other=>other.active&&
            other.groupType==='breakaway'&&other.distanceKm>group.distanceKm)
            .map(other=>other.distanceKm-group.distanceKm):[]
        const pullerChase=options.experimentalBudgetedPelotonChaseEnabled===true&&
          group.groupType==='peloton'
          ?calculatePelotonChaseEffort({
             riders:riders.map(r=>({
               riderId:r.riderId,teamId:r.teamId,teamwork:r.attributes.teamwork,
               stamina:r.attributes.stamina,currentEnergy:r.energy,
               raceStatus:'racing' as const,
             })),
             orders:Object.values(state.orders).filter(o=>o.type==='chase').map(o=>({
               riderId:o.riderId,teamId:o.teamId,
               executed:o.status==='executed'&&
                 o.executionRaceSecond!==undefined&&o.executionRaceSecond<=state.raceSecond,
               currentKm:state.currentKm,eligibleFromKm:o.eligibleFromKm,
               eligibleUntilKm:o.eligibleUntilKm,
             })),
             pelotonSpeedKmh:physicalAppliedSpeedKmh,
             breakawayDistanceAheadKm:aheadBreakawayDistances.length?
               Math.max(...aheadBreakawayDistances):0,
             pelotonSpeedLimitKmh:state.input.settings.maximumSpeedKmh,
             gradientPercent:terrainSample.gradientPercent,tickSeconds,
           }):null
        // Independently switchable candidate. The selected pace setters must
        // actually have executed, active chase orders; a visible escape is
        // required before this experimental leadership can raise pace.
        const authorizedLeaderIds=group.groupType==='peloton'&&
          aheadBreakawayDistances.length>0
          ?Object.values(state.orders).filter(o=>
             o.type==='chase'&&o.status==='executed'&&
             o.executionRaceSecond!==undefined&&
             o.executionRaceSecond<=state.raceSecond&&
             state.currentKm>=o.eligibleFromKm&&
             state.currentKm<o.eligibleUntilKm&&
             riders.some(r=>r.riderId===o.riderId&&r.teamId===o.teamId)
           ).map(o=>o.riderId):[]
        const leaderPace=(options.experimentalFundedPelotonLeadershipEnabled===true||
          options.experimentalCapabilityBasedLeadershipEnabled===true)&&
          group.groupType==='peloton'&&aheadBreakawayDistances.length>0
          ?calculateFundedPelotonLeadership({
             riders,minimumSpeedKmh:state.input.settings.minimumSpeedKmh,
             maximumSpeedKmh:state.input.settings.maximumSpeedKmh,
             raceSecond:state.raceSecond,tickSeconds,
             eligibleOrderedRiderIds:authorizedLeaderIds,
             experimentalCapabilityBasedFunding:
              options.experimentalCapabilityBasedLeadershipEnabled===true,
             experimentalStableDutyRotation:
              options.experimentalStableLeaderRotationEnabled===true,
           }):null
        const leadershipSpeedKmh=leaderPace?
          Math.min(state.input.settings.maximumSpeedKmh,
             physicalAppliedSpeedKmh*(leaderPace.fundedSpeedKmh/leaderPace.baseSpeedKmh))
          :physicalAppliedSpeedKmh
        const chaseAdjustedAppliedSpeedKmh =
          leaderPace?leadershipSpeedKmh:
          pullerChase?pullerChase.appliedSpeedKmh:
          options.experimentalChaseOrdersEnabled
            ? Math.min(
                state.input.settings.maximumSpeedKmh,
                physicalAppliedSpeedKmh * calculateExperimentalChaseMultiplier(
                  state,group,terrainSample.gradientPercent,
                ),
              )
            : physicalAppliedSpeedKmh

        const weatherAdjustedAppliedSpeedKmh =
          weatherEffects
            .speedMultiplier ===
            1
            ? chaseAdjustedAppliedSpeedKmh
            : Number(
                (
                  chaseAdjustedAppliedSpeedKmh *
                  weatherEffects
                    .speedMultiplier
                ).toFixed(6),
              )

        const unclampedNextDistanceKm =
          group.distanceKm +
          weatherAdjustedAppliedSpeedKmh *
            (
              tickSeconds /
              3600
            )

        const nextDistanceKm =
          Math.min(
            state.stageDistanceKm,
            unclampedNextDistanceKm,
          )

        return {
          group,
          terrainSample,
          pace,
          pullerChase,
          leaderPace,
          weatherAdjustedAppliedSpeedKmh,
          nextDistanceKm,
          distanceAdvancedKm:
            nextDistanceKm -
            group.distanceKm,
        }
      },
    )

  const leaderEntry =
    preliminary
      .slice()
      .sort(
        (left, right) => {
          if (
            left.nextDistanceKm !==
            right.nextDistanceKm
          ) {
            return (
              right.nextDistanceKm -
              left.nextDistanceKm
            )
          }

          return left.group.groupId
            .localeCompare(
              right.group.groupId,
            )
        },
      )[0]

  if (!leaderEntry) {
    throw new Error(
      'calculateTerrainAwareMultiGroupMovement: could not resolve a leader.',
    )
  }

  const activeLeaderDistanceKm =
    leaderEntry
      .nextDistanceKm

  const raceLeaderDistanceKm =
    Math.max(
      state.currentKm,
      activeLeaderDistanceKm,
    )

  const commonGapReferenceSpeedKmh =
    Math.max(
      leaderEntry
        .weatherAdjustedAppliedSpeedKmh,
      0.000001,
    )

  const finishedLeaderIsAhead =
    raceLeaderDistanceKm >
    activeLeaderDistanceKm

  const existingFinishTimes =
    Object.values(state.riders)
      .filter(
        (rider) =>
          rider.stageStatus ===
            'finished' &&
          typeof rider.finishTimeSeconds ===
            'number',
      )
      .map(
        (rider) =>
          rider.finishTimeSeconds as number,
      )

  const winnerFinishTimeSeconds =
    existingFinishTimes.length > 0
      ? Math.min(
          ...existingFinishTimes,
        )
      : null

  const predictedRaceSecond =
    state.raceSecond +
    tickSeconds

  const proposals:
    MultiGroupMovementProposal[] =
    preliminary.map(
      (entry) => {
        const distanceGapKm =
          Math.max(
            0,
            raceLeaderDistanceKm -
              entry.nextDistanceKm,
          )

        /*
         * Use one common speed for every active group in this tick.
         *
         * This converts physical distance differences into physical replay
         * gaps and guarantees that groups ordered by distance also have
         * non-decreasing gapFromLeaderSeconds values.
         *
         * After the winner has finished, elapsedSinceWinnerSeconds is added
         * equally to all trailing groups below.
         */
        const remainingTimeToLeaderSeconds =
          distanceGapKm === 0
            ? 0
            : (
                distanceGapKm /
                commonGapReferenceSpeedKmh
              ) *
              3600

        const elapsedSinceWinnerSeconds =
          finishedLeaderIsAhead &&
          winnerFinishTimeSeconds !== null
            ? Math.max(
                0,
                predictedRaceSecond -
                  winnerFinishTimeSeconds,
              )
            : 0

        const gapFromLeaderSeconds =
          remainingTimeToLeaderSeconds +
          elapsedSinceWinnerSeconds

        return {
          groupId:
            entry.group.groupId,
          groupType:
            entry.group.groupType,
          riderIds:
            entry.group.riderIds
              .slice()
              .sort(
                (left, right) =>
                  left.localeCompare(
                    right,
                  ),
              ),
          previousDistanceKm:
            entry.group.distanceKm,
          nextDistanceKm:
            entry.nextDistanceKm,
          distanceAdvancedKm:
            entry
              .distanceAdvancedKm,
          elevationMetres:
            entry.terrainSample
              .elevationMetres,
          gradientPercent:
            entry.terrainSample
              .gradientPercent,
          baseSpeedKmh:
            entry.pace
              .adjustedBaseSpeedKmh,
          terrainMultiplier:
            entry.pace
              .terrainMultiplier,
          appliedSpeedKmh:
            entry
              .weatherAdjustedAppliedSpeedKmh,
          gapFromLeaderSeconds,
          active: true,
        }
      },
    )

  return {
    movement: {
      tickSeconds,
      leaderGroupId:
        leaderEntry.group.groupId,
      leaderDistanceKm:
        activeLeaderDistanceKm,
      proposals,
    },
    ...((options.experimentalBudgetedPelotonChaseEnabled||
          options.experimentalFundedPelotonLeadershipEnabled||
          options.experimentalCapabilityBasedLeadershipEnabled)
      ? {experimentalPullerEnergyCosts:Object.fromEntries(
           preliminary.flatMap(entry=>entry.leaderPace?
             Object.entries(entry.leaderPace.surchargeByRiderId):
             entry.pullerChase?
               Object.entries(entry.pullerChase.energySurchargeByRiderId):[]))}
      : {}),
    groupDiagnostics:
      preliminary.map(
        (entry) => ({
          groupId:
            entry.group.groupId,
          pace:
            entry.pace,
        }),
      ),
  }
}
