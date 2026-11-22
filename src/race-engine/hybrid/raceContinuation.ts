import type { SimulationOutput } from '../domain/SimulationOutput'
import type { StageInput } from '../domain/StageInput'
import type { SimulationState } from '../domain/SimulationState'
import { createInitialState } from '../simulation/createInitialState'
import { createMultiGroupSimulationOutput } from '../simulation/createMultiGroupSimulationOutput'
import {
  createReplaySnapshot, getReplaySnapshotBoundarySeconds, type ReplaySnapshot,
} from '../simulation/replaySnapshots'
import { simulateMultiGroupTick } from '../simulation/simulateMultiGroupTick'
import {
  captureSimulationCheckpoint, restoreSimulationCheckpoint, type SimulationCheckpoint,
} from './simulationCheckpoint'

export interface RaceContinuation {
  readonly checkpoint: SimulationCheckpoint
  readonly snapshots: readonly ReplaySnapshot[]
  readonly sealedFrames?: SimulationOutput['snapshots']
}

function advance(
  initial: SimulationState,
  earlier: readonly ReplaySnapshot[],
  maximumTicks: number,
) {
  let state = initial
  const snapshots = [...earlier]
  for (let tick = 0; tick < maximumTicks && !state.completed; tick++) {
    const before = state.raceSecond
    state = simulateMultiGroupTick(state).state
    const boundaries = getReplaySnapshotBoundarySeconds(
      before, state.raceSecond, state.input.settings.replaySnapshotIntervalSeconds,
    )
    for (const boundary of boundaries) {
      if (boundary !== state.raceSecond) throw new Error('Replay boundary must align with a tick.')
      snapshots.push(createReplaySnapshot({ state, sequenceNumber: snapshots.length + 1 }))
    }
  }
  return { state, snapshots }
}

export function advanceRaceContinuation(continuation: RaceContinuation, ticks: number): RaceContinuation {
  if (!Number.isSafeInteger(ticks) || ticks < 0) throw new Error('Invalid continuation tick count.')
  const result = advance(restoreSimulationCheckpoint(continuation.checkpoint), continuation.snapshots, ticks)
  return { ...continuation, checkpoint: captureSimulationCheckpoint(result.state), snapshots: result.snapshots }
}

export function beginRaceContinuation(input: StageInput): RaceContinuation {
  const initial = createInitialState(input)
  return {
    checkpoint: captureSimulationCheckpoint(initial),
    snapshots: [createReplaySnapshot({ state: initial, sequenceNumber: 1 })],
  }
}

export function finishRaceContinuation(continuation: RaceContinuation) {
  const initialState = restoreSimulationCheckpoint(continuation.checkpoint)
  const { state: finalState, snapshots } = advance(initialState, continuation.snapshots, 100_000)
  const output = createMultiGroupSimulationOutput({
    initialState, finalState, completed: finalState.completed,
    events: finalState.events, replaySnapshots: snapshots,
  })
  return { ...output, snapshots: output.snapshots.map((frame, index) => continuation.sealedFrames?.[index] ?? frame) }
}
