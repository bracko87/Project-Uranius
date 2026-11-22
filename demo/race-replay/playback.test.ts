import { expect, it } from 'vitest'
import { playbackSecond } from './playback'

it('plays, pauses and clamps local playback while live viewing remains at the server boundary', () => {
  expect(playbackSecond(12, 500, 4, 50, false)).toBe(14)
  expect(playbackSecond(12, 500, 0, 50, false)).toBe(12)
  expect(playbackSecond(45, 1000, 16, 50, false)).toBe(50)
  expect(playbackSecond(-4, 0, 1, 50, false)).toBe(0)
  expect(playbackSecond(1000, 999, 16, 50, true)).toBe(50)
})
