import { makeEllipseMask, makePolygonMask } from './mask'
import type { EyeMask, EyeSide, Point } from './types'

interface Component {
  area: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  cx: number
  cy: number
  samples: Point[]
}

export interface DetectResult {
  masks: Record<EyeSide, EyeMask>
  message: string
}

export function detectEyeMasksFromAlpha(image: HTMLImageElement): DetectResult {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('이미지 분석용 Canvas를 만들 수 없습니다.')
  }
  ctx.drawImage(image, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const components = extractComponents(data.data, canvas.width, canvas.height)

  if (components.length === 0) {
    throw new Error('불투명한 UV 영역을 찾지 못했습니다. 자동 인식은 눈 UV 주변이 투명한 PNG에서 가장 잘 작동합니다.')
  }

  const leftCandidates = components.filter((component) => component.cx < canvas.width * 0.5)
  const rightCandidates = components.filter((component) => component.cx >= canvas.width * 0.5)

  const chooseBest = (pool: Component[]) => {
    const filtered = pool
      .filter((component) => component.area > Math.max(40, canvas.width * canvas.height * 0.00015))
      .sort((a, b) => scoreComponent(b, canvas.width, canvas.height) - scoreComponent(a, canvas.width, canvas.height))
    return filtered[0] ?? null
  }

  const left = chooseBest(leftCandidates)
  const right = chooseBest(rightCandidates)

  if (!left || !right) {
    const ordered = [...components].sort((a, b) => b.area - a.area).slice(0, 2).sort((a, b) => a.cx - b.cx)
    if (ordered.length < 2) {
      const fallback = componentToMask(ordered[0] ?? components[0])
      return {
        masks: { left: fallback, right: fallback },
        message: '불투명 영역을 하나만 찾아 동일한 마스크를 양쪽에 임시 적용했습니다.',
      }
    }
    return {
      masks: { left: componentToMask(ordered[0]), right: componentToMask(ordered[1]) },
      message: '가장 적합한 두 개의 불투명 영역을 양쪽 눈으로 인식했습니다. 필요하면 점 편집으로 보정해주세요.',
    }
  }

  return {
    masks: { left: componentToMask(left), right: componentToMask(right) },
    message: '투명하지 않은 UV 영역에서 양쪽 눈 마스크를 자동 인식했습니다.',
  }
}

function scoreComponent(component: Component, width: number, height: number) {
  const areaScore = component.area
  const topPreference = 1 - Math.min(1, component.cy / Math.max(1, height))
  const aspect = (component.maxX - component.minX + 1) / Math.max(1, component.maxY - component.minY + 1)
  const aspectPenalty = Math.abs(aspect - 1)
  return areaScore * (1 + topPreference * 0.2) - aspectPenalty * width * 0.2
}

function extractComponents(data: Uint8ClampedArray, width: number, height: number) {
  const visited = new Uint8Array(width * height)
  const components: Component[] = []
  const queue = new Int32Array(width * height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (visited[index]) continue
      visited[index] = 1
      if (data[index * 4 + 3] < 10) continue

      let head = 0
      let tail = 0
      queue[tail++] = index
      let area = 0
      let minX = x
      let minY = y
      let maxX = x
      let maxY = y
      let sumX = 0
      let sumY = 0
      const samples: Point[] = []

      while (head < tail) {
        const current = queue[head++]
        const cx = current % width
        const cy = Math.floor(current / width)
        area += 1
        sumX += cx
        sumY += cy
        if (cx < minX) minX = cx
        if (cy < minY) minY = cy
        if (cx > maxX) maxX = cx
        if (cy > maxY) maxY = cy
        if ((area % 3) === 0) samples.push({ x: cx, y: cy })

        const neighbors = [current - 1, current + 1, current - width, current + width]
        for (const next of neighbors) {
          if (next < 0 || next >= width * height) continue
          const nx = next % width
          const ny = Math.floor(next / width)
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue
          if (visited[next]) continue
          visited[next] = 1
          if (data[next * 4 + 3] >= 10) {
            queue[tail++] = next
          }
        }
      }

      components.push({
        area,
        minX,
        minY,
        maxX,
        maxY,
        cx: sumX / area,
        cy: sumY / area,
        samples: samples.length > 0 ? samples : [{ x, y }],
      })
    }
  }

  return components
}

function componentToMask(component: Component): EyeMask {
  const polygon = componentToPolygon(component)
  if (polygon.length >= 6) {
    const mask = makePolygonMask(polygon)
    mask.feather = 0
    return mask
  }
  const cx = (component.minX + component.maxX) / 2
  const cy = (component.minY + component.maxY) / 2
  const rx = (component.maxX - component.minX + 1) / 2
  const ry = (component.maxY - component.minY + 1) / 2
  return makeEllipseMask(cx, cy, rx, ry)
}

function componentToPolygon(component: Component) {
  const points: Point[] = []
  const bins = 20
  for (let i = 0; i < bins; i += 1) {
    const start = (i / bins) * Math.PI * 2
    const end = ((i + 1) / bins) * Math.PI * 2
    let best: { point: Point; distance: number } | null = null
    for (const sample of component.samples) {
      const angle = normalizeAngle(Math.atan2(sample.y - component.cy, sample.x - component.cx))
      if (!angleInRange(angle, start, end)) continue
      const dx = sample.x - component.cx
      const dy = sample.y - component.cy
      const distance = dx * dx + dy * dy
      if (!best || distance > best.distance) best = { point: sample, distance }
    }
    if (best) points.push(best.point)
  }
  return dedupePolygon(points)
}

function normalizeAngle(angle: number) {
  let result = angle
  while (result < 0) result += Math.PI * 2
  while (result >= Math.PI * 2) result -= Math.PI * 2
  return result
}

function angleInRange(angle: number, start: number, end: number) {
  const a = normalizeAngle(angle)
  const s = normalizeAngle(start)
  const e = normalizeAngle(end)
  if (s <= e) return a >= s && a < e
  return a >= s || a < e
}

function dedupePolygon(points: Point[]) {
  const unique: Point[] = []
  for (const point of points) {
    const previous = unique[unique.length - 1]
    if (!previous || Math.hypot(previous.x - point.x, previous.y - point.y) > 2) {
      unique.push({ x: point.x, y: point.y })
    }
  }
  if (unique.length >= 2) {
    const first = unique[0]
    const last = unique[unique.length - 1]
    if (Math.hypot(first.x - last.x, first.y - last.y) <= 2) unique.pop()
  }
  return unique
}
