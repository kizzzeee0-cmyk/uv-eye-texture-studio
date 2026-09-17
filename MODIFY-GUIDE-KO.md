# v0.5 수정 가이드

## 가장 중요한 파일

### `src/lib/presets.ts`
세부 프리셋 데이터가 들어 있습니다.

- `BACKGROUND_PRESETS` : 배경
- `RING_PRESETS` : 윤곽 링
- `PUPIL_PRESETS` : 동공
- `LOWER_POINT_PRESETS` : 하단 포인트
- `UPPER_SHADOW_PRESETS` : 상단 그림자
- `REFLECTION_PRESETS` : 반사광
- `IRIS_TEXTURE_PRESETS` : 홍채 결
- `OVERLAY_PRESETS` : 내장 문양
- `HANDDRAWN_PRESETS` : 손그림 질감

프리셋을 더 만들고 싶으면 이 파일에 기존 항목을 복사한 뒤 이름과 수치만 바꾸는 것이 가장 쉽습니다.

### `src/lib/irisRenderer.ts`
실제 눈동자를 그리는 핵심 파일입니다.

- `drawBackground()` : 배경 그라데이션
- `drawPupil()` : 동공
- `drawUpperShadow()` : 상단 / 속눈썹 그림자
- `drawReflection()` : 반사광
- `drawLowerPoints()` : 하단 포인트
- `drawIrisTexture()` : 홍채 결
- `drawOverlayPreset()` : 내장 문양
- `drawHandDrawnTexture()` : 손그림 질감
- `drawOverlayImage()` : 사용자 이미지

디자인 자체가 마음에 들지 않을 때 가장 많이 수정할 파일입니다.

### `src/lib/detect.ts`
투명도를 분석하여 눈 UV 위치를 찾는 코드입니다.

알파 임계값을 더 민감하게 바꾸고 싶다면 `alpha < 10` 기준을 낮추면 됩니다.

### `src/App.tsx`
전체 한국어 UI, 마스크 조작, 프리셋 토글, 프로젝트 저장 등을 담당합니다.

### `src/styles.css`
UI 색상 / 패널 크기 / 버튼 디자인.

---

## 프리셋을 추가하는 예

`BACKGROUND_PRESETS` 안에 다음처럼 추가할 수 있습니다.

```ts
'새벽 라벤더': {
  background: {
    enabled: true,
    presetId: '새벽 라벤더',
    topColor: '#22203a',
    upperMidColor: '#514b78',
    midColor: '#827bb0',
    lowerMidColor: '#b9b3da',
    bottomColor: '#ebe9ff',
    opacity: 1,
    contrast: 1,
  },
},
```

---

## 동공 모양을 추가하는 방법

1. `src/lib/types.ts`의 `PupilShape`에 이름 추가
2. `src/lib/irisRenderer.ts`의 `shapePath()`에 도형 경로 추가
3. `src/lib/presets.ts`의 `PUPIL_PRESETS`에 선택 버튼용 프리셋 추가

---

## 하단 포인트 모양을 추가하는 방법

1. `LowerPointType`에 타입 추가
2. `drawLowerPoints()`에 그리는 코드 추가
3. `LOWER_POINT_PRESETS`에 프리셋 추가

---

## GitHub에 새 버전 덮어쓰기

1. ZIP 압축 풀기
2. 기존 GitHub Desktop 로컬 `uv-eye-texture-studio` 폴더 열기
3. v0.5 ZIP 안의 파일/폴더를 기존 폴더에 덮어쓰기
4. 기존에 남아 있는 v0.4 전용 파일은 필요 시 삭제
5. GitHub Desktop에서 Changes 확인
6. Summary: `Upgrade to UV Eye Texture Studio v0.5`
7. `Commit to main`
8. `Push origin`

Cloudflare Pages가 GitHub 저장소와 연결되어 있으면 이후 자동 재배포됩니다.
