import { buildLiveRequest } from './liveControls'
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
root.innerHTML = "<h1>Race replay</h1><p>Synthetic 10 km road stage</p><nav aria-label=\"Replay examples\"><a href=\"?fixture=groups\">Groups</a><a href=\"?fixture=terrain\">Terrain</a><a href=\"?fixture=status\">Classifications</a><a href=\"?mode=live\">Live demo</a></nav><p id=\"connection\" role=\"status\" hidden></p><section class=\"panel controls\" aria-label=\"Fixture moments\"></section><section class=\"panel\"><div class=\"playback\"><button id=\"play\" type=\"button\">Play</button><label>Replay speed <select id=\"rate\"><option value=\"1\">1&times;</option><option value=\"4\">4&times;</option><option value=\"16\">16&times;</option></select></label><output id=\"timer\"></output><label class=\"seek\">Race time <input id=\"seek\" type=\"range\" min=\"0\" step=\"0.1\"></label></div><h2>Stage profile</h2><div id=\"course\"></div><h2>Groups on the road</h2><ul id=\"groups\"></ul><p id=\"classification\"></p><h2>Race events</h2><ul id=\"events\"></ul><section id=\"result\" hidden><h2>Final classification</h2><ol></ol></section></section>"
const comparisonLink = document.createElement('a')
comparisonLink.href = './comparison'
comparisonLink.textContent = 'Attack comparison'
root.querySelector('nav')!.append(comparisonLink)
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

function render(second: number, animateElapsed = false) {
  if (!frames.length) return
  cursor = playbackSecond(second, 0, 1, lastSecond, liveDemo && !projection?.completed && !animateElapsed)
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
    const distance = gaps[index].distanceKm
    const separation = distance > 0 && distance < 0.01 ? (distance * 1000).toFixed(1) + ' m' : distance.toFixed(2) + ' km'
    row.textContent = group.name + ' · ' + group.roster.length + (group.roster.length === 1 ? ' rider' : ' riders') + ' · ' + group.km.toFixed(3) + " km · " + group.speedKmh.toFixed(1) + ' km/h'
      + " · " + separation + ' behind'
      + (gaps[index].gapSeconds === null ? " · time gap unavailable" : " · " + gaps[index].gapSeconds.toFixed(1) + ' s gap')
    return row
  }))
  classification.textContent = (frame.finished?.length ?? 0) + " finished · " + (frame.withdrawn?.length ?? 0) + ' withdrawn'
  eventsList.replaceChildren(...elapsedEvents(projection ? projectionEvents(projection) : terrain || status ? [] : fixtureEvents, frame.second).map(event => {
    const item = document.createElement('li')
    item.textContent = event.second + " s · " + event.label
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
  connection.textContent = "Loading the local race…"
  let drift = 0
  const api = async (route: string, method = 'GET', body?: unknown) => {
    const response = await fetch(route, {
      method, cache: 'no-store',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) throw new Error('Local race response failed.')
    return response.json()
  }
  const refresh = async () => {
    try {
      const wasComplete = projection?.completed
      const previousSecond = projection?.raceSecond
      projection = acceptRevision(projection, await api('/api/state'))
      frames = projectionFrames(projection)
      lastSecond = projection.raceSecond
      seek.max = String(lastSecond)
      play.disabled = seek.disabled = rate.disabled = !projection.completed
      connection.textContent = projection.completed ? "Completed replay · revision " + projection.revision : "Live · revision " + projection.revision
      if (document.visibilityState === 'visible' && !projection.completed && previousSecond !== undefined && lastSecond > previousSecond) {
        cancelAnimationFrame(drift)
        const start = performance.now()
        const from = cursor
        const to = lastSecond
        const transition = (now: number) => {
          const fraction = Math.min(1, (now - start) / 450)
          render(from + (to - from) * fraction, true)
          drift = fraction < 1 ? requestAnimationFrame(transition) : 0
        }
        drift = requestAnimationFrame(transition)
      } else if (!drift || projection.completed || document.visibilityState === 'hidden') {
        if (projection.completed || document.visibilityState === 'hidden') { cancelAnimationFrame(drift); drift = 0 }
        render(projection.completed && wasComplete ? cursor : lastSecond)
      }
      form.hidden = projection.completed
      updateTargets()
      if (projection.final) {
        const result = root.querySelector<HTMLElement>('#result')!
        result.hidden = false
        result.querySelector('ol')!.replaceChildren(...projection.final.finalRiderStates.map(rider => {
          const item = document.createElement('li')
          item.textContent = rider.riderName + " · " + (rider.finishTimeSeconds === null ? rider.stageStatus : rider.finishTimeSeconds.toFixed(1) + ' s')
          return item
        }))
      }
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
  const reconnect = document.createElement('button')
  reconnect.textContent = 'Reconnect'
  reconnect.addEventListener('click', () => { void refresh() })
  controls.append(reconnect)
  const form = document.createElement('form')
  form.className = 'panel tactics'
  form.innerHTML = '<h2>Live tactics</h2><label>Manager <select name="owner"><option value="manager-a">Manager A</option><option value="manager-b">Manager B</option></select></label><label>Rider <select name="rider"></select></label><label>Command <select name="kind"><option value="attack">Attack</option><option value="chase">Chase</option><option value="follow">Follow</option><option value="support">Support</option><option value="effort">Effort</option></select></label><label class="target">Target <select name="target"></select></label><button type="submit">Send command</button><p role="status" id="command-status"></p>'
  controls.after(form)
  const owner = form.querySelector<HTMLSelectElement>('select[name=owner]')!
  const rider = form.querySelector<HTMLSelectElement>('select[name=rider]')!
  const kind = form.querySelector<HTMLSelectElement>('select[name=kind]')!
  const target = form.querySelector<HTMLSelectElement>('select[name=target]')!
  const submit = form.querySelector<HTMLButtonElement>('button')!
  const feedback = form.querySelector<HTMLElement>('#command-status')!
  let pending = false
  const teamId = () => owner.value === 'manager-a' ? 'synthetic-team-a' : 'synthetic-team-b'
  function options(select: HTMLSelectElement, entries: readonly { id: string; label: string }[]) {
    const previous = select.value
    select.replaceChildren(...entries.map(entry => new Option(entry.label, entry.id)))
    if (entries.some(entry => entry.id === previous)) select.value = previous
  }
  function updateTargets() {
    const active = frames.at(-1)?.groups ?? []
    const currentGroup = active.find(group => group.roster.includes(rider.value))
    const needsTarget = ['chase', 'follow', 'support'].includes(kind.value)
    target.closest('label')!.hidden = !needsTarget
    const eligible = kind.value === 'chase'
      ? active.filter(group => currentGroup && group.km > currentGroup.km).map(group => ({ id: group.id, label: group.name }))
      : syntheticTenRiderStage.riders.filter(candidate =>
          candidate.riderId !== rider.value && currentGroup?.roster.includes(candidate.riderId)
          && (kind.value !== 'support' || candidate.teamId === teamId()),
        ).map(candidate => ({ id: candidate.riderId, label: candidate.riderName }))
    options(target, needsTarget ? eligible : [])
    submit.disabled = pending || !projection || projection.completed || (needsTarget && !target.value)
  }
  function updateRiders() {
    options(rider, syntheticTenRiderStage.riders.filter(candidate => candidate.teamId === teamId())
      .map(candidate => ({ id: candidate.riderId, label: candidate.riderName })))
    updateTargets()
  }
  owner.addEventListener('change', updateRiders)
  rider.addEventListener('change', updateTargets)
  kind.addEventListener('change', updateTargets)
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (!projection || pending) return
    pending = true
    updateTargets()
    feedback.textContent = "Sending command…"
    try {
      const reply = await api('/api/command', 'POST', {
        owner: owner.value,
        command: buildLiveRequest(projection, syntheticTenRiderStage.settings.tickSeconds, {
          commandId: crypto.randomUUID(), teamId: teamId(), riderId: rider.value, kind: kind.value, targetId: target.value,
        }),
      })
      feedback.textContent = reply.status === 'accepted' ? "Accepted · revision " + reply.revision : "Rejected · " + reply.reason
      await refresh()
    } catch { feedback.textContent = 'Command unavailable. Reconnect to confirm the current revision.' }
    finally { pending = false; updateTargets() }
  })
  updateRiders()
  play.disabled = seek.disabled = rate.disabled = true
  void refresh()
  setInterval(refresh, 1000)
}
