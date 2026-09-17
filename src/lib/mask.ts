import type { EyeMask, EllipseMask, Point, PolygonMask } from './types'
import { pointInPolygon } from './math'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  cx: number
  cy: number
}

export function getMaskBounds(mask: EyeMask): Bounds {
  if (mask.type === 'ellipse') {
    const cos = Math.abs(Math.cos(mask.rotation))
    const sin = Math.abs(Math.sin(mask.rotation))
    const ex = mask.rx * cos + mask.ry * sin
    const ey = mask.rx * sin + mask.ry * cos
    return makeBounds(mask.cx - ex, mask.cy - ey, mask.cx + ex, mask.cy + ey)
  }

  if (mask.points.length === 0) return makeBounds(0, 0, 1, 1)
  const xs = mask.points.map((point) => point.x)
  const ys = mask.points.map((point) => point.y)
  return makeBounds(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))
}

function makeBounds(minX: number, minY: number, maxX: number, maxY: number): Bounds {
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  }
}

export function traceMaskPath(ctx: CanvasRenderingContext2D, mask: EyeMask) {
  ctx.beginPath()
  if (mask.type === 'ellipse') {
    ctx.save()
    ctx.translate(mask.cx, mask.cy)
    ctx.rotate(mask.rotation)
    ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2)
    ctx.restore()
    return
  }

  if (mask.points.length < 3) return
  ctx.moveTo(mask.points[0].x, mask.points[0].y)
  for (let i = 1; i < mask.points.length; i += 1) ctx.lineTo(mask.points[i].x, mask.points[i].y)
  ctx.closePath()
}

export function pointInMask(point: Point, mask: EyeMask) {
  if (mask.type === 'polygon') return pointInPolygon(point, mask.points)

  const dx = point.x - mask.cx
  const dy = point.y - mask.cy
  const cos = Math.cos(-mask.rotation)
  const sin = Math.sin(-mask.rotation)
  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos
  return (localX * localX) / (mask.rx * mask.rx) + (localY * localY) / (mask.ry * mask.ry) <= 1
}

export function translateMask(mask: EyeMask, dx: number, dy: number): EyeMask {
  if (mask.type === 'ellipse') return { ...mask, cx: mask.cx + dx, cy: mask.cy + dy }
  return { ...mask, points: mask.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) }
}

export function cloneMask(mask: EyeMask): EyeMask {
  if (mask.type === 'ellipse') return { ...mask }
  return { ...mask, points: mask.points.map((point) => ({ ...point })) }
}

export function makeEllipseMask(cx: number, cy: number, rx: number, ry: number): EllipseMask {
  return { type: 'ellipse', cx, cy, rx: Math.max(2, rx), ry: Math.max(2, ry), rotation: 0, feather: 0 }
}

export function makePolygonMask(points: Point[]): PolygonMask {
  return { type: 'polygon', points: points.map((point) => ({ ...point })), feather: 0 }
}
