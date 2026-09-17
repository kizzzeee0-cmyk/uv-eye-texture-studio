import { getMaskBounds, traceMaskPath, translateMask } from './mask'
import { mulberry32 } from './random'
import type { EyeMask, EyeStyle } from './types'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized.padEnd(6, '0').slice(0, 6)
  const value = Number.parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function ellipsePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2)
}

function applyGlow(ctx: CanvasRenderingContext2D, color: string, amount: number, basis: number) {
  if (amount <= 0) {
    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'
    return
  }
  ctx.shadowColor = color
  ctx.shadowBlur = Math.max(0, amount * basis)
}

export function compositeIrisDesign(
  target: CanvasRenderingContext2D,
  mask: EyeMask,
  style: EyeStyle,
  width: number,
  height: number,
) {
  const designCanvas = document.createElement('canvas')
  designCanvas.width = Math.max(1, Math.ceil(width))
  designCanvas.height = Math.max(1, Math.ceil(height))
  const designCtx = designCanvas.getContext('2d')
  if (!designCtx) return

  renderIrisCore(designCtx, mask, style)

  const feather = Math.max(0, mask.feather)
  if (feather > 0.01) {
    const hardMask = document.createElement('canvas')
    hardMask.width = designCanvas.width
    hardMask.height = designCanvas.height
    const hardCtx = hardMask.getContext('2d')
    if (hardCtx) {
      hardCtx.fillStyle = '#ffffff'
      traceMaskPath(hardCtx, mask)
      hardCtx.fill()

      const softMask = document.createElement('canvas')
      softMask.width = designCanvas.width
      softMask.height = designCanvas.height
      const softCtx = softMask.getContext('2d')
      if (softCtx) {
        softCtx.filter = `blur(${Math.max(0.5, feather)}px)`
        softCtx.drawImage(hardMask, 0, 0)
        softCtx.filter = 'none'
        // Keep the blur strictly inside the hard mask so pixels outside the selected UV area remain untouched.
        softCtx.globalCompositeOperation = 'destination-in'
        softCtx.drawImage(hardMask, 0, 0)
        designCtx.globalCompositeOperation = 'destination-in'
        designCtx.drawImage(softMask, 0, 0)
        designCtx.globalCompositeOperation = 'source-over'
      }
    }
  }

  target.drawImage(designCanvas, 0, 0)
}

export function renderIrisCore(ctx: CanvasRenderingContext2D, mask: EyeMask, style: EyeStyle) {
  const bounds = getMaskBounds(mask)
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  const minR = Math.max(1, Math.min(rx, ry))
  const cx = bounds.cx
  const cy = bounds.cy

  ctx.save()
  traceMaskPath(ctx, mask)
  ctx.clip()
  ctx.globalAlpha = style.opacity
  ctx.filter = `brightness(${style.effects.brightness}) contrast(${style.effects.contrast}) saturate(${style.effects.saturation})`

  if (style.gradient.enabled) {
    const gradient = ctx.createLinearGradient(cx, bounds.minY, cx, bounds.maxY)
    gradient.addColorStop(0, style.gradient.top)
    gradient.addColorStop(0.24, style.gradient.upperMid)
    gradient.addColorStop(0.5, style.gradient.mid)
    gradient.addColorStop(0.76, style.gradient.lowerMid)
    gradient.addColorStop(1, style.gradient.bottom)
    ctx.fillStyle = gradient
    traceMaskPath(ctx, mask)
    ctx.fill()
  }

  if (style.upperShadow.enabled) drawUpperShadow(ctx, bounds, style)
  if (style.lowerGlow.enabled) drawLowerGlow(ctx, bounds, style)
  if (style.radial.enabled) drawRadial(ctx, cx, cy, rx, ry, style)
  if (style.softTexture.enabled) drawSoftTexture(ctx, cx, cy, rx, ry, style)
  if (style.reflection.enabled) drawReflection(ctx, bounds, style)
  if (style.lowerMotif.enabled) drawLowerMotif(ctx, bounds, style)
  if (style.particles.enabled) drawParticles(ctx, bounds, style)

  ctx.filter = 'none'

  if (style.outerRing.enabled) {
    ctx.save()
    ctx.globalAlpha = style.outerRing.opacity * style.opacity
    ctx.strokeStyle = style.outerRing.color
    ctx.lineWidth = Math.max(1, minR * style.outerRing.thickness)
    ctx.filter = style.outerRing.blur > 0 ? `blur(${style.outerRing.blur * minR}px)` : 'none'
    traceMaskPath(ctx, mask)
    ctx.stroke()
    ctx.restore()
  }

  if (style.extraInnerRing.enabled) drawInnerRing(ctx, cx, cy, rx, ry, style.extraInnerRing, style.opacity)
  if (style.innerRing.enabled) drawInnerRing(ctx, cx, cy, rx, ry, style.innerRing, style.opacity)
  if (style.pupil.enabled) drawPupil(ctx, cx, cy, rx, ry, style)
  if (style.highlight.enabled) drawHighlights(ctx, bounds, style)

  ctx.restore()
}

function drawUpperShadow(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, style: EyeStyle) {
  const { upperShadow } = style
  const endY = bounds.minY + bounds.height * Math.max(0.15, Math.min(0.9, upperShadow.height))
  const gradient = ctx.createLinearGradient(0, bounds.minY, 0, endY)
  gradient.addColorStop(0, hexToRgba(upperShadow.color, upperShadow.intensity))
  gradient.addColorStop(Math.max(0.1, 0.7 - upperShadow.softness * 0.35), hexToRgba(upperShadow.color, upperShadow.intensity * 0.55))
  gradient.addColorStop(1, hexToRgba(upperShadow.color, 0))
  ctx.fillStyle = gradient
  ctx.fillRect(bounds.minX, bounds.minY, bounds.width, endY - bounds.minY)
}

function drawLowerGlow(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, style: EyeStyle) {
  const { lowerGlow } = style
  const cx = bounds.cx
  const cy = bounds.minY + bounds.height * (0.62 + lowerGlow.height * 0.18)
  const radius = Math.max(bounds.width, bounds.height) * (0.3 + lowerGlow.spread * 0.42)
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  gradient.addColorStop(0, hexToRgba(lowerGlow.color, lowerGlow.intensity * 0.7))
  gradient.addColorStop(0.48, hexToRgba(lowerGlow.color, lowerGlow.intensity * 0.26))
  gradient.addColorStop(1, hexToRgba(lowerGlow.color, 0))
  ctx.fillStyle = gradient
  ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height)
}

function drawInnerRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ring: EyeStyle['innerRing'],
  overallOpacity: number,
) {
  ctx.save()
  ctx.globalAlpha = ring.opacity * overallOpacity
  ctx.strokeStyle = ring.color
  ctx.lineWidth = Math.max(1, Math.min(rx, ry) * ring.thickness)
  ctx.filter = ring.blur > 0 ? `blur(${ring.blur * Math.min(rx, ry)}px)` : 'none'
  ellipsePath(ctx, cx, cy, rx * ring.radius, ry * ring.radius)
  ctx.stroke()
  ctx.restore()
}

function drawPupil(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, style: EyeStyle) {
  const pupil = style.pupil
  const px = cx + (pupil.x - 0.5) * rx * 2
  const py = cy + (pupil.y - 0.5) * ry * 2
  const prx = rx * pupil.scaleX
  const pry = ry * (pupil.shape === 'circle' ? pupil.scaleX : pupil.scaleY)
  ctx.save()
  ctx.globalAlpha = pupil.opacity * style.opacity
  ctx.fillStyle = pupil.color
  ctx.filter = pupil.softness > 0 ? `blur(${pupil.softness * Math.min(rx, ry) * 0.15}px)` : 'none'
  ellipsePath(ctx, px, py, prx, pry)
  ctx.fill()

  // A subtle internal depth ring prevents the pupil from reading as a flat black dot.
  const depth = ctx.createRadialGradient(px, py + pry * 0.18, prx * 0.05, px, py, Math.max(prx, pry))
  depth.addColorStop(0, 'rgba(255,255,255,0.10)')
  depth.addColorStop(0.55, 'rgba(255,255,255,0.025)')
  depth.addColorStop(1, 'rgba(0,0,0,0.24)')
  ctx.fillStyle = depth
  ellipsePath(ctx, px, py, prx, pry)
  ctx.fill()
  ctx.restore()
}

function drawRadial(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, style: EyeStyle) {
  const radial = style.radial
  const rand = mulberry32(radial.seed)
  const count = Math.max(4, Math.round(radial.density))
  ctx.save()
  ctx.strokeStyle = hexToRgba(radial.color, Math.min(1, radial.strength * 0.56))
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i += 1) {
    const baseAngle = (i / count) * Math.PI * 2 + radial.rotation
    const angle = baseAngle + (rand() - 0.5) * radial.randomness * 0.3
    const inner = 0.16 + rand() * 0.12
    const outer = Math.min(0.98, inner + radial.length * (0.62 + rand() * 0.3))
    const x1 = cx + Math.cos(angle) * rx * inner
    const y1 = cy + Math.sin(angle) * ry * inner
    const x2 = cx + Math.cos(angle) * rx * outer
    const y2 = cy + Math.sin(angle) * ry * outer
    ctx.globalAlpha = style.opacity * (0.35 + rand() * 0.65)
    ctx.lineWidth = Math.max(0.55, Math.min(rx, ry) * radial.width * (0.65 + rand() * 0.7))
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    const curve = (rand() - 0.5) * Math.min(rx, ry) * 0.08
    const mx = (x1 + x2) / 2 - Math.sin(angle) * curve
    const my = (y1 + y2) / 2 + Math.cos(angle) * curve
    ctx.quadraticCurveTo(mx, my, x2, y2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSoftTexture(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, style: EyeStyle) {
  const texture = style.softTexture
  const rand = mulberry32(texture.seed)
  ctx.save()
  for (let i = 0; i < texture.amount; i += 1) {
    const angle = rand() * Math.PI * 2
    const radius = Math.sqrt(rand()) * 0.9
    const x = cx + Math.cos(angle) * rx * radius
    const y = cy + Math.sin(angle) * ry * radius
    const size = Math.min(rx, ry) * (0.018 + rand() * 0.05)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size)
    gradient.addColorStop(0, hexToRgba(texture.color, texture.strength * (0.25 + rand() * 0.5)))
    gradient.addColorStop(1, hexToRgba(texture.color, 0))
    ctx.fillStyle = gradient
    ctx.fillRect(x - size, y - size, size * 2, size * 2)
  }
  ctx.restore()
}

function drawReflection(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, style: EyeStyle) {
  const reflection = style.reflection
  const cx = bounds.minX + bounds.width * reflection.x
  const cy = bounds.minY + bounds.height * reflection.y
  const rx = bounds.width * reflection.scaleX * 0.5
  const ry = bounds.height * reflection.scaleY * 0.5
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(reflection.rotation)
  ctx.globalAlpha = reflection.opacity * style.opacity
  ctx.filter = reflection.blur > 0 ? `blur(${reflection.blur * Math.min(bounds.width, bounds.height)}px)` : 'none'

  if (reflection.type === 'curved') {
    ctx.strokeStyle = reflection.color
    ctx.lineWidth = Math.max(1, ry * 0.32)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(2, rx * 0.75), Math.PI * 0.72, Math.PI * 1.42)
    ctx.stroke()
  } else if (reflection.type === 'side') {
    const gradient = ctx.createLinearGradient(-rx, 0, rx, 0)
    gradient.addColorStop(0, hexToRgba(reflection.color, 0.95))
    gradient.addColorStop(1, hexToRgba(reflection.color, 0))
    ctx.fillStyle = gradient
    ellipsePath(ctx, 0, 0, rx, ry)
    ctx.fill()
  } else {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry))
    gradient.addColorStop(0, hexToRgba(reflection.color, reflection.type === 'haze' ? 0.78 : 1))
    gradient.addColorStop(1, hexToRgba(reflection.color, 0))
    ctx.fillStyle = gradient
    ellipsePath(ctx, 0, 0, rx, ry)
    ctx.fill()
  }
  ctx.restore()
}

function drawLowerMotif(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, style: EyeStyle) {
  const motif = style.lowerMotif
  const count = Math.max(1, Math.round(motif.count))
  const basis = Math.min(bounds.width, bounds.height)
  const baseY = bounds.minY + bounds.height * motif.y
  ctx.save()
  ctx.globalAlpha = motif.opacity * style.opacity
  ctx.fillStyle = motif.color
  ctx.strokeStyle = motif.color
  applyGlow(ctx, motif.color, motif.glow + style.effects.bloom, basis)

  if (motif.type === 'wave') {
    ctx.lineWidth = Math.max(1, basis * motif.size * 0.24)
    ctx.lineCap = 'round'
    ctx.beginPath()
    const left = bounds.cx - bounds.width * motif.spread * 0.5
    const right = bounds.cx + bounds.width * motif.spread * 0.5
    const segments = Math.max(4, count)
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments
      const x = left + (right - left) * t
      const y = baseY + Math.sin(t * Math.PI * 3) * basis * motif.size * 0.18
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
    return
  }

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const centered = (t - 0.5) * 2
    const x = bounds.cx + centered * bounds.width * motif.spread * 0.5
    const arcLift = (1 - centered * centered) * basis * 0.08
    const y = baseY + arcLift
    const size = basis * motif.size * (0.78 + (1 - Math.abs(centered)) * 0.28)
    const angle = centered * 0.5

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    if (motif.type === 'petal') {
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.quadraticCurveTo(size * 0.75, -size * 0.25, 0, size)
      ctx.quadraticCurveTo(-size * 0.75, -size * 0.25, 0, -size)
      ctx.fill()
    } else if (motif.type === 'dash') {
      ctx.lineWidth = Math.max(1, size * 0.36)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-size * 0.55, 0)
      ctx.lineTo(size * 0.55, 0)
      ctx.stroke()
    } else if (motif.type === 'droplet') {
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.bezierCurveTo(size * 0.75, -size * 0.2, size * 0.58, size * 0.72, 0, size)
      ctx.bezierCurveTo(-size * 0.58, size * 0.72, -size * 0.75, -size * 0.2, 0, -size)
      ctx.fill()
    } else if (motif.type === 'glass') {
      ctx.beginPath()
      ctx.moveTo(-size * 0.65, size * 0.2)
      ctx.lineTo(-size * 0.1, -size)
      ctx.lineTo(size * 0.72, -size * 0.16)
      ctx.lineTo(size * 0.28, size * 0.84)
      ctx.closePath()
      ctx.fill()
    } else {
      ellipsePath(ctx, 0, 0, size * 0.52, size, angle)
      ctx.fill()
    }
    ctx.restore()
  }
  ctx.restore()
}

function drawParticles(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, style: EyeStyle) {
  const particles = style.particles
  const rand = mulberry32(particles.seed)
  const basis = Math.min(bounds.width, bounds.height)
  ctx.save()
  ctx.fillStyle = particles.color
  ctx.strokeStyle = particles.color
  ctx.globalAlpha = particles.opacity * style.opacity
  applyGlow(ctx, particles.color, particles.glow + style.effects.bloom, basis)
  for (let i = 0; i < particles.count; i += 1) {
    const angle = rand() * Math.PI * 2
    const radius = 0.25 + rand() * 0.62
    const x = bounds.cx + Math.cos(angle) * bounds.width * radius * 0.45
    const y = bounds.cy + Math.sin(angle) * bounds.height * radius * 0.45
    const size = basis * (particles.sizeMin + rand() * Math.max(0, particles.sizeMax - particles.sizeMin))
    if (particles.type === 'star') {
      ctx.lineWidth = Math.max(0.7, size * 0.25)
      ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke()
    } else if (particles.type === 'diamond') {
      ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.72, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size * 0.72, y); ctx.closePath(); ctx.fill()
    } else {
      ellipsePath(ctx, x, y, size * (particles.type === 'tinyCircle' ? 0.65 : 1), size * (particles.type === 'tinyCircle' ? 0.65 : 1))
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawHighlights(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, style: EyeStyle) {
  const highlight = style.highlight
  const basis = Math.min(bounds.width, bounds.height)
  const x = bounds.minX + bounds.width * highlight.x
  const y = bounds.minY + bounds.height * highlight.y
  const size = basis * 0.12 * highlight.size
  ctx.save()
  ctx.fillStyle = highlight.color
  ctx.strokeStyle = highlight.color
  ctx.globalAlpha = highlight.opacity * style.opacity
  applyGlow(ctx, highlight.color, highlight.glow + style.effects.bloom, basis)

  const circle = (dx: number, dy: number, scale: number, squash = 1) => {
    ellipsePath(ctx, x + dx * size, y + dy * size, size * scale, size * scale * squash)
    ctx.fill()
  }

  switch (highlight.preset) {
    case 'singleLarge':
      circle(0, 0, 1.05, 0.95)
      break
    case 'animeStandard':
      circle(0, 0, 1, 0.88)
      circle(1.75, 1.05, 0.34)
      circle(-0.55, 2.0, 0.2)
      break
    case 'glassyDouble':
      circle(0, 0, 1.08, 0.9)
      circle(1.58, 0.62, 0.42)
      circle(0.65, 1.9, 0.16)
      break
    case 'cluster':
      circle(0, 0, 0.72)
      circle(1.0, 0.35, 0.42)
      circle(-0.45, 1.05, 0.28)
      circle(1.55, 1.25, 0.2)
      break
    case 'sideHighlight':
      ctx.beginPath()
      ctx.ellipse(x, y, size * 0.55, size * 1.65, -0.5, 0, Math.PI * 2)
      ctx.fill()
      circle(1.3, 0.9, 0.32)
      break
    case 'topDome':
      ctx.globalAlpha *= 0.74
      ctx.lineWidth = Math.max(1, size * 0.55)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(x + size * 0.55, y + size * 0.8, size * 1.65, Math.PI * 1.08, Math.PI * 1.72)
      ctx.stroke()
      circle(1.8, 1.1, 0.28)
      break
  }
  ctx.restore()
}

export function exportFullUvPng(
  originalImage: HTMLImageElement,
  masks: Record<'left' | 'right', EyeMask>,
  styles: Record<'left' | 'right', EyeStyle>,
) {
  const canvas = document.createElement('canvas')
  canvas.width = originalImage.naturalWidth
  canvas.height = originalImage.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create export canvas context.')
  ctx.drawImage(originalImage, 0, 0)
  compositeIrisDesign(ctx, masks.left, styles.left, canvas.width, canvas.height)
  compositeIrisDesign(ctx, masks.right, styles.right, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export function exportSingleIrisPng(mask: EyeMask, style: EyeStyle, padding = 28) {
  const bounds = getMaskBounds(mask)
  const width = Math.ceil(bounds.width + padding * 2)
  const height = Math.ceil(bounds.height + padding * 2)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create iris export canvas context.')
  const localMask = translateMask(mask, padding - bounds.minX, padding - bounds.minY)
  compositeIrisDesign(ctx, localMask, style, width, height)
  return canvas.toDataURL('image/png')
}
