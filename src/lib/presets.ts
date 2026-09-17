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

function mergeStyle(overrides: Partial<EyeStyle>): EyeStyle {
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
  'Night Blue': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#090d20', upperMid: '#17264e', mid: '#2f4f86', lowerMid: '#5d88b5', bottom: '#b6d7e8' },
    upperShadow: { ...DEFAULT_STYLE.upperShadow, intensity: 0.88 },
    outerRing: { ...DEFAULT_STYLE.outerRing, color: '#070b18', thickness: 0.09 },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#5768c8', opacity: 0.2 },
  }),
  'Dream Purple': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#2b173c', upperMid: '#533b75', mid: '#8b67b1', lowerMid: '#c695d8', bottom: '#f2d7ff' },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#8a9cff', opacity: 0.42 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'ovalCluster', color: '#fff1ff' },
    particles: { ...DEFAULT_STYLE.particles, type: 'star', color: '#fff0ff' },
  }),
  'Violet Glow': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#231333', upperMid: '#5f2f79', mid: '#9f5db0', lowerMid: '#dc8fc9', bottom: '#ffd7eb' },
    lowerGlow: { ...DEFAULT_STYLE.lowerGlow, color: '#ffd7ff', intensity: 0.48 },
    highlight: { ...DEFAULT_STYLE.highlight, preset: 'cluster', size: 0.86 },
  }),
  'Soft Pink Doll': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#4d2539', upperMid: '#8c3f67', mid: '#d06495', lowerMid: '#f49abb', bottom: '#ffd7df' },
    outerRing: { ...DEFAULT_STYLE.outerRing, color: '#472335' },
    innerRing: { ...DEFAULT_STYLE.innerRing, color: '#7e3659' },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'petal', color: '#fff0f5', count: 11 },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#d799e8' },
  }),
  'Pink Bloom': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#541d3b', upperMid: '#9f3769', mid: '#df5f9d', lowerMid: '#f79aba', bottom: '#ffe1e9' },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'droplet', count: 12, color: '#ffeef8', spread: 0.7 },
    particles: { ...DEFAULT_STYLE.particles, type: 'tinyCircle', count: 12 },
    highlight: { ...DEFAULT_STYLE.highlight, preset: 'animeStandard' },
  }),
  'Rose Jelly': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#431b2c', upperMid: '#84334f', mid: '#c85576', lowerMid: '#ed839a', bottom: '#ffc5ce' },
    reflection: { ...DEFAULT_STYLE.reflection, type: 'haze', color: '#ffb0dd', opacity: 0.34 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'wave', color: '#ffe8ef' },
  }),
  'Aqua Crystal': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#13303c', upperMid: '#205a6b', mid: '#3d8e9d', lowerMid: '#86cdd1', bottom: '#dbffff' },
    reflection: { ...DEFAULT_STYLE.reflection, color: '#8ab4ff', type: 'side', opacity: 0.32 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'glass', color: '#e6ffff', count: 8 },
    particles: { ...DEFAULT_STYLE.particles, type: 'diamond', color: '#b9ffff', count: 10 },
  }),
  'Cotton Pink': mergeStyle({
    gradient: { ...DEFAULT_STYLE.gradient, top: '#5a314a', upperMid: '#9b5b7c', mid: '#d58eaa', lowerMid: '#f0b5c7', bottom: '#ffe4ea' },
    upperShadow: { ...DEFAULT_STYLE.upperShadow, intensity: 0.5 },
    lowerGlow: { ...DEFAULT_STYLE.lowerGlow, intensity: 0.52 },
    lowerMotif: { ...DEFAULT_STYLE.lowerMotif, type: 'ovalCluster', count: 9, color: '#fff7fb' },
    highlight: { ...DEFAULT_STYLE.highlight, preset: 'topDome', opacity: 0.86 },
  }),
}

export function cloneStyle(style: EyeStyle): EyeStyle {
  return JSON.parse(JSON.stringify(style)) as EyeStyle
}
