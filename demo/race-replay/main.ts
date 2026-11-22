import { fixtureFrameAt } from './fixture'
import { syntheticTenRiderStage } from '../../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import { courseProfile, distanceX } from './courseProfile'

const root = document.querySelector<HTMLElement>('#replay')
if (!root) throw new Error('Replay root is missing.')
root.innerHTML = '<h1>Race replay</h1><p>Synthetic 10 km road stage</p><section class="panel controls" aria-label="Fixture moments"></section><section class="panel"><h2>Stage profile</h2><div id="course"></div><h2>Groups on the road</h2><ul id="groups"></ul></section>'
const course = root.querySelector('#course')!
course.innerHTML = courseProfile(syntheticTenRiderStage.profilePoints, syntheticTenRiderStage.distanceKm)
const position = course.querySelector('#position')!
const list = root.querySelector('#groups')!
const controls = root.querySelector('.controls')!
const moments = [['Start', 0], ['Split', 300], ['Mid-chase', 450], ['Catch', 600]] as const

function render(second: number) {
  const frame = fixtureFrameAt(second)
  const x = distanceX(frame.groups[0].km, syntheticTenRiderStage.distanceKm)
  position.setAttribute('x1', String(x))
  position.setAttribute('x2', String(x))
  list.replaceChildren(...frame.groups.map(group => {
    const row = document.createElement('li')
    row.dataset.groupId = group.id
    row.textContent = group.name + ' · ' + group.roster.length + ' riders'
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
const requested = Number(new URLSearchParams(location.search).get('second'))
render(moments.some(([, second]) => second === requested) ? requested : 0)
