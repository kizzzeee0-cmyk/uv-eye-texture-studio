# UV Eye Texture Studio v0.4 수정 / 확장 가이드

이 문서는 v0.4에서 **어디를 수정하면 무엇이 바뀌는지** 빠르게 찾을 수 있게 정리한 파일이다.

---

## 1. 핵심 파일 구조

### `src/App.tsx`
메인 UI와 상태 관리.

수정 가능한 주요 영역:
- 상단 버튼 / 좌측 패널 / 우측 패널 UI
- Auto Detect 버튼 동작
- 상세 프리셋 라이브러리 구성
- 프로젝트 저장 / 불러오기

### `src/lib/types.ts`
전체 타입 정의.

여기서 수정 가능한 것:
- 새로운 동공 모양 타입 추가
- 새로운 하단 포인트 타입 추가
- 새로운 반사광 / 하이라이트 타입 추가
- 프로젝트 저장 포맷 버전 변경

### `src/lib/presets.ts`
프리셋 데이터의 핵심 파일.

여기서 수정 가능한 것:
- 전체 완성형 프리셋 `PRESETS`
- 배경 프리셋 `BASE_PRESETS`
- 하단 포인트 프리셋 `LOWER_MOTIF_PRESETS`
- 동공 프리셋 `PUPIL_PRESETS`
- 상단 그림자 / 속눈썹 반사 프리셋 `UPPER_ACCENT_PRESETS`
- 반사광 프리셋 `REFLECTION_PRESETS`
- 하이라이트 프리셋 `HIGHLIGHT_PRESET_PATCHES`
- 파티클 프리셋 `PARTICLE_PRESETS`

### `src/lib/irisRenderer.ts`
실제 눈동자 렌더링 로직.

여기서 수정 가능한 것:
- 동공 도형 그리는 함수
- 하단 포인트 도형 그리는 함수
- 반사광 / 하이라이트 렌더링 방식
- 상단 그림자 표현

### `src/lib/detect.ts`
투명도를 기준으로 눈동자 UV 영역을 자동 인식하는 파일.

여기서 수정 가능한 것:
- 알파 임계값
- 연결 요소(connected components) 기준
- 왼쪽/오른쪽 눈 선택 방식
- 폴리곤 생성 방식

### `src/styles.css`
UI 디자인 수정.

---

## 2. 투명 영역 자동 인식 로직을 바꾸고 싶을 때

파일:
- `src/lib/detect.ts`

### 알파 임계값 바꾸기
현재는 대략 alpha 10 이상을 보이는 픽셀로 본다.
다음 부분을 수정하면 된다.

```ts
if (data[index * 4 + 3] < 10) continue
```

- 더 민감하게: `10 → 3`
- 더 엄격하게: `10 → 30`

### 더 큰 조각만 눈으로 인식하게 하기
`chooseBest()` 내부의 필터 부분을 조정하면 된다.

```ts
component.area > Math.max(40, canvas.width * canvas.height * 0.00015)
```

값을 키우면 작은 먼지 조각은 무시한다.

---

## 3. 상세 프리셋을 추가하는 방법

파일:
- `src/lib/presets.ts`

### 예시 1) 배경 프리셋 추가
`BASE_PRESETS`에 새 항목을 추가한다.

```ts
'Moon Gray': {
  gradient: {
    top: '#1d2130',
    upperMid: '#3f4867',
    mid: '#6f7ea8',
    lowerMid: '#b6c0df',
    bottom: '#f4f7ff',
  },
  lowerGlow: { color: '#edf4ff', intensity: 0.34 },
}
```

### 예시 2) 동공 프리셋 추가
`PUPIL_PRESETS`에 추가한다.

```ts
'Large Round': {
  pupil: {
    enabled: true,
    shape: 'circle',
    scaleX: 0.24,
    scaleY: 0.24,
    y: 0.49,
    color: '#111427',
  },
}
```

### 예시 3) 하단 포인트 프리셋 추가
`LOWER_MOTIF_PRESETS`에 추가한다.

```ts
'Crystal Drops': {
  lowerMotif: {
    enabled: true,
    type: 'droplet',
    count: 12,
    size: 0.08,
    spread: 0.7,
    y: 0.73,
    opacity: 0.85,
    glow: 0.16,
    color: '#f6ffff',
  },
}
```

---

## 4. 새 동공 모양을 직접 추가하는 방법

필요한 파일:
- `src/lib/types.ts`
- `src/lib/irisRenderer.ts`
- `src/App.tsx`

### 순서
1. `types.ts`의 `PupilShape`에 새 이름 추가
2. `irisRenderer.ts`의 `shapePath()`에 해당 도형 그리기 코드 추가
3. `App.tsx`의 `PUPIL_SHAPES` 배열에 이름 추가
4. 필요하면 `presets.ts`의 `PUPIL_PRESETS`에도 프리셋 추가

---

## 5. 하단 포인트 도형을 더 추가하는 방법

필요한 파일:
- `src/lib/types.ts`
- `src/lib/irisRenderer.ts`
- `src/App.tsx`

### 순서
1. `MotifType`에 새 타입 이름 추가
2. `drawLowerMotif()`에 해당 타입 분기 추가
3. `App.tsx`의 `MOTIF_TYPES` 배열에 이름 추가
4. `presets.ts`의 `LOWER_MOTIF_PRESETS`에 프리셋 추가

---

## 6. UI에서 프리셋 그룹 순서를 바꾸고 싶을 때

파일:
- `src/App.tsx`

다음 부분에서 순서를 바꿀 수 있다.

```tsx
<PresetGroup title="Background / Gradient" ... />
<PresetGroup title="Lower Point Motifs" ... />
<PresetGroup title="Pupil Shapes" ... />
<PresetGroup title="Upper Shadow / Lash Reflection" ... />
<PresetGroup title="Reflection Presets" ... />
<PresetGroup title="Highlight Presets" ... />
<PresetGroup title="Particle Presets" ... />
```

---

## 7. 저장 포맷 관련

v0.4 프로젝트 저장 포맷은 다음을 기준으로 한다.

- `version: 4`
- 로컬스토리지 키: `uv-eye-studio-v04-settings`
- JSON 파일명: `uv-eye-project-v0.4.json`

이 버전을 바꾸면 App.tsx의 import/export / save/load 부분도 같이 맞춰야 한다.

---

## 8. 추천 커스터마이징 방향

사용 목적이 “완성형 눈 프리셋”보다 “세부 요소 조합형 스튜디오”에 가깝다면,
다음 순서로 계속 확장하는 것이 좋다.

1. 배경 프리셋 컬러 수 늘리기
2. 하단 포인트 도형 종류 늘리기
3. 동공 도형 더 추가하기
4. 속눈썹 그림자 프리셋 더 세분화하기
5. 반사광 위치 프리셋 추가하기
6. 하이라이트 구조 프리셋 더 추가하기
7. RGB 슬라이더 / 팔레트 저장 기능 넣기
8. 레이어 순서 On/Off 기능 더 세분화하기

---

## 9. 빌드 방법

```bash
npm install
npm run dev
```

배포용 빌드:

```bash
npm run build
```
