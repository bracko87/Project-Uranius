import { performance } from 'node:perf_hooks'
import { expect, it } from 'vitest'
import type { StageInput } from '../domain/StageInput'
import { createCanonicalHashedValue } from '../simulation/canonicalSerialization'
import { createSyntheticFullFieldStage } from '../tests/fixtures/syntheticFullFieldStage'
import { RaceAuthority } from './raceAuthority'

function play(input: StageInput) {
  const start = performance.now()
  const cpu = process.cpuUsage()
  const initialHeap = process.memoryUsage().heapUsed
  let commandMs = 0
  let heapGrowth = 0
  const owners = Object.fromEntries(input.teams.map(team => [team.teamId, 'fictional-owner-' + team.teamId]))
  const authority = new RaceAuthority(input, owners)
  const commands = [
    { tick: 4, rider: input.riders[input.riders.length - 1] },
    { tick: 8, rider: input.riders[7] },
  ]
  const sampleHeap = () => { heapGrowth = Math.max(heapGrowth, process.memoryUsage().heapUsed - initialHeap) }
  for (const [index, { tick, rider }] of commands.entries()) {
    authority.advanceTo(tick)
    const before = authority.elapsed()
    const beginCommand = performance.now()
    const reply = authority.submit(owners[rider.teamId], {
      commandId: 'benchmark-attack-' + index, teamId: rider.teamId, riderId: rider.riderId,
      expectedRevision: index, requestedTick: tick, kind: 'attack', payload: {},
    })
    commandMs = Math.max(commandMs, performance.now() - beginCommand)
    expect(reply).toEqual({ status: 'accepted', revision: index + 1, effectiveTick: tick })
    authority.advanceTo(tick + 1)
    const after = authority.elapsed()
    expect(after.frames.slice(0, before.frames.length)).toStrictEqual(before.frames)
    expect(after.events.slice(0, before.events.length)).toStrictEqual(before.events)
    sampleHeap()
  }
  authority.advanceTo(1000)
  const final = authority.finalize()
  if (!final) throw Error('Expected sealed results.')
  sampleHeap()
  const used = process.cpuUsage(cpu)
  const measurements = {
    wallMs: Math.round(performance.now() - start),
    cpuMs: Math.round((used.user + used.system) / 1000),
    commandMs: Math.round(commandMs), heapGrowth,
    bytes: Buffer.byteLength(JSON.stringify(final)),
  }
  expect(measurements.wallMs).toBeLessThanOrEqual(20_000)
  expect(measurements.cpuMs).toBeLessThanOrEqual(20_000)
  expect(measurements.commandMs).toBeLessThanOrEqual(500)
  expect(measurements.heapGrowth).toBeLessThanOrEqual(256 * 1024 * 1024)
  expect(measurements.bytes).toBeLessThanOrEqual(1024 * 1024)
  expect(final.finalRiderStates.map(rider => rider.riderId).sort()).toEqual(input.riders.map(rider => rider.riderId).sort())
  expect(final.finalRiderStates.every(rider => rider.finished)).toBe(true)
  expect(final.events.filter(event => event.eventType === 'ATTACK_STARTED').map(event => event.actorRiderId)).toEqual(commands.map(({ rider }) => rider.riderId))
  return { final, measurements }
}

it.each([['flat', 24], ['hilly', 48], ['mountain', 96]] as const)(
  'replays two managers deterministically on %s terrain with %d riders', (terrain, size) => {
    const input = createSyntheticFullFieldStage(terrain, size)
    const first = play(input)
    const second = play(input)
    const hash = createCanonicalHashedValue(first.final).hash
    expect(createCanonicalHashedValue(second.final).hash).toBe(hash)
    console.log('URANIUS_HYBRID', JSON.stringify({ terrain, size, hash, first: first.measurements, repeat: second.measurements }))
  }, 120_000,
)
