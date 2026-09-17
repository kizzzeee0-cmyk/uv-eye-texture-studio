import type { EyeDesignV6 } from './types'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }
export type DesignPatch = DeepPartial<EyeDesignV6>

export const CLEAR_DESIGN: EyeDesignV6 = {
  background: { enabled: false, presetId: null, topColor: '#2d1d45', upperMidColor: '#60406f', midColor: '#a86d9e', lowerMidColor: '#e3a4c9', bottomColor: '#f8dbe9', opacity: 1, contrast: 1, softness: 0.5 },
  ring: { enabled: false, presetId: null, color: '#342140', thickness: 0.035, opacity: 0.45, softness: 0.08 },
  pupil: { enabled: false, presetId: null, shape: 'ovalVertical', x: 0.5, y: 0.47, scaleX: 0.22, scaleY: 0.3, rotation: 0, topColor: '#24162b', midColor: '#59345f', bottomColor: '#a76591', gradientStrength: 0.82, opacity: 0.9, blur: 0.008, softness: 0.13 },
  lowerPoint: { enabled: false, presetId: null, type: 'petal', x: 0.5, y: 0.74, scale: 1, spread: 0.62, count: 9, size: 0.075, sizeJitter: 0.28, rotation: 0, color: '#f4deeb', secondaryColor: '#c6c7ff', opacity: 0.62, blur: 0.008, glow: 0.06, handDrawnAmount: 0.28, seed: 505 },
  upperShadow: { enabled: false, presetId: null, type: 'softShadow', x: 0.5, y: 0.22, scaleX: 1, scaleY: 0.5, rotation: 0, intensity: 0.7, opacity: 0.7, blur: 0.05, color: '#21182f', lashCount: 5, lashLength: 0.2, lashSpread: 0.7, handDrawnAmount: 0.18 },
  reflection: { enabled: false, presetId: null, type: 'purpleGlow', x: 0.31, y: 0.38, scaleX: 0.52, scaleY: 0.3, rotation: -0.35, color: '#9a89df', secondaryColor: '#7db7ff', opacity: 0.26, blur: 0.06, bloom: 0.08, handDrawnAmount: 0.2, seed: 733 },
  symbol: { enabled: false, presetId: null, type: 'heart', x: 0.67, y: 0.33, scale: 0.1, rotation: 0, color: '#f7dceb', secondaryColor: '#a8d9ff', opacity: 0.74, blur: 0.004, handDrawnAmount: 0.16, seed: 1661 },
  irisTexture: { enabled: false, presetId: null, type: 'softRadial', color: '#dfcdfa', secondaryColor: '#7daee9', opacity: 0.22, density: 34, length: 0.7, width: 0.012, rotation: 0, randomness: 0.24, handDrawnAmount: 0.18, seed: 777 },
  overlayPreset: { enabled: false, presetId: null, type: 'fog', x: 0.5, y: 0.54, scaleX: 0.8, scaleY: 0.5, rotation: 0, color: '#d4c4f2', secondaryColor: '#a6d2ff', opacity: 0.2, blur: 0.04, handDrawnAmount: 0.14, seed: 105 },
  handDrawnTexture: { enabled: false, presetId: null, amount: 0.18, opacity: 0.12, color: '#ffffff', grainSize: 0.025, seed: 909 },
  overlayImage: { enabled: false, src: null, name: null, x: 0.5, y: 0.5, scale: 0.6, rotation: 0, opacity: 0.65, flipX: false, tintColor: null, blendMode: 'source-over' },
}

export function cloneDesign(design: EyeDesignV6): EyeDesignV6 { return JSON.parse(JSON.stringify(design)) as EyeDesignV6 }

export function applyDesignPatch(base: EyeDesignV6, patch: DesignPatch): EyeDesignV6 {
  const next = cloneDesign(base)
  for (const key of Object.keys(patch) as (keyof EyeDesignV6)[]) {
    const incoming = patch[key]
    if (incoming && typeof incoming === 'object') Object.assign(next[key] as object, incoming)
  }
  return next
}

const bg = (id: string, top: string, upper: string, mid: string, lower: string, bottom: string, contrast = 1.02, softness = 0.5): DesignPatch => ({ background: { enabled: true, presetId: id, topColor: top, upperMidColor: upper, midColor: mid, lowerMidColor: lower, bottomColor: bottom, opacity: 1, contrast, softness } })

export const BACKGROUND_PRESETS: Record<string, DesignPatch> = {
  '분홍 보라': bg('분홍 보라','#29182f','#5d315f','#a5558d','#e68ebd','#ffd9eb',1.04),
  '장밋빛 핑크': bg('장밋빛 핑크','#3c1625','#7c304e','#c64f7b','#f38faf','#ffe0e8',1.03),
  '라벤더': bg('라벤더','#26203e','#504a79','#817eb5','#b8b2dc','#efeaff',0.98),
  '몽환 퍼플': bg('몽환 퍼플','#20172f','#49346f','#7b63ae','#b49bd7','#eadfff'),
  '그린 판타지': bg('그린 판타지','#18301d','#365d36','#67956a','#a6ca97','#efffe2'),
  '민트 블루': bg('민트 블루','#12323a','#246170','#4a9aa7','#94d2d3','#e6ffff'),
  '하늘 블루': bg('하늘 블루','#172945','#365f91','#6594c3','#a5cbea','#edf9ff'),
  '푸른 유리': bg('푸른 유리','#101a2d','#264c78','#4f89be','#8fc8e7','#e4f9ff',1.05),
  '딥오션 블루': bg('딥오션 블루','#090f24','#172e59','#2e6498','#6aadd0','#d8f8ff',1.1),
  '아이스 블루': bg('아이스 블루','#1c2b40','#405f7c','#779cb7','#b5d6e5','#f3ffff'),
  '코튼 핑크': bg('코튼 핑크','#553a48','#936b7b','#cfa0b2','#e8c5d2','#fff2f6',0.95,0.7),
  '로즈 와인': bg('로즈 와인','#32141f','#67283d','#a94766','#dd7896','#ffd1dd',1.06),
  '버건디 핑크': bg('버건디 핑크','#2b101c','#601b39','#a62f63','#ed6397','#ffc5dc',1.09),
  '앰버 골드': bg('앰버 골드','#3b250a','#744719','#b2772f','#e7b967','#fff0c5'),
  '허니 브라운': bg('허니 브라운','#342119','#694533','#a46f4a','#d9a978','#f8dfbd',0.98),
  '피치 골드': bg('피치 골드','#3b2721','#754a3d','#ba7960','#efad86','#ffe2bd'),
  '회보라': bg('회보라','#242331','#48465f','#76758e','#aaa7c3','#eeeaf8',0.98),
  '새벽 블루': bg('새벽 블루','#0e1730','#293c69','#596f9e','#929fc1','#d8d9ec',1.03),
  '코랄 핑크': bg('코랄 핑크','#4a252a','#8b474d','#cb716f','#efa6a0','#ffe0d7'),
  '플럼 핑크': bg('플럼 핑크','#30162f','#63305f','#a64f8f','#dc83b5','#ffd5e8',1.05),
}

export const RING_PRESETS: Record<string, DesignPatch> = {
  '얇은 유광 링': { ring: { enabled: true, presetId: '얇은 유광 링', color: '#40304d', thickness: 0.022, opacity: 0.38, softness: 0.12 } },
  '부드러운 외곽 음영': { ring: { enabled: true, presetId: '부드러운 외곽 음영', color: '#21182e', thickness: 0.045, opacity: 0.34, softness: 0.22 } },
  '컬러 외곽': { ring: { enabled: true, presetId: '컬러 외곽', color: '#7664aa', thickness: 0.03, opacity: 0.4, softness: 0.16 } },
}

const pupil = (id: string, shape: EyeDesignV6['pupil']['shape'], sx: number, sy: number, top='#24162b', mid='#55305b', bottom='#9d628c', y=0.48, softness=0.14): DesignPatch => ({ pupil: { enabled: true, presetId: id, shape, x: 0.5, y, scaleX: sx, scaleY: sy, rotation: 0, topColor: top, midColor: mid, bottomColor: bottom, gradientStrength: 0.84, opacity: 0.9, blur: 0.006, softness } })

export const PUPIL_PRESETS: Record<string, DesignPatch> = {
  '원형': pupil('원형','circle',0.2,0.2),
  '세로 타원': pupil('세로 타원','ovalVertical',0.2,0.3),
  '소프트 타원': pupil('소프트 타원','softOval',0.23,0.31,'#2b1930','#68426b','#b77ba2',0.48,0.22),
  '얇은 세로형': pupil('얇은 세로형','ovalVertical',0.14,0.32,'#171321','#39304c','#725c83'),
  '렌즈형': pupil('렌즈형','lens',0.25,0.31,'#15182b','#385a82','#8cb4d4',0.48,0.18),
  '코어형': pupil('코어형','core',0.26,0.31,'#17111f','#59375d','#b5749d'),
  '물방울형': pupil('물방울형','droplet',0.22,0.29,'#171d2d','#3d6481','#8fb9c7',0.49),
  '하트형': pupil('하트형','heart',0.23,0.24,'#281326','#6f315c','#d27ea4',0.5),
  '꽃잎형': pupil('꽃잎형','petal',0.22,0.3,'#25192d','#694566','#c789a8',0.5),
  '둥근 캡슐형': pupil('둥근 캡슐형','capsule',0.24,0.3,'#171a2a','#465472','#97a8be'),
  '세로 렌즈형': pupil('세로 렌즈형','lens',0.18,0.34,'#11182c','#264b7a','#76a7d6'),
  '다중 코어형': pupil('다중 코어형','core',0.3,0.34,'#201222','#5a2d50','#c16f91'),
  '슬릿형': pupil('슬릿형','slit',0.08,0.34,'#090a13','#12182a','#243650',0.47,0.08),
  '반투명 타원형': pupil('반투명 타원형','softOval',0.25,0.32,'#1d263d','#536e95','#a7c4dd',0.48,0.28),
  '꽃심형': pupil('꽃심형','flowerCore',0.26,0.28,'#3a1625','#8e4e59','#e0a26f',0.49,0.16),
}

const lower = (id: string, type: EyeDesignV6['lowerPoint']['type'], opts: Partial<EyeDesignV6['lowerPoint']> = {}): DesignPatch => ({ lowerPoint: { enabled: true, presetId: id, type, x: 0.5, y: 0.74, scale: 1, spread: 0.64, count: 9, size: 0.072, sizeJitter: 0.34, rotation: 0, color: '#f5e4f0', secondaryColor: '#cbd8ff', opacity: 0.66, blur: 0.007, glow: 0.055, handDrawnAmount: 0.32, seed: 505, ...opts } })

export const LOWER_POINT_PRESETS: Record<string, DesignPatch> = {
  '꽃잎 반원': lower('꽃잎 반원','petal',{count:11,size:0.075,spread:0.62,color:'#f7dfea',secondaryColor:'#e6c6ff'}),
  '짧은 타원 반짝': lower('짧은 타원 반짝','ovalCluster',{count:10,size:0.065,spread:0.66,opacity:0.58}),
  '물방울형': lower('물방울형','droplet',{count:9,size:0.07,color:'#d9f4ff',secondaryColor:'#d8c8ff'}),
  '파도형': lower('파도형','wave',{count:8,size:0.075,spread:0.68,color:'#d8f5ff',opacity:0.56,handDrawnAmount:0.42}),
  '유리조각형': lower('유리조각형','glass',{count:8,size:0.07,spread:0.66,color:'#dff8ff',secondaryColor:'#b9c9ff',opacity:0.54}),
  '빛반사 조각형': lower('빛반사 조각형','reflection',{count:9,size:0.075,color:'#f6e8f2',secondaryColor:'#d6e6ff',opacity:0.56,glow:0.08}),
  '점묘형': lower('점묘형','stippling',{count:18,size:0.04,spread:0.7,opacity:0.48,handDrawnAmount:0.65}),
  '타원 클러스터': lower('타원 클러스터','ovalCluster',{count:8,size:0.085,spread:0.6,opacity:0.62}),
  '혼합 반짝': lower('혼합 반짝','mixed',{count:8,size:0.065,spread:0.69,opacity:0.58,handDrawnAmount:0.4}),
  '곡선 대시형': lower('곡선 대시형','curve',{count:10,size:0.066,spread:0.66,opacity:0.57,handDrawnAmount:0.44}),
  '꽃잎+점 혼합': lower('꽃잎+점 혼합','mixed',{count:11,size:0.06,spread:0.67,color:'#f5dce8',secondaryColor:'#c8e1ff',opacity:0.62}),
  '물방울+곡선 혼합': lower('물방울+곡선 혼합','handdrawn',{count:10,size:0.065,spread:0.67,color:'#d9efff',secondaryColor:'#efd6ff',opacity:0.6}),
  '초승달 포인트형': lower('초승달 포인트형','crescent',{count:7,size:0.072,spread:0.61,color:'#efe1ff',secondaryColor:'#d6f5ff'}),
  '별가루형': lower('별가루형','sparkDust',{count:14,size:0.045,spread:0.72,color:'#efdfff',secondaryColor:'#bceeff',opacity:0.56}),
  '반원 광택띠형': lower('반원 광택띠형','warmGlow',{count:8,size:0.075,spread:0.72,color:'#f7e4e2',secondaryColor:'#fff2cf',opacity:0.45,glow:0.1}),
  '손그림 점선형': lower('손그림 점선형','handdrawn',{count:12,size:0.055,spread:0.72,opacity:0.5,handDrawnAmount:0.82}),
  '붓터치형': lower('붓터치형','brushStroke',{count:8,size:0.075,spread:0.66,opacity:0.5,handDrawnAmount:0.9}),
  '무지개빛 조각형': lower('무지개빛 조각형','rainbowShard',{count:8,size:0.07,spread:0.66,color:'#f6d6ec',secondaryColor:'#aeeeff',opacity:0.52}),
  '크리스탈형': lower('크리스탈형','crystal',{count:9,size:0.067,spread:0.64,color:'#dceeff',secondaryColor:'#e6c9ff',opacity:0.58}),
  '따뜻한 글로우형': lower('따뜻한 글로우형','warmGlow',{count:7,size:0.09,spread:0.63,y:0.78,color:'#ffdcd0',secondaryColor:'#fff1bc',opacity:0.42,glow:0.13}),
}

const upper = (id:string,type:EyeDesignV6['upperShadow']['type'], opts:Partial<EyeDesignV6['upperShadow']>={}):DesignPatch => ({ upperShadow:{enabled:true,presetId:id,type,x:0.5,y:0.22,scaleX:1,scaleY:0.5,rotation:0,intensity:0.7,opacity:0.68,blur:0.045,color:'#1d1a2f',lashCount:5,lashLength:0.2,lashSpread:0.7,handDrawnAmount:0.2,...opts} })

export const UPPER_SHADOW_PRESETS: Record<string, DesignPatch> = {
  '부드러운 상단 그림자': upper('부드러운 상단 그림자','softShadow',{opacity:0.52,blur:0.08}),
  '진한 상단 그림자': upper('진한 상단 그림자','deepShadow',{opacity:0.76,scaleY:0.55,color:'#111525'}),
  '속눈썹 그림자': upper('속눈썹 그림자','lashShadow',{lashCount:5,lashLength:0.22,opacity:0.68}),
  '갈라지는 속눈썹 그림자': upper('갈라지는 속눈썹 그림자','splitLash',{lashCount:7,lashLength:0.25,lashSpread:0.78,opacity:0.7}),
  '젤리형 상단 막': upper('젤리형 상단 막','jellyDark',{scaleY:0.47,opacity:0.62,blur:0.03}),
  '짧은 속눈썹 그림자': upper('짧은 속눈썹 그림자','shortLash',{lashCount:6,lashLength:0.14,opacity:0.62}),
  '길게 뻗는 속눈썹 그림자': upper('길게 뻗는 속눈썹 그림자','longLash',{lashCount:5,lashLength:0.3,lashSpread:0.82,opacity:0.7}),
  '중앙 집중 그림자': upper('중앙 집중 그림자','centerShadow',{scaleX:0.75,scaleY:0.55,opacity:0.64}),
  '좌우 날개형 그림자': upper('좌우 날개형 그림자','wingShadow',{scaleX:1.08,scaleY:0.46,opacity:0.64}),
  '둥근 눈꺼풀 그림자': upper('둥근 눈꺼풀 그림자','roundLid',{scaleY:0.5,opacity:0.58,blur:0.065}),
  '손그림 붓그림자': upper('손그림 붓그림자','handdrawnShadow',{opacity:0.6,blur:0.025,handDrawnAmount:0.8}),
  '얇은 만화풍 그림자': upper('얇은 만화풍 그림자','thinAnime',{scaleY:0.3,opacity:0.58,blur:0.015}),
  '짙은 남색 그림자': upper('짙은 남색 그림자','animeTop',{color:'#101a36',opacity:0.7}),
  '자주빛 그림자': upper('자주빛 그림자','animeTop',{color:'#351b3e',opacity:0.66}),
  '검보라 그림자': upper('검보라 그림자','deepShadow',{color:'#211528',opacity:0.7}),
}

const refl = (id:string,type:EyeDesignV6['reflection']['type'], opts:Partial<EyeDesignV6['reflection']>={}):DesignPatch => ({ reflection:{enabled:true,presetId:id,type,x:0.31,y:0.38,scaleX:0.52,scaleY:0.3,rotation:-0.35,color:'#9b8ee1',secondaryColor:'#79b5ee',opacity:0.25,blur:0.055,bloom:0.06,handDrawnAmount:0.24,seed:733,...opts} })

export const REFLECTION_PRESETS: Record<string, DesignPatch> = {
  '부드러운 상단 반사': refl('부드러운 상단 반사','mist',{x:0.4,y:0.28,scaleX:0.72,scaleY:0.32,color:'#d6c9eb',secondaryColor:'#abcaff',opacity:0.22}),
  '푸른 유리 반사': refl('푸른 유리 반사','blueGlass',{color:'#75aeea',secondaryColor:'#9cecf2',opacity:0.3}),
  '보라빛 반사': refl('보라빛 반사','purpleGlow',{color:'#9a7ed0',secondaryColor:'#c8a6e8',opacity:0.28}),
  '측면 얇은 반사': refl('측면 얇은 반사','sideThin',{x:0.2,y:0.48,scaleX:0.3,scaleY:0.66,rotation:-0.22,color:'#98c6e8',opacity:0.24}),
  '상단 렌즈 반사': refl('상단 렌즈 반사','topLens',{x:0.5,y:0.2,scaleX:0.78,scaleY:0.32,rotation:0,color:'#baa8da',opacity:0.25}),
  '곡선 띠 반사': refl('곡선 띠 반사','curvedBand',{scaleX:0.7,scaleY:0.42,color:'#a5bff0',opacity:0.25,handDrawnAmount:0.38}),
  '이중 반사': refl('이중 반사','doubleReflection',{scaleX:0.65,scaleY:0.38,color:'#b3c8ef',secondaryColor:'#caa9df',opacity:0.25}),
  '점 반사 묶음': refl('점 반사 묶음','dotCluster',{x:0.68,y:0.4,scaleX:0.4,scaleY:0.45,color:'#cde8f1',opacity:0.34,handDrawnAmount:0.4}),
  '물방울 반사': refl('물방울 반사','dropletReflection',{x:0.72,y:0.4,scaleX:0.35,scaleY:0.48,color:'#b7d7f0',opacity:0.3}),
  '안개형 반사': refl('안개형 반사','mist',{x:0.5,y:0.46,scaleX:0.82,scaleY:0.58,color:'#c3b8dc',secondaryColor:'#9dcbea',opacity:0.18,blur:0.09}),
  '복합 유리 반사': refl('복합 유리 반사','complex',{scaleX:0.75,scaleY:0.5,color:'#8ec4ee',secondaryColor:'#b998d7',opacity:0.28,handDrawnAmount:0.34}),
  '하단 발광 반사': refl('하단 발광 반사','lowerGlowReflection',{x:0.5,y:0.72,scaleX:0.8,scaleY:0.42,color:'#ffd9ca',secondaryColor:'#fff0bc',opacity:0.2,bloom:0.1}),
  '별 반짝이 반사': refl('별 반짝이 반사','starSparkle',{x:0.68,y:0.4,scaleX:0.5,scaleY:0.5,color:'#eadcf6',secondaryColor:'#badfff',opacity:0.42}),
  '핑크 광택 반사': refl('핑크 광택 반사','pinkGloss',{color:'#e79dc3',secondaryColor:'#f4c5dd',opacity:0.28}),
  '시안 광택 반사': refl('시안 광택 반사','cyanGloss',{color:'#83d5e5',secondaryColor:'#b5eff4',opacity:0.28}),
  '손그림 번짐 반사': refl('손그림 번짐 반사','handdrawn',{color:'#b9a6df',secondaryColor:'#8bc5e6',opacity:0.24,handDrawnAmount:0.85}),
  '유광 필름형': refl('유광 필름형','film',{x:0.48,y:0.35,scaleX:0.82,scaleY:0.55,color:'#b6cce6',opacity:0.18,blur:0.04}),
  '상단 작은 구름형': refl('상단 작은 구름형','cloudTop',{x:0.44,y:0.25,scaleX:0.56,scaleY:0.3,color:'#d2cde7',opacity:0.22}),
  '점+띠 혼합형': refl('점+띠 혼합형','dotBand',{scaleX:0.7,scaleY:0.44,color:'#a9cbea',secondaryColor:'#c8aedf',opacity:0.28}),
  '컬러 반사 포인트형': refl('컬러 반사 포인트형','colorPoint',{x:0.65,y:0.46,scaleX:0.5,scaleY:0.48,color:'#d58dbd',secondaryColor:'#71cddf',opacity:0.34}),
}

const sym = (id:string,type:EyeDesignV6['symbol']['type'], opts:Partial<EyeDesignV6['symbol']>={}):DesignPatch => ({ symbol:{enabled:true,presetId:id,type,x:0.7,y:0.36,scale:0.105,rotation:0,color:'#f2d8ea',secondaryColor:'#b7dcf1',opacity:0.72,blur:0.003,handDrawnAmount:0.18,seed:1661,...opts} })

export const SYMBOL_PRESETS: Record<string, DesignPatch> = {
  '하트': sym('하트','heart'),
  '이중 하트': sym('이중 하트','doubleHeart',{scale:0.09}),
  '초승달': sym('초승달','crescent',{x:0.72,y:0.34,scale:0.12}),
  '별': sym('별','star',{scale:0.1}),
  '십자 반짝': sym('십자 반짝','crossSpark',{scale:0.115,opacity:0.62}),
  '꽃': sym('꽃','flower',{scale:0.12}),
  '클로버': sym('클로버','clover',{scale:0.12}),
  '물방울': sym('물방울','droplet',{scale:0.1}),
  '다이아': sym('다이아','diamond',{scale:0.09}),
  '점 3개': sym('점 3개','threeDots',{scale:0.07,opacity:0.58}),
  '하트+달': sym('하트+달','heartMoon',{scale:0.1}),
  '별+점': sym('별+점','starDots',{scale:0.1}),
  '꽃+점': sym('꽃+점','flowerDots',{scale:0.105}),
  '컬러 포인트점': sym('컬러 포인트점','colorDots',{scale:0.07,color:'#e48eb9',secondaryColor:'#7bcadf'}),
  '미니 문양 혼합': sym('미니 문양 혼합','mixedMini',{scale:0.085,opacity:0.64,handDrawnAmount:0.35}),
}

const tex = (id:string,type:EyeDesignV6['irisTexture']['type'], opts:Partial<EyeDesignV6['irisTexture']>={}):DesignPatch => ({ irisTexture:{enabled:true,presetId:id,type,color:'#d9d3f2',secondaryColor:'#8fb9e4',opacity:0.18,density:34,length:0.68,width:0.01,rotation:0,randomness:0.3,handDrawnAmount:0.28,seed:777,...opts} })

export const IRIS_TEXTURE_PRESETS: Record<string, DesignPatch> = {
  '방사형 결': tex('방사형 결','softRadial',{opacity:0.16,density:38}),
  '부드러운 붓결': tex('부드러운 붓결','softBrush',{opacity:0.15,density:26,handDrawnAmount:0.58}),
  '점묘 질감': tex('점묘 질감','speckle',{opacity:0.14,density:44}),
  '안개 질감': tex('안개 질감','fogTexture',{opacity:0.12,density:18}),
  '유리결': tex('유리결','glassTexture',{opacity:0.14,density:24,color:'#b8d9e9'}),
  '수채화 번짐': tex('수채화 번짐','watercolor',{opacity:0.13,density:20,handDrawnAmount:0.72}),
  '연필 스케치감': tex('연필 스케치감','pencil',{opacity:0.11,density:30,color:'#5d5572',handDrawnAmount:0.74}),
  '브러시 스트로크': tex('브러시 스트로크','brushStroke',{opacity:0.14,density:20,handDrawnAmount:0.88}),
  '불균일 노이즈': tex('불균일 노이즈','unevenNoise',{opacity:0.1,density:55,handDrawnAmount:0.9}),
  '결+점 혼합': tex('결+점 혼합','handRadial',{opacity:0.17,density:36,randomness:0.46,handDrawnAmount:0.6}),
  '얇은 링 결': tex('얇은 링 결','ringLines',{opacity:0.11,density:18}),
  '아래쪽 글로우 결': tex('아래쪽 글로우 결','lowerGlowTexture',{opacity:0.15,density:22,color:'#e5dbe8',secondaryColor:'#c6e8f1'}),
}

export const OVERLAY_PRESETS: Record<string, DesignPatch> = {
  '안개 패턴': { overlayPreset:{enabled:true,presetId:'안개 패턴',type:'fog',x:0.5,y:0.53,scaleX:0.82,scaleY:0.55,rotation:0,color:'#d9cde6',secondaryColor:'#b7d7e8',opacity:0.16,blur:0.06,handDrawnAmount:0.3,seed:105} },
  '꽃잎 패턴': { overlayPreset:{enabled:true,presetId:'꽃잎 패턴',type:'flower',x:0.5,y:0.55,scaleX:0.55,scaleY:0.55,rotation:0,color:'#efd9e8',secondaryColor:'#cfd8f4',opacity:0.18,blur:0.01,handDrawnAmount:0.2,seed:106} },
  '유리 파편 패턴': { overlayPreset:{enabled:true,presetId:'유리 파편 패턴',type:'fragments',x:0.5,y:0.5,scaleX:0.76,scaleY:0.65,rotation:0,color:'#c5e1eb',secondaryColor:'#c8bce5',opacity:0.18,blur:0.008,handDrawnAmount:0.35,seed:107} },
  '물결 패턴': { overlayPreset:{enabled:true,presetId:'물결 패턴',type:'ripple',x:0.5,y:0.6,scaleX:0.75,scaleY:0.48,rotation:0,color:'#c5e3ec',secondaryColor:'#dbc9e8',opacity:0.15,blur:0.004,handDrawnAmount:0.2,seed:108} },
  '붓터치 패턴': { overlayPreset:{enabled:true,presetId:'붓터치 패턴',type:'brushStroke',x:0.5,y:0.53,scaleX:0.78,scaleY:0.52,rotation:-0.15,color:'#cab8dd',secondaryColor:'#9fc8e0',opacity:0.15,blur:0.006,handDrawnAmount:0.68,seed:109} },
  '별가루 패턴': { overlayPreset:{enabled:true,presetId:'별가루 패턴',type:'starMist',x:0.5,y:0.5,scaleX:0.78,scaleY:0.68,rotation:0,color:'#e3d6ea',secondaryColor:'#aed8eb',opacity:0.18,blur:0.002,handDrawnAmount:0.4,seed:110} },
}

export const HANDDRAWN_PRESETS: Record<string, DesignPatch> = {
  '약한 손그림': { handDrawnTexture:{enabled:true,presetId:'약한 손그림',amount:0.2,opacity:0.055,color:'#f0e8f1',grainSize:0.018,seed:909} },
  '부드러운 붓결': { handDrawnTexture:{enabled:true,presetId:'부드러운 붓결',amount:0.42,opacity:0.075,color:'#e9dfec',grainSize:0.025,seed:910} },
  '수채화 잔결': { handDrawnTexture:{enabled:true,presetId:'수채화 잔결',amount:0.58,opacity:0.07,color:'#d8d5ec',grainSize:0.036,seed:911} },
  '점묘 손질': { handDrawnTexture:{enabled:true,presetId:'점묘 손질',amount:0.62,opacity:0.07,color:'#e8ddea',grainSize:0.015,seed:912} },
  '강한 붓터치': { handDrawnTexture:{enabled:true,presetId:'강한 붓터치',amount:0.85,opacity:0.09,color:'#d4c9df',grainSize:0.042,seed:913} },
}
