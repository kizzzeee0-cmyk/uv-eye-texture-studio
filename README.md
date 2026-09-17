# UV Eye Texture Studio v0.3

UV / VRM / VRC / VTuber용 눈동자 텍스처를 브라우저 안에서 비파괴 방식으로 디자인하는 실험적 웹 에디터입니다.

## v0.3 핵심 기능

- PNG UV 텍스처 업로드
- Zoom / Pan / Fit / 100%
- Left / Right Eye 독립 Mask
- Ellipse Mask 새로 그리기
- **Polygon Free-form Mask**
  - 캔버스를 자유롭게 클릭해서 점 생성
  - 첫 점 클릭 또는 Complete로 닫기
  - 점 Drag 수정
  - Shift + Click edge = 점 추가
  - Alt + Click point = 점 삭제
  - 전체 Mask 이동
  - Inward Feather
- 5-stop Iris Gradient
- Upper Shadow / Lower Glow
- Outer Ring / Inner Ring / Extra Inner Ring
- Circle / Oval Pupil
- Seed 기반 Radial Texture
- Soft Texture
- Lower Motif 6종
  - Petal
  - Dash
  - Droplet
  - Glass
  - Wave
  - Oval Cluster
- Reflection 4종
- Highlight Group 6종
- Particle 4종
- 10개 Starter Preset
- Seed Randomizer + 카테고리별 Random 잠금
- Left ↔ Right 디자인 복사
- Design Link
- Browser Local Save
- Project JSON Save / Load
- Full UV PNG Export
- Transparent Single Iris Export

## UV 보호 원칙

Full PNG Export는 원본 PNG를 먼저 그린 뒤, Eye Design을 Mask 내부에만 합성합니다.

- Canvas 크기 변경 없음
- 원본 UV 좌표 이동 없음
- Hard Mask 외부에는 디자인을 그리지 않음
- Feather는 hard mask 밖으로 번지지 않도록 inward 방식으로 처리

PNG 인코딩 자체의 메타데이터/압축 바이트까지 원본과 동일하게 유지하는 도구는 아니지만, 편집 렌더링은 지정된 mask 내부로 제한됩니다.

## 실행

Node.js 18+ 권장.

```bash
npm install
npm run dev
```

터미널에 표시되는 localhost 주소를 Chrome에서 엽니다.

## 빌드

```bash
npm run build
```

결과 폴더: `dist`

## Cloudflare Pages

- Framework: Vite
- Build command: `npm run build`
- Build output directory: `dist`

## 주요 파일

- `src/App.tsx` — 전체 UI / Mask 조작 / 저장
- `src/lib/types.ts` — 프로젝트 데이터 구조
- `src/lib/presets.ts` — 기본 디자인과 10개 프리셋
- `src/lib/irisRenderer.ts` — 실제 눈동자 procedural renderer
- `src/lib/mask.ts` — Ellipse/Polygon mask 계산
- `src/lib/random.ts` — Seed randomizer
- `src/styles.css` — UI 디자인

자세한 수정법은 `MODIFY-GUIDE-KO.md`를 확인하세요.

## v0.3에서 아직 없는 기능

- Brush/Lasso Mask
- 자동 홍채 영역 탐지
- Undo / Redo History
- Photoshop식 자유 Layer 순서 변경
- 4/8/12 Variation 비교창
- 원본 PNG Blob을 포함한 완전한 IndexedDB 프로젝트 복원
- VRM/GLB 3D 실시간 Preview

이 기능들은 v0.4 이후 확장하기 좋은 구조로 분리되어 있습니다.
