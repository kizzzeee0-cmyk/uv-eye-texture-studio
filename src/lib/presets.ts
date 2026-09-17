import type { EyeDesignV5 } from './types'

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type DesignPatch = DeepPartial<EyeDesignV5>

export const CLEAR_DESIGN: EyeDesignV5 = {
  background: {
    enabled: false,
    presetId: null,
    topColor: '#2d1d45',
    upperMidColor: '#60406f',
    midColor: '#a86d9e',
    lowerMidColor: '#e3a4c9',
    bottomColor: '#f8dbe9',
    opacity: 1,
    contrast: 1,
    softness: 0.5,
  },
  ring: {
    enabled: false,
    presetId: null,
    color: '#2a1738',
    thickness: 0.06,
    opacity: 0.85,
    softness: 0.03,
  },
  pupil: {
    enabled: false,
    presetId: null,
    shape: 'ovalVertical',
    x: 0.5,
    y: 0.47,
    scaleX: 0.22,
    scaleY: 0.3,
    rotation: 0,
    topColor: '#26172d',
    midColor: '#5b315f',
    bottomColor: '#a76191',
    edgeColor: '#180f20',
    gradientStrength: 0.8,
    edgeOpacity: 0.7,
    opacity: 0.92,
    blur: 0,
    softness: 0.08,
  },
  lowerPoint: {
    enabled: false,
    presetId: null,
    type: 'petal',
    x: 0.5,
    y: 0.73,
    scale: 1,
    spread: 0.62,
    count: 9,
    size: 0.075,
    sizeJitter: 0.18,
    rotation: 0,
    color: '#f8d9ed',
    secondaryColor: '#c9a5ff',
    opacity: 0.65,
    blur: 0.01,
    glow: 0.08,
    handDrawnAmount: 0.16,
    seed: 505,
  },
  upperShadow: {
    enabled: false,
    presetId: null,
    type: 'softShadow',
    x: 0.5,
    y: 0.22,
    scaleX: 1,
    scaleY: 0.5,
    rotation: 0,
    intensity: 0.7,
    opacity: 0.7,
    blur: 0.05,
    color: '#21182f',
    lashCount: 5,
    lashLength: 0.2,
    lashSpread: 0.7,
    handDrawnAmount: 0.12,
  },
  reflection: {
    enabled: false,
    presetId: null,
    type: 'purpleGlow',
    x: 0.31,
    y: 0.38,
    scaleX: 0.52,
    scaleY: 0.3,
    rotation: -0.35,
    color: '#9a89df',
    secondaryColor: '#7db7ff',
    opacity: 0.26,
    blur: 0.06,
    bloom: 0.08,
    handDrawnAmount: 0.12,
  },
  irisTexture: {
    enabled: false,
    presetId: null,
    type: 'softRadial',
    color: '#dfcdfa',
    secondaryColor: '#7daee9',
    opacity: 0.22,
    density: 34,
    length: 0.7,
    width: 0.012,
    rotation: 0,
    randomness: 0.24,
    handDrawnAmount: 0.18,
    seed: 777,
  },
  overlayPreset: {
    enabled: false,
    presetId: null,
    type: 'fog',
    x: 0.5,
    y: 0.54,
    scaleX: 0.8,
    scaleY: 0.5,
    rotation: 0,
    color: '#d4c4f2',
    secondaryColor: '#a6d2ff',
    opacity: 0.2,
    blur: 0.04,
    handDrawnAmount: 0.14,
    seed: 105,
  },
  handDrawnTexture: {
    enabled: false,
    presetId: null,
    amount: 0.18,
    opacity: 0.12,
    color: '#ffffff',
    grainSize: 0.025,
    seed: 909,
  },
  overlayImage: {
    enabled: false,
    src: null,
    name: null,
    x: 0.5,
    y: 0.5,
    scale: 0.6,
    rotation: 0,
    opacity: 0.65,
    flipX: false,
    tintColor: null,
    blendMode: 'source-over',
  },
}

export function cloneDesign(design: EyeDesignV5): EyeDesignV5 {
  return JSON.parse(JSON.stringify(design)) as EyeDesignV5
}

export function applyDesignPatch(base: EyeDesignV5, patch: DesignPatch): EyeDesignV5 {
  const next = cloneDesign(base)
  for (const key of Object.keys(patch) as (keyof EyeDesignV5)[]) {
    const incoming = patch[key]
    if (incoming && typeof incoming === 'object') {
      Object.assign(next[key] as object, incoming)
    }
  }
  return next
}

export const BACKGROUND_PRESETS: Record<string, DesignPatch> = {
  '분홍 보라': { background: { enabled: true, presetId: '분홍 보라', topColor: '#29182f', upperMidColor: '#5d315f', midColor: '#a5558d', lowerMidColor: '#e68ebd', bottomColor: '#ffd9eb', opacity: 1, contrast: 1.04 } },
  '장밋빛 핑크': { background: { enabled: true, presetId: '장밋빛 핑크', topColor: '#3c1625', upperMidColor: '#7c304e', midColor: '#c64f7b', lowerMidColor: '#f38faf', bottomColor: '#ffe0e8', opacity: 1, contrast: 1.02 } },
  '몽환 퍼플': { background: { enabled: true, presetId: '몽환 퍼플', topColor: '#20172f', upperMidColor: '#49346f', midColor: '#7b63ae', lowerMidColor: '#b49bd7', bottomColor: '#eadfff', opacity: 1, contrast: 1 } },
  '청보라': { background: { enabled: true, presetId: '청보라', topColor: '#121932', upperMidColor: '#283e70', midColor: '#526fae', lowerMidColor: '#93a7d9', bottomColor: '#e2e8ff', opacity: 1, contrast: 1.04 } },
  '푸른 유리': { background: { enabled: true, presetId: '푸른 유리', topColor: '#101a2d', upperMidColor: '#264c78', midColor: '#4f89be', lowerMidColor: '#8fc8e7', bottomColor: '#e4f9ff', opacity: 1, contrast: 1.05 } },
  '민트 블루': { background: { enabled: true, presetId: '민트 블루', topColor: '#12323a', upperMidColor: '#246170', midColor: '#4a9aa7', lowerMidColor: '#94d2d3', bottomColor: '#e6ffff', opacity: 1, contrast: 1.02 } },
  '회보라': { background: { enabled: true, presetId: '회보라', topColor: '#242331', upperMidColor: '#48465f', midColor: '#76758e', lowerMidColor: '#aaa7c3', bottomColor: '#eeeaf8', opacity: 1, contrast: 0.98 } },
  '밀키 핑크': { background: { enabled: true, presetId: '밀키 핑크', topColor: '#4d3040', upperMidColor: '#8f6177', midColor: '#d497ae', lowerMidColor: '#edbccd', bottomColor: '#fff0f4', opacity: 0.95, contrast: 0.96 } },
  '앰버 브라운': { background: { enabled: true, presetId: '앰버 브라운', topColor: '#2a1e14', upperMidColor: '#5f4527', midColor: '#9e743d', lowerMidColor: '#d3a86b', bottomColor: '#f7e2b6', opacity: 1, contrast: 1.02 } },
}

export const RING_PRESETS: Record<string, DesignPatch> = {
  '부드러운 딥 링': { ring: { enabled: true, presetId: '부드러운 딥 링', color: '#241729', thickness: 0.07, opacity: 0.7, softness: 0.04 } },
  '플럼 링': { ring: { enabled: true, presetId: '플럼 링', color: '#4b2346', thickness: 0.065, opacity: 0.8, softness: 0.025 } },
  '네이비 링': { ring: { enabled: true, presetId: '네이비 링', color: '#14223a', thickness: 0.06, opacity: 0.8, softness: 0.03 } },
  '얇은 소프트 링': { ring: { enabled: true, presetId: '얇은 소프트 링', color: '#5d4c6e', thickness: 0.035, opacity: 0.52, softness: 0.08 } },
}

export const PUPIL_PRESETS: Record<string, DesignPatch> = {
  '원형': { pupil: { enabled: true, presetId: '원형', shape: 'circle', scaleX: 0.2, scaleY: 0.2 } },
  '세로 타원': { pupil: { enabled: true, presetId: '세로 타원', shape: 'ovalVertical', scaleX: 0.19, scaleY: 0.3 } },
  '가로 타원': { pupil: { enabled: true, presetId: '가로 타원', shape: 'ovalHorizontal', scaleX: 0.29, scaleY: 0.18 } },
  '소프트 타원': { pupil: { enabled: true, presetId: '소프트 타원', shape: 'softOval', scaleX: 0.22, scaleY: 0.29, softness: 0.16 } },
  '하트': { pupil: { enabled: true, presetId: '하트', shape: 'heart', scaleX: 0.22, scaleY: 0.24, y: 0.5 } },
  '꽃잎형': { pupil: { enabled: true, presetId: '꽃잎형', shape: 'petal', scaleX: 0.2, scaleY: 0.29 } },
  '물방울형': { pupil: { enabled: true, presetId: '물방울형', shape: 'droplet', scaleX: 0.2, scaleY: 0.29 } },
  '렌즈형': { pupil: { enabled: true, presetId: '렌즈형', shape: 'lens', scaleX: 0.24, scaleY: 0.26 } },
  '슬릿형': { pupil: { enabled: true, presetId: '슬릿형', shape: 'slit', scaleX: 0.08, scaleY: 0.34 } },
  '코어형': { pupil: { enabled: true, presetId: '코어형', shape: 'core', scaleX: 0.24, scaleY: 0.28, edgeOpacity: 0.85 } },
}

export const LOWER_POINT_PRESETS: Record<string, DesignPatch> = {
  '부드러운 파도': { lowerPoint: { enabled: true, presetId: '부드러운 파도', type: 'wave', count: 7, size: 0.075, spread: 0.68, color: '#d8cef4', secondaryColor: '#9cc9ee', opacity: 0.54, glow: 0.04, handDrawnAmount: 0.18 } },
  '꽃잎 호': { lowerPoint: { enabled: true, presetId: '꽃잎 호', type: 'petal', count: 10, size: 0.072, spread: 0.61, color: '#f0cbe1', secondaryColor: '#c6b6ed', opacity: 0.62, glow: 0.05, handDrawnAmount: 0.24 } },
  '물방울 호': { lowerPoint: { enabled: true, presetId: '물방울 호', type: 'droplet', count: 9, size: 0.07, spread: 0.64, color: '#cde6ee', secondaryColor: '#b7a8df', opacity: 0.62, handDrawnAmount: 0.18 } },
  '유리 파편': { lowerPoint: { enabled: true, presetId: '유리 파편', type: 'glass', count: 8, size: 0.07, spread: 0.66, color: '#d6def6', secondaryColor: '#92c6e9', opacity: 0.52, glow: 0.04, handDrawnAmount: 0.3 } },
  '광택 조각': { lowerPoint: { enabled: true, presetId: '광택 조각', type: 'reflection', count: 9, size: 0.065, spread: 0.64, color: '#e4c9ea', secondaryColor: '#8fbce5', opacity: 0.46, blur: 0.012, handDrawnAmount: 0.18 } },
  '타원 클러스터': { lowerPoint: { enabled: true, presetId: '타원 클러스터', type: 'ovalCluster', count: 9, size: 0.065, spread: 0.6, color: '#efccdf', secondaryColor: '#abc7e8', opacity: 0.58, handDrawnAmount: 0.25 } },
  '손그림 점묘': { lowerPoint: { enabled: true, presetId: '손그림 점묘', type: 'stippling', count: 17, size: 0.04, spread: 0.67, color: '#d8b8d8', secondaryColor: '#91badd', opacity: 0.5, sizeJitter: 0.45, handDrawnAmount: 0.68 } },
  '짧은 곡선': { lowerPoint: { enabled: true, presetId: '짧은 곡선', type: 'curve', count: 8, size: 0.07, spread: 0.64, color: '#d8caec', secondaryColor: '#99b9db', opacity: 0.54, handDrawnAmount: 0.42 } },
  '크고 작은 혼합': { lowerPoint: { enabled: true, presetId: '크고 작은 혼합', type: 'mixed', count: 13, size: 0.055, spread: 0.7, color: '#e2c9e6', secondaryColor: '#9cc6e5', opacity: 0.56, sizeJitter: 0.5, handDrawnAmount: 0.36 } },
  '손그림 브러시': { lowerPoint: { enabled: true, presetId: '손그림 브러시', type: 'handdrawn', count: 8, size: 0.08, spread: 0.62, color: '#d7bddc', secondaryColor: '#8fb7dd', opacity: 0.46, blur: 0.008, handDrawnAmount: 0.82 } },
}

export const UPPER_SHADOW_PRESETS: Record<string, DesignPatch> = {
  '부드러운 상단 그림자': { upperShadow: { enabled: true, presetId: '부드러운 상단 그림자', type: 'softShadow', y: 0.22, scaleY: 0.52, intensity: 0.66, opacity: 0.62, blur: 0.055, color: '#1e1730' } },
  '강한 상단 그림자': { upperShadow: { enabled: true, presetId: '강한 상단 그림자', type: 'deepShadow', y: 0.2, scaleY: 0.58, intensity: 0.88, opacity: 0.78, blur: 0.035, color: '#171126' } },
  '속눈썹 그림자': { upperShadow: { enabled: true, presetId: '속눈썹 그림자', type: 'lashShadow', lashCount: 5, lashLength: 0.22, lashSpread: 0.72, opacity: 0.65, color: '#21172b', handDrawnAmount: 0.18 } },
  '갈라진 속눈썹': { upperShadow: { enabled: true, presetId: '갈라진 속눈썹', type: 'splitLash', lashCount: 7, lashLength: 0.25, lashSpread: 0.74, opacity: 0.62, color: '#21152a', handDrawnAmount: 0.28 } },
  '애니 상단 암부': { upperShadow: { enabled: true, presetId: '애니 상단 암부', type: 'animeTop', y: 0.21, scaleY: 0.6, intensity: 0.85, opacity: 0.75, color: '#17142a' } },
  '젤리형 상단 암부': { upperShadow: { enabled: true, presetId: '젤리형 상단 암부', type: 'jellyDark', y: 0.24, scaleY: 0.48, intensity: 0.7, opacity: 0.64, blur: 0.07, color: '#34203f' } },
  '손그림 번짐': { upperShadow: { enabled: true, presetId: '손그림 번짐', type: 'handdrawnShadow', y: 0.22, scaleY: 0.52, intensity: 0.68, opacity: 0.58, blur: 0.045, color: '#24192f', handDrawnAmount: 0.72 } },
}

export const REFLECTION_PRESETS: Record<string, DesignPatch> = {
  '보라빛 번짐': { reflection: { enabled: true, presetId: '보라빛 번짐', type: 'purpleGlow', x: 0.28, y: 0.38, scaleX: 0.54, scaleY: 0.34, rotation: -0.38, color: '#9582cf', secondaryColor: '#c391cc', opacity: 0.22, blur: 0.065, bloom: 0.06 } },
  '푸른 유리': { reflection: { enabled: true, presetId: '푸른 유리', type: 'blueGlass', x: 0.25, y: 0.41, scaleX: 0.5, scaleY: 0.32, rotation: -0.3, color: '#77a9dc', secondaryColor: '#b5c5ef', opacity: 0.24, blur: 0.04, bloom: 0.04 } },
  '상단 렌즈 반사': { reflection: { enabled: true, presetId: '상단 렌즈 반사', type: 'topLens', x: 0.5, y: 0.28, scaleX: 0.8, scaleY: 0.24, rotation: 0, color: '#a49bd2', secondaryColor: '#6e9ac5', opacity: 0.22, blur: 0.025 } },
  '측면 얇은 반사': { reflection: { enabled: true, presetId: '측면 얇은 반사', type: 'sideThin', x: 0.21, y: 0.51, scaleX: 0.24, scaleY: 0.64, rotation: -0.16, color: '#86b4d5', secondaryColor: '#d0aed0', opacity: 0.26, blur: 0.025 } },
  '곡선 띠': { reflection: { enabled: true, presetId: '곡선 띠', type: 'curvedBand', x: 0.34, y: 0.42, scaleX: 0.58, scaleY: 0.42, rotation: -0.34, color: '#b18ac5', secondaryColor: '#79a4d3', opacity: 0.22, blur: 0.02, handDrawnAmount: 0.18 } },
  '복합 반사': { reflection: { enabled: true, presetId: '복합 반사', type: 'complex', x: 0.34, y: 0.4, scaleX: 0.62, scaleY: 0.4, rotation: -0.28, color: '#aa8dcc', secondaryColor: '#75a5d1', opacity: 0.2, blur: 0.035, handDrawnAmount: 0.26 } },
  '안개형 반사': { reflection: { enabled: true, presetId: '안개형 반사', type: 'mist', x: 0.46, y: 0.42, scaleX: 0.85, scaleY: 0.5, rotation: 0, color: '#bba6d8', secondaryColor: '#88b5d9', opacity: 0.16, blur: 0.11 } },
  '손그림 번짐 반사': { reflection: { enabled: true, presetId: '손그림 번짐 반사', type: 'handdrawn', x: 0.3, y: 0.42, scaleX: 0.62, scaleY: 0.42, rotation: -0.25, color: '#a786bd', secondaryColor: '#79a9cb', opacity: 0.2, blur: 0.035, handDrawnAmount: 0.72 } },
}

export const IRIS_TEXTURE_PRESETS: Record<string, DesignPatch> = {
  '부드러운 방사결': { irisTexture: { enabled: true, presetId: '부드러운 방사결', type: 'softRadial', opacity: 0.18, density: 30, length: 0.72, width: 0.012, randomness: 0.22, color: '#d5bfe8', secondaryColor: '#7fa9d3', handDrawnAmount: 0.18 } },
  '손그림 방사결': { irisTexture: { enabled: true, presetId: '손그림 방사결', type: 'handRadial', opacity: 0.2, density: 28, length: 0.68, width: 0.014, randomness: 0.38, color: '#c6acd8', secondaryColor: '#759cc5', handDrawnAmount: 0.7 } },
  '얇은 섬유결': { irisTexture: { enabled: true, presetId: '얇은 섬유결', type: 'fibers', opacity: 0.16, density: 42, length: 0.78, width: 0.007, randomness: 0.32, color: '#d6cae2', secondaryColor: '#7899be', handDrawnAmount: 0.32 } },
  '물결결': { irisTexture: { enabled: true, presetId: '물결결', type: 'ripple', opacity: 0.16, density: 8, length: 0.6, width: 0.01, randomness: 0.2, color: '#c7b8d9', secondaryColor: '#78a6cc', handDrawnAmount: 0.28 } },
  '미세 점결': { irisTexture: { enabled: true, presetId: '미세 점결', type: 'speckle', opacity: 0.15, density: 50, length: 0.5, width: 0.01, randomness: 0.55, color: '#d9c4df', secondaryColor: '#7da0c4', handDrawnAmount: 0.48 } },
}

export const OVERLAY_PRESETS: Record<string, DesignPatch> = {
  '안개 결': { overlayPreset: { enabled: true, presetId: '안개 결', type: 'fog', x: 0.5, y: 0.52, scaleX: 0.9, scaleY: 0.55, rotation: 0, color: '#c9b7d9', secondaryColor: '#8fb2d4', opacity: 0.16, blur: 0.08, handDrawnAmount: 0.2 } },
  '유리결': { overlayPreset: { enabled: true, presetId: '유리결', type: 'glassVein', x: 0.5, y: 0.55, scaleX: 0.8, scaleY: 0.62, rotation: 0.08, color: '#b6c2dc', secondaryColor: '#9a83b4', opacity: 0.2, blur: 0.01, handDrawnAmount: 0.28 } },
  '꽃무늬': { overlayPreset: { enabled: true, presetId: '꽃무늬', type: 'flower', x: 0.5, y: 0.58, scaleX: 0.72, scaleY: 0.62, rotation: 0, color: '#d9b6d2', secondaryColor: '#8caed2', opacity: 0.18, blur: 0.01, handDrawnAmount: 0.22 } },
  '별 안개': { overlayPreset: { enabled: true, presetId: '별 안개', type: 'starMist', x: 0.5, y: 0.52, scaleX: 0.8, scaleY: 0.7, rotation: 0, color: '#ceb7d9', secondaryColor: '#81add1', opacity: 0.18, blur: 0.02, handDrawnAmount: 0.28 } },
  '파편 무늬': { overlayPreset: { enabled: true, presetId: '파편 무늬', type: 'fragments', x: 0.5, y: 0.58, scaleX: 0.8, scaleY: 0.7, rotation: 0.04, color: '#c7bdd5', secondaryColor: '#7ca4c9', opacity: 0.2, blur: 0.008, handDrawnAmount: 0.38 } },
  '물결 무늬': { overlayPreset: { enabled: true, presetId: '물결 무늬', type: 'ripple', x: 0.5, y: 0.57, scaleX: 0.88, scaleY: 0.65, rotation: 0, color: '#c1b6d4', secondaryColor: '#82a9ce', opacity: 0.17, blur: 0.015, handDrawnAmount: 0.26 } },
  '브러시 스트로크': { overlayPreset: { enabled: true, presetId: '브러시 스트로크', type: 'brushStroke', x: 0.5, y: 0.55, scaleX: 0.86, scaleY: 0.6, rotation: -0.08, color: '#c5aac7', secondaryColor: '#769ec5', opacity: 0.16, blur: 0.025, handDrawnAmount: 0.58 } },
  '손그림 붓터치': { overlayPreset: { enabled: true, presetId: '손그림 붓터치', type: 'handBrush', x: 0.5, y: 0.58, scaleX: 0.84, scaleY: 0.64, rotation: 0.06, color: '#c2a4c4', secondaryColor: '#7898ba', opacity: 0.16, blur: 0.018, handDrawnAmount: 0.86 } },
}

export const HANDDRAWN_PRESETS: Record<string, DesignPatch> = {
  '약하게': { handDrawnTexture: { enabled: true, presetId: '약하게', amount: 0.16, opacity: 0.08, color: '#ffffff', grainSize: 0.02 } },
  '중간': { handDrawnTexture: { enabled: true, presetId: '중간', amount: 0.32, opacity: 0.1, color: '#ffffff', grainSize: 0.026 } },
  '강하게': { handDrawnTexture: { enabled: true, presetId: '강하게', amount: 0.58, opacity: 0.12, color: '#f4e8ef', grainSize: 0.032 } },
  '수채화 번짐': { handDrawnTexture: { enabled: true, presetId: '수채화 번짐', amount: 0.72, opacity: 0.09, color: '#d8c7db', grainSize: 0.05 } },
}
