import { z } from 'zod'

const counter = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const identifier = z.string().trim().min(1)
const requestFields = z.object({
  commandId: identifier,
  teamId: identifier,
  riderId: identifier,
  expectedRevision: counter,
  requestedTick: counter,
})
const requestSchema = z.discriminatedUnion('kind', [
  requestFields.extend({ kind: z.literal('attack'), payload: z.object({}).strict() }).strict(),
  requestFields.extend({ kind: z.literal('chase'), payload: z.object({ targetGroupId: identifier }).strict() }).strict(),
  requestFields.extend({ kind: z.literal('follow'), payload: z.object({ targetRiderId: identifier }).strict() }).strict(),
])

type CommandRequest = z.infer<typeof requestSchema>
export type AcceptedRaceCommand = CommandRequest & {
  readonly version: 1
  readonly ownerId: string
  readonly raceId: string
  readonly stageId: string
  readonly sequence: number
  readonly effectiveTick: number
}

export interface CommandClock {
  readonly raceId: string
  readonly stageId: string
  readonly tick: number
  readonly completed: boolean
}

export type CommandOrderResult =
  | { readonly status: 'accepted'; readonly command: AcceptedRaceCommand }
  | { readonly status: 'rejected'; readonly reason: 'invalid' | 'duplicate' | 'closed' | 'stale' | 'late' | 'future' }

export function orderRaceCommand(
  clock: CommandClock,
  commands: readonly AcceptedRaceCommand[],
  ownerId: string,
  request: unknown,
): CommandOrderResult {
  const parsed = requestSchema.safeParse(request)
  if (!parsed.success || ownerId.trim() === '') return { status: 'rejected', reason: 'invalid' }
  const input = parsed.data
  if (commands.some(command => command.commandId === input.commandId)) return { status: 'rejected', reason: 'duplicate' }
  if (clock.completed) return { status: 'rejected', reason: 'closed' }
  if (input.expectedRevision !== commands.length) return { status: 'rejected', reason: 'stale' }
  if (input.requestedTick < clock.tick) return { status: 'rejected', reason: 'late' }
  if (input.requestedTick > clock.tick) return { status: 'rejected', reason: 'future' }
  return {
    status: 'accepted',
    command: {
      ...input, version: 1, ownerId, raceId: clock.raceId, stageId: clock.stageId,
      sequence: commands.length + 1, effectiveTick: clock.tick,
    },
  }
}
