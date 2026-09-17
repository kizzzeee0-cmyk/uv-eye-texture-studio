# UV Eye Texture Studio v0.2

브라우저에서 동작하는 UV 기반 눈동자 텍스처 편집기입니다.

## v0.2 주요 기능

- PNG UV 텍스처 업로드
- Zoom / Pan / Fit / 100%
- Left / Right Iris Mask 이동 및 수치 조절
- Top / Mid / Bottom 컬러 그라데이션
- Outer Ring / Pupil
- Radial Pattern 강도 조절
- Reflection 색상 / 강도 조절
- Highlight 강도 / 크기 / 위치 조절
- 6개 기본 색상 프리셋
- Seed 기반 Randomize
- Link Eyes
- L → R / R → L 스타일 복사
- 브라우저 로컬 설정 저장/불러오기
- Project Settings JSON Export / Import
- Full UV PNG Export
- Selected Iris PNG Export

## 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## Cloudflare Pages

```text
Build command: npm run build
Build output directory: dist
```

자세한 초보자용 절차는 `DEPLOY-GUIDE-KO.md`를 확인하세요.

## 아직 추가 예정인 기능

- 직접 드래그하는 Mask 크기 조절 핸들
- Undo / Redo
- 완전한 IndexedDB 프로젝트 저장
- Layer reorder 시스템
- Crystal / Wave / Ice 패턴 라이브러리
- 4/8/12 Variation 비교 화면
- Pixel Preservation 자동 검증
