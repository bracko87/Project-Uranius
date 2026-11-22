import { createHash } from 'node:crypto'
import type { SimulationOutput } from '../domain/SimulationOutput'
import type { StageInput } from '../domain/StageInput'
import { createOutputReplaySnapshot } from '../simulation/createMultiGroupSimulationOutput'
import { applyAcceptedAttack } from './applyAcceptedAttack'
import { applyAcceptedPursuit } from './applyAcceptedPursuit'
import { orderRaceCommand } from './orderRaceCommand'
import { advanceRaceContinuation, beginRaceContinuation, finishRaceContinuation, type RaceContinuation } from './raceContinuation'
import { restoreSimulationCheckpoint } from './simulationCheckpoint'

export interface RaceRecovery {
  readonly version: 1
  readonly json: string
  readonly digest: string
}

function recoveryDigest(json: string): string {
  return createHash('sha256').update(json).digest('hex')
}

export class RaceAuthority {
  #race: RaceContinuation
  #sealed: SimulationOutput | null = null
  #owners: ReadonlyMap<string, string>

  constructor(input: StageInput, owners: Readonly<Record<string, string>>) {
    this.#race = beginRaceContinuation(input)
    this.#owners = new Map(Object.entries(owners))
  }

  static recover(recovery: RaceRecovery, owners: Readonly<Record<string, string>>): RaceAuthority {
    if (recovery.version !== 1 || recovery.digest !== recoveryDigest(recovery.json)) {
      throw new Error('Invalid race recovery record.')
    }
    const durable: { race: RaceContinuation; sealed: SimulationOutput | null } = JSON.parse(recovery.json)
    const state = restoreSimulationCheckpoint(durable.race.checkpoint)
    if (durable.sealed && !state.completed) throw new Error('Premature sealed result.')
    const authority = new RaceAuthority(state.input, owners)
    authority.#race = durable.race
    authority.#sealed = durable.sealed
    return authority
  }

  exportRecovery(): RaceRecovery {
    const json = JSON.stringify({ race: this.#race, sealed: this.#sealed })
    return { version: 1, json, digest: recoveryDigest(json) }
  }

  finalize(): SimulationOutput | null {
    if (!restoreSimulationCheckpoint(this.#race.checkpoint).completed) return null
    this.#sealed ??= finishRaceContinuation(this.#race)
    return structuredClone(this.#sealed)
  }

  advanceTo(tick: number, signal?: AbortSignal): void {
    signal?.throwIfAborted()
    const state = restoreSimulationCheckpoint(this.#race.checkpoint)
    const currentTick = state.raceSecond / state.input.settings.tickSeconds
    if (!Number.isSafeInteger(tick) || tick < currentTick) throw new Error('Invalid server tick.')
    const next = advanceRaceContinuation(this.#race, tick - currentTick)
    signal?.throwIfAborted()
    this.#race = next
  }

  submit(owner: string, request: unknown) {
    const state = restoreSimulationCheckpoint(this.#race.checkpoint)
    const tick = state.raceSecond / state.input.settings.tickSeconds
    const ordered = orderRaceCommand({
      raceId: state.raceId, stageId: state.stageId, tick, completed: state.completed,
    }, this.#race.acceptedCommands, owner, request)
    if (ordered.status === 'rejected') {
      if (ordered.reason === 'duplicate' && request && typeof request === 'object' && 'commandId' in request) {
        const command = this.#race.acceptedCommands.find(entry => entry.commandId === request.commandId)
        const input = request as Record<string, unknown>
        if (command?.ownerId === owner
          && command.teamId === input.teamId && command.riderId === input.riderId
          && command.kind === input.kind && command.expectedRevision === input.expectedRevision
          && command.requestedTick === input.requestedTick
          && JSON.stringify(command.payload) === JSON.stringify(input.payload)) {
          return { status: 'accepted', revision: command.sequence, effectiveTick: command.effectiveTick } as const
        }
      }
      return ordered
    }
    const { command } = ordered
    if (this.#owners.get(command.teamId) !== owner) return { status: 'rejected', reason: 'ownership' } as const
    try {
      this.#race = command.kind === 'attack'
        ? applyAcceptedAttack(this.#race, command)
        : applyAcceptedPursuit(this.#race, command)
    } catch {
      return { status: 'rejected', reason: 'eligibility' } as const
    }
    return { status: 'accepted', revision: command.sequence, effectiveTick: command.effectiveTick } as const
  }

  elapsed() {
    const state = restoreSimulationCheckpoint(this.#race.checkpoint)
    const snapshots = this.#race.snapshots
    const frames = snapshots.map((_, index) => this.#race.sealedFrames?.[index]
      ?? createOutputReplaySnapshot({ replaySnapshots: snapshots, events: state.events }, index))
    this.#race = { ...this.#race, sealedFrames: frames }
    return structuredClone({
      raceId: state.raceId, stageId: state.stageId, raceSecond: state.raceSecond,
      revision: this.#race.acceptedCommands.length, completed: state.completed, frames, events: state.events,
    })
  }
}
