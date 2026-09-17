import type { EyeStyle } from './types'

export const DEFAULT_STYLE: EyeStyle = {
  opacity: 1,
  gradient: {
    enabled: true,
    top: '#16182f',
    upperMid: '#2e3d74',
    mid: '#568fd1',
    lowerMid: '#9ed7f0',
    bottom: '#dcfbff',
  },
  upperShadow: { enabled: true, color: '#080b1b', intensity: 0.72, height: 0.52, softness: 0.58 },
  lowerGlow: { enabled: true, color: '#dffcff', intensity: 0.38, height: 0.34, spread: 0.72 },
  outerRing: { enabled: true, color: '#101326', thickness: 0.07, opacity: 0.95, blur: 0 },
  innerRing: { enabled: true, color: '#1a2446', radius: 0.34, thickness: 0.055, opacity: 0.72, blur: 0 },
  extraInnerRing: { enabled: true, color: '#8bc9f3', radius: 0.55, thickness: 0.018, opacity: 0.28, blur: 0 },
  pupil: { enabled: true, shape: 'oval', x: 0.5, y: 0.48, scaleX: 0.22, scaleY: 0.28, color: '#111427', opacity: 0.92, softness: 0.05 },
  radial: { enabled: true, color: '#d8f7ff', strength: 0.34, density: 34, length: 0.72, width: 0.012, randomness: 0.22, rotation: 0, seed: 9389 },
  softTexture: { enabled: true, color: '#ffffff', strength: 0.12, amount: 24, seed: 701 },
  lowerMotif: { enabled: true, type: 'petal', color: '#f6ffff', count: 10, size: 0.09, spread: 0.62, y: 0.73, opacity: 0.72, glow: 0.16 },
  reflection: { enabled: true, type: 'curved', color: '#8d82e4', opacity: 0.3, blur: 0.08, x: 0.28, y: 0.38, scaleX: 0.58, scaleY: 0.36, rotation: -0.45 },
  highlight: { enabled: true, preset: 'glassyDouble', color: '#ffffff', opacity: 0.96, size: 1, x: 0.31, y: 0.22, glow: 0.18 },
  particles: { enabled: true, type: 'dot', color: '#ffffff', count: 8, sizeMin: 0.008, sizeMax: 0.018, opacity: 0.7, glow: 0.12, seed: 119 },
  effects: { brightness: 1, contrast: 1, saturation: 1, bloom: 0.05 },
}

type EyeStyleOverrides = Partial<EyeStyle>

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

type EyeStylePatch = DeepPartial<EyeStyle>

function mergeStyle(overrides: EyeStyleOverrides): EyeStyle {
  return {
    ...DEFAULT_STYLE,
    ...overrides,
    gradient: { ...DEFAULT_STYLE.gradient, ...(overrides.gradient ?? {}) },
    upperShadow: { ...DEFAULT_STYLE.upperShadow, ...(overrides.upperShadow ?? {}) },
    lowerGlow: { ...DEFAULT_STYLE.lowerGlow, ...(overrides.lowerGlow ?? {}) },
    outerRing: { ...DEFAULT_STYLE.outerRing, ...(overrides.outerRing ?? {}) },
    innerRing: { ...DEFAULT_STYLE.innerRing, ...(overrides.innerRing ?? {}) },
    extraInnerRing: { ...DEFAULT_STYLE.extraInnerRing, ...(overrides.extraInnerRing ?? {}) },
    pupil: { ...DEFAULT_STYLE.pupil, ...(overrides.pupil ?? {}) },
    radial: { ...DEFAULT_STYLE.radial, ...(overrides.radial ?? {}) },
    softTexture: { ...DEFAULT_STYLE.softTexture, ...(overrides.softTexture ?? {}) },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, ...(overrides.lowerMotif ?? {}) },
    reflection: { ...DEFAULT_STYLE.reflection, ...(overrides.reflection ?? {}) },
    highlight: { ...DEFAULT_STYLE.highlight, ...(overrides.highlight ?? {}) },
    particles: { ...DEFAULT_STYLE.particles, ...(overrides.particles ?? {}) },
    effects: { ...DEFAULT_STYLE.effects, ...(overrides.effects ?? {}) },
  }
}

export function cloneStyle(style: EyeStyle): EyeStyle {
  return JSON.parse(JSON.stringify(style)) as EyeStyle
}

export function applyStylePatch(base: EyeStyle, patch: EyeStylePatch): EyeStyle {
  const next = cloneStyle(base)
  const top = patch as Record<string, unknown>
  for (const key of Object.keys(top) as (keyof EyeStyle)[]) {
    const value = patch[key]
    if (value === undefined) continue
    const current = next[key]
    if (typeof current === 'object' && current !== null && typeof value === 'object' && value !== null) {
      Object.assign(current as object, value)
    } else {
      ;(next as unknown as Record<string, unknown>)[key] = value
    }
  }
  return next
}

export const PRESETS: Record<string, EyeStyle> = {
  'Blue Glass': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#12172e', upperMid: '#263b72', mid: '#4f83c5', lowerMid: '#9fcff2', bottom: '#e1f5ff' },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#857ee5', opacity: 0.33 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'dash', color: '#d9ffff' },
    highlight: { ...DEFAULT_STYLE.highlight, preset: 'glassyDouble' },
  }),
  'Ice Blue': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#17253e', upperMid: '#315f89', mid: '#69a9cf', lowerMid: '#afe7ec', bottom: '#f2ffff' },
    lowerGlow: { ...DEFAULT_STYLE.lowerGlow, color: '#d8ffff', intensity: 0.58 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'glass', count: 9, color: '#eaffff', opacity: 0.78 },
    particles: { ...DEFAULT_STYLE.particles, type: 'diamond', color: '#b9ffff' },
  }),
  'Dream Purple': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#2b173c', upperMid: '#533b75', mid: '#8b67b1', lowerMid: '#c695d8', bottom: '#f2d7ff' },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#8a9cff', opacity: 0.42 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'ovalCluster', color: '#fff1ff' },
    particles: { ...DEFAULT_STYLE.particles, type: 'star', color: '#fff0ff' },
  }),
  'Soft Pink Doll': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#4d2539', upperMid: '#8c3f67', mid: '#d06495', lowerMid: '#f49abb', bottom: '#ffd7df' },
    outerRing: { ...DEFAULT_STYLE.outerRing, color: '#472335' },
    innerRing: { ...DEFAULT_STYLE.innerRing, color: '#7e3659' },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'petal', color: '#fff0f5', count: 11 },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#d799e8' },
  }),
  'Aqua Crystal': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#13303c', upperMid: '#205a6b', mid: '#3d8e9d', lowerMid: '#86cdd1', bottom: '#dbffff' },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#8ab4ff', type: 'side', opacity: 0.32 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'glass', color: '#e6ffff', count: 8 },
    particles: { ...DEFAULT_STYLE.particles, type: 'diamond', color: '#b9ffff', count: 10 },
  }),
}

export const BASE_PRESETS: Record<string, EyeStylePatch> = {
  'Blue Fade': { gradient: { top: '#12172e', upperMid: '#274175', mid: '#5a8ed2', lowerMid: '#9ed1f2', bottom: '#e6fbff' }, lowerGlow: { color: '#dafcff', intensity: 0.42 } },
  'Rose Pink': { gradient: { top: '#4d223a', upperMid: '#8b4267', mid: '#d66a98', lowerMid: '#f4a6c3', bottom: '#ffe1ea' }, lowerGlow: { color: '#fff2f7', intensity: 0.44 } },
  'Dream Purple': { gradient: { top: '#2a173e', upperMid: '#563575', mid: '#8e65b1', lowerMid: '#c79adc', bottom: '#f1dcff' }, lowerGlow: { color: '#f5e9ff', intensity: 0.4 } },
  'Ruby Wine': { gradient: { top: '#2d0f18', upperMid: '#5d172a', mid: '#a82a47', lowerMid: '#ea6084', bottom: '#ffd0da' }, lowerGlow: { color: '#ffe3ea', intensity: 0.38 } },
  'Mint Aqua': { gradient: { top: '#113441', upperMid: '#1d6473', mid: '#40a0ab', lowerMid: '#90d8d9', bottom: '#e6ffff' }, lowerGlow: { color: '#deffff', intensity: 0.45 } },
  'Gray Blue': { gradient: { top: '#202739', upperMid: '#3a4e72', mid: '#6485b2', lowerMid: '#abc0df', bottom: '#edf2ff' }, lowerGlow: { color: '#edf6ff', intensity: 0.36 } },
  'Golden Amber': { gradient: { top: '#3a260b', upperMid: '#7c4b16', mid: '#bd7b2f', lowerMid: '#efbf71', bottom: '#fff0cc' }, lowerGlow: { color: '#fff0c9', intensity: 0.42 } },
  'Leaf Green': { gradient: { top: '#18311a', upperMid: '#28542a', mid: '#4d9152', lowerMid: '#92c388', bottom: '#e8ffdf' }, lowerGlow: { color: '#efffe8', intensity: 0.35 } },
}

export const LOWER_MOTIF_PRESETS: Record<string, EyeStylePatch> = {
  'Wave Arc': { lowerMotif: { enabled: true, type: 'wave', count: 8, size: 0.085, spread: 0.68, y: 0.74, opacity: 0.74, glow: 0.18, color: '#efffff' }, particles: { enabled: false } },
  'Flower Petals': { lowerMotif: { enabled: true, type: 'petal', count: 11, size: 0.09, spread: 0.63, y: 0.73, opacity: 0.8, glow: 0.18, color: '#fff7ff' }, particles: { enabled: false } },
  'Droplet Arc': { lowerMotif: { enabled: true, type: 'droplet', count: 10, size: 0.08, spread: 0.65, y: 0.72, opacity: 0.82, glow: 0.14, color: '#efffff' }, particles: { enabled: false } },
  'Light Reflection': { lowerMotif: { enabled: true, type: 'lightShards', count: 9, size: 0.09, spread: 0.62, y: 0.71, opacity: 0.84, glow: 0.24, color: '#f9ffff' }, particles: { enabled: false } },
  'Big+Small Points': { lowerMotif: { enabled: true, type: 'mixedPoints', count: 11, size: 0.08, spread: 0.7, y: 0.73, opacity: 0.9, glow: 0.12, color: '#ffffff' }, particles: { enabled: false } },
  'Oval Cluster': { lowerMotif: { enabled: true, type: 'ovalCluster', count: 9, size: 0.085, spread: 0.6, y: 0.74, opacity: 0.75, glow: 0.12, color: '#fffefe' }, particles: { enabled: false } },
}

export const PUPIL_PRESETS: Record<string, EyeStylePatch> = {
  'Circle Pupil': { pupil: { enabled: true, shape: 'circle', scaleX: 0.18, scaleY: 0.18, y: 0.49, color: '#111427' } },
  'Vertical Oval': { pupil: { enabled: true, shape: 'oval', scaleX: 0.19, scaleY: 0.28, y: 0.49, color: '#111427' } },
  'Soft Oval': { pupil: { enabled: true, shape: 'oval', scaleX: 0.22, scaleY: 0.32, y: 0.48, color: '#1a1e32', softness: 0.12 } },
  'Heart Pupil': { pupil: { enabled: true, shape: 'heart', scaleX: 0.22, scaleY: 0.24, y: 0.51, color: '#21142a', softness: 0.05 } },
  'Petal Pupil': { pupil: { enabled: true, shape: 'petal', scaleX: 0.2, scaleY: 0.29, y: 0.5, color: '#181727', softness: 0.05 } },
  'Slit Pupil': { pupil: { enabled: true, shape: 'slit', scaleX: 0.08, scaleY: 0.34, y: 0.48, color: '#0d0e18', softness: 0.03 } },
}

export const UPPER_ACCENT_PRESETS: Record<string, EyeStylePatch> = {
  'Soft Lash Shadow': { upperShadow: { enabled: true, color: '#09101f', intensity: 0.58, height: 0.46, softness: 0.7 }, reflection: { enabled: true, type: 'softPatch', color: '#8a92f1', opacity: 0.18, x: 0.22, y: 0.33, scaleX: 0.52, scaleY: 0.28, rotation: -0.42 } },
  'Heavy Top Shadow': { upperShadow: { enabled: true, color: '#050811', intensity: 0.88, height: 0.62, softness: 0.46 }, reflection: { enabled: false } },
  'Glassy Top Light': { upperShadow: { enabled: true, color: '#0d1224', intensity: 0.62, height: 0.48, softness: 0.55 }, reflection: { enabled: true, type: 'topBand', color: '#cad6ff', opacity: 0.28, x: 0.5, y: 0.2, scaleX: 0.88, scaleY: 0.22, rotation: 0 } },
  'Eyelash Reflection': { upperShadow: { enabled: true, color: '#0b0f1c', intensity: 0.66, height: 0.5, softness: 0.53 }, reflection: { enabled: true, type: 'curved', color: '#7b78de', opacity: 0.34, x: 0.28, y: 0.34, scaleX: 0.6, scaleY: 0.34, rotation: -0.45 } },
}

export const REFLECTION_PRESETS: Record<string, EyeStylePatch> = {
  'Soft Patch': { reflection: { enabled: true, type: 'softPatch', color: '#9ba7ff', opacity: 0.24, x: 0.28, y: 0.38, scaleX: 0.55, scaleY: 0.34, rotation: -0.2 } },
  'Curved Shine': { reflection: { enabled: true, type: 'curved', color: '#8d82e4', opacity: 0.32, x: 0.27, y: 0.37, scaleX: 0.55, scaleY: 0.35, rotation: -0.5 } },
  'Side Reflection': { reflection: { enabled: true, type: 'side', color: '#88b4ff', opacity: 0.3, x: 0.2, y: 0.48, scaleX: 0.35, scaleY: 0.58, rotation: -0.1 } },
  'Top Band': { reflection: { enabled: true, type: 'topBand', color: '#dbe5ff', opacity: 0.26, x: 0.5, y: 0.18, scaleX: 0.92, scaleY: 0.18, rotation: 0 } },
}

export const HIGHLIGHT_PRESET_PATCHES: Record<string, EyeStylePatch> = {
  'Single Large': { highlight: { enabled: true, preset: 'singleLarge', size: 1, x: 0.32, y: 0.22, opacity: 0.96, glow: 0.18 } },
  'Anime Standard': { highlight: { enabled: true, preset: 'animeStandard', size: 0.96, x: 0.32, y: 0.2, opacity: 0.95, glow: 0.18 } },
  'Glassy Double': { highlight: { enabled: true, preset: 'glassyDouble', size: 1, x: 0.31, y: 0.22, opacity: 0.96, glow: 0.18 } },
  'Cluster': { highlight: { enabled: true, preset: 'cluster', size: 0.9, x: 0.28, y: 0.22, opacity: 0.95, glow: 0.2 } },
  'Side Highlight': { highlight: { enabled: true, preset: 'sideHighlight', size: 0.92, x: 0.2, y: 0.38, opacity: 0.9, glow: 0.16 } },
  'Top Dome': { highlight: { enabled: true, preset: 'topDome', size: 0.95, x: 0.5, y: 0.16, opacity: 0.88, glow: 0.14 } },
  'Sparkle Arc': { highlight: { enabled: true, preset: 'sparkleArc', size: 0.92, x: 0.28, y: 0.22, opacity: 0.92, glow: 0.22 } },
}

export const PARTICLE_PRESETS: Record<string, EyeStylePatch> = {
  'Off': { particles: { enabled: false } },
  'Tiny Dots': { particles: { enabled: true, type: 'dot', count: 9, sizeMin: 0.008, sizeMax: 0.018, opacity: 0.7, glow: 0.1, color: '#ffffff' } },
  'Sparkle Stars': { particles: { enabled: true, type: 'star', count: 8, sizeMin: 0.009, sizeMax: 0.02, opacity: 0.78, glow: 0.16, color: '#fff6ff' } },
  'Diamond Dust': { particles: { enabled: true, type: 'diamond', count: 10, sizeMin: 0.01, sizeMax: 0.02, opacity: 0.8, glow: 0.12, color: '#d9ffff' } },
  'Big+Small Mix': { particles: { enabled: true, type: 'tinyCircle', count: 14, sizeMin: 0.005, sizeMax: 0.028, opacity: 0.74, glow: 0.08, color: '#ffffff' } },
}
