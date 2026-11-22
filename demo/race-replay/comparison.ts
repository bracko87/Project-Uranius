import type { AttackComparison } from './attackComparison'
import { courseProfile } from './courseProfile'
import { markerLayout, showMarkers } from './groupMarkers'
import { projectionEvents, projectionFrames } from './liveProjection'
import { playbackSecond } from './playback'
import { raceGaps } from './raceGaps'
import { elapsedEvents, frameAt } from './timeline'

const scenario = document.querySelector<HTMLSelectElement>('#scenario')!
const play = document.querySelector<HTMLButtonElement>('#play')!
const before = document.querySelector<HTMLButtonElement>('#before')!
const attack = document.querySelector<HTMLButtonElement>('#attack')!
const peak = document.querySelector<HTMLButtonElement>('#peak')!
const finish = document.querySelector<HTMLButtonElement>('#finish')!
const seek = document.querySelector<HTMLInputElement>('#seek')!
const clock = document.querySelector<HTMLOutputElement>('#timer')!
const outcome = document.querySelector<HTMLElement>('#outcome')!
const rule = document.querySelector<HTMLElement>('#rule')!
const summary = document.querySelector<HTMLElement>('#summary')!
const panels = [document.querySelector('#control-race')!, document.querySelector('#attacked-race')!]

function stageFrames(output: AttackComparison['baseline']) {
  return projectionFrames({
    frames: output.snapshots,
    riderStatuses: output.snapshots.map(frame => ({
      finished: output.finalRiderStates.filter(rider => rider.finishTimeSeconds !== null && rider.finishTimeSeconds <= frame.raceSecond).map(rider => rider.riderId),
      withdrawn: frame === output.snapshots.at(-1) ? output.finalRiderStates.filter(rider => rider.stageStatus === 'dnf' || rider.stageStatus === 'dns').map(rider => rider.riderId) : [],
    })),
  })
}

let comparison: AttackComparison | undefined
let timelines: ReturnType<typeof stageFrames>[] = []
let events: ReturnType<typeof projectionEvents>[] = []
let cursor = 0
let lastSecond = 0
let animation = 0
let previousPaint = 0
let loadSequence = 0

function pause() {
  cancelAnimationFrame(animation)
  animation = 0
  play.textContent = 'Play'
}

function render(second: number) {
  if (!comparison) return
  cursor = playbackSecond(second, 0, 1, lastSecond, false)
  seek.value = String(cursor)
  clock.value = Math.floor(cursor / 60) + ':' + String(Math.floor(cursor % 60)).padStart(2, '0')
  const fact = [...comparison.track].reverse().find(sample => sample.second <= cursor)
  const labels = { executing: 'Executing', successful: 'Successful', unsuccessful: 'Unsuccessful' }
  outcome.textContent = fact
    ? labels[fact.status] + ' | ' + comparison.selected.name + ' | recorded breakaway gap ' + (fact.gapKm * 1000).toFixed(0) + ' m'
    : 'Before command | elapsed history matches'
  summary.hidden = cursor < lastSecond
  panels.forEach((panel, index) => {
    const frames = timelines[index]
    const frame = frameAt(frames, cursor)
    const markers = markerLayout(frame.groups, comparison!.distanceKm)
    showMarkers(panel.querySelector('.profile-markers')!, markers)
    const gaps = raceGaps(frames, frame)
    const rows = frame.groups.map((group, row) => {
      const element = document.createElement('li')
      element.textContent = group.name + ' | ' + group.roster.length + ' rider(s) | ' + group.km.toFixed(3)
        + ' km | ' + group.speedKmh.toFixed(1) + ' km/h | ' + (gaps[row].gapSeconds === null ? 'time gap unavailable' : gaps[row].gapSeconds.toFixed(1) + ' s gap')
      return element
    })
    if (!rows.length) {
      const element = document.createElement('li')
      element.textContent = (frame.finished?.length ?? 0) + ' finished'
      rows.push(element)
    }
    panel.querySelector('.groups')!.replaceChildren(...rows)
    panel.querySelector('.race-events')!.replaceChildren(...elapsedEvents(events[index], cursor).map(event => {
      const item = document.createElement('li')
      item.textContent = event.second + ' s | ' + event.label
      return item
    }))
  })
}

function scoreRows(data: AttackComparison) {
  const attacked = new Map(data.attacked.finalRiderStates.map(rider => [rider.riderId, rider]))
  const seconds = (value: number | null) => value === null ? '--' : value.toFixed(1) + ' s'
  return data.baseline.finalRiderStates.map(control => {
    const withAttack = attacked.get(control.riderId)!
    const energy = data.startingEnergy[control.riderId]
    const row = document.createElement('tr')
    row.classList.toggle('selected-rider', control.riderId === data.selected.id)
    for (const value of [control.riderName, control.finishPosition, withAttack.finishPosition,
      seconds(control.finishTimeSeconds), seconds(withAttack.finishTimeSeconds),
      (energy - control.energy).toFixed(3), (energy - withAttack.energy).toFixed(3)]) {
      const cell = document.createElement('td')
      cell.textContent = String(value ?? '--')
      row.append(cell)
    }
    return row
  })
}

async function load() {
  const sequence = ++loadSequence
  pause()
  comparison = undefined
  summary.hidden = true
  for (const control of [play, before, attack, peak, finish, seek]) control.disabled = true
  outcome.textContent = 'Running both simulations...'
  try {
    const response = await fetch('/api/attack-comparison?case=' + encodeURIComponent(scenario.value))
    if (!response.ok) throw Error('Comparison did not complete.')
    const data: AttackComparison = await response.json()
    if (sequence !== loadSequence) return
    comparison = data
    timelines = [stageFrames(data.baseline), stageFrames(data.attacked)]
    events = [projectionEvents(data.baseline), projectionEvents(data.attacked)]
    lastSecond = Math.max(...timelines.map(frames => frames.at(-1)!.second))
    seek.max = String(lastSecond)
    const course = courseProfile(data.course, data.distanceKm).replace('id="profile-markers"', 'class="profile-markers"')
    for (const panel of panels) panel.querySelector('.course')!.innerHTML = course
    document.querySelector('tbody')!.replaceChildren(...scoreRows(data))
    rule.textContent = 'Success in this comparison means at least ' + data.thresholdKm * 1000 + ' m of separation for '
      + data.sustainedSamples + ' consecutive recorded samples. Pre-command frames and events match exactly.'
    for (const control of [play, before, attack, finish, seek]) control.disabled = false
    peak.disabled = !data.track.some(entry => entry.gapKm > 0)
    render(data.commandSecond - 30)
  } catch {
    if (sequence === loadSequence) outcome.textContent = 'The local comparison could not complete.'
  }
}

function jump(second: number) { pause(); render(second) }
before.addEventListener('click', () => { if (comparison) jump(comparison.commandSecond - 30) })
attack.addEventListener('click', () => { if (comparison) jump(comparison.commandSecond) })
peak.addEventListener('click', () => {
  if (comparison) jump(comparison.track.reduce((largest, entry) => entry.gapKm > largest.gapKm ? entry : largest).second)
})
finish.addEventListener('click', () => { jump(lastSecond); summary.scrollIntoView({ block: 'nearest' }) })
seek.addEventListener('input', () => jump(Number(seek.value)))
scenario.addEventListener('change', () => { void load() })
play.addEventListener('click', () => {
  if (animation) return pause()
  if (cursor >= lastSecond && comparison) render(comparison.commandSecond - 30)
  play.textContent = 'Pause'
  previousPaint = performance.now()
  const paint = (now: number) => {
    render(playbackSecond(cursor, now - previousPaint, 12, lastSecond, false))
    previousPaint = now
    if (cursor >= lastSecond) pause()
    else animation = requestAnimationFrame(paint)
  }
  animation = requestAnimationFrame(paint)
})
void load()
