import { distanceX } from './courseProfile'
import type { ReplayGroup } from './timeline'

const colours = ['#f7c46c', '#77d7ff', '#91e8ab', '#f6a8d3', '#d3b9ff', '#ffa98f']

export function markerLayout(groups: readonly ReplayGroup[], distanceKm: number) {
  return groups.map((group, index) => {
    const colourIndex = group.id === 'lead' ? 0 : group.id === 'peloton' ? 1 : [...group.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colours.length
    return { id: group.id, name: group.name, x: distanceX(group.km, distanceKm), y: 32 + index % 8 * 12, colour: colours[colourIndex] }
  })
}

export function showMarkers(element: Element, markers: ReturnType<typeof markerLayout>): void {
  const previous = new Map([...element.children].map(child => [child.getAttribute('data-group-id'), child]))
  for (const marker of markers) {
    const node = previous.get(marker.id) ?? document.createElementNS('http://www.w3.org/2000/svg', 'g')
    previous.delete(marker.id)
    node.setAttribute('data-group-id', marker.id)
    node.setAttribute('aria-label', marker.name)
    const line = node.querySelector('line') ?? document.createElementNS(node.namespaceURI, 'line')
    const dot = node.querySelector('circle') ?? document.createElementNS(node.namespaceURI, 'circle')
    for (const [key, value] of Object.entries({ x1: marker.x, x2: marker.x, y1: marker.y, y2: 204, stroke: marker.colour })) {
      line.setAttribute(key, String(value))
    }
    for (const [key, value] of Object.entries({ cx: marker.x, cy: marker.y, r: 4, fill: marker.colour })) {
      dot.setAttribute(key, String(value))
    }
    if (!line.parentElement) node.append(line, dot)
    if (!node.parentElement) element.append(node)
  }
  for (const element of previous.values()) element.remove()
}
