import { fixtureFrames, terrainFrames } from './fixture'
import { frameAt } from './timeline'
import { syntheticTenRiderStage } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import { markerLayout, showMarkers } from './groupMarkers'
import { courseProfile } from './courseProfile'

const root = document.querySelector<HTMLElement>('#replay')
if (!root) throw new Error('Replay root is missing.')
root.innerHTML = '<h1>Race replay</h1><p>Synthetic 10 km road stage</p><section class="panel controls" aria-label="Fixture moments"></section><section class="panel"><h2>Stage profile</h2><div id="course"></div><h2>Groups on the road</h2><ul id="groups"></ul></section>'
const course = root.querySelector('#course')!
course.innerHTML = courseProfile(syntheticTenRiderStage.profilePoints, syntheticTenRiderStage.distanceKm)
const groupMarkers = course.querySelector('#profile-markers')!
const list = root.querySelector('#groups')!
const controls = root.querySelector('.controls')!
const params = new URLSearchParams(location.search)
const terrain = params.get('fixture') === 'terrain'
const frames = terrain ? terrainFrames : fixtureFrames
const moments = terrain ? [['Start', 0], ['Climb', 300], ['Descent', terrainFrames[2].second], ['Finish', terrainFrames[3].second]] as const : [['Start', 0], ['Split', 300], ['Mid-chase', 450], ['Catch', 600]] as const

function render(second: number) {
  const frame = frameAt(frames, second)
  const markers = markerLayout(frame.groups, syntheticTenRiderStage.distanceKm)
  showMarkers(groupMarkers, markers)
  list.replaceChildren(...frame.groups.map((group, index) => {
    const row = document.createElement('li')
    row.dataset.groupId = group.id
    row.style.borderInlineStart = '3px solid ' + markers[index].colour
    row.textContent = group.name + ' · ' + group.roster.length + ' riders ? ' + group.km.toFixed(2) + ' km ? ' + group.speedKmh.toFixed(1) + ' km/h'
    return row
  }))
  for (const element of controls.querySelectorAll('button')) {
    element.setAttribute('aria-pressed', String(Number(element.dataset.second) === second))
  }
}

for (const [label, second] of moments) {
  const button = document.createElement('button')
  button.textContent = label
  button.dataset.second = String(second)
  button.addEventListener('click', () => render(second))
  controls.append(button)
}
const requested = Number(params.get('second'))
render(Number.isFinite(requested) ? requested : 0)
