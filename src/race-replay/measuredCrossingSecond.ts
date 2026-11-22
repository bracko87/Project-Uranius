export interface PositionSample {
  readonly second: number
  readonly km: number
}

export function measuredCrossingSecond(samples: readonly PositionSample[], km: number): number | null {
  if (!Number.isFinite(km) || km < 0) throw new Error('Invalid crossing distance.')
  let crossing: number | null = null
  for (let index = 0; index < samples.length; index++) {
    const current = samples[index]
    const previous = samples[index - 1]
    if (!Number.isFinite(current.second) || current.second < 0 || !Number.isFinite(current.km) || current.km < 0
      || (previous && (current.second <= previous.second || current.km < previous.km))) {
      throw new Error('Invalid position chronology.')
    }
    if (crossing !== null) continue
    if (current.km === km) crossing = current.second
    else if (previous && previous.km < km && current.km > km) {
      const fraction = (km - previous.km) / (current.km - previous.km)
      crossing = previous.second + fraction * (current.second - previous.second)
    }
  }
  return crossing
}
