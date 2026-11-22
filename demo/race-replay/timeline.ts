export interface ReplayGroup {
  id: string
  name: string
  km: number
  speedKmh: number
  roster: readonly string[]
}

export interface ReplayFrame {
  second: number
  groups: readonly ReplayGroup[]
  finished?: readonly string[]
  withdrawn?: readonly string[]
  terminalKm?: Readonly<Record<string, number>>
}

export function frameAt(frames: readonly ReplayFrame[], second: number): ReplayFrame {
  const next = frames.findIndex(frame => frame.second > second)
  if (next === 0) return frames[0]
  if (next === -1) return frames[frames.length - 1]
  const before = frames[next - 1]
  const after = frames[next]
  if (second === before.second) return before
  const fraction = (second - before.second) / (after.second - before.second)

  return {
    ...before,
    second,
    groups: before.groups.map(group => {
      const destination = after.groups.find(candidate => candidate.id === group.id)?.km ?? after.terminalKm?.[group.id]
      if (destination === undefined || destination < group.km) return group
      return { ...group, km: group.km + (destination - group.km) * fraction }
    }),
  }
}

export interface ReplayEvent {
  second: number
  label: string
}

export function elapsedEvents(events: readonly ReplayEvent[], second: number) {
  return events.filter(event => event.second <= second)
}

export function hasUniqueGroupMembership(frame: ReplayFrame): boolean {
  const groupIds = new Set(frame.groups.map(group => group.id))
  const riders = frame.groups.flatMap(group => [...group.roster])
  const classified = [...riders, ...(frame.finished ?? []), ...(frame.withdrawn ?? [])]
  return groupIds.size === frame.groups.length && new Set(classified).size === classified.length
}
