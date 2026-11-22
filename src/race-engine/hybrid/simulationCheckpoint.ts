import { createHash } from 'node:crypto'
import type { SimulationState } from '../domain/SimulationState'
import { validateSimulationState } from '../validation/validateSimulationState'

export interface SimulationCheckpoint {
  readonly stateVersion: 1
  readonly engine: 'race_engine_ts_v1/existing_v1'
  readonly stateJson: string
  readonly stateDigest: string
}

const undefinedMarker = '$uraniusUndefined'

function digest(stateJson: string): string {
  return createHash('sha256').update(stateJson).digest('hex')
}

function encodeValue(value: unknown): unknown {
  if (value === undefined) return { [undefinedMarker]: true }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Nonfinite checkpoint value.')
  }
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value)) return value
  if (typeof value !== 'object') throw new Error('Unsupported checkpoint value.')
  if (Array.isArray(value)) return Array.from(value, encodeValue)
  const prototype = Object.getPrototypeOf(value)
  if ((prototype !== Object.prototype && prototype !== null) || Object.hasOwn(value, undefinedMarker)) {
    throw new Error('Unsupported checkpoint record.')
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)]))
}

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeValue)
  if (value === null || typeof value !== 'object') return value
  if (Object.hasOwn(value, undefinedMarker)) {
    if (Object.keys(value).length !== 1 || (value as Record<string, unknown>)[undefinedMarker] !== true) {
      throw new Error('Invalid checkpoint marker.')
    }
    return undefined
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decodeValue(entry)]))
}

export function captureSimulationCheckpoint(state: SimulationState): SimulationCheckpoint {
  validateSimulationState(state)
  // Keep insertion order and explicit undefined properties used by inherited orders.
  const stateJson = JSON.stringify(encodeValue(state))
  return { stateVersion: 1, engine: 'race_engine_ts_v1/existing_v1', stateJson, stateDigest: digest(stateJson) }
}

export function restoreSimulationCheckpoint(checkpoint: SimulationCheckpoint): SimulationState {
  if (checkpoint.stateVersion !== 1 || checkpoint.engine !== 'race_engine_ts_v1/existing_v1') {
    throw new Error('Unsupported simulation checkpoint version.')
  }
  if (typeof checkpoint.stateJson !== 'string' || digest(checkpoint.stateJson) !== checkpoint.stateDigest) {
    throw new Error('Simulation checkpoint digest mismatch.')
  }
  const state = decodeValue(JSON.parse(checkpoint.stateJson)) as SimulationState
  validateSimulationState(state)
  return state
}
