# UV Eye Texture Studio v0.4 변경사항

## 핵심 업그레이드

### 1) 투명 영역 기반 자동 눈 위치 인식 추가
- PNG에서 **투명하지 않은 영역(alpha island)** 을 분석해
  좌/우 눈 UV 위치를 자동으로 잡을 수 있게 변경.
- 투명 배경에 눈 UV만 분리된 이미지일수록 정확도가 높음.
- 자동 인식 후 `Edit Points`로 후보정 가능.

### 2) “완성형 프리셋” 중심에서 “세부 요소 프리셋” 중심으로 구조 개선
아래와 같은 상세 프리셋 라이브러리 추가:
- Background / Gradient
- Lower Point Motifs
- Pupil Shapes
- Upper Shadow / Lash Reflection
- Reflection
- Highlight
- Particle

즉, 버튼 한 번으로 완성된 눈을 뽑는 방식보다,
**하나의 눈동자를 직접 조합해서 만드는 작업형 구조**에 더 가깝게 업그레이드됨.

### 3) 동공 모양 확장
기존보다 더 자유로운 표현을 위해 추가:
- circle
- oval
- heart
- petal
- slit

### 4) 하단 포인트 요소 확장
추가 / 정리된 타입:
- wave
- petal
- droplet
- glass
- ovalCluster
- lightShards
- mixedPoints

### 5) 반사광 / 하이라이트 업그레이드
- 반사광 타입 `topBand` 추가
- 하이라이트 타입 `sparkleArc` 추가
- 상단 속눈썹 그림자 느낌이 더 잘 나오도록 상단 그림자 표현 강화

### 6) 저장 포맷 v4로 갱신
- 로컬 저장 키 변경: `uv-eye-studio-v04-settings`
- 프로젝트 JSON 버전: `4`

---

## 사용자 요청과 연결된 반영 내용

### 요청: 눈동자 UV 위치를 투명 제외 영역에서 자동으로 인식
반영:
- `src/lib/detect.ts` 추가
- 상단/좌측 패널에 **Auto Detect Eyes / Detect from Alpha** 버튼 추가

### 요청: 디자인이 너무 구리고, 완성형 프리셋 말고 세부 조합형 프리셋이 필요
반영:
- 상세 프리셋 그룹 구조로 UI 개편
- 세부 요소별 프리셋 라이브러리 추가

### 요청: 배경 프리셋에서 색 하나를 누르면 위가 어둡고 아래가 자연스럽게 밝아지는 식
반영:
- 5단 그라데이션 기반 배경 프리셋 다수 추가

### 요청: 하단 포인트 요소를 파도 / 꽃잎 / 물방울 / 빛반사 / 큰점+작은점 등으로 다양화
반영:
- `LOWER_MOTIF_PRESETS` 및 렌더러 분기 확장

### 요청: 동공 모양 자유도 확대
반영:
- heart / petal / slit 추가

### 요청: 눈동자 상단 속눈썹 그림자 / 빛반사 프리셋 추가
반영:
- `UPPER_ACCENT_PRESETS` 추가
- 상단 그림자 렌더링 보강

---

## 기술적으로 추가된 파일
- `src/lib/detect.ts`
- `src/react-shim.d.ts` (개발 환경 타입 검사 보조용)

## 수정된 주요 파일
- `src/App.tsx`
- `src/lib/types.ts`
- `src/lib/presets.ts`
- `src/lib/random.ts`
- `src/lib/irisRenderer.ts`
- `src/styles.css`
- `package.json`
- `index.html`
