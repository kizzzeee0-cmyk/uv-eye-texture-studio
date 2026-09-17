export type EyeSide = 'left' | 'right'
export type ToolMode = 'pan' | 'mask'

export interface EyeMask {
  cx: number
  cy: number
  rx: number
  ry: number
  rotation: number
}

export interface EyeStyle {
  topColor: string
  midColor: string
  bottomColor: string
  ringColor: string
  pupilColor: string
  reflectionColor: string
  ringThickness: number
  pupilScale: number
  opacity: number
  radialStrength: number
  reflectionStrength: number
  highlightStrength: number
  highlightScale: number
  highlightX: number
  highlightY: number
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

export interface SavedProjectSettings {
  version: 2
  seed: number
  linkEyes: boolean
  masks: Record<EyeSide, EyeMask>
  styles: Record<EyeSide, EyeStyle>
  source?: {
    name: string
    width: number
    height: number
  }
}
