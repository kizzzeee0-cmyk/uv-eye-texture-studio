# UV Eye Texture Studio v0.6 수정 가이드

## 가장 자주 수정할 파일

### `src/lib/presets.ts`
프리셋 이름, 색상, 기본 위치, 크기, 불투명도 등을 수정합니다.

- `BACKGROUND_PRESETS` : 배경
- `PUPIL_PRESETS` : 동공
- `LOWER_POINT_PRESETS` : 하단 포인트
- `UPPER_SHADOW_PRESETS` : 상단/속눈썹 그림자
- `REFLECTION_PRESETS` : 반사광
- `SYMBOL_PRESETS` : 하트/달/꽃/별 등의 상징 문양
- `IRIS_TEXTURE_PRESETS` : 홍채 내부 질감
- `OVERLAY_PRESETS` : 안개/유리/물결 등의 내장 오버레이
- `HANDDRAWN_PRESETS` : 손그림 질감

### `src/lib/irisRenderer.ts`
실제로 눈동자 안에 그림을 그리는 핵심 파일입니다.

- `drawPupil()` : 동공
- `drawLowerPoints()` : 하단 포인트
- `drawUpperShadow()` : 상단 그림자
- `drawReflection()` : 반사광
- `drawSymbol()` : 상징 문양
- `drawIrisTexture()` : 홍채 결

동공에 외곽선을 다시 만들고 싶지 않다면 `drawPupil()`에 `stroke()`를 추가하지 마세요.

### `src/App.tsx`
버튼, 슬라이더, 프리셋 그룹 및 한국어 UI를 수정합니다.

### `src/lib/types.ts`
새 도형 타입을 추가할 때 수정합니다.

## 새로운 프리셋 하나 추가 예시

`BACKGROUND_PRESETS` 안에 다음처럼 넣을 수 있습니다.

```ts
'달빛 회색': bg(
  '달빛 회색',
  '#1d2130',
  '#3f4867',
  '#6f7ea8',
  '#b6c0df',
  '#f4f7ff'
),
```

## 새 하단 포인트 도형 추가

1. `src/lib/types.ts`의 `LowerPointType`에 타입 추가
2. `src/lib/irisRenderer.ts`의 `drawLowerPoints()`에 그리기 분기 추가
3. `src/lib/presets.ts`에 프리셋 추가

## 새 상징 문양 추가

1. `SymbolType`에 이름 추가
2. `drawSymbol()`에 도형 코드 추가
3. `SYMBOL_PRESETS`에 버튼용 프리셋 추가

## 손그림 느낌을 더 강하게 하고 싶을 때

다음 값을 주로 올리면 됩니다.

- `handDrawnAmount`
- `sizeJitter`
- `randomness`

단, 너무 높이면 지저분해질 수 있으므로 0.2~0.6 정도가 일반적인 시작점입니다.
