import type { Point, ViewState } from './types'

export interface RectSize {
  width: number
  height: number
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function getBaseScale(canvas: RectSize, image: RectSize) {
  return Math.min(canvas.width / image.width, canvas.height / image.height)
}

export function imageToScreen(
  x: number,
  y: number,
  canvas: RectSize,
  image: RectSize,
  view: ViewState,
) {
  const baseScale = getBaseScale(canvas, image)
  const scale = baseScale * view.zoom
  const drawnWidth = image.width * scale
  const drawnHeight = image.height * scale
  const startX = (canvas.width - drawnWidth) / 2 + view.offsetX
  const startY = (canvas.height - drawnHeight) / 2 + view.offsetY

  return { x: startX + x * scale, y: startY + y * scale, scale, startX, startY }
}

export function screenToImage(
  x: number,
  y: number,
  canvas: RectSize,
  image: RectSize,
  view: ViewState,
) {
  const transform = imageToScreen(0, 0, canvas, image, view)
  return { x: (x - transform.startX) / transform.scale, y: (y - transform.startY) / transform.scale }
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function distanceToSegment(point: Point, a: Point, b: Point) {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const wx = point.x - a.x
  const wy = point.y - a.y
  const len2 = vx * vx + vy * vy
  if (len2 === 0) return distance(point, a)
  const t = clamp((wx * vx + wy * vy) / len2, 0, 1)
  return distance(point, { x: a.x + vx * t, y: a.y + vy * t })
}

export function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-9) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function nearestPointIndex(point: Point, points: Point[]) {
  let best = -1
  let bestDistance = Number.POSITIVE_INFINITY
  points.forEach((candidate, index) => {
    const d = distance(point, candidate)
    if (d < bestDistance) {
      bestDistance = d
      best = index
    }
  })
  return { index: best, distance: bestDistance }
}

export function nearestSegmentIndex(point: Point, points: Point[]) {
  let best = -1
  let bestDistance = Number.POSITIVE_INFINITY
  if (points.length < 2) return { index: best, distance: bestDistance }
  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length
    const d = distanceToSegment(point, points[i], points[next])
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  }
  return { index: best, distance: bestDistance }
}
