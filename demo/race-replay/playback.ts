export function playbackSecond(second: number, elapsedMs: number, rate: number, lastSecond: number, live: boolean): number {
  return live ? lastSecond : Math.min(lastSecond, Math.max(0, second + elapsedMs * rate / 1000))
}
