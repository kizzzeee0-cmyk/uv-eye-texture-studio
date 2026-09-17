import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode, WheelEvent } from 'react'
import { clamp, imageToScreen, nearestPointIndex, nearestSegmentIndex, screenToImage } from './lib/math'
import { cloneMask, makeEllipseMask, makePolygonMask, translateMask } from './lib/mask'
import { compositeEyeDesign, exportEyePng, exportFullUvPng } from './lib/irisRenderer'
import { detectEyeMasksFromAlpha } from './lib/detect'
import {
  applyDesignPatch,
  BACKGROUND_PRESETS,
  CLEAR_DESIGN,
  cloneDesign,
  HANDDRAWN_PRESETS,
  IRIS_TEXTURE_PRESETS,
  LOWER_POINT_PRESETS,
  OVERLAY_PRESETS,
  PUPIL_PRESETS,
  REFLECTION_PRESETS,
  RING_PRESETS,
  SYMBOL_PRESETS,
  UPPER_SHADOW_PRESETS,
} from './lib/presets'
import type { EyeDesignV6, EyeMask, EyeProjectV6, Point, ToolMode, UVFileInfo, ViewState } from './lib/types'

type Category = 'mask' | 'background' | 'ring' | 'pupil' | 'lowerPoint' | 'upperShadow' | 'reflection' | 'symbol' | 'irisTexture' | 'overlayPreset' | 'handDrawnTexture' | 'overlayImage'

const CATEGORY_LABELS: Record<Category, string> = {
  mask: '마스크',
  background: '배경',
  ring: '윤곽 링',
  pupil: '동공',
  lowerPoint: '하단 포인트',
  upperShadow: '상단 그림자',
  reflection: '반사광',
  symbol: '상징 문양',
  irisTexture: '홍채 결',
  overlayPreset: '문양',
  handDrawnTexture: '손그림 질감',
  overlayImage: '이미지 오버레이',
}

const TOOL_LABELS: Record<ToolMode, string> = {
  pan: '이동',
  ellipse: '타원 마스크',
  polygon: '다각형 마스크',
  editPoints: '점 편집',
  moveMask: '마스크 전체 이동',
}

function createDefaultMasks(width: number, height: number) {
  const radius = Math.max(28, Math.round(Math.min(width, height) * 0.055))
  return {
    left: makeEllipseMask(width * 0.16, height * 0.13, radius, radius),
    right: makeEllipseMask(width * 0.84, height * 0.13, radius, radius),
  }
}

function mirrorMask(mask: EyeMask, width: number): EyeMask {
  if (mask.type === 'ellipse') {
    return { ...mask, cx: width - mask.cx, rotation: -mask.rotation }
  }
  return {
    ...mask,
    points: mask.points.map((point) => ({ x: width - point.x, y: point.y })).reverse(),
  }
}

function deepCloneProject(project: EyeProjectV6): EyeProjectV6 {
  return JSON.parse(JSON.stringify(project)) as EyeProjectV6
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  a.click()
}

function downloadText(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function App() {
  const uvInputRef = useRef<HTMLInputElement | null>(null)
  const projectInputRef = useRef<HTMLInputElement | null>(null)
  const overlayInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasHostRef = useRef<HTMLDivElement | null>(null)

  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [overlayElement, setOverlayElement] = useState<HTMLImageElement | null>(null)
  const [uvInfo, setUvInfo] = useState<UVFileInfo | null>(null)
  const [project, setProject] = useState<EyeProjectV6>({
    version: 6,
    masks: { left: makeEllipseMask(200, 150, 65, 65), right: makeEllipseMask(700, 150, 65, 65) },
    design: cloneDesign(CLEAR_DESIGN),
  })
  const [toolMode, setToolMode] = useState<ToolMode>('pan')
  const [category, setCategory] = useState<Category>('background')
  const [view, setView] = useState<ViewState>({ zoom: 1, offsetX: 0, offsetY: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 650 })
  const [draftPoints, setDraftPoints] = useState<Point[]>([])
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [status, setStatus] = useState('UV 텍스처를 열어주세요.')
  const historyRef = useRef<EyeProjectV6[]>([])
  const futureRef = useRef<EyeProjectV6[]>([])

  const dragRef = useRef<
    | { type: 'pan'; startX: number; startY: number; offsetX: number; offsetY: number }
    | { type: 'ellipse'; start: Point; original: EyeProjectV6 }
    | { type: 'moveMask'; start: Point; original: EyeMask; originalProject: EyeProjectV6 }
    | { type: 'point'; index: number; originalProject: EyeProjectV6 }
    | null
  >(null)

  const canEdit = Boolean(imageElement && uvInfo)
  const zoomLabel = useMemo(() => `${Math.round(view.zoom * 100)}%`, [view.zoom])

  useEffect(() => {
    const host = canvasHostRef.current
    if (!host) return
    const resize = () => {
      const rect = host.getBoundingClientRect()
      setCanvasSize({ width: Math.max(320, rect.width), height: Math.max(360, rect.height) })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const src = project.design.overlayImage.src
    if (!src) {
      setOverlayElement(null)
      return
    }
    const image = new Image()
    image.onload = () => setOverlayElement(image)
    image.onerror = () => setOverlayElement(null)
    image.src = src
  }, [project.design.overlayImage.src])

  function pushHistory(snapshot = project) {
    historyRef.current.push(deepCloneProject(snapshot))
    if (historyRef.current.length > 80) historyRef.current.shift()
    futureRef.current = []
  }

  function commitProject(updater: (current: EyeProjectV6) => EyeProjectV6) {
    setProject((current) => {
      historyRef.current.push(deepCloneProject(current))
      if (historyRef.current.length > 80) historyRef.current.shift()
      futureRef.current = []
      return updater(deepCloneProject(current))
    })
  }

  function undo() {
    const previous = historyRef.current.pop()
    if (!previous) return
    futureRef.current.push(deepCloneProject(project))
    setProject(previous)
    setStatus('실행 취소했습니다.')
  }

  function redo() {
    const next = futureRef.current.pop()
    if (!next) return
    historyRef.current.push(deepCloneProject(project))
    setProject(next)
    setStatus('다시 실행했습니다.')
  }

  function updateDesign(section: keyof EyeDesignV6, patch: Record<string, unknown>, withHistory = false) {
    const apply = (current: EyeProjectV6) => ({
      ...current,
      design: {
        ...current.design,
        [section]: { ...(current.design[section] as object), ...patch },
      },
    }) as EyeProjectV6
    if (withHistory) commitProject(apply)
    else setProject((current) => apply(current))
  }

  function clearSection(section: keyof EyeDesignV6) {
    commitProject((current) => ({
      ...current,
      design: { ...current.design, [section]: JSON.parse(JSON.stringify(CLEAR_DESIGN[section])) },
    }) as EyeProjectV6)
  }

  function togglePreset(section: keyof EyeDesignV6, name: string, patch: any) {
    const currentSection = project.design[section] as any
    if (currentSection.enabled && currentSection.presetId === name) {
      clearSection(section)
      setStatus(`${CATEGORY_LABELS[section as Category] ?? '프리셋'}: ${name} 해제`)
      return
    }
    commitProject((current) => {
      const nextDesign = applyDesignPatch(current.design, patch)
      return { ...current, design: nextDesign }
    })
    setStatus(`${name} 프리셋을 적용했습니다. 같은 버튼을 다시 누르면 해제됩니다.`)
  }

  const fitView = () => {
    setView({ zoom: 1, offsetX: 0, offsetY: 0 })
    setStatus('화면에 맞췄습니다.')
  }

  const resetTo100 = () => {
    if (!uvInfo) return
    const scaleAt100 = 1 / Math.min(canvasSize.width / uvInfo.width, canvasSize.height / uvInfo.height)
    setView({ zoom: scaleAt100, offsetX: 0, offsetY: 0 })
    setStatus('100% 보기로 변경했습니다.')
  }

  function applyDetectedMasks(image: HTMLImageElement, currentSource?: EyeProjectV6['source']) {
    try {
      const detected = detectEyeMasksFromAlpha(image)
      setProject({ version: 6, masks: detected.masks, design: cloneDesign(CLEAR_DESIGN), source: currentSource })
      setToolMode('editPoints')
      setStatus(`눈 위치 자동 인식 완료. ${detected.message} 현재 디자인은 모두 꺼진 클리어 상태입니다.`)
    } catch (error) {
      const fallback = createDefaultMasks(image.naturalWidth, image.naturalHeight)
      setProject({ version: 6, masks: fallback, design: cloneDesign(CLEAR_DESIGN), source: currentSource })
      setToolMode('moveMask')
      setStatus(`자동 인식 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'} 수동 마스크를 사용해주세요.`)
    }
    historyRef.current = []
    futureRef.current = []
  }

  const handleUvFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'image/png') {
      setStatus('UV 텍스처는 PNG 파일을 사용해주세요.')
      return
    }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImageElement(image)
      const info = { name: file.name, width: image.naturalWidth, height: image.naturalHeight, hasAlpha: true }
      setUvInfo(info)
      setView({ zoom: 1, offsetX: 0, offsetY: 0 })
      setDraftPoints([])
      setSelectedPointIndex(null)
      applyDetectedMasks(image, { name: file.name, width: image.naturalWidth, height: image.naturalHeight })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => setStatus('PNG 파일을 읽을 수 없습니다.')
    image.src = url
    event.target.value = ''
  }

  const reDetect = () => {
    if (!imageElement || !uvInfo) return
    pushHistory()
    try {
      const detected = detectEyeMasksFromAlpha(imageElement)
      setProject((current) => ({ ...current, masks: detected.masks }))
      setToolMode('editPoints')
      setStatus('양쪽 눈 위치를 다시 자동 인식했습니다.')
    } catch (error) {
      setStatus(`자동 인식 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(canvasSize.width * ratio)
    canvas.height = Math.floor(canvasSize.height * ratio)
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    drawChecker(ctx, canvasSize.width, canvasSize.height)

    if (!imageElement || !uvInfo) {
      drawEmptyState(ctx, canvasSize.width, canvasSize.height)
      return
    }

    const transform = imageToScreen(0, 0, canvasSize, uvInfo, view)
    ctx.drawImage(imageElement, transform.startX, transform.startY, uvInfo.width * transform.scale, uvInfo.height * transform.scale)

    const leftScreen = maskToScreen(project.masks.left, canvasSize, uvInfo, view)
    const rightScreen = maskToScreen(project.masks.right, canvasSize, uvInfo, view)
    compositeEyeDesign(ctx, leftScreen, project.design, canvasSize.width, canvasSize.height, false, overlayElement)
    compositeEyeDesign(ctx, rightScreen, project.design, canvasSize.width, canvasSize.height, true, overlayElement)
    drawMaskOverlay(ctx, leftScreen, '#8eb3ff', toolMode === 'editPoints' ? selectedPointIndex : null)
    drawMaskOverlay(ctx, rightScreen, '#ff9ccf', null)
    drawDraftPolygon(ctx, draftPoints.map((p) => imagePointToScreen(p, canvasSize, uvInfo, view)))
  }, [canvasSize, draftPoints, imageElement, overlayElement, project, selectedPointIndex, toolMode, uvInfo, view])

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    if (!uvInfo || !imageElement) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const sx = event.clientX - rect.left
    const sy = event.clientY - rect.top
    const before = screenToImage(sx, sy, canvasSize, uvInfo, view)
    const nextZoom = clamp(view.zoom * (event.deltaY < 0 ? 1.1 : 0.9), 0.1, 24)
    const nextView = { ...view, zoom: nextZoom }
    const after = imageToScreen(before.x, before.y, canvasSize, uvInfo, nextView)
    setView({ zoom: nextZoom, offsetX: view.offsetX + sx - after.x, offsetY: view.offsetY + sy - after.y })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!uvInfo) return
    const rect = event.currentTarget.getBoundingClientRect()
    const sx = event.clientX - rect.left
    const sy = event.clientY - rect.top
    const point = screenToImage(sx, sy, canvasSize, uvInfo, view)

    if (toolMode === 'pan') {
      dragRef.current = { type: 'pan', startX: sx, startY: sy, offsetX: view.offsetX, offsetY: view.offsetY }
      return
    }

    if (toolMode === 'ellipse') {
      pushHistory()
      dragRef.current = { type: 'ellipse', start: point, original: deepCloneProject(project) }
      return
    }

    if (toolMode === 'polygon') {
      if (draftPoints.length >= 3) {
        const firstScreen = imagePointToScreen(draftPoints[0], canvasSize, uvInfo, view)
        if (Math.hypot(sx - firstScreen.x, sy - firstScreen.y) < 13) {
          completePolygon()
          return
        }
      }
      setDraftPoints((points) => [...points, point])
      return
    }

    if (toolMode === 'moveMask') {
      pushHistory()
      dragRef.current = { type: 'moveMask', start: point, original: cloneMask(project.masks.left), originalProject: deepCloneProject(project) }
      return
    }

    if (toolMode === 'editPoints' && project.masks.left.type === 'polygon') {
      const screenPoints = project.masks.left.points.map((p) => imagePointToScreen(p, canvasSize, uvInfo, view))
      const clickScreen = { x: sx, y: sy }
      const nearest = nearestPointIndex(clickScreen, screenPoints)
      if (event.altKey && nearest.distance < 14 && project.masks.left.points.length > 3) {
        pushHistory()
        const points = project.masks.left.points.filter((_, index) => index !== nearest.index)
        setProject((current) => ({ ...current, masks: { left: makePolygonMask(points), right: mirrorMask(makePolygonMask(points), uvInfo.width) } }))
        return
      }
      if (event.shiftKey) {
        const segment = nearestSegmentIndex(clickScreen, screenPoints)
        if (segment.distance < 18) {
          pushHistory()
          const points = [...project.masks.left.points]
          points.splice(segment.index + 1, 0, point)
          const left = { ...makePolygonMask(points), feather: project.masks.left.feather }
          setProject((current) => ({ ...current, masks: { left, right: mirrorMask(left, uvInfo.width) } }))
          return
        }
      }
      if (nearest.distance < 14) {
        pushHistory()
        setSelectedPointIndex(nearest.index)
        dragRef.current = { type: 'point', index: nearest.index, originalProject: deepCloneProject(project) }
      }
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!uvInfo || !dragRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const sx = event.clientX - rect.left
    const sy = event.clientY - rect.top
    const point = screenToImage(sx, sy, canvasSize, uvInfo, view)
    const drag = dragRef.current

    if (drag.type === 'pan') {
      setView((current) => ({ ...current, offsetX: drag.offsetX + sx - drag.startX, offsetY: drag.offsetY + sy - drag.startY }))
    } else if (drag.type === 'ellipse') {
      const cx = (drag.start.x + point.x) / 2
      const cy = (drag.start.y + point.y) / 2
      const rx = Math.abs(point.x - drag.start.x) / 2
      const ry = Math.abs(point.y - drag.start.y) / 2
      const left = makeEllipseMask(cx, cy, Math.max(2, rx), Math.max(2, ry))
      setProject((current) => ({ ...current, masks: { left, right: mirrorMask(left, uvInfo.width) } }))
    } else if (drag.type === 'moveMask') {
      const dx = point.x - drag.start.x
      const dy = point.y - drag.start.y
      const left = translateMask(drag.original, dx, dy)
      setProject((current) => ({ ...current, masks: { left, right: mirrorMask(left, uvInfo.width) } }))
    } else if (drag.type === 'point' && project.masks.left.type === 'polygon') {
      const points = project.masks.left.points.map((p, index) => index === drag.index ? { x: clamp(point.x, 0, uvInfo.width), y: clamp(point.y, 0, uvInfo.height) } : p)
      const left = { ...makePolygonMask(points), feather: project.masks.left.feather }
      setProject((current) => ({ ...current, masks: { left, right: mirrorMask(left, uvInfo.width) } }))
    }
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  function completePolygon() {
    if (!uvInfo || draftPoints.length < 3) return
    pushHistory()
    const left = makePolygonMask(draftPoints)
    setProject((current) => ({ ...current, masks: { left, right: mirrorMask(left, uvInfo.width) } }))
    setDraftPoints([])
    setToolMode('editPoints')
    setStatus('다각형 마스크를 완성했습니다. 오른쪽 눈에도 대칭 적용되었습니다.')
  }

  function updateMaskFeather(value: number) {
    if (!uvInfo) return
    setProject((current) => {
      const left = { ...current.masks.left, feather: value } as EyeMask
      return { ...current, masks: { left, right: { ...mirrorMask(left, uvInfo.width), feather: value } as EyeMask } }
    })
  }

  const exportFull = () => {
    if (!imageElement || !uvInfo) return
    const data = exportFullUvPng(imageElement, project.masks, project.design, overlayElement)
    downloadDataUrl(data, `${uvInfo.name.replace(/\.png$/i, '')}-v06-eye.png`)
    setStatus('전체 UV PNG를 저장했습니다.')
  }

  const exportEye = () => {
    const data = exportEyePng(project.masks.left, project.design, overlayElement)
    downloadDataUrl(data, 'iris-v06.png')
    setStatus('눈동자 PNG를 저장했습니다.')
  }

  const saveProject = () => {
    downloadText(JSON.stringify(project, null, 2), 'uv-eye-project-v0.6.json')
    setStatus('프로젝트 JSON을 저장했습니다.')
  }

  const loadProjectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as EyeProjectV6
        if (parsed.version !== 6 || !parsed.masks || !parsed.design) throw new Error('v0.6 프로젝트 파일이 아닙니다.')
        pushHistory()
        setProject(parsed)
        setStatus('v0.6 프로젝트 설정을 불러왔습니다. 원본 UV가 다르면 다시 열어주세요.')
      } catch (error) {
        setStatus(`프로젝트 불러오기 실패: ${error instanceof Error ? error.message : '파일 오류'}`)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const saveBrowser = () => {
    localStorage.setItem('uv-eye-studio-v06-project', JSON.stringify(project))
    setStatus('현재 설정을 이 브라우저에 저장했습니다.')
  }

  const loadBrowser = () => {
    const raw = localStorage.getItem('uv-eye-studio-v06-project')
    if (!raw) { setStatus('브라우저에 저장된 v0.6 설정이 없습니다.'); return }
    try {
      pushHistory()
      setProject(JSON.parse(raw) as EyeProjectV6)
      setStatus('브라우저 저장 설정을 불러왔습니다.')
    } catch { setStatus('브라우저 저장 데이터를 읽지 못했습니다.') }
  }

  const loadOverlayImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type)) {
      setStatus('문양 이미지는 PNG / WEBP / JPG를 사용해주세요.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateDesign('overlayImage', { enabled: true, src: String(reader.result), name: file.name, opacity: 0.65 }, true)
      setCategory('overlayImage')
      setStatus(`${file.name} 문양 이미지를 불러왔습니다.`)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const clearAllDesign = () => {
    commitProject((current) => ({ ...current, design: cloneDesign(CLEAR_DESIGN) }))
    setStatus('모든 디자인 요소를 껐습니다. 마스크만 남은 클리어 상태입니다.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="app-title">UV Eye Texture Studio <span>v0.6</span></div>
          <div className="app-subtitle">양안 대칭 · 세부 요소 조합형 UV 눈동자 편집기</div>
        </div>
        <div className="topbar-actions">
          <button className="primary" onClick={() => uvInputRef.current?.click()}>UV 텍스처 열기</button>
          <button onClick={reDetect} disabled={!canEdit}>눈 위치 자동 인식</button>
          <button onClick={fitView} disabled={!canEdit}>맞춤</button>
          <button onClick={resetTo100} disabled={!canEdit}>100%</button>
          <button onClick={undo} disabled={historyRef.current.length === 0}>실행 취소</button>
          <button onClick={redo} disabled={futureRef.current.length === 0}>다시 실행</button>
          <button onClick={exportFull} disabled={!canEdit}>전체 PNG 저장</button>
        </div>
      </header>

      <input ref={uvInputRef} type="file" accept="image/png" hidden onChange={handleUvFile} />
      <input ref={projectInputRef} type="file" accept="application/json,.json" hidden onChange={loadProjectFile} />
      <input ref={overlayInputRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={loadOverlayImage} />

      <div className="workspace">
        <aside className="leftbar panel">
          <div className="notice-card">
            <strong>양안 동시 적용</strong>
            <p>왼쪽 기준 마스크와 디자인을 수정하면 오른쪽 눈에 자동으로 대칭 적용됩니다.</p>
          </div>

          <section>
            <h3>마스크 도구</h3>
            <div className="tool-grid">
              {(Object.keys(TOOL_LABELS) as ToolMode[]).map((tool) => (
                <button key={tool} className={toolMode === tool ? 'active' : ''} onClick={() => { setToolMode(tool); setCategory('mask') }} disabled={!canEdit}>{TOOL_LABELS[tool]}</button>
              ))}
            </div>
            {toolMode === 'polygon' && (
              <div className="button-grid two-col">
                <button onClick={() => setDraftPoints((p) => p.slice(0, -1))}>마지막 점 취소</button>
                <button onClick={completePolygon} disabled={draftPoints.length < 3}>마스크 완료</button>
              </div>
            )}
          </section>

          <section>
            <h3>디자인 요소</h3>
            <div className="category-list">
              {(Object.keys(CATEGORY_LABELS) as Category[]).filter((c) => c !== 'mask').map((item) => (
                <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{CATEGORY_LABELS[item]}</button>
              ))}
            </div>
          </section>

          <section>
            <h3>빠른 초기화</h3>
            <button className="danger-soft full" onClick={clearAllDesign}>모든 디자인 끄기</button>
          </section>

          <section>
            <h3>프로젝트</h3>
            <div className="button-grid two-col">
              <button onClick={saveProject}>JSON 저장</button>
              <button onClick={() => projectInputRef.current?.click()}>JSON 불러오기</button>
              <button onClick={saveBrowser}>브라우저 저장</button>
              <button onClick={loadBrowser}>브라우저 불러오기</button>
            </div>
          </section>
        </aside>

        <main className="canvas-panel panel">
          <div className="canvas-toolbar">
            <div className="badge">현재 도구: {TOOL_LABELS[toolMode]}</div>
            <div className="canvas-zoom-group">
              <button onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 0.9, 0.1, 24) }))} disabled={!canEdit}>−</button>
              <span>{zoomLabel}</span>
              <button onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 1.1, 0.1, 24) }))} disabled={!canEdit}>+</button>
              <button onClick={fitView} disabled={!canEdit}>맞춤</button>
              <button onClick={exportEye} disabled={!canEdit}>눈만 저장</button>
            </div>
          </div>
          <div ref={canvasHostRef} className="canvas-host">
            <canvas
              ref={canvasRef}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
          <div className="statusbar"><span>{status}</span><span>{uvInfo ? `${uvInfo.name} · ${uvInfo.width}×${uvInfo.height}` : 'PNG를 열면 투명 영역 기준으로 눈 위치를 자동 인식합니다.'}</span></div>
        </main>

        <aside className="rightbar panel">
          <div className="property-title"><span>{CATEGORY_LABELS[category]}</span><small>프리셋은 다시 누르면 해제됩니다.</small></div>
          <CategoryPanel
            category={category}
            project={project}
            updateDesign={updateDesign}
            clearSection={clearSection}
            togglePreset={togglePreset}
            overlayInputRef={overlayInputRef}
            updateMaskFeather={updateMaskFeather}
          />
        </aside>
      </div>
    </div>
  )
}

function CategoryPanel({ category, project, updateDesign, clearSection, togglePreset, overlayInputRef, updateMaskFeather }: any) {
  const d = project.design as EyeDesignV6
  if (category === 'mask') {
    return <section><h3>마스크 설정</h3><RangeField label="경계 부드러움" value={project.masks.left.feather} min={0} max={20} step={0.5} onChange={updateMaskFeather} /><div className="hint">다각형 점 편집: 점 드래그 / Shift+선 클릭=점 추가 / Alt+점 클릭=점 삭제</div></section>
  }

  if (category === 'background') return (
    <>
      <PresetGrid title="배경 프리셋" section="background" active={d.background.presetId} presets={BACKGROUND_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <SectionCard title="배경 세부 조절">
        <OpacityField value={d.background.opacity} onChange={(v) => updateDesign('background', { opacity: v })} />
        <ColorField label="상단 색" value={d.background.topColor} onChange={(v) => updateDesign('background', { topColor: v })} />
        <ColorField label="중앙 색" value={d.background.midColor} onChange={(v) => updateDesign('background', { midColor: v })} />
        <ColorField label="하단 색" value={d.background.bottomColor} onChange={(v) => updateDesign('background', { bottomColor: v })} />
        <RangeField label="대비" value={d.background.contrast} min={0.6} max={1.5} step={0.01} onChange={(v) => updateDesign('background', { contrast: v })} />
      </SectionCard>
    </>
  )

  if (category === 'ring') return (
    <>
      <PresetGrid title="윤곽 링" section="ring" active={d.ring.presetId} presets={RING_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <SectionCard title="링 세부 조절"><OpacityField value={d.ring.opacity} onChange={(v) => updateDesign('ring', { opacity: v })} /><ColorField label="색상" value={d.ring.color} onChange={(v) => updateDesign('ring', { color: v })} /><RangeField label="두께" value={d.ring.thickness} min={0.01} max={0.18} step={0.005} onChange={(v) => updateDesign('ring', { thickness: v })} /></SectionCard>
    </>
  )

  if (category === 'pupil') return (
    <>
      <PresetGrid title="동공 모양" section="pupil" active={d.pupil.presetId} presets={PUPIL_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <div className="hint">동공은 별도의 테두리 선 없이 내부 그라데이션과 음영만으로 형태를 표현합니다.</div>
      <SectionCard title="동공 위치와 크기">
        <RangeField label="위치 X" value={d.pupil.x} min={0.15} max={0.85} step={0.005} onChange={(v) => updateDesign('pupil', { x: v })} />
        <RangeField label="위치 Y" value={d.pupil.y} min={0.15} max={0.85} step={0.005} onChange={(v) => updateDesign('pupil', { y: v })} />
        <RangeField label="가로 크기" value={d.pupil.scaleX} min={0.04} max={0.65} step={0.005} onChange={(v) => updateDesign('pupil', { scaleX: v })} />
        <RangeField label="세로 크기" value={d.pupil.scaleY} min={0.04} max={0.7} step={0.005} onChange={(v) => updateDesign('pupil', { scaleY: v })} />
        <RangeField label="회전" value={d.pupil.rotation} min={-3.14} max={3.14} step={0.01} onChange={(v) => updateDesign('pupil', { rotation: v })} />
        <OpacityField value={d.pupil.opacity} onChange={(v) => updateDesign('pupil', { opacity: v })} />
      </SectionCard>
      <SectionCard title="동공 내부 그라데이션">
        <ColorField label="상단" value={d.pupil.topColor} onChange={(v) => updateDesign('pupil', { topColor: v })} />
        <ColorField label="중앙" value={d.pupil.midColor} onChange={(v) => updateDesign('pupil', { midColor: v })} />
        <ColorField label="하단" value={d.pupil.bottomColor} onChange={(v) => updateDesign('pupil', { bottomColor: v })} />
        <RangeField label="그라데이션 깊이" value={d.pupil.gradientStrength} min={0} max={1} step={0.01} onChange={(v) => updateDesign('pupil', { gradientStrength: v })} />
      </SectionCard>
    </>
  )

  if (category === 'lowerPoint') return (
    <>
      <PresetGrid title="하단 포인트" section="lowerPoint" active={d.lowerPoint.presetId} presets={LOWER_POINT_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <TransformControls state={d.lowerPoint} update={(patch: any) => updateDesign('lowerPoint', patch)} includeCount />
      <SectionCard title="표현"><ColorField label="주 색상" value={d.lowerPoint.color} onChange={(v) => updateDesign('lowerPoint', { color: v })} /><ColorField label="보조 색상" value={d.lowerPoint.secondaryColor} onChange={(v) => updateDesign('lowerPoint', { secondaryColor: v })} /><OpacityField value={d.lowerPoint.opacity} onChange={(v) => updateDesign('lowerPoint', { opacity: v })} /><RangeField label="손그림 느낌" value={d.lowerPoint.handDrawnAmount} min={0} max={1} step={0.01} onChange={(v) => updateDesign('lowerPoint', { handDrawnAmount: v })} /></SectionCard>
    </>
  )

  if (category === 'upperShadow') return (
    <>
      <PresetGrid title="상단 그림자 / 속눈썹 그림자" section="upperShadow" active={d.upperShadow.presetId} presets={UPPER_SHADOW_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <SectionCard title="위치와 표현"><RangeField label="위치 X" value={d.upperShadow.x} min={0} max={1} step={0.005} onChange={(v) => updateDesign('upperShadow', { x: v })} /><RangeField label="위치 Y" value={d.upperShadow.y} min={0} max={0.7} step={0.005} onChange={(v) => updateDesign('upperShadow', { y: v })} /><RangeField label="높이" value={d.upperShadow.scaleY} min={0.1} max={1} step={0.01} onChange={(v) => updateDesign('upperShadow', { scaleY: v })} /><OpacityField value={d.upperShadow.opacity} onChange={(v) => updateDesign('upperShadow', { opacity: v })} /><ColorField label="색상" value={d.upperShadow.color} onChange={(v) => updateDesign('upperShadow', { color: v })} /><RangeField label="블러" value={d.upperShadow.blur} min={0} max={0.2} step={0.005} onChange={(v) => updateDesign('upperShadow', { blur: v })} /></SectionCard>
    </>
  )

  if (category === 'reflection') return (
    <>
      <PresetGrid title="반사광" section="reflection" active={d.reflection.presetId} presets={REFLECTION_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <TransformControls state={d.reflection} update={(patch: any) => updateDesign('reflection', patch)} />
      <SectionCard title="반사광 표현"><ColorField label="주 색상" value={d.reflection.color} onChange={(v) => updateDesign('reflection', { color: v })} /><ColorField label="보조 색상" value={d.reflection.secondaryColor} onChange={(v) => updateDesign('reflection', { secondaryColor: v })} /><OpacityField value={d.reflection.opacity} onChange={(v) => updateDesign('reflection', { opacity: v })} /><RangeField label="블러" value={d.reflection.blur} min={0} max={0.2} step={0.005} onChange={(v) => updateDesign('reflection', { blur: v })} /><RangeField label="손그림 느낌" value={d.reflection.handDrawnAmount} min={0} max={1} step={0.01} onChange={(v) => updateDesign('reflection', { handDrawnAmount: v })} /></SectionCard>
    </>
  )

  if (category === 'symbol') return (
    <>
      <PresetGrid title="상징 문양" section="symbol" active={d.symbol.presetId} presets={SYMBOL_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <SectionCard title="문양 위치와 크기">
        <RangeField label="위치 X" value={d.symbol.x} min={0} max={1} step={0.005} onChange={(v) => updateDesign('symbol', { x: v })} />
        <RangeField label="위치 Y" value={d.symbol.y} min={0} max={1} step={0.005} onChange={(v) => updateDesign('symbol', { y: v })} />
        <RangeField label="크기" value={d.symbol.scale} min={0.02} max={0.4} step={0.005} onChange={(v) => updateDesign('symbol', { scale: v })} />
        <RangeField label="회전" value={d.symbol.rotation} min={-3.14} max={3.14} step={0.01} onChange={(v) => updateDesign('symbol', { rotation: v })} />
        <OpacityField value={d.symbol.opacity} onChange={(v) => updateDesign('symbol', { opacity: v })} />
      </SectionCard>
      <SectionCard title="문양 표현"><ColorField label="주 색상" value={d.symbol.color} onChange={(v) => updateDesign('symbol', { color: v })} /><ColorField label="보조 색상" value={d.symbol.secondaryColor} onChange={(v) => updateDesign('symbol', { secondaryColor: v })} /><RangeField label="블러" value={d.symbol.blur} min={0} max={0.12} step={0.002} onChange={(v) => updateDesign('symbol', { blur: v })} /><RangeField label="손그림 느낌" value={d.symbol.handDrawnAmount} min={0} max={1} step={0.01} onChange={(v) => updateDesign('symbol', { handDrawnAmount: v })} /></SectionCard>
    </>
  )

  if (category === 'irisTexture') return (
    <>
      <PresetGrid title="홍채 결" section="irisTexture" active={d.irisTexture.presetId} presets={IRIS_TEXTURE_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <SectionCard title="결 세부 조절"><OpacityField value={d.irisTexture.opacity} onChange={(v) => updateDesign('irisTexture', { opacity: v })} /><RangeField label="밀도" value={d.irisTexture.density} min={4} max={80} step={1} onChange={(v) => updateDesign('irisTexture', { density: v })} /><RangeField label="길이" value={d.irisTexture.length} min={0.1} max={1} step={0.01} onChange={(v) => updateDesign('irisTexture', { length: v })} /><RangeField label="랜덤도" value={d.irisTexture.randomness} min={0} max={1} step={0.01} onChange={(v) => updateDesign('irisTexture', { randomness: v })} /><ColorField label="주 색상" value={d.irisTexture.color} onChange={(v) => updateDesign('irisTexture', { color: v })} /><ColorField label="보조 색상" value={d.irisTexture.secondaryColor} onChange={(v) => updateDesign('irisTexture', { secondaryColor: v })} /></SectionCard>
    </>
  )

  if (category === 'overlayPreset') return (
    <>
      <PresetGrid title="내장 문양" section="overlayPreset" active={d.overlayPreset.presetId} presets={OVERLAY_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <TransformControls state={d.overlayPreset} update={(patch: any) => updateDesign('overlayPreset', patch)} />
      <SectionCard title="문양 표현"><ColorField label="주 색상" value={d.overlayPreset.color} onChange={(v) => updateDesign('overlayPreset', { color: v })} /><ColorField label="보조 색상" value={d.overlayPreset.secondaryColor} onChange={(v) => updateDesign('overlayPreset', { secondaryColor: v })} /><OpacityField value={d.overlayPreset.opacity} onChange={(v) => updateDesign('overlayPreset', { opacity: v })} /></SectionCard>
    </>
  )

  if (category === 'handDrawnTexture') return (
    <>
      <PresetGrid title="손그림 질감" section="handDrawnTexture" active={d.handDrawnTexture.presetId} presets={HANDDRAWN_PRESETS} clearSection={clearSection} togglePreset={togglePreset} />
      <SectionCard title="질감 조절"><OpacityField value={d.handDrawnTexture.opacity} onChange={(v) => updateDesign('handDrawnTexture', { opacity: v })} /><RangeField label="불균일도" value={d.handDrawnTexture.amount} min={0} max={1} step={0.01} onChange={(v) => updateDesign('handDrawnTexture', { amount: v })} /><RangeField label="결 크기" value={d.handDrawnTexture.grainSize} min={0.005} max={0.08} step={0.001} onChange={(v) => updateDesign('handDrawnTexture', { grainSize: v })} /><ColorField label="색상" value={d.handDrawnTexture.color} onChange={(v) => updateDesign('handDrawnTexture', { color: v })} /></SectionCard>
    </>
  )

  return (
    <>
      <SectionCard title="외부 문양 이미지">
        <button className="primary full" onClick={() => overlayInputRef.current?.click()}>문양 이미지 불러오기</button>
        <div className="hint">PNG 투명 배경을 권장합니다. WEBP/JPG도 불러올 수 있습니다.</div>
        <button className="full" onClick={() => clearSection('overlayImage')}>이미지 제거</button>
      </SectionCard>
      <SectionCard title="이미지 위치 / 투명도">
        <RangeField label="위치 X" value={d.overlayImage.x} min={0} max={1} step={0.005} onChange={(v) => updateDesign('overlayImage', { x: v })} />
        <RangeField label="위치 Y" value={d.overlayImage.y} min={0} max={1} step={0.005} onChange={(v) => updateDesign('overlayImage', { y: v })} />
        <RangeField label="크기" value={d.overlayImage.scale} min={0.05} max={2} step={0.01} onChange={(v) => updateDesign('overlayImage', { scale: v })} />
        <RangeField label="회전" value={d.overlayImage.rotation} min={-3.14} max={3.14} step={0.01} onChange={(v) => updateDesign('overlayImage', { rotation: v })} />
        <OpacityField value={d.overlayImage.opacity} onChange={(v) => updateDesign('overlayImage', { opacity: v })} />
        <SelectField label="혼합 모드" value={d.overlayImage.blendMode} options={{ 'source-over': '일반', screen: '스크린', overlay: '오버레이', multiply: '곱하기', 'soft-light': '소프트 라이트' }} onChange={(v) => updateDesign('overlayImage', { blendMode: v })} />
      </SectionCard>
    </>
  )
}

function PresetGrid({ title, section, active, presets, clearSection, togglePreset }: any) {
  return (
    <section><h3>{title}</h3><div className="preset-grid"><button className={!active ? 'off active' : 'off'} onClick={() => clearSection(section)}>끄기</button>{Object.keys(presets).map((name) => <button key={name} className={active === name ? 'active' : ''} onClick={() => togglePreset(section, name, presets[name])}>{name}</button>)}</div></section>
  )
}

function TransformControls({ state, update, includeCount = false }: any) {
  return <SectionCard title="위치 / 크기"><RangeField label="위치 X" value={state.x ?? 0.5} min={0} max={1} step={0.005} onChange={(v) => update({ x: v })} /><RangeField label="위치 Y" value={state.y ?? 0.5} min={0} max={1} step={0.005} onChange={(v) => update({ y: v })} />{state.scale !== undefined ? <RangeField label="전체 크기" value={state.scale} min={0.2} max={2} step={0.01} onChange={(v) => update({ scale: v })} /> : <><RangeField label="가로 크기" value={state.scaleX} min={0.1} max={1.8} step={0.01} onChange={(v) => update({ scaleX: v })} /><RangeField label="세로 크기" value={state.scaleY} min={0.1} max={1.8} step={0.01} onChange={(v) => update({ scaleY: v })} /></>}<RangeField label="회전" value={state.rotation ?? 0} min={-3.14} max={3.14} step={0.01} onChange={(v) => update({ rotation: v })} />{includeCount && <><RangeField label="개수" value={state.count} min={1} max={30} step={1} onChange={(v) => update({ count: v })} /><RangeField label="퍼짐" value={state.spread} min={0.1} max={1.2} step={0.01} onChange={(v) => update({ spread: v })} /><RangeField label="요소 크기" value={state.size} min={0.01} max={0.2} step={0.002} onChange={(v) => update({ size: v })} /></>}</SectionCard>
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="section-card"><h3>{title}</h3><div className="field-grid">{children}</div></section>
}

function RangeField({ label, value, min, max, step, onChange }: any) {
  const numberValue = Number(value)
  return <label className="field"><div className="field-head"><span>{label}</span><input className="mini-number" type="number" value={Number.isFinite(numberValue) ? Number(numberValue.toFixed(3)) : 0} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></div><input type="range" value={numberValue} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></label>
}

function OpacityField({ value, onChange }: any) {
  return <RangeField label="불투명도" value={value} min={0} max={1} step={0.01} onChange={onChange} />
}

function ColorField({ label, value, onChange }: any) {
  return <label className="field"><span>{label}</span><div className="color-input-row"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /><input type="text" value={value} onChange={(e) => onChange(e.target.value)} /></div></label>
}

function SelectField({ label, value, options, onChange }: any) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{Object.entries(options).map(([key, name]) => <option key={key} value={key}>{String(name)}</option>)}</select></label>
}

function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const size = 18
  for (let y = 0; y < height; y += size) for (let x = 0; x < width; x += size) { ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#202635' : '#252d3e'; ctx.fillRect(x, y, size, size) }
}

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 23px sans-serif'; ctx.fillText('UV 텍스처를 열어주세요', width / 2, height / 2 - 12); ctx.fillStyle = 'rgba(255,255,255,0.56)'; ctx.font = '14px sans-serif'; ctx.fillText('PNG를 열면 투명하지 않은 눈 영역을 먼저 자동 인식합니다.', width / 2, height / 2 + 20)
}

function imagePointToScreen(point: Point, canvas: { width: number; height: number }, image: { width: number; height: number }, view: ViewState) {
  const t = imageToScreen(point.x, point.y, canvas, image, view)
  return { x: t.x, y: t.y }
}

function maskToScreen(mask: EyeMask, canvas: { width: number; height: number }, image: { width: number; height: number }, view: ViewState): EyeMask {
  const base = imageToScreen(0, 0, canvas, image, view)
  if (mask.type === 'ellipse') {
    const center = imageToScreen(mask.cx, mask.cy, canvas, image, view)
    return { ...mask, cx: center.x, cy: center.y, rx: mask.rx * base.scale, ry: mask.ry * base.scale, feather: mask.feather * base.scale }
  }
  return { ...mask, points: mask.points.map((p) => imagePointToScreen(p, canvas, image, view)), feather: mask.feather * base.scale }
}

function drawMaskOverlay(ctx: CanvasRenderingContext2D, mask: EyeMask, color: string, selectedPoint: number | null) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath()
  if (mask.type === 'ellipse') { ctx.save(); ctx.translate(mask.cx, mask.cy); ctx.rotate(mask.rotation); ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2); ctx.restore() } else if (mask.points.length) { ctx.moveTo(mask.points[0].x, mask.points[0].y); for (let i = 1; i < mask.points.length; i += 1) ctx.lineTo(mask.points[i].x, mask.points[i].y); ctx.closePath() }
  ctx.stroke(); ctx.setLineDash([])
  if (mask.type === 'polygon') mask.points.forEach((p, index) => { ctx.fillStyle = index === selectedPoint ? '#ffe38a' : color; ctx.beginPath(); ctx.arc(p.x, p.y, index === selectedPoint ? 5.5 : 4, 0, Math.PI * 2); ctx.fill() })
  ctx.restore()
}

function drawDraftPolygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (!points.length) return
  ctx.save(); ctx.strokeStyle = '#9bc0ff'; ctx.fillStyle = '#9bc0ff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y); ctx.stroke(); ctx.setLineDash([]); points.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill() }); ctx.restore()
}
