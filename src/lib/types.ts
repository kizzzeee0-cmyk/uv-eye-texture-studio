export type EyeSide = 'left' | 'right'
export type ToolMode = 'pan' | 'ellipse' | 'polygon' | 'editPoints' | 'moveMask'

export interface Point { x: number; y: number }

export interface EllipseMask {
  type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotation: number; feather: number
}
export interface PolygonMask { type: 'polygon'; points: Point[]; feather: number }
export type EyeMask = EllipseMask | PolygonMask

export type PupilShape =
  | 'circle' | 'ovalVertical' | 'ovalHorizontal' | 'softOval' | 'heart'
  | 'petal' | 'droplet' | 'lens' | 'slit' | 'core' | 'capsule' | 'flowerCore'

export type LowerPointType =
  | 'wave' | 'petal' | 'droplet' | 'glass' | 'reflection' | 'ovalCluster'
  | 'stippling' | 'curve' | 'mixed' | 'handdrawn' | 'crescent' | 'sparkDust'
  | 'crystal' | 'warmGlow' | 'brushStroke' | 'rainbowShard'

export type UpperShadowType =
  | 'softShadow' | 'deepShadow' | 'lashShadow' | 'splitLash' | 'animeTop'
  | 'jellyDark' | 'handdrawnShadow' | 'shortLash' | 'longLash'
  | 'centerShadow' | 'wingShadow' | 'roundLid' | 'thinAnime'

export type ReflectionType =
  | 'purpleGlow' | 'blueGlass' | 'topLens' | 'sideThin' | 'curvedBand' | 'complex'
  | 'mist' | 'handdrawn' | 'doubleReflection' | 'dotCluster' | 'dropletReflection'
  | 'lowerGlowReflection' | 'starSparkle' | 'pinkGloss' | 'cyanGloss' | 'film'
  | 'cloudTop' | 'dotBand' | 'colorPoint'

export type SymbolType =
  | 'heart' | 'doubleHeart' | 'crescent' | 'star' | 'crossSpark' | 'flower'
  | 'clover' | 'droplet' | 'diamond' | 'threeDots' | 'heartMoon' | 'starDots'
  | 'flowerDots' | 'colorDots' | 'mixedMini'

export type OverlayPresetType =
  | 'cloud' | 'fog' | 'glassVein' | 'flower' | 'starMist' | 'fragments'
  | 'ripple' | 'brushStroke' | 'handBrush'

export type IrisTextureType =
  | 'softRadial' | 'handRadial' | 'fibers' | 'ripple' | 'speckle'
  | 'softBrush' | 'fogTexture' | 'glassTexture' | 'watercolor' | 'pencil'
  | 'brushStroke' | 'unevenNoise' | 'ringLines' | 'lowerGlowTexture'

export type BlendMode = 'source-over' | 'screen' | 'overlay' | 'multiply' | 'soft-light'

export interface BackgroundState {
  enabled: boolean; presetId: string | null
  topColor: string; upperMidColor: string; midColor: string; lowerMidColor: string; bottomColor: string
  opacity: number; contrast: number; softness: number
}

export interface RingState {
  enabled: boolean; presetId: string | null; color: string; thickness: number; opacity: number; softness: number
}

export interface PupilState {
  enabled: boolean; presetId: string | null; shape: PupilShape
  x: number; y: number; scaleX: number; scaleY: number; rotation: number
  topColor: string; midColor: string; bottomColor: string
  gradientStrength: number; opacity: number; blur: number; softness: number
}

export interface LowerPointState {
  enabled: boolean; presetId: string | null; type: LowerPointType
  x: number; y: number; scale: number; spread: number; count: number; size: number; sizeJitter: number
  rotation: number; color: string; secondaryColor: string; opacity: number; blur: number; glow: number
  handDrawnAmount: number; seed: number
}

export interface UpperShadowState {
  enabled: boolean; presetId: string | null; type: UpperShadowType
  x: number; y: number; scaleX: number; scaleY: number; rotation: number
  intensity: number; opacity: number; blur: number; color: string
  lashCount: number; lashLength: number; lashSpread: number; handDrawnAmount: number
}

export interface ReflectionState {
  enabled: boolean; presetId: string | null; type: ReflectionType
  x: number; y: number; scaleX: number; scaleY: number; rotation: number
  color: string; secondaryColor: string; opacity: number; blur: number; bloom: number; handDrawnAmount: number; seed: number
}

export interface SymbolState {
  enabled: boolean; presetId: string | null; type: SymbolType
  x: number; y: number; scale: number; rotation: number
  color: string; secondaryColor: string; opacity: number; blur: number; handDrawnAmount: number; seed: number
}

export interface IrisTextureState {
  enabled: boolean; presetId: string | null; type: IrisTextureType
  color: string; secondaryColor: string; opacity: number; density: number; length: number; width: number
  rotation: number; randomness: number; handDrawnAmount: number; seed: number
}

export interface OverlayPresetState {
  enabled: boolean; presetId: string | null; type: OverlayPresetType
  x: number; y: number; scaleX: number; scaleY: number; rotation: number
  color: string; secondaryColor: string; opacity: number; blur: number; handDrawnAmount: number; seed: number
}

export interface HandDrawnTextureState {
  enabled: boolean; presetId: string | null; amount: number; opacity: number; color: string; grainSize: number; seed: number
}

export interface OverlayImageState {
  enabled: boolean; src: string | null; name: string | null
  x: number; y: number; scale: number; rotation: number; opacity: number; flipX: boolean
  tintColor: string | null; blendMode: BlendMode
}

export interface EyeDesignV6 {
  background: BackgroundState
  ring: RingState
  pupil: PupilState
  lowerPoint: LowerPointState
  upperShadow: UpperShadowState
  reflection: ReflectionState
  symbol: SymbolState
  irisTexture: IrisTextureState
  overlayPreset: OverlayPresetState
  handDrawnTexture: HandDrawnTextureState
  overlayImage: OverlayImageState
}

export interface UVFileInfo { name: string; width: number; height: number; hasAlpha: boolean }
export interface ViewState { zoom: number; offsetX: number; offsetY: number }

export interface EyeProjectV6 {
  version: 6
  masks: { left: EyeMask; right: EyeMask }
  design: EyeDesignV6
  source?: { name: string; width: number; height: number }
}
