import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, WheelEvent } from 'react'
import { clamp, imageToScreen, nearestPointIndex, nearestSegmentIndex, screenToImage } from './lib/math'
import { cloneMask, makeEllipseMask, makePolygonMask, pointInMask, translateMask } from './lib/mask'
import { compositeIrisDesign, exportFullUvPng, exportSingleIrisPng } from './lib/irisRenderer'
import { cloneStyle, DEFAULT_STYLE, PRESETS } from './lib/presets'
import { randomizeStyle } from './lib/random'
import type {
  EyeMask,
  EyeSide,
  EyeStyle,
  Point,
  RandomOptions,
  SavedProjectSettings,
  ToolMode,
  UVFileInfo,
  ViewState,
} from './lib/types'

const TOOL_LABELS: Record<ToolMode, string> = {
  pan: 'Pan',
  ellipse: 'Draw Ellipse',
  polygon: 'Polygon Click',
  editPoints: 'Edit Points',
  moveMask: 'Move Mask',
}

function createDefaultMasks(width: number, height: number): Record<EyeSide, EyeMask> {
  const radius = Math.max(28, Math.round(Math.min(width, height) * 0.055))
  return {
    left: makeEllipseMask(width * 0.16, height * 0.13, radius, radius),
    right: makeEllipseMask(width * 0.84, height * 0.13, radius, radius),
  }
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

function deepProjectClone(project: SavedProjectSettings): SavedProjectSettings {
  return JSON.parse(JSON.stringify(project)) as SavedProjectSettings
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const projectInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasHostRef = useRef<HTMLDivElement | null>(null)

  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [uvInfo, setUvInfo] = useState<UVFileInfo | null>(null)
  const [toolMode, setToolMode] = useState<ToolMode>('pan')
  const [selectedEye, setSelectedEye] = useState<EyeSide>('left')
  const [linkEyes, setLinkEyes] = useState(true)
  const [view, setView] = useState<ViewState>({ zoom: 1, offsetX: 0, offsetY: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 650 })
  const [masks, setMasks] = useState<Record<EyeSide, EyeMask>>({
    left: makeEllipseMask(200, 150, 65, 65),
    right: makeEllipseMask(700, 150, 65, 65),
  })
  const [styles, setStyles] = useState<Record<EyeSide, EyeStyle>>({
    left: cloneStyle(DEFAULT_STYLE),
    right: cloneStyle(DEFAULT_STYLE),
  })
  const [draftPoints, setDraftPoints] = useState<Point[]>([])
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [seed, setSeed] = useState(9389)
  const [randomOptions, setRandomOptions] = useState<RandomOptions>({ colors: true, structure: true, texture: true, motif: true, highlights: true })
  const [status, setStatus] = useState('Ready — open a PNG UV texture.')

  const dragRef = useRef<
    | { type: 'pan'; startX: number; startY: number; offsetX: number; offsetY: number }
    | { type: 'ellipse'; start: Point }
    | { type: 'moveMask'; start: Point; original: EyeMask }
    | { type: 'point'; index: number }
    | null
  >(null)

  const selectedMask = masks[selectedEye]
  const selectedStyle = styles[selectedEye]
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
    setDraftPoints([])
    setSelectedPointIndex(null)
  }, [selectedEye])

  const fitView = () => {
    setView({ zoom: 1, offsetX: 0, offsetY: 0 })
    setStatus('Fit view applied.')
  }

  const resetTo100 = () => {
    if (!uvInfo) return
    const scaleAt100 = 1 / Math.min(canvasSize.width / uvInfo.width, canvasSize.height / uvInfo.height)
    setView({ zoom: scaleAt100, offsetX: 0, offsetY: 0 })
    setStatus('100% view applied (1 image pixel = 1 CSS pixel).')
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'image/png') {
      setStatus('PNG only. Please choose a PNG UV texture.')
      return
    }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImageElement(image)
      setUvInfo({ name: file.name, width: image.naturalWidth, height: image.naturalHeight, hasAlpha: true })
      setMasks(createDefaultMasks(image.naturalWidth, image.naturalHeight))
      setStyles({ left: cloneStyle(DEFAULT_STYLE), right: cloneStyle(DEFAULT_STYLE) })
      setView({ zoom: 1, offsetX: 0, offsetY: 0 })
      setSelectedEye('left')
      setToolMode('moveMask')
      setStatus(`Loaded ${file.name}. Place or redraw each eye mask.`)
      URL.revokeObjectURL(url)
    }
    image.onerror = () => setStatus('The PNG could not be decoded.')
    image.src = url
    event.target.value = ''
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.floor(canvasSize.width * pixelRatio)
    canvas.height = Math.floor(canvasSize.height * pixelRatio)
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    drawChecker(ctx, canvasSize.width, canvasSize.height)

    if (!imageElement || !uvInfo) {
      drawEmptyState(ctx, canvasSize.width, canvasSize.height)
      return
    }

    const transform = imageToScreen(0, 0, canvasSize, uvInfo, view)
    ctx.drawImage(imageElement, transform.startX, transform.startY, uvInfo.width * transform.scale, uvInfo.height * transform.scale)

    const leftScreen = maskToScreen(masks.left, canvasSize, uvInfo, view)
    const rightScreen = maskToScreen(masks.right, canvasSize, uvInfo, view)
    compositeIrisDesign(ctx, leftScreen, styles.left, canvasSize.width, canvasSize.height)
    compositeIrisDesign(ctx, rightScreen, styles.right, canvasSize.width, canvasSize.height)

    drawMaskOverlay(ctx, leftScreen, selectedEye === 'left', '#83a9ff', toolMode === 'editPoints' && selectedEye === 'left' ? selectedPointIndex : null)
    drawMaskOverlay(ctx, rightScreen, selectedEye === 'right', '#ff8fc9', toolMode === 'editPoints' && selectedEye === 'right' ? selectedPointIndex : null)
    drawDraftPolygon(ctx, draftPoints.map((point) => imagePointToScreen(point, canvasSize, uvInfo, view)), selectedEye === 'left' ? '#83a9ff' : '#ff8fc9')
  }, [canvasSize, draftPoints, imageElement, masks, selectedEye, selectedPointIndex, styles, toolMode, uvInfo, view])

  const eventImagePoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!uvInfo) return null
    const rect = event.currentTarget.getBoundingClientRect()
    return screenToImage(event.clientX - rect.left, event.clientY - rect.top, canvasSize, uvInfo, view)
  }

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    if (!uvInfo || !imageElement) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    const before = screenToImage(screenX, screenY, canvasSize, uvInfo, view)
    const nextZoom = clamp(view.zoom * (event.deltaY < 0 ? 1.12 : 0.89), 0.08, 30)
    const nextView = { ...view, zoom: nextZoom }
    const after = imageToScreen(before.x, before.y, canvasSize, uvInfo, nextView)
    setView({ zoom: nextZoom, offsetX: view.offsetX + (screenX - after.x), offsetY: view.offsetY + (screenY - after.y) })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!uvInfo) return
    const point = eventImagePoint(event)
    if (!point) return
    const rect = event.currentTarget.getBoundingClientRect()
    const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }

    if (toolMode === 'pan') {
      dragRef.current = { type: 'pan', startX: screenPoint.x, startY: screenPoint.y, offsetX: view.offsetX, offsetY: view.offsetY }
      return
    }

    if (toolMode === 'ellipse') {
      dragRef.current = { type: 'ellipse', start: point }
      setMasks((prev) => ({ ...prev, [selectedEye]: makeEllipseMask(point.x, point.y, 2, 2) }))
      return
    }

    if (toolMode === 'polygon') {
      if (draftPoints.length >= 3) {
        const firstScreen = imagePointToScreen(draftPoints[0], canvasSize, uvInfo, view)
        if (Math.hypot(screenPoint.x - firstScreen.x, screenPoint.y - firstScreen.y) <= 13) {
          completePolygon()
          return
        }
      }
      setDraftPoints((prev) => [...prev, point])
      setStatus('Polygon point added. Click around the iris; click the first point or Complete when finished.')
      return
    }

    if (toolMode === 'moveMask') {
      if (pointInMask(point, selectedMask)) {
        dragRef.current = { type: 'moveMask', start: point, original: cloneMask(selectedMask) }
      }
      return
    }

    if (toolMode === 'editPoints' && selectedMask.type === 'polygon') {
      const transform = imageToScreen(0, 0, canvasSize, uvInfo, view)
      const threshold = 14 / transform.scale
      const nearest = nearestPointIndex(point, selectedMask.points)

      if (event.altKey && nearest.index >= 0 && nearest.distance <= threshold && selectedMask.points.length > 3) {
        const points = selectedMask.points.filter((_, index) => index !== nearest.index)
        setMasks((prev) => ({ ...prev, [selectedEye]: { ...selectedMask, points } }))
        setSelectedPointIndex(null)
        setStatus('Polygon point deleted.')
        return
      }

      if (event.shiftKey) {
        const segment = nearestSegmentIndex(point, selectedMask.points)
        if (segment.index >= 0 && segment.distance <= threshold * 1.5) {
          const points = [...selectedMask.points]
          points.splice(segment.index + 1, 0, point)
          setMasks((prev) => ({ ...prev, [selectedEye]: { ...selectedMask, points } }))
          setSelectedPointIndex(segment.index + 1)
          setStatus('Polygon point inserted. Drag it to refine the edge.')
          return
        }
      }

      if (nearest.index >= 0 && nearest.distance <= threshold) {
        setSelectedPointIndex(nearest.index)
        dragRef.current = { type: 'point', index: nearest.index }
      } else {
        setSelectedPointIndex(null)
      }
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!uvInfo || !dragRef.current) return
    const point = eventImagePoint(event)
    if (!point) return
    const drag = dragRef.current

    if (drag.type === 'pan') {
      const rect = event.currentTarget.getBoundingClientRect()
      const screenX = event.clientX - rect.left
      const screenY = event.clientY - rect.top
      setView((prev) => ({ ...prev, offsetX: drag.offsetX + (screenX - drag.startX), offsetY: drag.offsetY + (screenY - drag.startY) }))
      return
    }

    if (drag.type === 'ellipse') {
      const minX = Math.min(drag.start.x, point.x)
      const maxX = Math.max(drag.start.x, point.x)
      const minY = Math.min(drag.start.y, point.y)
      const maxY = Math.max(drag.start.y, point.y)
      setMasks((prev) => ({
        ...prev,
        [selectedEye]: makeEllipseMask((minX + maxX) / 2, (minY + maxY) / 2, Math.max(2, (maxX - minX) / 2), Math.max(2, (maxY - minY) / 2)),
      }))
      return
    }

    if (drag.type === 'moveMask') {
      const dx = point.x - drag.start.x
      const dy = point.y - drag.start.y
      setMasks((prev) => ({ ...prev, [selectedEye]: translateMask(drag.original, dx, dy) }))
      return
    }

    if (drag.type === 'point' && selectedMask.type === 'polygon') {
      const points = selectedMask.points.map((candidate, index) => index === drag.index ? { ...point } : candidate)
      setMasks((prev) => ({ ...prev, [selectedEye]: { ...selectedMask, points } }))
    }
  }

  const handlePointerUp = () => {
    if (dragRef.current?.type === 'ellipse') setStatus('Ellipse mask created. Use Move Mask or redraw it if needed.')
    dragRef.current = null
  }

  const completePolygon = () => {
    if (draftPoints.length < 3) {
      setStatus('Polygon needs at least 3 points.')
      return
    }
    const feather = selectedMask.feather
    setMasks((prev) => ({ ...prev, [selectedEye]: { ...makePolygonMask(draftPoints), feather } }))
    setDraftPoints([])
    setToolMode('editPoints')
    setStatus('Polygon mask completed. Drag points; Shift+click edge adds a point; Alt+click point deletes it.')
  }

  const deleteSelectedPoint = () => {
    if (selectedMask.type !== 'polygon' || selectedPointIndex === null || selectedMask.points.length <= 3) return
    const points = selectedMask.points.filter((_, index) => index !== selectedPointIndex)
    setMasks((prev) => ({ ...prev, [selectedEye]: { ...selectedMask, points } }))
    setSelectedPointIndex(null)
    setStatus('Selected polygon point deleted.')
  }

  const updateMaskFeather = (value: number) => {
    setMasks((prev) => ({ ...prev, [selectedEye]: { ...prev[selectedEye], feather: Math.max(0, value) } as EyeMask }))
  }

  const updateEllipse = (key: 'cx' | 'cy' | 'rx' | 'ry' | 'rotation', value: number) => {
    if (selectedMask.type !== 'ellipse') return
    setMasks((prev) => ({ ...prev, [selectedEye]: { ...selectedMask, [key]: value } }))
  }

  const updateStyleSection = (section: keyof EyeStyle, key: string, value: unknown) => {
    setStyles((prev) => {
      const selected = cloneStyle(prev[selectedEye])
      const target = selected[section]
      if (typeof target === 'object' && target !== null) {
        ;(target as unknown as Record<string, unknown>)[key] = value
      } else if (section === 'opacity' && typeof value === 'number') {
        selected.opacity = value
      }

      if (!linkEyes) return { ...prev, [selectedEye]: selected }
      const otherEye: EyeSide = selectedEye === 'left' ? 'right' : 'left'
      const other = cloneStyle(prev[otherEye])
      const otherTarget = other[section]
      if (typeof otherTarget === 'object' && otherTarget !== null) {
        ;(otherTarget as unknown as Record<string, unknown>)[key] = value
      } else if (section === 'opacity' && typeof value === 'number') {
        other.opacity = value
      }
      return { ...prev, [selectedEye]: selected, [otherEye]: other }
    })
  }

  const updateOpacity = (value: number) => {
    setStyles((prev) => {
      const selected = cloneStyle(prev[selectedEye]); selected.opacity = value
      if (!linkEyes) return { ...prev, [selectedEye]: selected }
      const otherEye: EyeSide = selectedEye === 'left' ? 'right' : 'left'
      const other = cloneStyle(prev[otherEye]); other.opacity = value
      return { ...prev, [selectedEye]: selected, [otherEye]: other }
    })
  }

  const applyStyle = (style: EyeStyle) => {
    setStyles((prev) => {
      if (!linkEyes) return { ...prev, [selectedEye]: cloneStyle(style) }
      return { left: cloneStyle(style), right: cloneStyle(style) }
    })
  }

  const applyPreset = (name: string) => {
    applyStyle(PRESETS[name])
    setStatus(`Preset applied: ${name}`)
  }

  const randomize = (randomSeed = seed) => {
    const next = randomizeStyle(selectedStyle, randomSeed, randomOptions)
    applyStyle(next)
    setStatus(`Generated design from seed ${randomSeed}. Same seed + same options = same design.`)
  }

  const makeProjectSettings = (): SavedProjectSettings => ({
    version: 3,
    seed,
    linkEyes,
    selectedEye,
    masks: { left: cloneMask(masks.left), right: cloneMask(masks.right) },
    styles: { left: cloneStyle(styles.left), right: cloneStyle(styles.right) },
    source: uvInfo ? { name: uvInfo.name, width: uvInfo.width, height: uvInfo.height } : undefined,
  })

  const applyProjectSettings = (data: SavedProjectSettings) => {
    const safe = deepProjectClone(data)
    setSeed(safe.seed)
    setLinkEyes(safe.linkEyes)
    setSelectedEye(safe.selectedEye ?? 'left')
    setMasks(safe.masks)
    setStyles(safe.styles)
    setDraftPoints([])
    setSelectedPointIndex(null)
  }

  const saveLocal = () => {
    localStorage.setItem('uv-eye-studio-v03-settings', JSON.stringify(makeProjectSettings()))
    setStatus('Project settings saved in this browser. The source PNG is not embedded.')
  }

  const loadLocal = () => {
    const raw = localStorage.getItem('uv-eye-studio-v03-settings')
    if (!raw) {
      setStatus('No v0.3 browser save found.')
      return
    }
    try {
      const data = JSON.parse(raw) as SavedProjectSettings
      if (data.version !== 3) throw new Error('Wrong project version')
      applyProjectSettings(data)
      setStatus('Browser save loaded. Re-open the matching PNG if necessary.')
    } catch {
      setStatus('Browser save is invalid or incompatible.')
    }
  }

  const exportProjectJson = () => {
    downloadText(JSON.stringify(makeProjectSettings(), null, 2), 'uv-eye-project-v0.3.json')
    setStatus('Project JSON exported. It stores masks/design settings, not the PNG pixels.')
  }

  const handleProjectImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as SavedProjectSettings
        if (data.version !== 3 || !data.masks || !data.styles) throw new Error('Invalid v0.3 project')
        applyProjectSettings(data)
        setStatus('Project JSON imported.')
      } catch {
        setStatus('Could not import that file. Please use a v0.3 project JSON.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const exportFull = () => {
    if (!imageElement || !uvInfo) return
    try {
      const dataUrl = exportFullUvPng(imageElement, masks, styles)
      downloadDataUrl(dataUrl, uvInfo.name.replace(/\.png$/i, '') + '-v03-eyes.png')
      setStatus('Full UV PNG exported at the original resolution. Drawing is clipped inside the hard masks.')
    } catch (error) {
      setStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const exportSelected = () => {
    try {
      downloadDataUrl(exportSingleIrisPng(selectedMask, selectedStyle), `${selectedEye}-iris-v03.png`)
      setStatus(`${selectedEye} iris exported on a transparent background.`)
    } catch (error) {
      setStatus(`Iris export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const copyStyle = (from: EyeSide, to: EyeSide) => {
    setStyles((prev) => ({ ...prev, [to]: cloneStyle(prev[from]) }))
    setStatus(`Copied ${from} iris design to ${to}. Mask position was not copied.`)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="app-title">UV Eye Texture Studio <span>v0.3</span></div>
          <div className="app-subtitle">Free-form UV mask + layered procedural iris designer</div>
        </div>
        <div className="topbar-actions">
          <button className="primary" onClick={() => fileInputRef.current?.click()}>Open UV Texture</button>
          <button onClick={fitView} disabled={!canEdit}>Fit</button>
          <button onClick={resetTo100} disabled={!canEdit}>100%</button>
          <button onClick={exportSelected} disabled={!canEdit}>Export Eye</button>
          <button className="success" onClick={exportFull} disabled={!canEdit}>Export Full PNG</button>
        </div>
      </header>

      <input ref={fileInputRef} hidden type="file" accept="image/png" onChange={handleFileChange} />
      <input ref={projectInputRef} hidden type="file" accept="application/json,.json" onChange={handleProjectImport} />

      <div className="workspace">
        <aside className="leftbar panel">
          <section>
            <h3>Mask Tools</h3>
            <div className="tool-grid">
              {(Object.keys(TOOL_LABELS) as ToolMode[]).map((tool) => (
                <button key={tool} className={toolMode === tool ? 'active' : ''} onClick={() => { setToolMode(tool); setStatus(toolHelp(tool)) }}>
                  {TOOL_LABELS[tool]}
                </button>
              ))}
            </div>
            {toolMode === 'polygon' && (
              <div className="subpanel polygon-actions">
                <strong>Polygon: {draftPoints.length} points</strong>
                <div className="button-grid two-col">
                  <button onClick={() => setDraftPoints((prev) => prev.slice(0, -1))} disabled={draftPoints.length === 0}>Undo Point</button>
                  <button onClick={completePolygon} disabled={draftPoints.length < 3}>Complete</button>
                </div>
                <button className="wide-button" onClick={() => setDraftPoints([])} disabled={draftPoints.length === 0}>Cancel Draft</button>
              </div>
            )}
            {toolMode === 'editPoints' && selectedMask.type === 'polygon' && (
              <div className="hint-box">
                Drag point = move<br />Shift + click edge = add point<br />Alt + click point = delete
                <button className="wide-button compact" disabled={selectedPointIndex === null || selectedMask.points.length <= 3} onClick={deleteSelectedPoint}>Delete Selected Point</button>
              </div>
            )}
          </section>

          <section>
            <h3>Eyes</h3>
            <div className="segmented">
              <button className={selectedEye === 'left' ? 'active' : ''} onClick={() => setSelectedEye('left')}>Left</button>
              <button className={selectedEye === 'right' ? 'active' : ''} onClick={() => setSelectedEye('right')}>Right</button>
            </div>
            <label className="check-row"><input type="checkbox" checked={linkEyes} onChange={(e: ChangeEvent<HTMLInputElement>) => setLinkEyes(e.target.checked)} />Link design changes</label>
            <div className="button-grid two-col">
              <button onClick={() => copyStyle('left', 'right')}>L → R design</button>
              <button onClick={() => copyStyle('right', 'left')}>R → L design</button>
            </div>
          </section>

          <section>
            <h3>10 Starter Presets</h3>
            <div className="preset-grid">
              {Object.keys(PRESETS).map((name) => <button key={name} onClick={() => applyPreset(name)}>{name}</button>)}
            </div>
          </section>

          <section>
            <h3>Seed Random</h3>
            <NumberField label="Seed" value={seed} step={1} min={0} max={999999999} onChange={setSeed} />
            <div className="random-options">
              {(Object.keys(randomOptions) as (keyof RandomOptions)[]).map((key) => (
                <label className="check-row mini" key={key}><input type="checkbox" checked={randomOptions[key]} onChange={(e: ChangeEvent<HTMLInputElement>) => setRandomOptions((prev) => ({ ...prev, [key]: e.target.checked }))} />{key}</label>
              ))}
            </div>
            <div className="button-grid two-col">
              <button onClick={() => randomize()}>Randomize</button>
              <button onClick={() => { const next = Math.floor(Math.random() * 999999999); setSeed(next); randomize(next) }}>New Seed</button>
            </div>
          </section>

          <section>
            <h3>Project</h3>
            <div className="button-grid">
              <button onClick={saveLocal}>Save in Browser</button>
              <button onClick={loadLocal}>Load Browser Save</button>
              <button onClick={exportProjectJson}>Export Project JSON</button>
              <button onClick={() => projectInputRef.current?.click()}>Import Project JSON</button>
            </div>
          </section>

          <section>
            <h3>Source</h3>
            {uvInfo ? <div className="info-list">
              <div><span>Name</span><strong>{uvInfo.name}</strong></div>
              <div><span>Resolution</span><strong>{uvInfo.width} × {uvInfo.height}</strong></div>
              <div><span>Mask</span><strong>{selectedMask.type}</strong></div>
            </div> : <p className="muted">No PNG loaded.</p>}
          </section>
        </aside>

        <main className="canvas-panel panel">
          <div className="canvas-toolbar">
            <div className="badge">{selectedEye.toUpperCase()} · {TOOL_LABELS[toolMode]}</div>
            <div className="canvas-zoom-group">
              <button disabled={!canEdit} onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 0.9, 0.08, 30) }))}>−</button>
              <span>{zoomLabel}</span>
              <button disabled={!canEdit} onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 1.1, 0.08, 30) }))}>+</button>
              <button disabled={!canEdit} onClick={fitView}>Fit</button>
              <button disabled={!canEdit} onClick={resetTo100}>100%</button>
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
              onContextMenu={(event: ReactMouseEvent<HTMLCanvasElement>) => event.preventDefault()}
            />
          </div>
          <div className="statusbar"><span>{status}</span><span>Mouse wheel: zoom · Mask coordinates stay in original UV pixels</span></div>
        </main>

        <aside className="rightbar panel">
          <details open>
            <summary>Mask Editor</summary>
            <div className="section-body">
              <div className="info-chip">Type: {selectedMask.type}</div>
              <RangeField label="Feather (inward px)" value={selectedMask.feather} min={0} max={uvInfo ? Math.max(2, Math.min(80, Math.min(uvInfo.width, uvInfo.height) * 0.03)) : 80} step={0.5} onChange={updateMaskFeather} />
              {selectedMask.type === 'ellipse' ? (
                <div className="field-grid two">
                  <NumberField label="Center X" value={selectedMask.cx} min={0} max={uvInfo?.width ?? 99999} step={1} onChange={(v) => updateEllipse('cx', v)} />
                  <NumberField label="Center Y" value={selectedMask.cy} min={0} max={uvInfo?.height ?? 99999} step={1} onChange={(v) => updateEllipse('cy', v)} />
                  <NumberField label="Radius X" value={selectedMask.rx} min={1} max={uvInfo?.width ?? 99999} step={1} onChange={(v) => updateEllipse('rx', v)} />
                  <NumberField label="Radius Y" value={selectedMask.ry} min={1} max={uvInfo?.height ?? 99999} step={1} onChange={(v) => updateEllipse('ry', v)} />
                  <NumberField label="Rotation rad" value={selectedMask.rotation} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => updateEllipse('rotation', v)} />
                </div>
              ) : (
                <div className="hint-box">{selectedMask.points.length} polygon points. Use <b>Edit Points</b> on the left for precise correction.</div>
              )}
            </div>
          </details>

          <details open>
            <summary>Base · 5-stop Gradient</summary>
            <div className="section-body">
              <Toggle label="Gradient" checked={selectedStyle.gradient.enabled} onChange={(v) => updateStyleSection('gradient', 'enabled', v)} />
              <div className="color-grid">
                <ColorField label="Top" value={selectedStyle.gradient.top} onChange={(v) => updateStyleSection('gradient', 'top', v)} />
                <ColorField label="Upper Mid" value={selectedStyle.gradient.upperMid} onChange={(v) => updateStyleSection('gradient', 'upperMid', v)} />
                <ColorField label="Middle" value={selectedStyle.gradient.mid} onChange={(v) => updateStyleSection('gradient', 'mid', v)} />
                <ColorField label="Lower Mid" value={selectedStyle.gradient.lowerMid} onChange={(v) => updateStyleSection('gradient', 'lowerMid', v)} />
                <ColorField label="Bottom" value={selectedStyle.gradient.bottom} onChange={(v) => updateStyleSection('gradient', 'bottom', v)} />
              </div>
              <RangeField label="Overall Opacity" value={selectedStyle.opacity} min={0} max={1} step={0.01} onChange={updateOpacity} />
            </div>
          </details>

          <details open>
            <summary>Depth · Rings · Pupil</summary>
            <div className="section-body">
              <LayerToggle title="Upper Shadow" checked={selectedStyle.upperShadow.enabled} onChange={(v) => updateStyleSection('upperShadow', 'enabled', v)}>
                <ColorField label="Color" value={selectedStyle.upperShadow.color} onChange={(v) => updateStyleSection('upperShadow', 'color', v)} />
                <RangeField label="Intensity" value={selectedStyle.upperShadow.intensity} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('upperShadow', 'intensity', v)} />
                <RangeField label="Height" value={selectedStyle.upperShadow.height} min={0.15} max={0.9} step={0.01} onChange={(v) => updateStyleSection('upperShadow', 'height', v)} />
              </LayerToggle>
              <LayerToggle title="Lower Glow" checked={selectedStyle.lowerGlow.enabled} onChange={(v) => updateStyleSection('lowerGlow', 'enabled', v)}>
                <ColorField label="Color" value={selectedStyle.lowerGlow.color} onChange={(v) => updateStyleSection('lowerGlow', 'color', v)} />
                <RangeField label="Intensity" value={selectedStyle.lowerGlow.intensity} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('lowerGlow', 'intensity', v)} />
              </LayerToggle>
              <LayerToggle title="Outer Ring" checked={selectedStyle.outerRing.enabled} onChange={(v) => updateStyleSection('outerRing', 'enabled', v)}>
                <ColorField label="Color" value={selectedStyle.outerRing.color} onChange={(v) => updateStyleSection('outerRing', 'color', v)} />
                <RangeField label="Thickness" value={selectedStyle.outerRing.thickness} min={0.01} max={0.2} step={0.005} onChange={(v) => updateStyleSection('outerRing', 'thickness', v)} />
              </LayerToggle>
              <LayerToggle title="Inner Ring" checked={selectedStyle.innerRing.enabled} onChange={(v) => updateStyleSection('innerRing', 'enabled', v)}>
                <ColorField label="Color" value={selectedStyle.innerRing.color} onChange={(v) => updateStyleSection('innerRing', 'color', v)} />
                <RangeField label="Radius" value={selectedStyle.innerRing.radius} min={0.12} max={0.7} step={0.01} onChange={(v) => updateStyleSection('innerRing', 'radius', v)} />
                <RangeField label="Thickness" value={selectedStyle.innerRing.thickness} min={0.005} max={0.14} step={0.005} onChange={(v) => updateStyleSection('innerRing', 'thickness', v)} />
              </LayerToggle>
              <LayerToggle title="Extra Inner Ring" checked={selectedStyle.extraInnerRing.enabled} onChange={(v) => updateStyleSection('extraInnerRing', 'enabled', v)}>
                <ColorField label="Color" value={selectedStyle.extraInnerRing.color} onChange={(v) => updateStyleSection('extraInnerRing', 'color', v)} />
                <RangeField label="Radius" value={selectedStyle.extraInnerRing.radius} min={0.18} max={0.86} step={0.01} onChange={(v) => updateStyleSection('extraInnerRing', 'radius', v)} />
              </LayerToggle>
              <LayerToggle title="Pupil" checked={selectedStyle.pupil.enabled} onChange={(v) => updateStyleSection('pupil', 'enabled', v)}>
                <SelectField label="Shape" value={selectedStyle.pupil.shape} options={['circle', 'oval']} onChange={(v) => updateStyleSection('pupil', 'shape', v)} />
                <ColorField label="Color" value={selectedStyle.pupil.color} onChange={(v) => updateStyleSection('pupil', 'color', v)} />
                <RangeField label="Scale X" value={selectedStyle.pupil.scaleX} min={0.05} max={0.55} step={0.01} onChange={(v) => updateStyleSection('pupil', 'scaleX', v)} />
                <RangeField label="Scale Y" value={selectedStyle.pupil.scaleY} min={0.05} max={0.62} step={0.01} onChange={(v) => updateStyleSection('pupil', 'scaleY', v)} />
                <RangeField label="Position Y" value={selectedStyle.pupil.y} min={0.25} max={0.75} step={0.01} onChange={(v) => updateStyleSection('pupil', 'y', v)} />
              </LayerToggle>
            </div>
          </details>

          <details>
            <summary>Texture · Radial · Particles</summary>
            <div className="section-body">
              <LayerToggle title="Radial Texture" checked={selectedStyle.radial.enabled} onChange={(v) => updateStyleSection('radial', 'enabled', v)}>
                <ColorField label="Color" value={selectedStyle.radial.color} onChange={(v) => updateStyleSection('radial', 'color', v)} />
                <RangeField label="Strength" value={selectedStyle.radial.strength} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('radial', 'strength', v)} />
                <RangeField label="Density" value={selectedStyle.radial.density} min={6} max={70} step={1} onChange={(v) => updateStyleSection('radial', 'density', Math.round(v))} />
                <RangeField label="Length" value={selectedStyle.radial.length} min={0.2} max={1} step={0.01} onChange={(v) => updateStyleSection('radial', 'length', v)} />
                <RangeField label="Randomness" value={selectedStyle.radial.randomness} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('radial', 'randomness', v)} />
              </LayerToggle>
              <LayerToggle title="Soft Texture" checked={selectedStyle.softTexture.enabled} onChange={(v) => updateStyleSection('softTexture', 'enabled', v)}>
                <ColorField label="Color" value={selectedStyle.softTexture.color} onChange={(v) => updateStyleSection('softTexture', 'color', v)} />
                <RangeField label="Strength" value={selectedStyle.softTexture.strength} min={0} max={0.45} step={0.01} onChange={(v) => updateStyleSection('softTexture', 'strength', v)} />
                <RangeField label="Amount" value={selectedStyle.softTexture.amount} min={0} max={70} step={1} onChange={(v) => updateStyleSection('softTexture', 'amount', Math.round(v))} />
              </LayerToggle>
              <LayerToggle title="Particles" checked={selectedStyle.particles.enabled} onChange={(v) => updateStyleSection('particles', 'enabled', v)}>
                <SelectField label="Type" value={selectedStyle.particles.type} options={['dot', 'star', 'diamond', 'tinyCircle']} onChange={(v) => updateStyleSection('particles', 'type', v)} />
                <ColorField label="Color" value={selectedStyle.particles.color} onChange={(v) => updateStyleSection('particles', 'color', v)} />
                <RangeField label="Count" value={selectedStyle.particles.count} min={0} max={30} step={1} onChange={(v) => updateStyleSection('particles', 'count', Math.round(v))} />
              </LayerToggle>
            </div>
          </details>

          <details open>
            <summary>Lower Motif · Reflection</summary>
            <div className="section-body">
              <LayerToggle title="Lower Motif" checked={selectedStyle.lowerMotif.enabled} onChange={(v) => updateStyleSection('lowerMotif', 'enabled', v)}>
                <SelectField label="Motif" value={selectedStyle.lowerMotif.type} options={['petal', 'dash', 'droplet', 'glass', 'wave', 'ovalCluster']} onChange={(v) => updateStyleSection('lowerMotif', 'type', v)} />
                <ColorField label="Color" value={selectedStyle.lowerMotif.color} onChange={(v) => updateStyleSection('lowerMotif', 'color', v)} />
                <RangeField label="Count" value={selectedStyle.lowerMotif.count} min={1} max={18} step={1} onChange={(v) => updateStyleSection('lowerMotif', 'count', Math.round(v))} />
                <RangeField label="Size" value={selectedStyle.lowerMotif.size} min={0.02} max={0.18} step={0.005} onChange={(v) => updateStyleSection('lowerMotif', 'size', v)} />
                <RangeField label="Spread" value={selectedStyle.lowerMotif.spread} min={0.2} max={0.9} step={0.01} onChange={(v) => updateStyleSection('lowerMotif', 'spread', v)} />
                <RangeField label="Y Position" value={selectedStyle.lowerMotif.y} min={0.5} max={0.9} step={0.01} onChange={(v) => updateStyleSection('lowerMotif', 'y', v)} />
                <RangeField label="Opacity" value={selectedStyle.lowerMotif.opacity} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('lowerMotif', 'opacity', v)} />
                <RangeField label="Glow" value={selectedStyle.lowerMotif.glow} min={0} max={0.5} step={0.01} onChange={(v) => updateStyleSection('lowerMotif', 'glow', v)} />
              </LayerToggle>
              <LayerToggle title="Reflection" checked={selectedStyle.reflection.enabled} onChange={(v) => updateStyleSection('reflection', 'enabled', v)}>
                <SelectField label="Type" value={selectedStyle.reflection.type} options={['softPatch', 'curved', 'side', 'haze']} onChange={(v) => updateStyleSection('reflection', 'type', v)} />
                <ColorField label="Color" value={selectedStyle.reflection.color} onChange={(v) => updateStyleSection('reflection', 'color', v)} />
                <RangeField label="Opacity" value={selectedStyle.reflection.opacity} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('reflection', 'opacity', v)} />
                <RangeField label="X" value={selectedStyle.reflection.x} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('reflection', 'x', v)} />
                <RangeField label="Y" value={selectedStyle.reflection.y} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('reflection', 'y', v)} />
              </LayerToggle>
            </div>
          </details>

          <details open>
            <summary>Highlight Group</summary>
            <div className="section-body">
              <LayerToggle title="Highlights" checked={selectedStyle.highlight.enabled} onChange={(v) => updateStyleSection('highlight', 'enabled', v)}>
                <SelectField label="Preset" value={selectedStyle.highlight.preset} options={['singleLarge', 'animeStandard', 'glassyDouble', 'cluster', 'sideHighlight', 'topDome']} onChange={(v) => updateStyleSection('highlight', 'preset', v)} />
                <ColorField label="Color" value={selectedStyle.highlight.color} onChange={(v) => updateStyleSection('highlight', 'color', v)} />
                <RangeField label="Opacity" value={selectedStyle.highlight.opacity} min={0} max={1} step={0.01} onChange={(v) => updateStyleSection('highlight', 'opacity', v)} />
                <RangeField label="Size" value={selectedStyle.highlight.size} min={0.35} max={2} step={0.01} onChange={(v) => updateStyleSection('highlight', 'size', v)} />
                <RangeField label="X" value={selectedStyle.highlight.x} min={0.05} max={0.95} step={0.01} onChange={(v) => updateStyleSection('highlight', 'x', v)} />
                <RangeField label="Y" value={selectedStyle.highlight.y} min={0.05} max={0.95} step={0.01} onChange={(v) => updateStyleSection('highlight', 'y', v)} />
                <RangeField label="Glow" value={selectedStyle.highlight.glow} min={0} max={0.55} step={0.01} onChange={(v) => updateStyleSection('highlight', 'glow', v)} />
              </LayerToggle>
            </div>
          </details>
        </aside>
      </div>
    </div>
  )
}

function toolHelp(tool: ToolMode) {
  switch (tool) {
    case 'pan': return 'Pan: drag the canvas view without changing UV coordinates.'
    case 'ellipse': return 'Draw Ellipse: drag directly over the iris UV area to replace the selected eye mask.'
    case 'polygon': return 'Polygon: click freely around the true iris boundary. Click the first point or Complete to close it.'
    case 'editPoints': return 'Edit Points: drag a polygon vertex. Shift+click edge adds; Alt+click vertex deletes.'
    case 'moveMask': return 'Move Mask: drag anywhere inside the selected mask to move the whole mask.'
  }
}

function maskToScreen(mask: EyeMask, canvas: { width: number; height: number }, image: { width: number; height: number }, view: ViewState): EyeMask {
  const origin = imageToScreen(0, 0, canvas, image, view)
  if (mask.type === 'ellipse') {
    const center = imageToScreen(mask.cx, mask.cy, canvas, image, view)
    return { ...mask, cx: center.x, cy: center.y, rx: mask.rx * origin.scale, ry: mask.ry * origin.scale, feather: mask.feather * origin.scale }
  }
  return {
    ...mask,
    feather: mask.feather * origin.scale,
    points: mask.points.map((point) => imagePointToScreen(point, canvas, image, view)),
  }
}

function imagePointToScreen(point: Point, canvas: { width: number; height: number }, image: { width: number; height: number }, view: ViewState) {
  const converted = imageToScreen(point.x, point.y, canvas, image, view)
  return { x: converted.x, y: converted.y }
}

function drawMaskOverlay(ctx: CanvasRenderingContext2D, mask: EyeMask, selected: boolean, color: string, selectedPoint: number | null) {
  ctx.save()
  ctx.strokeStyle = selected ? color : 'rgba(255,255,255,0.58)'
  ctx.lineWidth = selected ? 2.2 : 1.2
  ctx.setLineDash(selected ? [8, 5] : [5, 5])
  ctx.beginPath()
  if (mask.type === 'ellipse') {
    ctx.ellipse(mask.cx, mask.cy, mask.rx, mask.ry, mask.rotation, 0, Math.PI * 2)
  } else if (mask.points.length >= 2) {
    ctx.moveTo(mask.points[0].x, mask.points[0].y)
    mask.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.closePath()
  }
  ctx.stroke()
  ctx.setLineDash([])

  if (mask.type === 'ellipse') {
    ctx.strokeStyle = selected ? color : 'rgba(255,255,255,0.6)'
    ctx.beginPath(); ctx.moveTo(mask.cx - 9, mask.cy); ctx.lineTo(mask.cx + 9, mask.cy); ctx.moveTo(mask.cx, mask.cy - 9); ctx.lineTo(mask.cx, mask.cy + 9); ctx.stroke()
  } else if (selected) {
    mask.points.forEach((point, index) => {
      ctx.fillStyle = selectedPoint === index ? '#ffffff' : color
      ctx.strokeStyle = '#10131b'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(point.x, point.y, selectedPoint === index ? 6 : 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    })
  }
  ctx.restore()
}

function drawDraftPolygon(ctx: CanvasRenderingContext2D, points: Point[], color: string) {
  if (points.length === 0) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([6, 5])
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y)); ctx.stroke(); ctx.setLineDash([])
  points.forEach((point, index) => {
    ctx.beginPath(); ctx.arc(point.x, point.y, index === 0 ? 6 : 4, 0, Math.PI * 2); ctx.fill()
  })
  ctx.restore()
}

function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const size = 18
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#202637' : '#252d41'
      ctx.fillRect(x, y, size, size)
    }
  }
}

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '700 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('UV Eye Texture Studio v0.3', width / 2, height / 2 - 28)
  ctx.fillStyle = 'rgba(255,255,255,0.58)'
  ctx.font = '15px sans-serif'
  ctx.fillText('Open a PNG, draw a free-form polygon mask, then build the iris in procedural layers.', width / 2, height / 2 + 7)
  ctx.fillText('Your UV image is processed locally in the browser.', width / 2, height / 2 + 33)
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="field"><span>{label}</span><input type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))} /></label>
}

function RangeField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="field"><div className="field-head"><span>{label}</span><strong>{Number(value).toFixed(step >= 1 ? 0 : 2)}</strong></div><input type="range" value={value} min={min} max={max} step={step} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))} /></label>
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field color-field"><span>{label}</span><div className="color-input-row"><input type="color" value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} /><input type="text" value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} /></div></label>
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)} /><span>{label}</span></label>
}

function LayerToggle({ title, checked, onChange, children }: { title: string; checked: boolean; onChange: (value: boolean) => void; children: ReactNode }) {
  return <div className={`layer-card ${checked ? '' : 'disabled-layer'}`}><div className="layer-head"><Toggle label={title} checked={checked} onChange={onChange} /></div><div className="layer-fields">{children}</div></div>
}
