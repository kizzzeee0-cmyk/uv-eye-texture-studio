export type EyeSide = 'left' | 'right'
export type ToolMode = 'pan' | 'ellipse' | 'polygon' | 'editPoints' | 'moveMask'

export interface Point {
  x: number
  y: number
}

export interface EllipseMask {
  type: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
  rotation: number
  feather: number
}

export interface PolygonMask {
  type: 'polygon'
  points: Point[]
  feather: number
}

export type EyeMask = EllipseMask | PolygonMask

export type PupilShape = 'circle' | 'oval' | 'heart' | 'petal' | 'slit'
export type MotifType = 'petal' | 'dash' | 'droplet' | 'glass' | 'wave' | 'ovalCluster' | 'lightShards' | 'mixedPoints'
export type ReflectionType = 'softPatch' | 'curved' | 'side' | 'haze' | 'topBand'
export type HighlightPreset = 'singleLarge' | 'animeStandard' | 'glassyDouble' | 'cluster' | 'sideHighlight' | 'topDome' | 'sparkleArc'
export type ParticleType = 'dot' | 'star' | 'diamond' | 'tinyCircle'

export interface EyeStyle {
  opacity: number
  gradient: {
    enabled: boolean
    top: string
    upperMid: string
    mid: string
    lowerMid: string
    bottom: string
  }
  upperShadow: {
    enabled: boolean
    color: string
    intensity: number
    height: number
    softness: number
  }
  lowerGlow: {
    enabled: boolean
    color: string
    intensity: number
    height: number
    spread: number
  }
  outerRing: {
    enabled: boolean
    color: string
    thickness: number
    opacity: number
    blur: number
  }
  innerRing: {
    enabled: boolean
    color: string
    radius: number
    thickness: number
    opacity: number
    blur: number
  }
  extraInnerRing: {
    enabled: boolean
    color: string
    radius: number
    thickness: number
    opacity: number
    blur: number
  }
  pupil: {
    enabled: boolean
    shape: PupilShape
    x: number
    y: number
    scaleX: number
    scaleY: number
    color: string
    opacity: number
    softness: number
  }
  radial: {
    enabled: boolean
    color: string
    strength: number
    density: number
    length: number
    width: number
    randomness: number
    rotation: number
    seed: number
  }
  softTexture: {
    enabled: boolean
    color: string
    strength: number
    amount: number
    seed: number
  }
  lowerMotif: {
    enabled: boolean
    type: MotifType
    color: string
    count: number
    size: number
    spread: number
    y: number
    opacity: number
    glow: number
  }
  reflection: {
    enabled: boolean
    type: ReflectionType
    color: string
    opacity: number
    blur: number
    x: number
    y: number
    scaleX: number
    scaleY: number
    rotation: number
  }
  highlight: {
    enabled: boolean
    preset: HighlightPreset
    color: string
    opacity: number
    size: number
    x: number
    y: number
    glow: number
  }
  particles: {
    enabled: boolean
    type: ParticleType
    color: string
    count: number
    sizeMin: number
    sizeMax: number
    opacity: number
    glow: number
    seed: number
  }
  effects: {
    brightness: number
    contrast: number
    saturation: number
    bloom: number
  }
}

export interface UVFileInfo {
  name: string
  width: number
  height: number
  hasAlpha: boolean
}

export interface ViewState {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface RandomOptions {
  colors: boolean
  structure: boolean
  texture: boolean
  motif: boolean
  highlights: boolean
}

export interface SavedProjectSettings {
  version: 4
  seed: number
  linkEyes: boolean
  selectedEye: EyeSide
  masks: Record<EyeSide, EyeMask>
  styles: Record<EyeSide, EyeStyle>
  source?: {
    name: string
    width: number
    height: number
  }
}
