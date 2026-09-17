import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent, WheelEvent } from 'react'
import { clamp, imageToScreen, pointInRotatedEllipse, screenToImage } from './lib/math'
import { drawIrisDesign, exportFullUvPng, exportSingleIrisPng } from './lib/irisRenderer'
import type { EyeMask, EyeSide, EyeStyle, SavedProjectSettings, ToolMode, UVFileInfo, ViewState } from './lib/types'

const DEFAULT_STYLE: EyeStyle = {
  topColor: '#271747',
  midColor: '#547fc3',
  bottomColor: '#d0f7ff',
  ringColor: '#1b1131',
  pupilColor: '#1b1a27',
  reflectionColor: '#9389de',
  ringThickness: 0.085,
  pupilScale: 0.22,
  opacity: 0.9,
  radialStrength: 0.62,
  reflectionStrength: 0.55,
  highlightStrength: 0.95,
  highlightScale: 1,
  highlightX: 0.28,
  highlightY: 0.24,
}

const PRESETS: Record<string, EyeStyle> = {
  'Blue Ice': {
    ...DEFAULT_STYLE,
    topColor: '#171d45', midColor: '#3e79bb', bottomColor: '#c7f6ff', ringColor: '#10162f', reflectionColor: '#7d71dc',
  },
  Lavender: {
    ...DEFAULT_STYLE,
    topColor: '#332045', midColor: '#8c78cf', bottomColor: '#e4d8ff', ringColor: '#261934', reflectionColor: '#b59cff',
  },
  'Pink Glass': {
    ...DEFAULT_STYLE,
    topColor: '#4b213d', midColor: '#c860a5', bottomColor: '#ffd8ec', ringColor: '#351529', reflectionColor: '#ff96d6',
  },
  Ruby: {
    ...DEFAULT_STYLE,
    topColor: '#421318', midColor: '#b83849', bottomColor: '#ffb6ad', ringColor: '#2d0a0d', reflectionColor: '#ff7f9f',
  },
  Aqua: {
    ...DEFAULT_STYLE,
    topColor: '#10333a', midColor: '#2d9ca8', bottomColor: '#c9fff2', ringColor: '#0b272b', reflectionColor: '#68d5ff',
  },
  Amber: {
    ...DEFAULT_STYLE,
    topColor: '#3b2810', midColor: '#b47b20', bottomColor: '#ffe3a0', ringColor: '#2c1c08', reflectionColor: '#fff09a',
  },
}

function cloneStyle(style: EyeStyle): EyeStyle {
  return { ...style }
}

function createDefaultMasks(width: number, height: number): Record<EyeSide, EyeMask> {
  const radius = Math.max(24, Math.round(Math.min(width, height) * 0.03))
  return {
    left: { cx: width * 0.35, cy: height * 0.35, rx: radius, ry: radius, rotation: 0 },
    right: { cx: width * 0.65, cy: height * 0.35, rx: radius, ry: radius, rotation: 0 },
  }
}

function triggerDownload(dataUrl: string, fileName: string) {
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

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function randomStyle(seed: number): EyeStyle {
  const rand = mulberry32(seed)
  const presetNames = Object.keys(PRESETS)
  const base = cloneStyle(PRESETS[presetNames[Math.floor(rand() * presetNames.length)]])
  const hueJitter = () => Math.floor(rand() * 22) - 11
  base.ringThickness = 0.05 + rand() * 0.09
  base.pupilScale = 0.14 + rand() * 0.2
  base.radialStrength = 0.25 + rand() * 0.75
  base.reflectionStrength = 0.25 + rand() * 0.75
  base.highlightStrength = 0.65 + rand() * 0.35
  base.highlightScale = 0.7 + rand() * 0.8
  base.highlightX = 0.18 + rand() * 0.25
  base.highlightY = 0.15 + rand() * 0.25
  base.midColor = shiftHex(base.midColor, hueJitter())
  base.bottomColor = shiftHex(base.bottomColor, hueJitter())
  return base
}

function shiftHex(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = clamp(((value >> 16) & 255) + amount, 0, 255)
  const g = clamp(((value >> 8) & 255) + amount, 0, 255)
  const b = clamp((value & 255) + amount, 0, 255)
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`
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
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 })
  const [masks, setMasks] = useState<Record<EyeSide, EyeMask>>({
    left: { cx: 256, cy: 256, rx: 48, ry: 48, rotation: 0 },
    right: { cx: 512, cy: 256, rx: 48, ry: 48, rotation: 0 },
  })
  const [styles, setStyles] = useState<Record<EyeSide, EyeStyle>>({
    left: cloneStyle(DEFAULT_STYLE),
    right: cloneStyle(DEFAULT_STYLE),
  })
  const [seed, setSeed] = useState(9389)
  const [status, setStatus] = useState('Ready')

  const dragRef = useRef<
    | { type: 'pan'; startX: number; startY: number; offsetX: number; offsetY: number }
    | { type: 'mask'; eye: EyeSide; startImgX: number; startImgY: number; startCx: number; startCy: number }
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
      setCanvasSize({ width: Math.max(300, rect.width), height: Math.max(300, rect.height) })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const fitView = () => {
    setView({ zoom: 1, offsetX: 0, offsetY: 0 })
    setStatus('Fit view applied')
  }

  const resetTo100 = () => {
    if (!uvInfo) return
    const scaleAt100 = 1 / Math.min(canvasSize.width / uvInfo.width, canvasSize.height / uvInfo.height)
    setView({ zoom: scaleAt100, offsetX: 0, offsetY: 0 })
    setStatus('100% zoom applied')
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'image/png') {
      setStatus('Please choose a PNG file.')
      return
    }

    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImageElement(image)
      setUvInfo({ name: file.name, width: image.naturalWidth, height: image.naturalHeight, hasAlpha: true })
      setMasks(createDefaultMasks(image.naturalWidth, image.naturalHeight))
      setView({ zoom: 1, offsetX: 0, offsetY: 0 })
      setSelectedEye('left')
      setStatus(`Loaded ${file.name}`)
    }
    image.src = url
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageElement
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

    if (!image || !uvInfo) {
      drawEmptyState(ctx, canvasSize.width, canvasSize.height)
      return
    }

    const transform = imageToScreen(0, 0, canvasSize, uvInfo, view)
    ctx.drawImage(image, transform.startX, transform.startY, uvInfo.width * transform.scale, uvInfo.height * transform.scale)

    const leftMaskScreen = toScreenMask(masks.left, canvasSize, uvInfo, view)
    const rightMaskScreen = toScreenMask(masks.right, canvasSize, uvInfo, view)
    drawIrisDesign(ctx, leftMaskScreen, styles.left)
    drawIrisDesign(ctx, rightMaskScreen, styles.right)
    drawMaskOverlay(ctx, leftMaskScreen, selectedEye === 'left', '#8ab4ff')
    drawMaskOverlay(ctx, rightMaskScreen, selectedEye === 'right', '#ff98d3')
  }, [canvasSize, imageElement, masks, selectedEye, styles, uvInfo, view])

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    if (!uvInfo || !imageElement) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    const before = screenToImage(screenX, screenY, canvasSize, uvInfo, view)
    const nextZoom = clamp(view.zoom * (event.deltaY < 0 ? 1.1 : 0.9), 0.1, 20)
    const nextView = { ...view, zoom: nextZoom }
    const afterPos = imageToScreen(before.x, before.y, canvasSize, uvInfo, nextView)
    setView({ zoom: nextZoom, offsetX: view.offsetX + (screenX - afterPos.x), offsetY: view.offsetY + (screenY - afterPos.y) })
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!uvInfo) return
    const rect = event.currentTarget.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top

    if (toolMode === 'pan') {
      dragRef.current = { type: 'pan', startX: screenX, startY: screenY, offsetX: view.offsetX, offsetY: view.offsetY }
      return
    }

    const imgPos = screenToImage(screenX, screenY, canvasSize, uvInfo, view)
    if (pointInRotatedEllipse(imgPos.x, imgPos.y, masks[selectedEye])) {
      dragRef.current = {
        type: 'mask', eye: selectedEye, startImgX: imgPos.x, startImgY: imgPos.y,
        startCx: masks[selectedEye].cx, startCy: masks[selectedEye].cy,
      }
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!uvInfo || !dragRef.current) return
    const drag = dragRef.current
    const rect = event.currentTarget.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top

    if (drag.type === 'pan') {
      setView((prev) => ({ ...prev, offsetX: drag.offsetX + (screenX - drag.startX), offsetY: drag.offsetY + (screenY - drag.startY) }))
      return
    }

    const imgPos = screenToImage(screenX, screenY, canvasSize, uvInfo, view)
    const eye = drag.eye
    setMasks((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        cx: clamp(drag.startCx + (imgPos.x - drag.startImgX), 0, uvInfo.width),
        cy: clamp(drag.startCy + (imgPos.y - drag.startImgY), 0, uvInfo.height),
      },
    }))
  }

  const updateMask = (key: keyof EyeMask, value: number) => {
    setMasks((prev) => ({ ...prev, [selectedEye]: { ...prev[selectedEye], [key]: value } }))
  }

  const updateStyle = (key: keyof EyeStyle, value: string | number) => {
    setStyles((prev) => {
      const selected = { ...prev[selectedEye], [key]: value } as EyeStyle
      if (!linkEyes) return { ...prev, [selectedEye]: selected }
      const otherEye: EyeSide = selectedEye === 'left' ? 'right' : 'left'
      const other = { ...prev[otherEye], [key]: value } as EyeStyle
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
    setStatus(`Applied preset: ${name}`)
  }

  const randomize = () => {
    const next = randomStyle(seed)
    applyStyle(next)
    setStatus(`Randomized iris from seed ${seed}`)
  }

  const saveSettingsLocally = () => {
    const data = makeProjectSettings()
    localStorage.setItem('uv-eye-studio-v02-settings', JSON.stringify(data))
    setStatus('Settings saved locally in this browser')
  }

  const loadSettingsLocally = () => {
    const raw = localStorage.getItem('uv-eye-studio-v02-settings')
    if (!raw) {
      setStatus('No locally saved settings found')
      return
    }
    try {
      applyProjectSettings(JSON.parse(raw) as SavedProjectSettings)
      setStatus('Loaded locally saved settings')
    } catch {
      setStatus('Saved settings could not be loaded')
    }
  }

  const makeProjectSettings = (): SavedProjectSettings => ({
    version: 2,
    seed,
    linkEyes,
    masks,
    styles,
    source: uvInfo ? { name: uvInfo.name, width: uvInfo.width, height: uvInfo.height } : undefined,
  })

  const applyProjectSettings = (data: SavedProjectSettings) => {
    if (data.version !== 2) throw new Error('Unsupported project version')
    setSeed(data.seed)
    setLinkEyes(data.linkEyes)
    setMasks(data.masks)
    setStyles(data.styles)
  }

  const exportProjectJson = () => {
    downloadText(JSON.stringify(makeProjectSettings(), null, 2), 'uv-eye-project-v0.2.json')
    setStatus('Exported project settings JSON')
  }

  const importProjectJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        applyProjectSettings(JSON.parse(String(reader.result)) as SavedProjectSettings)
        setStatus(`Imported settings from ${file.name}`)
      } catch {
        setStatus('Project settings JSON is invalid or unsupported')
      }
    }
    reader.readAsText(file)
  }

  const handleExportFull = () => {
    if (!imageElement || !uvInfo) return
    triggerDownload(exportFullUvPng(imageElement, masks, styles), uvInfo.name.replace(/\.png$/i, '') + '-eye-edited.png')
    setStatus('Exported full UV PNG')
  }

  const handleExportSelected = () => {
    triggerDownload(exportSingleIrisPng(masks[selectedEye], styles[selectedEye]), `${selectedEye}-iris.png`)
    setStatus(`Exported ${selectedEye} iris PNG`)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="app-title">UV Eye Texture Studio</div>
          <div className="app-subtitle">v0.2 — presets, seeded random, reflection & project settings</div>
        </div>
        <div className="topbar-actions">
          <button className="primary" onClick={() => fileInputRef.current?.click()}>Open UV Texture</button>
          <button onClick={fitView} disabled={!canEdit}>Fit</button>
          <button onClick={resetTo100} disabled={!canEdit}>100%</button>
          <button onClick={handleExportFull} disabled={!canEdit}>Export Full PNG</button>
        </div>
      </header>

      <input ref={fileInputRef} type="file" accept="image/png" hidden onChange={handleFileChange} />
      <input ref={projectInputRef} type="file" accept="application/json,.json" hidden onChange={importProjectJson} />

      <div className="workspace">
        <aside className="leftbar panel">
          <section>
            <h3>Tools</h3>
            <div className="segmented">
              <button className={toolMode === 'pan' ? 'active' : ''} onClick={() => setToolMode('pan')}>Pan</button>
              <button className={toolMode === 'mask' ? 'active' : ''} onClick={() => setToolMode('mask')}>Move Mask</button>
            </div>
          </section>

          <section>
            <h3>Eyes</h3>
            <div className="segmented">
              <button className={selectedEye === 'left' ? 'active' : ''} onClick={() => setSelectedEye('left')}>Left</button>
              <button className={selectedEye === 'right' ? 'active' : ''} onClick={() => setSelectedEye('right')}>Right</button>
            </div>
            <label className="inline-row checkbox-row">
              <input type="checkbox" checked={linkEyes} onChange={(e) => setLinkEyes(e.target.checked)} /> Link iris style changes
            </label>
            <div className="button-grid two-col">
              <button onClick={() => setStyles((prev) => ({ ...prev, right: cloneStyle(prev.left) }))}>L → R</button>
              <button onClick={() => setStyles((prev) => ({ ...prev, left: cloneStyle(prev.right) }))}>R → L</button>
            </div>
          </section>

          <section>
            <h3>Preset</h3>
            <div className="preset-grid">
              {Object.keys(PRESETS).map((name) => <button key={name} onClick={() => applyPreset(name)}>{name}</button>)}
            </div>
          </section>

          <section>
            <h3>Seed Random</h3>
            <label className="field"><span>Seed</span><input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} /></label>
            <div className="button-grid two-col">
              <button onClick={randomize}>Randomize</button>
              <button onClick={() => { const next = Math.floor(Math.random() * 9999999); setSeed(next); applyStyle(randomStyle(next)); setStatus(`New random seed ${next}`) }}>New Seed</button>
            </div>
          </section>

          <section>
            <h3>Project Settings</h3>
            <div className="button-grid">
              <button onClick={saveSettingsLocally}>Save in Browser</button>
              <button onClick={loadSettingsLocally}>Load Browser Save</button>
              <button onClick={exportProjectJson}>Export Project JSON</button>
              <button onClick={() => projectInputRef.current?.click()}>Import Project JSON</button>
            </div>
          </section>

          <section>
            <h3>File</h3>
            {uvInfo ? (
              <div className="info-list">
                <div><span>Name</span><strong>{uvInfo.name}</strong></div>
                <div><span>Resolution</span><strong>{uvInfo.width} × {uvInfo.height}</strong></div>
                <div><span>Alpha</span><strong>{uvInfo.hasAlpha ? 'Detected' : 'Unknown'}</strong></div>
              </div>
            ) : <p className="muted">Load a PNG UV texture to start editing.</p>}
          </section>
        </aside>

        <main className="canvas-panel panel">
          <div className="canvas-toolbar">
            <div className="badge">Editing: {selectedEye.toUpperCase()}</div>
            <div className="canvas-zoom-group">
              <button onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 0.9, 0.1, 20) }))} disabled={!canEdit}>−</button>
              <span>{zoomLabel}</span>
              <button onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 1.1, 0.1, 20) }))} disabled={!canEdit}>+</button>
              <button onClick={fitView} disabled={!canEdit}>Fit</button>
              <button onClick={resetTo100} disabled={!canEdit}>100%</button>
            </div>
          </div>
          <div ref={canvasHostRef} className="canvas-host">
            <canvas ref={canvasRef} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => { dragRef.current = null }} onPointerLeave={() => { dragRef.current = null }} />
          </div>
          <div className="statusbar"><span>{status}</span><span>{canEdit ? 'Wheel: zoom · Pan: move view · Move Mask: drag selected ellipse' : 'No UV loaded yet.'}</span></div>
        </main>

        <aside className="rightbar panel">
          <section>
            <h3>Mask</h3>
            <div className="field-grid">
              <NumberField label="Center X" value={selectedMask.cx} min={0} max={uvInfo?.width ?? 99999} step={1} onChange={(v) => updateMask('cx', v)} />
              <NumberField label="Center Y" value={selectedMask.cy} min={0} max={uvInfo?.height ?? 99999} step={1} onChange={(v) => updateMask('cy', v)} />
              <NumberField label="Radius X" value={selectedMask.rx} min={1} max={uvInfo?.width ?? 99999} step={1} onChange={(v) => updateMask('rx', v)} />
              <NumberField label="Radius Y" value={selectedMask.ry} min={1} max={uvInfo?.height ?? 99999} step={1} onChange={(v) => updateMask('ry', v)} />
              <NumberField label="Rotation (rad)" value={selectedMask.rotation} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => updateMask('rotation', v)} />
            </div>
            <button className="wide-button" onClick={handleExportSelected} disabled={!canEdit}>Export Selected Iris</button>
          </section>

          <section>
            <h3>Iris Colors</h3>
            <div className="field-grid">
              <ColorField label="Top" value={selectedStyle.topColor} onChange={(v) => updateStyle('topColor', v)} />
              <ColorField label="Mid" value={selectedStyle.midColor} onChange={(v) => updateStyle('midColor', v)} />
              <ColorField label="Bottom" value={selectedStyle.bottomColor} onChange={(v) => updateStyle('bottomColor', v)} />
              <ColorField label="Ring" value={selectedStyle.ringColor} onChange={(v) => updateStyle('ringColor', v)} />
              <ColorField label="Pupil" value={selectedStyle.pupilColor} onChange={(v) => updateStyle('pupilColor', v)} />
              <ColorField label="Reflection" value={selectedStyle.reflectionColor} onChange={(v) => updateStyle('reflectionColor', v)} />
            </div>
          </section>

          <section>
            <h3>Details</h3>
            <div className="field-grid">
              <RangeField label="Opacity" min={0} max={1} step={0.01} value={selectedStyle.opacity} onChange={(v) => updateStyle('opacity', v)} />
              <RangeField label="Ring Thickness" min={0.01} max={0.25} step={0.005} value={selectedStyle.ringThickness} onChange={(v) => updateStyle('ringThickness', v)} />
              <RangeField label="Pupil Scale" min={0.05} max={0.5} step={0.01} value={selectedStyle.pupilScale} onChange={(v) => updateStyle('pupilScale', v)} />
              <RangeField label="Radial Pattern" min={0} max={1} step={0.01} value={selectedStyle.radialStrength} onChange={(v) => updateStyle('radialStrength', v)} />
              <RangeField label="Reflection" min={0} max={1} step={0.01} value={selectedStyle.reflectionStrength} onChange={(v) => updateStyle('reflectionStrength', v)} />
              <RangeField label="Highlight" min={0} max={1} step={0.01} value={selectedStyle.highlightStrength} onChange={(v) => updateStyle('highlightStrength', v)} />
              <RangeField label="Highlight Size" min={0.4} max={2} step={0.01} value={selectedStyle.highlightScale} onChange={(v) => updateStyle('highlightScale', v)} />
              <RangeField label="Highlight X" min={0.05} max={0.95} step={0.01} value={selectedStyle.highlightX} onChange={(v) => updateStyle('highlightX', v)} />
              <RangeField label="Highlight Y" min={0.05} max={0.95} step={0.01} value={selectedStyle.highlightY} onChange={(v) => updateStyle('highlightY', v)} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="field"><span>{label}</span><input type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></label>
}

function RangeField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="field"><div className="field-head"><span>{label}</span><strong>{value.toFixed(2)}</strong></div><input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></label>
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field color-field"><span>{label}</span><div className="color-input-row"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /><input type="text" value={value} onChange={(e) => onChange(e.target.value)} /></div></label>
}

function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const size = 18
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#222837' : '#252d3f'
      ctx.fillRect(x, y, size, size)
    }
  }
}

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '600 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Open a PNG UV texture to begin', width / 2, height / 2 - 10)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '15px sans-serif'
  ctx.fillText('Place the left/right masks, then customize or randomize the iris.', width / 2, height / 2 + 22)
}

function toScreenMask(mask: EyeMask, canvasSize: { width: number; height: number }, uvInfo: { width: number; height: number }, view: ViewState): EyeMask {
  const center = imageToScreen(mask.cx, mask.cy, canvasSize, uvInfo, view)
  return { cx: center.x, cy: center.y, rx: mask.rx * center.scale, ry: mask.ry * center.scale, rotation: mask.rotation }
}

function drawMaskOverlay(ctx: CanvasRenderingContext2D, mask: EyeMask, selected: boolean, color: string) {
  ctx.save()
  ctx.translate(mask.cx, mask.cy)
  ctx.rotate(mask.rotation)
  ctx.strokeStyle = selected ? color : 'rgba(255,255,255,0.7)'
  ctx.lineWidth = selected ? 2.5 : 1.5
  ctx.setLineDash(selected ? [8, 6] : [5, 5])
  ctx.beginPath()
  ctx.ellipse(0, 0, mask.rx, mask.ry, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10)
  ctx.strokeStyle = selected ? color : 'rgba(255,255,255,0.8)'
  ctx.stroke()
  ctx.restore()
}
