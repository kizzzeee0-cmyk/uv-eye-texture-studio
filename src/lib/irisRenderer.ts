import type { EyeMask, EyeStyle } from './types'

function addEllipsePath(ctx: CanvasRenderingContext2D, mask: EyeMask) {
  ctx.save()
  ctx.translate(mask.cx, mask.cy)
  ctx.rotate(mask.rotation)
  ctx.beginPath()
  ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2)
  ctx.restore()
}

export function drawIrisDesign(
  ctx: CanvasRenderingContext2D,
  mask: EyeMask,
  style: EyeStyle,
) {
  ctx.save()
  addEllipsePath(ctx, mask)
  ctx.clip()

  const gradient = ctx.createLinearGradient(mask.cx, mask.cy - mask.ry, mask.cx, mask.cy + mask.ry)
  gradient.addColorStop(0, style.topColor)
  gradient.addColorStop(0.55, style.midColor)
  gradient.addColorStop(1, style.bottomColor)

  ctx.globalAlpha = style.opacity
  ctx.fillStyle = gradient
  ctx.save()
  ctx.translate(mask.cx, mask.cy)
  ctx.rotate(mask.rotation)
  ctx.beginPath()
  ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2)
  ctx.fill()

  const upperShadow = ctx.createLinearGradient(0, -mask.ry, 0, mask.ry)
  upperShadow.addColorStop(0, 'rgba(0,0,0,0.42)')
  upperShadow.addColorStop(0.45, 'rgba(0,0,0,0.07)')
  upperShadow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = upperShadow
  ctx.beginPath()
  ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2)
  ctx.fill()

  const lowerGlow = ctx.createRadialGradient(0, mask.ry * 0.62, 0, 0, mask.ry * 0.62, mask.rx)
  lowerGlow.addColorStop(0, 'rgba(255,255,255,0.24)')
  lowerGlow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = lowerGlow
  ctx.beginPath()
  ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2)
  ctx.fill()

  if (style.radialStrength > 0) {
    const rayCount = 32
    for (let i = 0; i < rayCount; i += 1) {
      const angle = (i / rayCount) * Math.PI * 2
      const wobble = Math.sin(i * 2.17) * 0.035
      const inner = mask.rx * (0.16 + wobble)
      const outer = mask.rx * (0.92 - Math.abs(wobble))
      const x1 = Math.cos(angle) * inner
      const y1 = Math.sin(angle) * inner
      const x2 = Math.cos(angle) * outer
      const y2 = Math.sin(angle) * outer
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * style.radialStrength})`
      ctx.lineWidth = Math.max(1, mask.rx * 0.016)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }

  if (style.reflectionStrength > 0) {
    const reflection = ctx.createRadialGradient(
      -mask.rx * 0.3,
      mask.ry * 0.25,
      0,
      -mask.rx * 0.3,
      mask.ry * 0.25,
      mask.rx * 0.72,
    )
    reflection.addColorStop(0, hexToRgba(style.reflectionColor, 0.46 * style.reflectionStrength))
    reflection.addColorStop(0.55, hexToRgba(style.reflectionColor, 0.16 * style.reflectionStrength))
    reflection.addColorStop(1, hexToRgba(style.reflectionColor, 0))
    ctx.fillStyle = reflection
    ctx.beginPath()
    ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  ctx.save()
  ctx.translate(mask.cx, mask.cy)
  ctx.rotate(mask.rotation)

  ctx.strokeStyle = style.ringColor
  ctx.lineWidth = Math.max(1, Math.min(mask.rx, mask.ry) * style.ringThickness)
  ctx.globalAlpha = 0.95 * style.opacity
  ctx.beginPath()
  ctx.ellipse(0, 0, mask.rx - ctx.lineWidth / 2, mask.ry - ctx.lineWidth / 2, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = style.pupilColor
  const pupilRx = mask.rx * style.pupilScale
  const pupilRy = mask.ry * style.pupilScale
  ctx.beginPath()
  ctx.ellipse(0, 0, pupilRx, pupilRy, 0, 0, Math.PI * 2)
  ctx.fill()

  if (style.highlightStrength > 0) {
    ctx.globalAlpha = 0.92 * style.highlightStrength
    ctx.fillStyle = '#ffffff'
    const hx = (style.highlightX - 0.5) * mask.rx * 2
    const hy = (style.highlightY - 0.5) * mask.ry * 2
    ctx.beginPath()
    ctx.ellipse(
      hx,
      hy,
      mask.rx * 0.12 * style.highlightScale,
      mask.ry * 0.12 * style.highlightScale,
      -0.4,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(
      hx + mask.rx * 0.24,
      hy + mask.ry * 0.20,
      mask.rx * 0.045 * style.highlightScale,
      mask.ry * 0.045 * style.highlightScale,
      0.2,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  ctx.restore()
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
  drawIrisDesign(ctx, masks.left, styles.left)
  drawIrisDesign(ctx, masks.right, styles.right)
  return canvas.toDataURL('image/png')
}

export function exportSingleIrisPng(mask: EyeMask, style: EyeStyle, padding = 24) {
  const width = Math.ceil(mask.rx * 2 + padding * 2)
  const height = Math.ceil(mask.ry * 2 + padding * 2)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('Could not create export canvas context.')

  drawIrisDesign(ctx, {
    ...mask,
    cx: width / 2,
    cy: height / 2,
    rotation: 0,
  }, style)
  return canvas.toDataURL('image/png')
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized.padEnd(6, '0').slice(0, 6)
  const value = Number.parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r},${g},${b},${alpha})`
}
