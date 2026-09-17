import { clamp } from './math'
import { cloneStyle, PRESETS } from './presets'
import type { EyeStyle, RandomOptions } from './types'

export function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shiftHex(hex: string, amount: number) {
  const value = Number.parseInt(hex.replace('#', '').slice(0, 6), 16)
  const r = clamp(((value >> 16) & 255) + amount, 0, 255)
  const g = clamp(((value >> 8) & 255) + amount, 0, 255)
  const b = clamp((value & 255) + amount, 0, 255)
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`
}

export function randomizeStyle(current: EyeStyle, seed: number, options: RandomOptions) {
  const rand = mulberry32(seed)
  const presetNames = Object.keys(PRESETS)
  const preset = cloneStyle(PRESETS[presetNames[Math.floor(rand() * presetNames.length)]])
  const next = cloneStyle(current)

  if (options.colors) {
    const jitter = () => Math.floor(rand() * 25) - 12
    next.gradient = {
      ...preset.gradient,
      top: shiftHex(preset.gradient.top, jitter()),
      upperMid: shiftHex(preset.gradient.upperMid, jitter()),
      mid: shiftHex(preset.gradient.mid, jitter()),
      lowerMid: shiftHex(preset.gradient.lowerMid, jitter()),
      bottom: shiftHex(preset.gradient.bottom, jitter()),
    }
    next.upperShadow.color = preset.upperShadow.color
    next.lowerGlow.color = preset.lowerGlow.color
    next.outerRing.color = preset.outerRing.color
    next.innerRing.color = preset.innerRing.color
    next.extraInnerRing.color = preset.extraInnerRing.color
    next.reflection.color = preset.reflection.color
    next.lowerMotif.color = preset.lowerMotif.color
    next.highlight.color = preset.highlight.color
    next.particles.color = preset.particles.color
  }

  if (options.structure) {
    const shapes: EyeStyle['pupil']['shape'][] = ['circle', 'oval', 'heart', 'petal', 'slit']
    next.outerRing.thickness = 0.045 + rand() * 0.075
    next.innerRing.radius = 0.24 + rand() * 0.18
    next.innerRing.thickness = 0.025 + rand() * 0.06
    next.extraInnerRing.radius = 0.44 + rand() * 0.2
    next.extraInnerRing.thickness = 0.008 + rand() * 0.028
    next.pupil.shape = shapes[Math.floor(rand() * shapes.length)]
    next.pupil.scaleX = next.pupil.shape === 'slit' ? 0.05 + rand() * 0.05 : 0.14 + rand() * 0.16
    next.pupil.scaleY = next.pupil.shape === 'circle' ? next.pupil.scaleX : 0.2 + rand() * 0.18
    next.pupil.y = 0.44 + rand() * 0.08
  }

  if (options.texture) {
    next.radial.enabled = true
    next.radial.strength = 0.15 + rand() * 0.5
    next.radial.density = Math.round(22 + rand() * 32)
    next.radial.length = 0.48 + rand() * 0.42
    next.radial.randomness = 0.08 + rand() * 0.36
    next.radial.rotation = rand() * Math.PI * 2
    next.radial.seed = seed + 17
    next.softTexture.enabled = rand() > 0.15
    next.softTexture.strength = 0.05 + rand() * 0.17
    next.softTexture.amount = Math.round(12 + rand() * 36)
    next.softTexture.seed = seed + 99
    next.particles.enabled = rand() > 0.25
    next.particles.count = Math.round(5 + rand() * 13)
    next.particles.sizeMin = 0.005 + rand() * 0.008
    next.particles.sizeMax = 0.013 + rand() * 0.018
    next.particles.seed = seed + 211
  }

  if (options.motif) {
    const motifs: EyeStyle['lowerMotif']['type'][] = ['petal', 'dash', 'droplet', 'glass', 'wave', 'ovalCluster', 'lightShards', 'mixedPoints']
    next.lowerMotif.enabled = true
    next.lowerMotif.type = motifs[Math.floor(rand() * motifs.length)]
    next.lowerMotif.count = Math.round(7 + rand() * 7)
    next.lowerMotif.size = 0.055 + rand() * 0.07
    next.lowerMotif.spread = 0.48 + rand() * 0.28
    next.lowerMotif.y = 0.67 + rand() * 0.12
    next.lowerMotif.opacity = 0.55 + rand() * 0.35
    next.reflection.enabled = rand() > 0.1
    const reflections: EyeStyle['reflection']['type'][] = ['softPatch', 'curved', 'side', 'haze', 'topBand']
    next.reflection.type = reflections[Math.floor(rand() * reflections.length)]
    next.reflection.opacity = 0.16 + rand() * 0.34
    next.reflection.x = 0.2 + rand() * 0.28
    next.reflection.y = 0.18 + rand() * 0.3
    next.reflection.scaleX = 0.38 + rand() * 0.35
    next.reflection.scaleY = 0.14 + rand() * 0.36
    next.reflection.rotation = -0.8 + rand() * 1.6
  }

  if (options.highlights) {
    const presets: EyeStyle['highlight']['preset'][] = ['singleLarge', 'animeStandard', 'glassyDouble', 'cluster', 'sideHighlight', 'topDome', 'sparkleArc']
    next.highlight.enabled = true
    next.highlight.preset = presets[Math.floor(rand() * presets.length)]
    next.highlight.opacity = 0.75 + rand() * 0.25
    next.highlight.size = 0.7 + rand() * 0.7
    next.highlight.x = 0.2 + rand() * 0.22
    next.highlight.y = 0.13 + rand() * 0.22
    next.highlight.glow = 0.05 + rand() * 0.24
  }

  return next
}
