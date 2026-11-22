import { acceptRevision, projectionEvents, projectionFrames, type LiveProjection } from './liveProjection'
import { playbackSecond } from './playback'
import { raceGaps } from './raceGaps'
import { fixtureEvents, fixtureFrames, statusFrames, terrainFrames } from './fixture'
import { elapsedEvents, frameAt, hasUniqueGroupMembership } from './timeline'
import { syntheticTenRiderStage } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import { markerLayout, showMarkers } from './groupMarkers'
import { courseProfile } from './courseProfile'

const root = document.querySelector<HTMLElement>('#replay')
if (!root) throw new Error('Replay root is missing.')
root.innerHTML = '<h1>Race replay</h1><p>Synthetic 10 km road stage</p><nav aria-label="Replay examples"><a href="?fixture=groups">Groups</a><a href="?fixture=terrain">Terrain</a><a href="?fixture=status">Classifications</a><a href="?mode=live">Live demo</a></nav><p id="connection" role="status" hidden></p><section class="panel controls" aria-label="Fixture moments"></section><section class="panel"><div class="playback"><button id="play" type="button">Play</button><label>Replay speed <select id="rate"><option value="1">1?</option><option value="4">4?</option><option value="16">16?</option></select></label><output id="timer"></output><label class="seek">Race time <input id="seek" type="range" min="0" step="0.1"></label></div><h2>Stage profile</h2><div id="course"></div><h2>Groups on the road</h2><ul id="groups"></ul><p id="classification"></p><h2>Race events</h2><ul id="events"></ul></section>'
const course = root.querySelector('#course')!
course.innerHTML = courseProfile(syntheticTenRiderStage.profilePoints, syntheticTenRiderStage.distanceKm)
const groupMarkers = course.querySelector('#profile-markers')!
const list = root.querySelector('#groups')!
const classification = root.querySelector('#classification')!
const eventsList = root.querySelector('#events')!
const controls = root.querySelector('.controls')!
const params = new URLSearchParams(location.search)
const terrain = params.get('fixture') === 'terrain'
const status = params.get('fixture') === 'status'
const liveDemo = params.get('mode') === 'live'
let projection: LiveProjection | undefined
let frames = liveDemo ? [] : terrain ? terrainFrames : status ? statusFrames : fixtureFrames
const moments = status ? [['Start', 0], ['Withdrawal', 500], ['Finish', 1000]] as const : terrain ? [['Start', 0], ['Climb', 300], ['Descent', terrainFrames[2].second], ['Finish', terrainFrames[3].second]] as const : [['Start', 0], ['Split', 300], ['Mid-chase', 450], ['Catch', 600], ['Finish', 1000]] as const

const play = root.querySelector<HTMLButtonElement>('#play')!
const seek = root.querySelector<HTMLInputElement>('#seek')!
const rate = root.querySelector<HTMLSelectElement>('#rate')!
const timer = root.querySelector<HTMLOutputElement>('#timer')!
let lastSecond = frames.at(-1)?.second ?? 0
seek.max = String(lastSecond)
let cursor = 0
let animation = 0
let lastPaint = 0

function render(second: number) {
  if (!frames.length) return
  cursor = playbackSecond(second, 0, 1, lastSecond, liveDemo && !projection?.completed)
  seek.value = String(cursor)
  timer.value = Math.floor(cursor / 60) + ':' + String(Math.floor(cursor % 60)).padStart(2, '0')
  second = cursor
  const frame = frameAt(frames, second)
  if (!hasUniqueGroupMembership(frame)) throw new Error('Duplicate rider or group in replay frame.')
  const markers = markerLayout(frame.groups, syntheticTenRiderStage.distanceKm)
  showMarkers(groupMarkers, markers)
  const gaps = raceGaps(frames, frame)
  list.replaceChildren(...frame.groups.map((group, index) => {
    const row = document.createElement('li')
    row.dataset.groupId = group.id
    row.style.borderInlineStart = '3px solid ' + markers[index].colour
    row.textContent = group.name + ' · ' + group.roster.length + ' riders ? ' + group.km.toFixed(2) + ' km ? ' + group.speedKmh.toFixed(1) + ' km/h'
      + ' ? ' + gaps[index].distanceKm.toFixed(2) + ' km behind'
      + (gaps[index].gapSeconds === null ? ' ? time gap unavailable' : ' ? ' + gaps[index].gapSeconds.toFixed(1) + ' s gap')
    return row
  }))
  classification.textContent = (frame.finished?.length ?? 0) + ' finished ? ' + (frame.withdrawn?.length ?? 0) + ' withdrawn'
  eventsList.replaceChildren(...elapsedEvents(projection ? projectionEvents(projection) : terrain || status ? [] : fixtureEvents, frame.second).map(event => {
    const item = document.createElement('li')
    item.textContent = event.second + ' s ? ' + event.label
    return item
  }))
  for (const element of controls.querySelectorAll('button')) {
    element.setAttribute('aria-pressed', String(Number(element.dataset.second) === second))
  }
}

for (const [label, second] of liveDemo ? [] : moments) {
  const button = document.createElement('button')
  button.textContent = label
  button.dataset.second = String(second)
  button.addEventListener('click', () => { pause(); render(second) })
  controls.append(button)
}
function pause() {
  cancelAnimationFrame(animation)
  animation = 0
  play.textContent = 'Play'
}
function paint(now: number) {
  render(playbackSecond(cursor, lastPaint ? now - lastPaint : 0, Number(rate.value), lastSecond, false))
  lastPaint = now
  if (cursor >= lastSecond) pause()
  else animation = requestAnimationFrame(paint)
}
play.addEventListener('click', () => {
  if (liveDemo && !projection?.completed) return
  if (animation) return pause()
  if (cursor === lastSecond) render(0)
  lastPaint = 0
  play.textContent = 'Pause'
  animation = requestAnimationFrame(paint)
})
seek.addEventListener('input', () => { pause(); render(Number(seek.value)) })

const requested = Number(params.get('second'))
if (!liveDemo) render(Number.isFinite(requested) ? requested : 0)
else {
  const connection = root.querySelector<HTMLElement>('#connection')!
  connection.hidden = false
  connection.textContent = 'Loading the local race?'
  const api = async (route: string, method = 'GET') => {
    const response = await fetch(route, { method, cache: 'no-store' })
    if (!response.ok) throw new Error('Local race response failed.')
    return response.json()
  }
  const refresh = async () => {
    try {
      const wasComplete = projection?.completed
      projection = acceptRevision(projection, await api('/api/state'))
      frames = projectionFrames(projection)
      lastSecond = projection.raceSecond
      seek.max = String(lastSecond)
      play.disabled = seek.disabled = rate.disabled = !projection.completed
      connection.textContent = projection.completed ? 'Completed replay ? revision ' + projection.revision : 'Live ? revision ' + projection.revision
      render(projection.completed && wasComplete ? cursor : lastSecond)
    } catch {
      connection.textContent = 'Local race disconnected. Last verified view retained.'
    }
  }
  for (const [label, path] of [['Advance demo clock', '/api/advance'], ['Finish demo race', '/api/complete']]) {
    const button = document.createElement('button')
    button.textContent = label
    button.addEventListener('click', async () => {
      button.disabled = true
      try { await api(path, 'POST'); await refresh() } catch { connection.textContent = 'Clock operation failed.' }
      finally { button.disabled = false }
    })
    controls.append(button)
  }
  play.disabled = seek.disabled = rate.disabled = true
  void refresh()
  setInterval(refresh, 1000)
}
