import { getMaskBounds, traceMaskPath, translateMask } from './mask'
import { mulberry32 } from './random'
import type { EyeDesignV5, EyeMask, OverlayImageState, PupilShape } from './types'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized.padEnd(6, '0').slice(0, 6)
  const value = Number.parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function mappedX(value: number, mirrorX: boolean) {
  return mirrorX ? 1 - value : value
}

function ellipsePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2)
}

function shapePath(ctx: CanvasRenderingContext2D, shape: PupilShape, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  ctx.beginPath()
  if (shape === 'circle' || shape === 'ovalVertical' || shape === 'ovalHorizontal' || shape === 'softOval') {
    ctx.ellipse(0, 0, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2)
  } else if (shape === 'slit') {
    ctx.moveTo(0, -ry)
    ctx.bezierCurveTo(rx * 0.75, -ry * 0.18, rx * 0.42, ry * 0.8, 0, ry)
    ctx.bezierCurveTo(-rx * 0.42, ry * 0.8, -rx * 0.75, -ry * 0.18, 0, -ry)
    ctx.closePath()
  } else if (shape === 'heart') {
    ctx.moveTo(0, ry)
    ctx.bezierCurveTo(rx * 1.12, ry * 0.35, rx * 1.05, -ry * 0.65, 0, -ry * 0.18)
    ctx.bezierCurveTo(-rx * 1.05, -ry * 0.65, -rx * 1.12, ry * 0.35, 0, ry)
    ctx.closePath()
  } else if (shape === 'petal') {
    ctx.moveTo(0, -ry)
    ctx.bezierCurveTo(rx * 0.86, -ry * 0.48, rx * 0.76, ry * 0.48, 0, ry)
    ctx.bezierCurveTo(-rx * 0.76, ry * 0.48, -rx * 0.86, -ry * 0.48, 0, -ry)
    ctx.closePath()
  } else if (shape === 'droplet') {
    ctx.moveTo(0, -ry)
    ctx.bezierCurveTo(rx * 0.85, -ry * 0.05, rx * 0.72, ry * 0.7, 0, ry)
    ctx.bezierCurveTo(-rx * 0.72, ry * 0.7, -rx * 0.85, -ry * 0.05, 0, -ry)
    ctx.closePath()
  } else if (shape === 'lens') {
    ctx.moveTo(-rx, 0)
    ctx.quadraticCurveTo(0, -ry, rx, 0)
    ctx.quadraticCurveTo(0, ry, -rx, 0)
    ctx.closePath()
  } else {
    // core
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  }
  ctx.restore()
}

function fillPupilShape(ctx: CanvasRenderingContext2D, shape: PupilShape, cx: number, cy: number, rx: number, ry: number, rotation: number) {
  shapePath(ctx, shape, cx, cy, rx, ry, rotation)
  ctx.fill()
}

function strokePupilShape(ctx: CanvasRenderingContext2D, shape: PupilShape, cx: number, cy: number, rx: number, ry: number, rotation: number) {
  shapePath(ctx, shape, cx, cy, rx, ry, rotation)
  ctx.stroke()
}

export function compositeEyeDesign(
  target: CanvasRenderingContext2D,
  mask: EyeMask,
  design: EyeDesignV5,
  width: number,
  height: number,
  mirrorX = false,
  overlayImage: HTMLImageElement | null = null,
) {
  const designCanvas = document.createElement('canvas')
  designCanvas.width = Math.max(1, Math.ceil(width))
  designCanvas.height = Math.max(1, Math.ceil(height))
  const ctx = designCanvas.getContext('2d')
  if (!ctx) return

  renderEyeCore(ctx, mask, design, mirrorX, overlayImage)

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
        softCtx.globalCompositeOperation = 'destination-in'
        softCtx.drawImage(hardMask, 0, 0)
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(softMask, 0, 0)
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  }

  target.drawImage(designCanvas, 0, 0)
}

export function renderEyeCore(
  ctx: CanvasRenderingContext2D,
  mask: EyeMask,
  design: EyeDesignV5,
  mirrorX = false,
  overlayImage: HTMLImageElement | null = null,
) {
  const bounds = getMaskBounds(mask)
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  const basis = Math.max(1, Math.min(rx, ry))

  ctx.save()
  traceMaskPath(ctx, mask)
  ctx.clip()

  if (design.background.enabled) drawBackground(ctx, bounds, design)
  if (design.irisTexture.enabled) drawIrisTexture(ctx, bounds, design, mirrorX)
  if (design.upperShadow.enabled) drawUpperShadow(ctx, bounds, design, mirrorX)
  if (design.reflection.enabled) drawReflection(ctx, bounds, design, mirrorX)
  if (design.overlayPreset.enabled) drawOverlayPreset(ctx, bounds, design, mirrorX)
  if (design.lowerPoint.enabled) drawLowerPoints(ctx, bounds, design, mirrorX)
  if (design.handDrawnTexture.enabled) drawHandDrawnTexture(ctx, bounds, design)
  if (design.overlayImage.enabled && overlayImage) drawOverlayImage(ctx, bounds, design.overlayImage, overlayImage, mirrorX)

  if (design.ring.enabled) {
    ctx.save()
    ctx.globalAlpha = design.ring.opacity
    ctx.strokeStyle = design.ring.color
    ctx.lineWidth = Math.max(1, basis * design.ring.thickness)
    if (design.ring.softness > 0) ctx.filter = `blur(${design.ring.softness * basis * 0.45}px)`
    traceMaskPath(ctx, mask)
    ctx.stroke()
    ctx.restore()
  }

  if (design.pupil.enabled) drawPupil(ctx, bounds, design, mirrorX)

  ctx.restore()
}

function drawBackground(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5) {
  const bg = design.background
  ctx.save()
  ctx.globalAlpha = bg.opacity
  ctx.filter = `contrast(${bg.contrast})`
  const gradient = ctx.createLinearGradient(bounds.cx, bounds.minY, bounds.cx, bounds.maxY)
  gradient.addColorStop(0, bg.topColor)
  gradient.addColorStop(0.24, bg.upperMidColor)
  gradient.addColorStop(0.5, bg.midColor)
  gradient.addColorStop(0.77, bg.lowerMidColor)
  gradient.addColorStop(1, bg.bottomColor)
  ctx.fillStyle = gradient
  ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height)

  if (bg.softness > 0) {
    const glowY = bounds.minY + bounds.height * 0.8
    const glow = ctx.createRadialGradient(bounds.cx, glowY, 0, bounds.cx, glowY, Math.max(bounds.width, bounds.height) * 0.58)
    glow.addColorStop(0, `rgba(255,235,245,${0.12 * bg.softness})`)
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height)
  }
  ctx.restore()
}

function drawPupil(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5, mirrorX: boolean) {
  const p = design.pupil
  const x = bounds.minX + bounds.width * mappedX(p.x, mirrorX)
  const y = bounds.minY + bounds.height * p.y
  let sx = p.scaleX
  let sy = p.scaleY
  if (p.shape === 'circle') sy = sx
  if (p.shape === 'ovalHorizontal') { sx = Math.max(sx, sy); sy = Math.min(sx * 0.66, sy) }
  if (p.shape === 'ovalVertical') sy = Math.max(sy, sx * 1.25)
  const prx = bounds.width * sx * 0.5
  const pry = bounds.height * sy * 0.5
  const rotation = mirrorX ? -p.rotation : p.rotation

  ctx.save()
  ctx.globalAlpha = p.opacity
  if (p.blur > 0) ctx.filter = `blur(${p.blur * Math.min(bounds.width, bounds.height)}px)`
  const grad = ctx.createLinearGradient(x, y - pry, x, y + pry)
  grad.addColorStop(0, p.topColor)
  grad.addColorStop(0.5, p.midColor)
  grad.addColorStop(1, p.bottomColor)
  ctx.fillStyle = grad
  fillPupilShape(ctx, p.shape, x, y, prx, pry, rotation)

  if (p.edgeOpacity > 0) {
    ctx.filter = 'none'
    ctx.strokeStyle = hexToRgba(p.edgeColor, p.edgeOpacity)
    ctx.lineWidth = Math.max(1, Math.min(prx, pry) * (0.08 + p.softness * 0.12))
    strokePupilShape(ctx, p.shape, x, y, prx, pry, rotation)
  }

  if (p.gradientStrength > 0) {
    const depth = ctx.createRadialGradient(x, y + pry * 0.16, 0, x, y, Math.max(prx, pry))
    depth.addColorStop(0, `rgba(232,184,225,${0.14 * p.gradientStrength})`)
    depth.addColorStop(0.5, 'rgba(255,255,255,0)')
    depth.addColorStop(1, `rgba(10,8,18,${0.22 * p.gradientStrength})`)
    ctx.fillStyle = depth
    fillPupilShape(ctx, p.shape, x, y, prx, pry, rotation)
  }

  if (p.shape === 'core') {
    ctx.fillStyle = hexToRgba(p.edgeColor, Math.min(1, p.edgeOpacity + 0.1))
    ellipsePath(ctx, x, y, prx * 0.42, pry * 0.46)
    ctx.fill()
    const inner = ctx.createLinearGradient(x, y - pry * 0.3, x, y + pry * 0.3)
    inner.addColorStop(0, hexToRgba(p.midColor, 0.7))
    inner.addColorStop(1, hexToRgba(p.bottomColor, 0.7))
    ctx.fillStyle = inner
    ellipsePath(ctx, x, y, prx * 0.28, pry * 0.3)
    ctx.fill()
  }
  ctx.restore()
}

function drawUpperShadow(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5, mirrorX: boolean) {
  const s = design.upperShadow
  const basis = Math.min(bounds.width, bounds.height)
  const centerX = bounds.minX + bounds.width * mappedX(s.x, mirrorX)
  const centerY = bounds.minY + bounds.height * s.y
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(mirrorX ? -s.rotation : s.rotation)
  ctx.globalAlpha = s.opacity
  if (s.blur > 0) ctx.filter = `blur(${s.blur * basis}px)`

  if (s.type === 'lashShadow' || s.type === 'splitLash' || s.type === 'handdrawnShadow') {
    const count = Math.max(3, Math.round(s.lashCount))
    ctx.strokeStyle = s.color
    ctx.lineCap = 'round'
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      const offset = (t - 0.5) * bounds.width * s.lashSpread
      const seedWobble = Math.sin(i * 2.41 + s.handDrawnAmount * 3.7) * basis * 0.015 * s.handDrawnAmount
      const len = basis * s.lashLength * (0.75 + 0.35 * Math.sin(i * 1.7 + 1.2))
      ctx.lineWidth = Math.max(1, basis * (s.type === 'handdrawnShadow' ? 0.022 : 0.017))
      ctx.beginPath()
      ctx.moveTo(offset, -basis * 0.03)
      ctx.quadraticCurveTo(offset + seedWobble, len * 0.4, offset + (t - 0.5) * basis * 0.07, len)
      ctx.stroke()
      if (s.type === 'splitLash' && i % 2 === 0) {
        ctx.beginPath()
        ctx.moveTo(offset, basis * 0.03)
        ctx.lineTo(offset - basis * 0.05, len * 0.78)
        ctx.stroke()
      }
    }
  }

  const h = bounds.height * s.scaleY
  const w = bounds.width * s.scaleX
  const grad = ctx.createLinearGradient(0, -h * 0.55, 0, h * 0.55)
  const peak = s.type === 'deepShadow' || s.type === 'animeTop' ? s.intensity : s.intensity * 0.76
  grad.addColorStop(0, hexToRgba(s.color, peak))
  grad.addColorStop(0.48, hexToRgba(s.color, peak * 0.55))
  grad.addColorStop(1, hexToRgba(s.color, 0))
  ctx.fillStyle = grad
  if (s.type === 'animeTop') {
    ctx.beginPath()
    ctx.moveTo(-w * 0.5, -h * 0.4)
    ctx.quadraticCurveTo(0, h * 0.05, w * 0.5, -h * 0.4)
    ctx.lineTo(w * 0.5, -h)
    ctx.lineTo(-w * 0.5, -h)
    ctx.closePath()
    ctx.fill()
  } else if (s.type === 'jellyDark') {
    ellipsePath(ctx, 0, 0, w * 0.52, h * 0.7)
    ctx.fill()
  } else {
    ctx.fillRect(-w * 0.5, -h * 0.65, w, h)
  }
  ctx.restore()
}

function drawReflection(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5, mirrorX: boolean) {
  const r = design.reflection
  const basis = Math.min(bounds.width, bounds.height)
  const x = bounds.minX + bounds.width * mappedX(r.x, mirrorX)
  const y = bounds.minY + bounds.height * r.y
  const rx = bounds.width * r.scaleX * 0.5
  const ry = bounds.height * r.scaleY * 0.5
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(mirrorX ? -r.rotation : r.rotation)
  ctx.globalAlpha = r.opacity
  if (r.blur > 0) ctx.filter = `blur(${r.blur * basis}px)`
  if (r.bloom > 0) {
    ctx.shadowColor = r.color
    ctx.shadowBlur = basis * r.bloom
  }

  const radial = (strength = 0.9) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry))
    g.addColorStop(0, hexToRgba(r.color, strength))
    g.addColorStop(0.52, hexToRgba(r.secondaryColor, strength * 0.38))
    g.addColorStop(1, hexToRgba(r.color, 0))
    ctx.fillStyle = g
    ellipsePath(ctx, 0, 0, rx, ry)
    ctx.fill()
  }

  if (r.type === 'purpleGlow' || r.type === 'blueGlass' || r.type === 'mist') {
    radial(r.type === 'mist' ? 0.55 : 0.9)
  } else if (r.type === 'topLens') {
    const g = ctx.createLinearGradient(0, -ry, 0, ry)
    g.addColorStop(0, hexToRgba(r.color, 0.72))
    g.addColorStop(0.52, hexToRgba(r.secondaryColor, 0.26))
    g.addColorStop(1, hexToRgba(r.color, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-rx, 0)
    ctx.quadraticCurveTo(0, -ry * 1.5, rx, 0)
    ctx.quadraticCurveTo(0, -ry * 0.45, -rx, 0)
    ctx.fill()
  } else if (r.type === 'sideThin') {
    const g = ctx.createLinearGradient(-rx, 0, rx, 0)
    g.addColorStop(0, hexToRgba(r.color, 0.8))
    g.addColorStop(0.45, hexToRgba(r.secondaryColor, 0.24))
    g.addColorStop(1, hexToRgba(r.color, 0))
    ctx.fillStyle = g
    ellipsePath(ctx, 0, 0, rx, ry)
    ctx.fill()
  } else if (r.type === 'curvedBand' || r.type === 'complex' || r.type === 'handdrawn') {
    const bands = r.type === 'complex' ? 2 : 1
    for (let b = 0; b < bands; b += 1) {
      ctx.strokeStyle = b === 0 ? r.color : r.secondaryColor
      ctx.lineWidth = Math.max(1, basis * (0.035 + b * 0.018))
      ctx.lineCap = 'round'
      ctx.beginPath()
      const wobble = r.handDrawnAmount * basis * 0.03 * (b + 1)
      ctx.moveTo(-rx * 0.8, ry * (0.05 + b * 0.2))
      ctx.bezierCurveTo(-rx * 0.3 + wobble, -ry * 0.85, rx * 0.25 - wobble, -ry * 0.72, rx * 0.8, -ry * 0.12)
      ctx.stroke()
    }
    if (r.type === 'handdrawn') {
      ctx.globalAlpha *= 0.5
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath()
        ctx.arc(rx * (0.15 + i * 0.16), ry * (0.1 + i * 0.06), basis * (0.035 + i * 0.008), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

function drawLowerPoints(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5, mirrorX: boolean) {
  const m = design.lowerPoint
  const rand = mulberry32(m.seed)
  const basis = Math.min(bounds.width, bounds.height)
  const centerX = bounds.minX + bounds.width * mappedX(m.x, mirrorX)
  const baseY = bounds.minY + bounds.height * m.y
  const count = Math.max(1, Math.round(m.count))
  ctx.save()
  ctx.translate(centerX, baseY)
  ctx.rotate(mirrorX ? -m.rotation : m.rotation)
  ctx.globalAlpha = m.opacity
  if (m.blur > 0) ctx.filter = `blur(${m.blur * basis}px)`
  if (m.glow > 0) {
    ctx.shadowColor = m.color
    ctx.shadowBlur = basis * m.glow
  }

  if (m.type === 'wave') {
    ctx.strokeStyle = m.color
    ctx.lineWidth = Math.max(1, basis * m.size * 0.22 * m.scale)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i <= count * 2; i += 1) {
      const t = i / (count * 2)
      const x = (t - 0.5) * bounds.width * m.spread
      const jitter = (rand() - 0.5) * basis * 0.02 * m.handDrawnAmount
      const y = Math.sin(t * Math.PI * 3.2) * basis * m.size * 0.18 + jitter
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
    const jitterScale = 1 + (rand() - 0.5) * m.sizeJitter
    const size = basis * m.size * m.scale * jitterScale * (0.78 + (1 - Math.abs(centered)) * 0.25)
    const x = centered * bounds.width * m.spread * 0.5 + (rand() - 0.5) * basis * 0.035 * m.handDrawnAmount
    const y = (1 - centered * centered) * basis * 0.07 + (rand() - 0.5) * basis * 0.03 * m.handDrawnAmount
    const localRotation = centered * 0.45 + (rand() - 0.5) * m.handDrawnAmount * 0.3
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(localRotation)
    ctx.fillStyle = i % 3 === 0 ? m.secondaryColor : m.color
    ctx.strokeStyle = ctx.fillStyle as string

    if (m.type === 'petal') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * 0.68, -size * 0.22, 0, size); ctx.quadraticCurveTo(-size * 0.68, -size * 0.22, 0, -size); ctx.fill()
    } else if (m.type === 'droplet') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.bezierCurveTo(size * 0.72, -size * 0.1, size * 0.55, size * 0.72, 0, size); ctx.bezierCurveTo(-size * 0.55, size * 0.72, -size * 0.72, -size * 0.1, 0, -size); ctx.fill()
    } else if (m.type === 'glass') {
      ctx.beginPath(); ctx.moveTo(-size * 0.58, size * 0.3); ctx.lineTo(-size * 0.08, -size); ctx.lineTo(size * 0.66, -size * 0.12); ctx.lineTo(size * 0.28, size * 0.82); ctx.closePath(); ctx.fill()
    } else if (m.type === 'reflection') {
      const g = ctx.createLinearGradient(0, -size, 0, size)
      g.addColorStop(0, hexToRgba(m.color, 0.7))
      g.addColorStop(1, hexToRgba(m.secondaryColor, 0.16))
      ctx.fillStyle = g
      ellipsePath(ctx, 0, 0, size * 0.28, size)
      ctx.fill()
    } else if (m.type === 'ovalCluster') {
      ellipsePath(ctx, 0, 0, size * 0.42, size * 0.78, localRotation)
      ctx.fill()
    } else if (m.type === 'stippling') {
      ellipsePath(ctx, 0, 0, size * (0.22 + rand() * 0.28), size * (0.22 + rand() * 0.28))
      ctx.fill()
    } else if (m.type === 'curve' || m.type === 'handdrawn') {
      ctx.lineWidth = Math.max(1, size * (m.type === 'handdrawn' ? 0.24 : 0.18))
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-size * 0.55, size * 0.1)
      ctx.quadraticCurveTo(0, -size * (0.55 + rand() * 0.22), size * 0.55, size * 0.08)
      ctx.stroke()
    } else {
      // mixed
      ellipsePath(ctx, -size * 0.3, 0, size * 0.36, size * 0.36)
      ctx.fill()
      ellipsePath(ctx, size * 0.55, size * 0.08, size * 0.18, size * 0.18)
      ctx.fill()
      ctx.lineWidth = Math.max(1, size * 0.15)
      ctx.beginPath(); ctx.moveTo(-size * 0.1, -size * 0.62); ctx.lineTo(size * 0.18, -size * 0.2); ctx.stroke()
    }
    ctx.restore()
  }
  ctx.restore()
}

function drawIrisTexture(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5, mirrorX: boolean) {
  const t = design.irisTexture
  const rand = mulberry32(t.seed)
  const basis = Math.min(bounds.width, bounds.height)
  const cx = bounds.cx
  const cy = bounds.cy
  ctx.save()
  ctx.globalAlpha = t.opacity
  ctx.strokeStyle = t.color
  ctx.fillStyle = t.color
  const density = Math.max(5, Math.round(t.density))

  if (t.type === 'ripple') {
    ctx.lineWidth = Math.max(0.7, basis * t.width)
    for (let i = 0; i < Math.max(3, Math.round(density / 5)); i += 1) {
      const radius = lerp(0.22, 0.9, (i + 1) / (density / 5 + 1))
      ctx.globalAlpha = t.opacity * (0.35 + rand() * 0.35)
      ellipsePath(ctx, cx, cy + basis * 0.08, bounds.width * 0.5 * radius, bounds.height * 0.5 * radius)
      ctx.stroke()
    }
  } else if (t.type === 'speckle') {
    for (let i = 0; i < density; i += 1) {
      const angle = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * 0.88
      const x = cx + Math.cos(angle) * bounds.width * 0.46 * r
      const y = cy + Math.sin(angle) * bounds.height * 0.46 * r
      const size = basis * (0.006 + rand() * 0.014)
      ctx.globalAlpha = t.opacity * (0.3 + rand() * 0.6)
      ctx.fillStyle = rand() > 0.55 ? t.secondaryColor : t.color
      ellipsePath(ctx, x, y, size, size * (0.7 + rand() * 0.5))
      ctx.fill()
    }
  } else {
    ctx.lineCap = 'round'
    for (let i = 0; i < density; i += 1) {
      const baseAngle = (i / density) * Math.PI * 2 + (mirrorX ? -t.rotation : t.rotation)
      const angle = baseAngle + (rand() - 0.5) * t.randomness * (0.3 + t.handDrawnAmount * 0.4)
      const inner = 0.2 + rand() * 0.12
      const outer = Math.min(0.96, inner + t.length * (0.56 + rand() * 0.32))
      const x1 = cx + Math.cos(angle) * bounds.width * 0.5 * inner
      const y1 = cy + Math.sin(angle) * bounds.height * 0.5 * inner
      const x2 = cx + Math.cos(angle) * bounds.width * 0.5 * outer
      const y2 = cy + Math.sin(angle) * bounds.height * 0.5 * outer
      const wobble = (rand() - 0.5) * basis * 0.06 * t.handDrawnAmount
      ctx.strokeStyle = rand() > 0.7 ? t.secondaryColor : t.color
      ctx.globalAlpha = t.opacity * (0.35 + rand() * 0.65)
      ctx.lineWidth = Math.max(0.5, basis * t.width * (0.55 + rand() * 0.8))
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo((x1 + x2) * 0.5 - Math.sin(angle) * wobble, (y1 + y2) * 0.5 + Math.cos(angle) * wobble, x2, y2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawOverlayPreset(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5, mirrorX: boolean) {
  const o = design.overlayPreset
  const rand = mulberry32(o.seed)
  const basis = Math.min(bounds.width, bounds.height)
  const x = bounds.minX + bounds.width * mappedX(o.x, mirrorX)
  const y = bounds.minY + bounds.height * o.y
  const w = bounds.width * o.scaleX
  const h = bounds.height * o.scaleY
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(mirrorX ? -o.rotation : o.rotation)
  ctx.globalAlpha = o.opacity
  if (o.blur > 0) ctx.filter = `blur(${o.blur * basis}px)`
  ctx.strokeStyle = o.color
  ctx.fillStyle = o.color
  ctx.lineCap = 'round'

  if (o.type === 'fog' || o.type === 'cloud') {
    for (let i = 0; i < 6; i += 1) {
      const ox = (rand() - 0.5) * w * 0.7
      const oy = (rand() - 0.5) * h * 0.35
      const r = basis * (0.08 + rand() * 0.12)
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r)
      g.addColorStop(0, hexToRgba(i % 2 ? o.secondaryColor : o.color, 0.55))
      g.addColorStop(1, hexToRgba(o.color, 0))
      ctx.fillStyle = g
      ctx.fillRect(ox - r, oy - r, r * 2, r * 2)
    }
  } else if (o.type === 'glassVein' || o.type === 'fragments') {
    ctx.lineWidth = Math.max(0.8, basis * 0.012)
    for (let i = 0; i < 7; i += 1) {
      const sx = (rand() - 0.5) * w * 0.65
      const sy = (rand() - 0.5) * h * 0.55
      ctx.strokeStyle = i % 2 ? o.secondaryColor : o.color
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (rand() - 0.5) * basis * 0.25, sy - basis * (0.08 + rand() * 0.16)); ctx.lineTo(sx + (rand() - 0.5) * basis * 0.32, sy + basis * (0.06 + rand() * 0.14)); ctx.stroke()
    }
  } else if (o.type === 'flower') {
    for (let i = 0; i < 5; i += 1) {
      ctx.save(); ctx.rotate((i / 5) * Math.PI * 2); ctx.fillStyle = i % 2 ? o.secondaryColor : o.color; ellipsePath(ctx, 0, -h * 0.16, w * 0.07, h * 0.17); ctx.fill(); ctx.restore()
    }
  } else if (o.type === 'starMist') {
    for (let i = 0; i < 14; i += 1) {
      const sx = (rand() - 0.5) * w * 0.75
      const sy = (rand() - 0.5) * h * 0.7
      const s = basis * (0.012 + rand() * 0.028)
      ctx.strokeStyle = rand() > 0.5 ? o.color : o.secondaryColor
      ctx.lineWidth = Math.max(0.7, s * 0.25)
      ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke()
    }
  } else if (o.type === 'ripple') {
    ctx.lineWidth = Math.max(0.8, basis * 0.01)
    for (let i = 0; i < 4; i += 1) {
      ctx.globalAlpha = o.opacity * (0.35 + i * 0.08)
      ctx.strokeStyle = i % 2 ? o.secondaryColor : o.color
      ellipsePath(ctx, 0, 0, w * (0.16 + i * 0.09), h * (0.08 + i * 0.055))
      ctx.stroke()
    }
  } else {
    ctx.lineWidth = Math.max(1, basis * (o.type === 'handBrush' ? 0.045 : 0.025))
    for (let i = 0; i < 5; i += 1) {
      const sy = (i - 2) * h * 0.09 + (rand() - 0.5) * basis * 0.03 * o.handDrawnAmount
      ctx.strokeStyle = i % 2 ? o.secondaryColor : o.color
      ctx.beginPath()
      ctx.moveTo(-w * 0.36, sy)
      ctx.bezierCurveTo(-w * 0.12, sy - basis * 0.06, w * 0.12, sy + basis * 0.05, w * 0.36, sy - basis * 0.02)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawHandDrawnTexture(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV5) {
  const h = design.handDrawnTexture
  const rand = mulberry32(h.seed)
  const basis = Math.min(bounds.width, bounds.height)
  const count = Math.round(18 + h.amount * 58)
  ctx.save()
  ctx.globalAlpha = h.opacity
  ctx.strokeStyle = h.color
  ctx.fillStyle = h.color
  for (let i = 0; i < count; i += 1) {
    const x = bounds.minX + rand() * bounds.width
    const y = bounds.minY + rand() * bounds.height
    const size = basis * h.grainSize * (0.3 + rand() * 1.2)
    if (rand() > 0.45) {
      ctx.globalAlpha = h.opacity * (0.25 + rand() * 0.55)
      ellipsePath(ctx, x, y, size, size * (0.45 + rand() * 0.8), (rand() - 0.5) * 1.2)
      ctx.fill()
    } else {
      ctx.globalAlpha = h.opacity * (0.2 + rand() * 0.5)
      ctx.lineWidth = Math.max(0.5, size * 0.28)
      ctx.beginPath(); ctx.moveTo(x - size, y); ctx.quadraticCurveTo(x, y + (rand() - 0.5) * size, x + size, y + (rand() - 0.5) * size); ctx.stroke()
    }
  }
  ctx.restore()
}

function drawOverlayImage(
  ctx: CanvasRenderingContext2D,
  bounds: ReturnType<typeof getMaskBounds>,
  state: OverlayImageState,
  image: HTMLImageElement,
  mirrorX: boolean,
) {
  const basis = Math.min(bounds.width, bounds.height)
  const x = bounds.minX + bounds.width * mappedX(state.x, mirrorX)
  const y = bounds.minY + bounds.height * state.y
  const naturalAspect = image.naturalWidth / Math.max(1, image.naturalHeight)
  const height = basis * state.scale
  const width = height * naturalAspect
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(mirrorX ? -state.rotation : state.rotation)
  const flip = (state.flipX ? -1 : 1) * (mirrorX ? -1 : 1)
  ctx.scale(flip, 1)
  ctx.globalAlpha = state.opacity
  ctx.globalCompositeOperation = state.blendMode
  ctx.drawImage(image, -width / 2, -height / 2, width, height)
  ctx.restore()
}

export function exportFullUvPng(
  originalImage: HTMLImageElement,
  masks: { left: EyeMask; right: EyeMask },
  design: EyeDesignV5,
  overlayImage: HTMLImageElement | null = null,
) {
  const canvas = document.createElement('canvas')
  canvas.width = originalImage.naturalWidth
  canvas.height = originalImage.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('PNG 저장용 Canvas를 만들 수 없습니다.')
  ctx.drawImage(originalImage, 0, 0)
  compositeEyeDesign(ctx, masks.left, design, canvas.width, canvas.height, false, overlayImage)
  compositeEyeDesign(ctx, masks.right, design, canvas.width, canvas.height, true, overlayImage)
  return canvas.toDataURL('image/png')
}

export function exportEyePng(mask: EyeMask, design: EyeDesignV5, overlayImage: HTMLImageElement | null = null, padding = 28) {
  const bounds = getMaskBounds(mask)
  const width = Math.ceil(bounds.width + padding * 2)
  const height = Math.ceil(bounds.height + padding * 2)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('눈동자 저장용 Canvas를 만들 수 없습니다.')
  const localMask = translateMask(mask, padding - bounds.minX, padding - bounds.minY)
  compositeEyeDesign(ctx, localMask, design, width, height, false, overlayImage)
  return canvas.toDataURL('image/png')
}
