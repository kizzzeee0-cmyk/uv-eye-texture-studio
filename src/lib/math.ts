import type { EyeMask, ViewState } from './types'

export interface RectSize {
  width: number
  height: number
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

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

  return {
    x: startX + x * scale,
    y: startY + y * scale,
    scale,
    startX,
    startY,
  }
}

export function screenToImage(
  x: number,
  y: number,
  canvas: RectSize,
  image: RectSize,
  view: ViewState,
) {
  const t = imageToScreen(0, 0, canvas, image, view)
  return {
    x: (x - t.startX) / t.scale,
    y: (y - t.startY) / t.scale,
  }
}

export function pointInRotatedEllipse(px: number, py: number, mask: EyeMask) {
  const dx = px - mask.cx
  const dy = py - mask.cy
  const cos = Math.cos(-mask.rotation)
  const sin = Math.sin(-mask.rotation)
  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos
  const normalized = (localX * localX) / (mask.rx * mask.rx) + (localY * localY) / (mask.ry * mask.ry)
  return normalized <= 1
}
