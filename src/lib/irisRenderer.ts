import { getMaskBounds, traceMaskPath, translateMask } from './mask'
import { mulberry32 } from './random'
import type { EyeDesignV6, EyeMask, OverlayImageState, PupilShape } from './types'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized.padEnd(6, '0').slice(0, 6)
  const value = Number.parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function mappedX(value: number, mirrorX: boolean) {
  return mirrorX ? 1 - value : value
}

function ellipsePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2)
}

function shapePath(ctx: CanvasRenderingContext2D, shape: PupilShape, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  ctx.beginPath()
  if (shape === 'circle' || shape === 'ovalVertical' || shape === 'ovalHorizontal' || shape === 'softOval') {
    ctx.ellipse(0, 0, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2)
  } else if (shape === 'slit') {
    ctx.moveTo(0, -ry)
    ctx.bezierCurveTo(rx * 0.75, -ry * 0.18, rx * 0.42, ry * 0.8, 0, ry)
    ctx.bezierCurveTo(-rx * 0.42, ry * 0.8, -rx * 0.75, -ry * 0.18, 0, -ry)
    ctx.closePath()
  } else if (shape === 'heart') {
    ctx.moveTo(0, ry)
    ctx.bezierCurveTo(rx * 1.12, ry * 0.35, rx * 1.05, -ry * 0.65, 0, -ry * 0.18)
    ctx.bezierCurveTo(-rx * 1.05, -ry * 0.65, -rx * 1.12, ry * 0.35, 0, ry)
    ctx.closePath()
  } else if (shape === 'petal') {
    ctx.moveTo(0, -ry)
    ctx.bezierCurveTo(rx * 0.86, -ry * 0.48, rx * 0.76, ry * 0.48, 0, ry)
    ctx.bezierCurveTo(-rx * 0.76, ry * 0.48, -rx * 0.86, -ry * 0.48, 0, -ry)
    ctx.closePath()
  } else if (shape === 'droplet') {
    ctx.moveTo(0, -ry)
    ctx.bezierCurveTo(rx * 0.85, -ry * 0.05, rx * 0.72, ry * 0.7, 0, ry)
    ctx.bezierCurveTo(-rx * 0.72, ry * 0.7, -rx * 0.85, -ry * 0.05, 0, -ry)
    ctx.closePath()
  } else if (shape === 'lens') {
    ctx.moveTo(-rx, 0)
    ctx.quadraticCurveTo(0, -ry, rx, 0)
    ctx.quadraticCurveTo(0, ry, -rx, 0)
    ctx.closePath()
  } else if (shape === 'capsule') {
    const r = Math.min(rx, ry)
    ctx.roundRect(-rx, -ry, rx * 2, ry * 2, r)
  } else if (shape === 'flowerCore') {
    const petals = 5
    for (let i = 0; i < petals; i += 1) {
      const a = (i / petals) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * rx * 0.36
      const py = Math.sin(a) * ry * 0.36
      ctx.moveTo(px + rx * 0.38, py)
      ctx.ellipse(px, py, rx * 0.42, ry * 0.42, a, 0, Math.PI * 2)
    }
  } else {
    // core
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  }
  ctx.restore()
}

function fillPupilShape(ctx: CanvasRenderingContext2D, shape: PupilShape, cx: number, cy: number, rx: number, ry: number, rotation: number) {
  shapePath(ctx, shape, cx, cy, rx, ry, rotation)
  ctx.fill()
}


export function compositeEyeDesign(
  target: CanvasRenderingContext2D,
  mask: EyeMask,
  design: EyeDesignV6,
  width: number,
  height: number,
  mirrorX = false,
  overlayImage: HTMLImageElement | null = null,
) {
  const designCanvas = document.createElement('canvas')
  designCanvas.width = Math.max(1, Math.ceil(width))
  designCanvas.height = Math.max(1, Math.ceil(height))
  const ctx = designCanvas.getContext('2d')
  if (!ctx) return

  renderEyeCore(ctx, mask, design, mirrorX, overlayImage)

  const feather = Math.max(0, mask.feather)
  if (feather > 0.01) {
    const hardMask = document.createElement('canvas')
    hardMask.width = designCanvas.width
    hardMask.height = designCanvas.height
    const hardCtx = hardMask.getContext('2d')
    if (hardCtx) {
      hardCtx.fillStyle = '#ffffff'
      traceMaskPath(hardCtx, mask)
      hardCtx.fill()
      const softMask = document.createElement('canvas')
      softMask.width = designCanvas.width
      softMask.height = designCanvas.height
      const softCtx = softMask.getContext('2d')
      if (softCtx) {
        softCtx.filter = `blur(${Math.max(0.5, feather)}px)`
        softCtx.drawImage(hardMask, 0, 0)
        softCtx.filter = 'none'
        softCtx.globalCompositeOperation = 'destination-in'
        softCtx.drawImage(hardMask, 0, 0)
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(softMask, 0, 0)
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  }

  target.drawImage(designCanvas, 0, 0)
}

export function renderEyeCore(
  ctx: CanvasRenderingContext2D,
  mask: EyeMask,
  design: EyeDesignV6,
  mirrorX = false,
  overlayImage: HTMLImageElement | null = null,
) {
  const bounds = getMaskBounds(mask)
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  const basis = Math.max(1, Math.min(rx, ry))

  ctx.save()
  traceMaskPath(ctx, mask)
  ctx.clip()

  if (design.background.enabled) drawBackground(ctx, bounds, design)
  if (design.irisTexture.enabled) drawIrisTexture(ctx, bounds, design, mirrorX)
  if (design.upperShadow.enabled) drawUpperShadow(ctx, bounds, design, mirrorX)
  if (design.reflection.enabled) drawReflection(ctx, bounds, design, mirrorX)
  if (design.symbol.enabled) drawSymbol(ctx, bounds, design, mirrorX)
  if (design.overlayPreset.enabled) drawOverlayPreset(ctx, bounds, design, mirrorX)
  if (design.lowerPoint.enabled) drawLowerPoints(ctx, bounds, design, mirrorX)
  if (design.handDrawnTexture.enabled) drawHandDrawnTexture(ctx, bounds, design)
  if (design.overlayImage.enabled && overlayImage) drawOverlayImage(ctx, bounds, design.overlayImage, overlayImage, mirrorX)

  if (design.ring.enabled) {
    ctx.save()
    ctx.globalAlpha = design.ring.opacity
    ctx.strokeStyle = design.ring.color
    ctx.lineWidth = Math.max(1, basis * design.ring.thickness)
    if (design.ring.softness > 0) ctx.filter = `blur(${design.ring.softness * basis * 0.45}px)`
    traceMaskPath(ctx, mask)
    ctx.stroke()
    ctx.restore()
  }

  if (design.pupil.enabled) drawPupil(ctx, bounds, design, mirrorX)

  ctx.restore()
}

function drawBackground(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6) {
  const bg = design.background
  ctx.save()
  ctx.globalAlpha = bg.opacity
  ctx.filter = `contrast(${bg.contrast})`
  const gradient = ctx.createLinearGradient(bounds.cx, bounds.minY, bounds.cx, bounds.maxY)
  gradient.addColorStop(0, bg.topColor)
  gradient.addColorStop(0.24, bg.upperMidColor)
  gradient.addColorStop(0.5, bg.midColor)
  gradient.addColorStop(0.77, bg.lowerMidColor)
  gradient.addColorStop(1, bg.bottomColor)
  ctx.fillStyle = gradient
  ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height)

  if (bg.softness > 0) {
    const glowY = bounds.minY + bounds.height * 0.8
    const glow = ctx.createRadialGradient(bounds.cx, glowY, 0, bounds.cx, glowY, Math.max(bounds.width, bounds.height) * 0.58)
    glow.addColorStop(0, `rgba(255,235,245,${0.12 * bg.softness})`)
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height)
  }
  ctx.restore()
}

function drawPupil(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6, mirrorX: boolean) {
  const p = design.pupil
  const x = bounds.minX + bounds.width * mappedX(p.x, mirrorX)
  const y = bounds.minY + bounds.height * p.y
  let sx = p.scaleX
  let sy = p.scaleY
  if (p.shape === 'circle') sy = sx
  if (p.shape === 'ovalHorizontal') { sx = Math.max(sx, sy); sy = Math.min(sx * 0.66, sy) }
  if (p.shape === 'ovalVertical') sy = Math.max(sy, sx * 1.25)
  const prx = bounds.width * sx * 0.5
  const pry = bounds.height * sy * 0.5
  const rotation = mirrorX ? -p.rotation : p.rotation

  ctx.save()
  ctx.globalAlpha = p.opacity
  if (p.blur > 0) ctx.filter = `blur(${p.blur * Math.min(bounds.width, bounds.height)}px)`
  const grad = ctx.createLinearGradient(x, y - pry, x, y + pry)
  grad.addColorStop(0, p.topColor)
  grad.addColorStop(0.5, p.midColor)
  grad.addColorStop(1, p.bottomColor)
  ctx.fillStyle = grad
  fillPupilShape(ctx, p.shape, x, y, prx, pry, rotation)


  if (p.gradientStrength > 0) {
    const depth = ctx.createRadialGradient(x, y + pry * 0.16, 0, x, y, Math.max(prx, pry))
    depth.addColorStop(0, `rgba(232,184,225,${0.14 * p.gradientStrength})`)
    depth.addColorStop(0.5, 'rgba(255,255,255,0)')
    depth.addColorStop(1, `rgba(10,8,18,${0.22 * p.gradientStrength})`)
    ctx.fillStyle = depth
    fillPupilShape(ctx, p.shape, x, y, prx, pry, rotation)
  }

  if (p.shape === 'core') {
    ctx.fillStyle = hexToRgba(p.topColor, Math.min(1, 0.75))
    ellipsePath(ctx, x, y, prx * 0.42, pry * 0.46)
    ctx.fill()
    const inner = ctx.createLinearGradient(x, y - pry * 0.3, x, y + pry * 0.3)
    inner.addColorStop(0, hexToRgba(p.midColor, 0.7))
    inner.addColorStop(1, hexToRgba(p.bottomColor, 0.7))
    ctx.fillStyle = inner
    ellipsePath(ctx, x, y, prx * 0.28, pry * 0.3)
    ctx.fill()
  }
  ctx.restore()
}

function drawUpperShadow(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6, mirrorX: boolean) {
  const s = design.upperShadow
  const basis = Math.min(bounds.width, bounds.height)
  const centerX = bounds.minX + bounds.width * mappedX(s.x, mirrorX)
  const centerY = bounds.minY + bounds.height * s.y
  const w = bounds.width * s.scaleX
  const h = bounds.height * s.scaleY
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(mirrorX ? -s.rotation : s.rotation)
  ctx.globalAlpha = s.opacity
  if (s.blur > 0) ctx.filter = `blur(${s.blur * basis}px)`

  const isLash = ['lashShadow','splitLash','handdrawnShadow','shortLash','longLash'].includes(s.type)
  if (isLash) {
    const count = Math.max(3, Math.round(s.lashCount))
    ctx.strokeStyle = s.color
    ctx.lineCap = 'round'
    const lenMul = s.type === 'shortLash' ? 0.65 : s.type === 'longLash' ? 1.38 : 1
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      const offset = (t - 0.5) * bounds.width * s.lashSpread
      const wave = Math.sin(i * 2.17 + 0.8) * basis * 0.018 * (0.4 + s.handDrawnAmount)
      const len = basis * s.lashLength * lenMul * (0.72 + 0.32 * Math.sin(i * 1.53 + 1.1))
      ctx.lineWidth = Math.max(0.8, basis * (s.type === 'handdrawnShadow' ? 0.02 : 0.014) * (0.85 + (i % 3) * 0.08))
      ctx.globalAlpha = s.opacity * (0.62 + 0.26 * Math.sin(i * 1.7 + 1.4))
      ctx.beginPath()
      ctx.moveTo(offset, -basis * 0.035)
      ctx.quadraticCurveTo(offset + wave, len * 0.28, offset + (t - 0.5) * basis * 0.085, len)
      ctx.stroke()
      if (s.type === 'splitLash' && i % 2 === 0) {
        ctx.beginPath(); ctx.moveTo(offset, basis * 0.015); ctx.lineTo(offset - basis * 0.045, len * 0.72); ctx.stroke()
      }
    }
    ctx.globalAlpha = s.opacity
  }

  const grad = ctx.createLinearGradient(0, -h * 0.62, 0, h * 0.62)
  const peak = ['deepShadow','animeTop','centerShadow','wingShadow'].includes(s.type) ? s.intensity : s.intensity * 0.72
  grad.addColorStop(0, hexToRgba(s.color, peak))
  grad.addColorStop(0.45, hexToRgba(s.color, peak * 0.48))
  grad.addColorStop(1, hexToRgba(s.color, 0))
  ctx.fillStyle = grad

  if (s.type === 'animeTop' || s.type === 'thinAnime') {
    const thin = s.type === 'thinAnime' ? 0.38 : 0.75
    ctx.beginPath(); ctx.moveTo(-w * 0.52, -h * 0.32); ctx.quadraticCurveTo(0, h * 0.06 * thin, w * 0.52, -h * 0.32); ctx.lineTo(w * 0.52, -h); ctx.lineTo(-w * 0.52, -h); ctx.closePath(); ctx.fill()
  } else if (s.type === 'jellyDark' || s.type === 'roundLid') {
    ellipsePath(ctx, 0, s.type === 'roundLid' ? -h * 0.1 : 0, w * 0.52, h * (s.type === 'roundLid' ? 0.58 : 0.72)); ctx.fill()
  } else if (s.type === 'centerShadow') {
    const g = ctx.createRadialGradient(0, -h * 0.05, 0, 0, -h * 0.05, w * 0.48)
    g.addColorStop(0, hexToRgba(s.color, peak)); g.addColorStop(1, hexToRgba(s.color, 0)); ctx.fillStyle = g; ctx.fillRect(-w/2,-h,w,h*1.4)
  } else if (s.type === 'wingShadow') {
    ctx.beginPath(); ctx.moveTo(-w * 0.55, -h * 0.25); ctx.quadraticCurveTo(-w * 0.2, h * 0.18, 0, h * 0.05); ctx.quadraticCurveTo(w * 0.2, h * 0.18, w * 0.55, -h * 0.25); ctx.lineTo(w * 0.55,-h); ctx.lineTo(-w*0.55,-h); ctx.closePath(); ctx.fill()
  } else {
    ctx.fillRect(-w * 0.5, -h * 0.68, w, h)
  }
  ctx.restore()
}

function drawReflection(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6, mirrorX: boolean) {
  const r = design.reflection
  const rand = mulberry32(r.seed)
  const basis = Math.min(bounds.width, bounds.height)
  const x = bounds.minX + bounds.width * mappedX(r.x, mirrorX)
  const y = bounds.minY + bounds.height * r.y
  const rx = bounds.width * r.scaleX * 0.5
  const ry = bounds.height * r.scaleY * 0.5
  ctx.save(); ctx.translate(x, y); ctx.rotate(mirrorX ? -r.rotation : r.rotation); ctx.globalAlpha = r.opacity
  if (r.blur > 0) ctx.filter = `blur(${r.blur * basis}px)`
  if (r.bloom > 0) { ctx.shadowColor = r.color; ctx.shadowBlur = basis * r.bloom }

  const radial = (strength = 0.75, cx=0, cy=0, sx=1, sy=1) => {
    ctx.save(); ctx.scale(sx,sy)
    const maxR=Math.max(rx,ry); const g=ctx.createRadialGradient(cx,cy,0,cx,cy,maxR)
    g.addColorStop(0,hexToRgba(r.color,strength)); g.addColorStop(0.48,hexToRgba(r.secondaryColor,strength*0.34)); g.addColorStop(1,hexToRgba(r.color,0))
    ctx.fillStyle=g; ellipsePath(ctx,cx,cy,rx,ry); ctx.fill(); ctx.restore()
  }
  const dot = (dx:number,dy:number,size:number,color:string,alpha:number) => { ctx.save(); ctx.globalAlpha=r.opacity*alpha; ctx.fillStyle=color; ellipsePath(ctx,dx,dy,size,size*(0.8+rand()*0.35)); ctx.fill(); ctx.restore() }
  const star = (dx:number,dy:number,size:number,color:string,alpha:number) => { ctx.save(); ctx.translate(dx,dy); ctx.globalAlpha=r.opacity*alpha; ctx.strokeStyle=color; ctx.lineCap='round'; ctx.lineWidth=Math.max(.7,size*.16); ctx.beginPath(); ctx.moveTo(-size,0); ctx.lineTo(size,0); ctx.moveTo(0,-size); ctx.lineTo(0,size); ctx.moveTo(-size*.55,-size*.55); ctx.lineTo(size*.55,size*.55); ctx.moveTo(size*.55,-size*.55); ctx.lineTo(-size*.55,size*.55); ctx.stroke(); ctx.restore() }

  if (['purpleGlow','blueGlass','mist','pinkGloss','cyanGloss'].includes(r.type)) {
    radial(r.type==='mist'?0.45:0.68)
  } else if (r.type === 'topLens' || r.type === 'film') {
    const g=ctx.createLinearGradient(0,-ry,0,ry); g.addColorStop(0,hexToRgba(r.color,r.type==='film'?0.42:0.62)); g.addColorStop(.55,hexToRgba(r.secondaryColor,.18)); g.addColorStop(1,hexToRgba(r.color,0)); ctx.fillStyle=g
    ctx.beginPath(); ctx.moveTo(-rx,0); ctx.quadraticCurveTo(0,-ry*1.5,rx,0); ctx.quadraticCurveTo(0,-ry*.38,-rx,0); ctx.fill()
  } else if (r.type === 'sideThin') {
    const g=ctx.createLinearGradient(-rx,0,rx,0); g.addColorStop(0,hexToRgba(r.color,.72)); g.addColorStop(.42,hexToRgba(r.secondaryColor,.22)); g.addColorStop(1,hexToRgba(r.color,0)); ctx.fillStyle=g; ellipsePath(ctx,0,0,rx,ry); ctx.fill()
  } else if (['curvedBand','complex','handdrawn','dotBand'].includes(r.type)) {
    const bands=r.type==='complex'?2:1
    for(let b=0;b<bands;b++){ ctx.strokeStyle=b? r.secondaryColor:r.color; ctx.lineWidth=Math.max(1,basis*(.022+b*.012)); ctx.lineCap='round'; ctx.globalAlpha=r.opacity*(.68-b*.18); ctx.beginPath(); const wob=(rand()-.5)*basis*.08*r.handDrawnAmount; ctx.moveTo(-rx*.82,ry*(.08+b*.2)); ctx.bezierCurveTo(-rx*.34+wob,-ry*.76,rx*.24-wob,-ry*.68,rx*.82,-ry*.12); ctx.stroke() }
    if(r.type==='dotBand'){ for(let i=0;i<5;i++) dot((-0.42+i*.2)*rx,ry*(.02+rand()*.24),basis*(.018+rand()*.014),i%2?r.secondaryColor:r.color,.55+rand()*.3) }
  } else if (r.type === 'doubleReflection') {
    radial(.52,-rx*.2,-ry*.12,.9,.9); ctx.globalAlpha=r.opacity*.7; radial(.36,rx*.35,ry*.22,.55,.55)
  } else if (r.type === 'dotCluster') {
    for(let i=0;i<7;i++) dot((rand()-.5)*rx*1.2,(rand()-.5)*ry*1.1,basis*(.018+rand()*.026),i%2?r.secondaryColor:r.color,.45+rand()*.45)
  } else if (r.type === 'dropletReflection') {
    for(let i=0;i<4;i++){ const dx=(rand()-.5)*rx*1.25, dy=(rand()-.5)*ry*.9, size=basis*(.025+rand()*.025); ctx.fillStyle=i%2?r.secondaryColor:r.color; ctx.beginPath(); ctx.moveTo(dx,dy-size*1.3); ctx.bezierCurveTo(dx+size,dy-size*.2,dx+size*.7,dy+size,dx,dy+size); ctx.bezierCurveTo(dx-size*.7,dy+size,dx-size,dy-size*.2,dx,dy-size*1.3); ctx.fill() }
  } else if (r.type === 'lowerGlowReflection') {
    const g=ctx.createRadialGradient(0,ry*.25,0,0,ry*.25,Math.max(rx,ry)); g.addColorStop(0,hexToRgba(r.color,.62)); g.addColorStop(.4,hexToRgba(r.secondaryColor,.25)); g.addColorStop(1,hexToRgba(r.color,0)); ctx.fillStyle=g; ellipsePath(ctx,0,ry*.15,rx,ry); ctx.fill()
  } else if (r.type === 'starSparkle') {
    star(-rx*.28,-ry*.12,basis*.07,r.color,.82); star(rx*.26,ry*.18,basis*.045,r.secondaryColor,.7); dot(rx*.05,-ry*.35,basis*.018,r.secondaryColor,.6)
  } else if (r.type === 'cloudTop') {
    for(let i=0;i<5;i++) radial(.34,(i-2)*rx*.18,(rand()-.5)*ry*.18,.36,.32)
  } else if (r.type === 'colorPoint') {
    for(let i=0;i<6;i++) dot((rand()-.5)*rx*1.4,(rand()-.5)*ry*1.2,basis*(.012+rand()*.024),i%2?r.secondaryColor:r.color,.5+rand()*.35)
  }
  ctx.restore()
}

function drawLowerPoints(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6, mirrorX: boolean) {
  const m=design.lowerPoint; const rand=mulberry32(m.seed); const basis=Math.min(bounds.width,bounds.height)
  const centerX=bounds.minX+bounds.width*mappedX(m.x,mirrorX); const baseY=bounds.minY+bounds.height*m.y; const count=Math.max(1,Math.round(m.count))
  ctx.save(); ctx.translate(centerX,baseY); ctx.rotate(mirrorX?-m.rotation:m.rotation); ctx.globalAlpha=m.opacity
  if(m.blur>0) ctx.filter=`blur(${m.blur*basis}px)`; if(m.glow>0){ctx.shadowColor=m.color;ctx.shadowBlur=basis*m.glow}
  const organic=(v:number,amount=.2)=>v*(1+(rand()-.5)*amount*m.handDrawnAmount)
  const miniStar=(x:number,y:number,s:number,color:string)=>{ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=Math.max(.7,s*.16);ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.moveTo(0,-s);ctx.lineTo(0,s);ctx.stroke();ctx.restore()}

  if(m.type==='wave'){
    ctx.strokeStyle=m.color;ctx.lineWidth=Math.max(1,basis*m.size*.18*m.scale);ctx.lineCap='round';ctx.beginPath()
    for(let i=0;i<=count*3;i++){const t=i/(count*3),x=(t-.5)*bounds.width*m.spread,y=Math.sin(t*Math.PI*2.6)*basis*m.size*.16+(rand()-.5)*basis*.018*m.handDrawnAmount;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.restore();return
  }
  if(m.type==='warmGlow'){
    const g=ctx.createRadialGradient(0,0,0,0,0,bounds.width*m.spread*.48);g.addColorStop(0,hexToRgba(m.secondaryColor,.48));g.addColorStop(.42,hexToRgba(m.color,.26));g.addColorStop(1,hexToRgba(m.color,0));ctx.fillStyle=g;ctx.fillRect(-bounds.width*.45,-basis*.22,bounds.width*.9,basis*.5);ctx.restore();return
  }

  for(let i=0;i<count;i++){
    const t=count===1?.5:i/(count-1), centered=(t-.5)*2, size=basis*m.size*m.scale*(1+(rand()-.5)*m.sizeJitter)*(.72+(1-Math.abs(centered))*.3)
    const x=centered*bounds.width*m.spread*.5+(rand()-.5)*basis*.04*m.handDrawnAmount, y=(1-centered*centered)*basis*.065+(rand()-.5)*basis*.034*m.handDrawnAmount
    const rot=centered*.42+(rand()-.5)*m.handDrawnAmount*.45
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=m.opacity*(.76+rand()*.24);ctx.fillStyle=i%3===0?m.secondaryColor:m.color;ctx.strokeStyle=ctx.fillStyle as string
    if(m.type==='petal'){ctx.beginPath();ctx.moveTo(0,-organic(size));ctx.quadraticCurveTo(organic(size*.66),-size*.2,0,organic(size));ctx.quadraticCurveTo(-organic(size*.66),-size*.2,0,-organic(size));ctx.fill()}
    else if(m.type==='droplet'){ctx.beginPath();ctx.moveTo(0,-size);ctx.bezierCurveTo(size*.68,-size*.08,size*.54,size*.72,0,size);ctx.bezierCurveTo(-size*.54,size*.72,-size*.68,-size*.08,0,-size);ctx.fill()}
    else if(['glass','crystal','rainbowShard'].includes(m.type)){ctx.beginPath();ctx.moveTo(-size*.55,size*.32);ctx.lineTo(-size*(.08+rand()*.12),-size);ctx.lineTo(size*(.48+rand()*.2),-size*.12);ctx.lineTo(size*.28,size*.78);ctx.closePath();ctx.fill(); if(m.type==='rainbowShard'){ctx.globalAlpha*=.5;ctx.fillStyle=i%2?'#aeefff':'#f3b9dd';ctx.fill()}}
    else if(m.type==='reflection'){const g=ctx.createLinearGradient(0,-size,0,size);g.addColorStop(0,hexToRgba(m.color,.62));g.addColorStop(1,hexToRgba(m.secondaryColor,.12));ctx.fillStyle=g;ellipsePath(ctx,0,0,size*.24,size);ctx.fill()}
    else if(m.type==='ovalCluster'){ellipsePath(ctx,0,0,size*.38,size*.72,rot);ctx.fill()}
    else if(m.type==='stippling'){ellipsePath(ctx,0,0,size*(.16+rand()*.26),size*(.14+rand()*.28));ctx.fill()}
    else if(m.type==='curve'||m.type==='handdrawn'||m.type==='brushStroke'){ctx.lineWidth=Math.max(1,size*(m.type==='brushStroke'?.28:.18));ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-size*.56,size*.1);ctx.quadraticCurveTo((rand()-.5)*size*.2,-size*(.5+rand()*.28),size*.56,size*.08);ctx.stroke()}
    else if(m.type==='crescent'){ctx.beginPath();ctx.arc(0,0,size*.7,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(size*.28,-size*.08,size*.65,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over'}
    else if(m.type==='sparkDust'){if(i%3===0)miniStar(0,0,size*.5,ctx.strokeStyle as string);else{ellipsePath(ctx,0,0,size*.22,size*.22);ctx.fill()}}
    else {ellipsePath(ctx,-size*.24,0,size*.28,size*.28);ctx.fill();ellipsePath(ctx,size*.42,size*.08,size*.14,size*.14);ctx.fill();ctx.lineWidth=Math.max(1,size*.12);ctx.beginPath();ctx.moveTo(-size*.05,-size*.52);ctx.lineTo(size*.15,-size*.18);ctx.stroke()}
    ctx.restore()
  }
  ctx.restore()
}

function drawIrisTexture(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6, mirrorX: boolean) {
  const t=design.irisTexture; const rand=mulberry32(t.seed); const basis=Math.min(bounds.width,bounds.height); const cx=bounds.cx, cy=bounds.cy; const density=Math.max(5,Math.round(t.density))
  ctx.save();ctx.globalAlpha=t.opacity;ctx.strokeStyle=t.color;ctx.fillStyle=t.color;ctx.lineCap='round'
  if(t.type==='ripple'||t.type==='ringLines'){
    ctx.lineWidth=Math.max(.6,basis*t.width); const loops=Math.max(3,Math.round(density/5)); for(let i=0;i<loops;i++){const radius=lerp(.2,.92,(i+1)/(loops+1));ctx.globalAlpha=t.opacity*(.22+rand()*.28);ctx.strokeStyle=i%3===0?t.secondaryColor:t.color;ellipsePath(ctx,cx,cy+basis*.06,bounds.width*.5*radius,bounds.height*.5*radius);ctx.stroke()}
  } else if(t.type==='speckle'||t.type==='unevenNoise'){
    for(let i=0;i<density;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.9,x=cx+Math.cos(a)*bounds.width*.46*r,y=cy+Math.sin(a)*bounds.height*.46*r,size=basis*(.004+rand()*(t.type==='unevenNoise'?.02:.012));ctx.globalAlpha=t.opacity*(.18+rand()*.6);ctx.fillStyle=rand()>.55?t.secondaryColor:t.color;ellipsePath(ctx,x,y,size,size*(.5+rand()*.8),(rand()-.5));ctx.fill()}
  } else if(['fogTexture','watercolor','glassTexture','lowerGlowTexture'].includes(t.type)){
    const blobs=t.type==='watercolor'?10:t.type==='glassTexture'?7:6; for(let i=0;i<blobs;i++){const bx=cx+(rand()-.5)*bounds.width*.65, by=t.type==='lowerGlowTexture'?bounds.minY+bounds.height*(.65+rand()*.25):cy+(rand()-.5)*bounds.height*.55, rr=basis*(.08+rand()*.18);const g=ctx.createRadialGradient(bx,by,0,bx,by,rr);g.addColorStop(0,hexToRgba(i%2?t.secondaryColor:t.color,t.type==='glassTexture'?.32:.24));g.addColorStop(1,hexToRgba(t.color,0));ctx.fillStyle=g;ctx.fillRect(bx-rr,by-rr,rr*2,rr*2)}
  } else if(t.type==='softBrush'||t.type==='brushStroke'||t.type==='pencil'){
    const lines=Math.max(8,Math.round(density*.65)); for(let i=0;i<lines;i++){const y=cy+(i/(lines-1)-.5)*bounds.height*.72+(rand()-.5)*basis*.04;ctx.globalAlpha=t.opacity*(.2+rand()*.42);ctx.strokeStyle=i%4===0?t.secondaryColor:t.color;ctx.lineWidth=Math.max(.5,basis*t.width*(t.type==='brushStroke'?1.8:.8));ctx.beginPath();ctx.moveTo(bounds.minX+bounds.width*.16,y);ctx.bezierCurveTo(cx-basis*.15,y+(rand()-.5)*basis*.12,cx+basis*.18,y+(rand()-.5)*basis*.12,bounds.maxX-bounds.width*.16,y+(rand()-.5)*basis*.04);ctx.stroke()}
  } else {
    for(let i=0;i<density;i++){const base=(i/density)*Math.PI*2+(mirrorX?-t.rotation:t.rotation), angle=base+(rand()-.5)*t.randomness*(.3+t.handDrawnAmount*.45), inner=.2+rand()*.12, outer=Math.min(.96,inner+t.length*(.54+rand()*.34));const x1=cx+Math.cos(angle)*bounds.width*.5*inner,y1=cy+Math.sin(angle)*bounds.height*.5*inner,x2=cx+Math.cos(angle)*bounds.width*.5*outer,y2=cy+Math.sin(angle)*bounds.height*.5*outer,wob=(rand()-.5)*basis*.07*t.handDrawnAmount;ctx.strokeStyle=rand()>.72?t.secondaryColor:t.color;ctx.globalAlpha=t.opacity*(.28+rand()*.6);ctx.lineWidth=Math.max(.45,basis*t.width*(.5+rand()*.82));ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo((x1+x2)*.5-Math.sin(angle)*wob,(y1+y2)*.5+Math.cos(angle)*wob,x2,y2);ctx.stroke()}
  }
  ctx.restore()
}

function drawSymbol(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6, mirrorX: boolean) {
  const s=design.symbol; const rand=mulberry32(s.seed); const basis=Math.min(bounds.width,bounds.height)
  const x=bounds.minX+bounds.width*mappedX(s.x,mirrorX), y=bounds.minY+bounds.height*s.y, size=basis*s.scale
  ctx.save();ctx.translate(x,y);ctx.rotate(mirrorX?-s.rotation:s.rotation);ctx.globalAlpha=s.opacity;if(s.blur>0)ctx.filter=`blur(${s.blur*basis}px)`;ctx.fillStyle=s.color;ctx.strokeStyle=s.color;ctx.lineCap='round';ctx.lineJoin='round'
  const jitter=()=> (rand()-.5)*size*.12*s.handDrawnAmount
  const heart=(ox=0,oy=0,k=1,color=s.color)=>{ctx.save();ctx.translate(ox,oy);ctx.scale(k,k);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,size*.72);ctx.bezierCurveTo(size*.9,size*.2,size*.82,-size*.58,0,-size*.14);ctx.bezierCurveTo(-size*.82,-size*.58,-size*.9,size*.2,0,size*.72);ctx.closePath();ctx.fill();ctx.restore()}
  const star=(ox=0,oy=0,k=1,color=s.color)=>{ctx.save();ctx.translate(ox,oy);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=(i%2===0?size:size*.42)*k+(i%2===0?jitter():jitter()*.4);const px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.closePath();ctx.fill();ctx.restore()}
  const dot=(ox:number,oy:number,k:number,color=s.color)=>{ctx.fillStyle=color;ellipsePath(ctx,ox,oy,size*k,size*k*(.82+rand()*.28));ctx.fill()}
  const crescent=(ox=0,oy=0,k=1,color=s.color)=>{ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.arc(ox,oy,size*k,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(ox+size*k*.38,oy-size*k*.08,size*k*.88,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.restore()}
  const flower=(ox=0,oy=0,k=1,color=s.color)=>{ctx.save();ctx.translate(ox,oy);ctx.fillStyle=color;for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*Math.PI*2/5+jitter()*.01);ellipsePath(ctx,0,-size*.46*k,size*.28*k,size*.48*k);ctx.fill();ctx.restore()}dot(0,0,.18*k,s.secondaryColor);ctx.restore()}
  if(s.type==='heart') heart()
  else if(s.type==='doubleHeart'){heart(-size*.32,size*.15,.72);heart(size*.36,-size*.22,.48,s.secondaryColor)}
  else if(s.type==='crescent') crescent()
  else if(s.type==='star') star()
  else if(s.type==='crossSpark'){ctx.lineWidth=Math.max(.8,size*.1);ctx.strokeStyle=s.color;ctx.beginPath();ctx.moveTo(-size,0);ctx.lineTo(size,0);ctx.moveTo(0,-size);ctx.lineTo(0,size);ctx.moveTo(-size*.55,-size*.55);ctx.lineTo(size*.55,size*.55);ctx.moveTo(size*.55,-size*.55);ctx.lineTo(-size*.55,size*.55);ctx.stroke()}
  else if(s.type==='flower') flower()
  else if(s.type==='clover'){for(let i=0;i<4;i++){const a=i*Math.PI/2;dot(Math.cos(a)*size*.35,Math.sin(a)*size*.35,.42,i%2?s.secondaryColor:s.color)}dot(0,0,.18,s.color)}
  else if(s.type==='droplet'){ctx.beginPath();ctx.moveTo(0,-size);ctx.bezierCurveTo(size*.76,-size*.05,size*.62,size*.72,0,size);ctx.bezierCurveTo(-size*.62,size*.72,-size*.76,-size*.05,0,-size);ctx.fill()}
  else if(s.type==='diamond'){ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.72,0);ctx.lineTo(0,size);ctx.lineTo(-size*.72,0);ctx.closePath();ctx.fill()}
  else if(s.type==='threeDots'){dot(-size*.62,0,.28);dot(0,-size*.12,.38,s.secondaryColor);dot(size*.58,size*.1,.22)}
  else if(s.type==='heartMoon'){heart(-size*.35,size*.1,.62);crescent(size*.42,-size*.16,.54,s.secondaryColor)}
  else if(s.type==='starDots'){star(-size*.15,-size*.08,.62);dot(size*.6,-size*.25,.18,s.secondaryColor);dot(size*.44,size*.42,.12)}
  else if(s.type==='flowerDots'){flower(-size*.08,0,.6);dot(size*.64,-size*.2,.15,s.secondaryColor);dot(size*.5,size*.42,.11)}
  else if(s.type==='colorDots'){dot(-size*.52,-size*.18,.22,s.color);dot(0,size*.12,.28,s.secondaryColor);dot(size*.56,-size*.05,.16,'#e8c36c')}
  else {heart(-size*.46,-size*.08,.42);crescent(size*.1,size*.16,.4,s.secondaryColor);star(size*.55,-size*.28,.32,'#e8c7df');dot(size*.62,size*.42,.12,s.secondaryColor)}
  ctx.restore()
}

function drawOverlayPreset(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6, mirrorX: boolean) {
  const o = design.overlayPreset
  const rand = mulberry32(o.seed)
  const basis = Math.min(bounds.width, bounds.height)
  const x = bounds.minX + bounds.width * mappedX(o.x, mirrorX)
  const y = bounds.minY + bounds.height * o.y
  const w = bounds.width * o.scaleX
  const h = bounds.height * o.scaleY
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(mirrorX ? -o.rotation : o.rotation)
  ctx.globalAlpha = o.opacity
  if (o.blur > 0) ctx.filter = `blur(${o.blur * basis}px)`
  ctx.strokeStyle = o.color
  ctx.fillStyle = o.color
  ctx.lineCap = 'round'

  if (o.type === 'fog' || o.type === 'cloud') {
    for (let i = 0; i < 6; i += 1) {
      const ox = (rand() - 0.5) * w * 0.7
      const oy = (rand() - 0.5) * h * 0.35
      const r = basis * (0.08 + rand() * 0.12)
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r)
      g.addColorStop(0, hexToRgba(i % 2 ? o.secondaryColor : o.color, 0.55))
      g.addColorStop(1, hexToRgba(o.color, 0))
      ctx.fillStyle = g
      ctx.fillRect(ox - r, oy - r, r * 2, r * 2)
    }
  } else if (o.type === 'glassVein' || o.type === 'fragments') {
    ctx.lineWidth = Math.max(0.8, basis * 0.012)
    for (let i = 0; i < 7; i += 1) {
      const sx = (rand() - 0.5) * w * 0.65
      const sy = (rand() - 0.5) * h * 0.55
      ctx.strokeStyle = i % 2 ? o.secondaryColor : o.color
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (rand() - 0.5) * basis * 0.25, sy - basis * (0.08 + rand() * 0.16)); ctx.lineTo(sx + (rand() - 0.5) * basis * 0.32, sy + basis * (0.06 + rand() * 0.14)); ctx.stroke()
    }
  } else if (o.type === 'flower') {
    for (let i = 0; i < 5; i += 1) {
      ctx.save(); ctx.rotate((i / 5) * Math.PI * 2); ctx.fillStyle = i % 2 ? o.secondaryColor : o.color; ellipsePath(ctx, 0, -h * 0.16, w * 0.07, h * 0.17); ctx.fill(); ctx.restore()
    }
  } else if (o.type === 'starMist') {
    for (let i = 0; i < 14; i += 1) {
      const sx = (rand() - 0.5) * w * 0.75
      const sy = (rand() - 0.5) * h * 0.7
      const s = basis * (0.012 + rand() * 0.028)
      ctx.strokeStyle = rand() > 0.5 ? o.color : o.secondaryColor
      ctx.lineWidth = Math.max(0.7, s * 0.25)
      ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke()
    }
  } else if (o.type === 'ripple') {
    ctx.lineWidth = Math.max(0.8, basis * 0.01)
    for (let i = 0; i < 4; i += 1) {
      ctx.globalAlpha = o.opacity * (0.35 + i * 0.08)
      ctx.strokeStyle = i % 2 ? o.secondaryColor : o.color
      ellipsePath(ctx, 0, 0, w * (0.16 + i * 0.09), h * (0.08 + i * 0.055))
      ctx.stroke()
    }
  } else {
    ctx.lineWidth = Math.max(1, basis * (o.type === 'handBrush' ? 0.045 : 0.025))
    for (let i = 0; i < 5; i += 1) {
      const sy = (i - 2) * h * 0.09 + (rand() - 0.5) * basis * 0.03 * o.handDrawnAmount
      ctx.strokeStyle = i % 2 ? o.secondaryColor : o.color
      ctx.beginPath()
      ctx.moveTo(-w * 0.36, sy)
      ctx.bezierCurveTo(-w * 0.12, sy - basis * 0.06, w * 0.12, sy + basis * 0.05, w * 0.36, sy - basis * 0.02)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawHandDrawnTexture(ctx: CanvasRenderingContext2D, bounds: ReturnType<typeof getMaskBounds>, design: EyeDesignV6) {
  const h = design.handDrawnTexture
  const rand = mulberry32(h.seed)
  const basis = Math.min(bounds.width, bounds.height)
  const count = Math.round(18 + h.amount * 58)
  ctx.save()
  ctx.globalAlpha = h.opacity
  ctx.strokeStyle = h.color
  ctx.fillStyle = h.color
  for (let i = 0; i < count; i += 1) {
    const x = bounds.minX + rand() * bounds.width
    const y = bounds.minY + rand() * bounds.height
    const size = basis * h.grainSize * (0.3 + rand() * 1.2)
    if (rand() > 0.45) {
      ctx.globalAlpha = h.opacity * (0.25 + rand() * 0.55)
      ellipsePath(ctx, x, y, size, size * (0.45 + rand() * 0.8), (rand() - 0.5) * 1.2)
      ctx.fill()
    } else {
      ctx.globalAlpha = h.opacity * (0.2 + rand() * 0.5)
      ctx.lineWidth = Math.max(0.5, size * 0.28)
      ctx.beginPath(); ctx.moveTo(x - size, y); ctx.quadraticCurveTo(x, y + (rand() - 0.5) * size, x + size, y + (rand() - 0.5) * size); ctx.stroke()
    }
  }
  ctx.restore()
}

function drawOverlayImage(
  ctx: CanvasRenderingContext2D,
  bounds: ReturnType<typeof getMaskBounds>,
  state: OverlayImageState,
  image: HTMLImageElement,
  mirrorX: boolean,
) {
  const basis = Math.min(bounds.width, bounds.height)
  const x = bounds.minX + bounds.width * mappedX(state.x, mirrorX)
  const y = bounds.minY + bounds.height * state.y
  const naturalAspect = image.naturalWidth / Math.max(1, image.naturalHeight)
  const height = basis * state.scale
  const width = height * naturalAspect
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(mirrorX ? -state.rotation : state.rotation)
  const flip = (state.flipX ? -1 : 1) * (mirrorX ? -1 : 1)
  ctx.scale(flip, 1)
  ctx.globalAlpha = state.opacity
  ctx.globalCompositeOperation = state.blendMode
  ctx.drawImage(image, -width / 2, -height / 2, width, height)
  ctx.restore()
}

export function exportFullUvPng(
  originalImage: HTMLImageElement,
  masks: { left: EyeMask; right: EyeMask },
  design: EyeDesignV6,
  overlayImage: HTMLImageElement | null = null,
) {
  const canvas = document.createElement('canvas')
  canvas.width = originalImage.naturalWidth
  canvas.height = originalImage.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('PNG 저장용 Canvas를 만들 수 없습니다.')
  ctx.drawImage(originalImage, 0, 0)
  compositeEyeDesign(ctx, masks.left, design, canvas.width, canvas.height, false, overlayImage)
  compositeEyeDesign(ctx, masks.right, design, canvas.width, canvas.height, true, overlayImage)
  return canvas.toDataURL('image/png')
}

export function exportEyePng(mask: EyeMask, design: EyeDesignV6, overlayImage: HTMLImageElement | null = null, padding = 28) {
  const bounds = getMaskBounds(mask)
  const width = Math.ceil(bounds.width + padding * 2)
  const height = Math.ceil(bounds.height + padding * 2)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('눈동자 저장용 Canvas를 만들 수 없습니다.')
  const localMask = translateMask(mask, padding - bounds.minX, padding - bounds.minY)
  compositeEyeDesign(ctx, localMask, design, width, height, false, overlayImage)
  return canvas.toDataURL('image/png')
}
