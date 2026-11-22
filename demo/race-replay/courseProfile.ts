export const plot = { left: 48, right: 696, top: 26, bottom: 204, width: 720, height: 244 } as const

export interface CoursePoint {
  kilometre: number
  elevationMetres: number
}

export function distanceX(km: number, distanceKm: number): number {
  return plot.left + km / distanceKm * (plot.right - plot.left)
}

export function courseProfile(points: readonly CoursePoint[], distanceKm: number): string {
  const low = Math.floor(Math.min(...points.map(point => point.elevationMetres)) / 10) * 10
  const high = Math.max(low + 10, Math.ceil(Math.max(...points.map(point => point.elevationMetres)) / 10) * 10)
  const elevationY = (metres: number) => plot.bottom - (metres - low) / (high - low) * (plot.bottom - plot.top)
  const string = points.map(point => distanceX(point.kilometre, distanceKm) + ',' + elevationY(point.elevationMetres)).join(' ')
  const ticks = Array.from({ length: 6 }, (_, index) => {
    const km = distanceKm * index / 5
    const x = distanceX(km, distanceKm)
    return '<text x="' + x + '" y="229" text-anchor="middle">' + Number(km.toFixed(2)) + ' km</text>'
  }).join('')
  return '<svg class="profile" viewBox="0 0 720 244" role="img" aria-label="Stage distance in kilometres and elevation in metres">'
    + '<path class="axis" d="M48 26V204H696" />'
    + '<text x="42" y="32" text-anchor="end">' + high + ' m</text>'
    + '<text x="42" y="204" text-anchor="end">' + low + ' m</text>'
    + '<polygon class="course-fill" points="' + plot.left + ',' + plot.bottom + ' ' + string + ' ' + plot.right + ',' + plot.bottom + '" />'
    + '<polyline class="course-line" points="' + string + '" />' + ticks
    + '<g id="profile-markers"></g></svg>'
}
