# UV Eye Texture Studio v0.3 — 초보자용 수정 가이드

이 문서는 코딩을 잘 몰라도 **어느 파일을 수정하면 무엇이 바뀌는지** 찾을 수 있도록 작성되었습니다.

---

## 1. 가장 먼저 알아둘 것

프로젝트에서 자주 수정하게 될 파일은 사실상 4개입니다.

| 하고 싶은 것 | 수정 파일 |
|---|---|
| 프리셋 색/기본 눈 디자인 수정 | `src/lib/presets.ts` |
| 꽃잎/유리/파도 같은 문양 모양 수정 | `src/lib/irisRenderer.ts` |
| 버튼, 메뉴, 슬라이더 추가/수정 | `src/App.tsx` |
| 사이트 색상/크기/레이아웃 변경 | `src/styles.css` |

Mask 계산 자체를 바꾸고 싶을 때만 `src/lib/mask.ts`를 수정하세요.

---

# 2. 프리셋 색상을 바꾸는 가장 쉬운 방법

파일:

```text
src/lib/presets.ts
```

예를 들어 `Soft Pink Doll`을 찾습니다.

```ts
'Soft Pink Doll': mergeStyle({
  gradient: {
    ...DEFAULT_STYLE.gradient,
    top: '#4d2539',
    upperMid: '#8c3f67',
    mid: '#d06495',
    lowerMid: '#f49abb',
    bottom: '#ffd7df'
  }
})
```

HEX 색상만 바꾸면 됩니다.

위에서 아래 순서:

```text
top       = 홍채 최상단
upperMid  = 상단 중간
mid       = 중앙
lowerMid  = 하단 중간
bottom    = 홍채 최하단
```

예를 들어 보라색 계열로 바꾸려면:

```ts
top: '#241532',
upperMid: '#55376f',
mid: '#8d69ad',
lowerMid: '#c393cf',
bottom: '#f0d6f5'
```

---

# 3. 새 프리셋을 하나 추가하기

`PRESETS` 안에 새 항목을 복사해서 넣습니다.

```ts
'My Iris': mergeStyle({
  gradient: {
    ...DEFAULT_STYLE.gradient,
    top: '#17172a',
    upperMid: '#39345f',
    mid: '#7263a8',
    lowerMid: '#aaa0d7',
    bottom: '#e5e0ff'
  },
  reflection: {
    ...DEFAULT_STYLE.reflection,
    color: '#9389de',
    opacity: 0.4
  }
}),
```

`App.tsx`가 `PRESETS`의 이름을 자동으로 읽어서 버튼을 만들기 때문에 **프리셋 버튼을 따로 코딩할 필요가 없습니다.**

---

# 4. 기본값 자체를 변경하기

새 PNG를 열었을 때 처음 나오는 눈을 바꾸려면:

```text
src/lib/presets.ts
```

맨 위의:

```ts
export const DEFAULT_STYLE
```

을 수정합니다.

추천: 기본값을 크게 바꾸기 전 `presets.ts` 파일을 복사해 백업하세요.

---

# 5. 아래쪽 꽃잎/유리 문양을 수정하기

파일:

```text
src/lib/irisRenderer.ts
```

검색:

```text
drawLowerMotif
```

아래에 각 문양의 실제 Canvas drawing 코드가 있습니다.

예:

```ts
if (motif.type === 'petal')
```

= 꽃잎

```ts
motif.type === 'dash'
```

= 아래쪽 짧은 빛 조각

```ts
motif.type === 'droplet'
```

= 물방울

```ts
motif.type === 'glass'
```

= 유리 파편

```ts
motif.type === 'wave'
```

= 파도

이 부분의 `bezierCurveTo`, `lineTo`, `ellipse` 값을 바꾸면 모양이 바뀝니다.

초보라면 직접 숫자를 바꾸기보다 개발 AI에게 다음처럼 요청하는 것이 안전합니다.

> `src/lib/irisRenderer.ts`의 drawLowerMotif 안에 있는 glass motif를 더 부드러운 얼음조각 모양으로 바꿔줘. 다른 기능은 수정하지 마.

---

# 6. 하이라이트 모양을 수정하기

파일:

```text
src/lib/irisRenderer.ts
```

검색:

```text
drawHighlights
```

현재 프리셋:

```text
singleLarge
animeStandard
glassyDouble
cluster
sideHighlight
topDome
```

예를 들어 `glassyDouble` 안의:

```ts
circle(0, 0, 1.08, 0.9)
circle(1.58, 0.62, 0.42)
circle(0.65, 1.9, 0.16)
```

숫자는 각각 상대 위치와 크기입니다.

첫 두 숫자 = 위치 오프셋
세 번째 숫자 = 크기
네 번째 숫자 = 세로 납작함 정도

---

# 7. 눈동자가 너무 평면적으로 보일 때 조절할 부분

사이트에서 먼저 다음 순서로 조절하세요.

1. **Upper Shadow**를 0.65~0.85 정도
2. **Lower Glow** 0.25~0.55
3. **Inner Ring** ON
4. **Extra Inner Ring** ON
5. **Radial Texture** 0.15~0.45
6. **Lower Motif** ON
7. **Reflection** 0.15~0.4
8. **Highlight Group**에서 Glassy Double / Cluster
9. Particle는 너무 많지 않게 5~12개

깊이감은 하나의 강한 효과보다 여러 약한 레이어를 겹치는 편이 자연스럽습니다.

---

# 8. Polygon Mask 사용법

왼쪽에서:

```text
Polygon Click
```

선택.

눈 UV 외곽을 따라 한 점씩 클릭합니다.

```text
1 → 2 → 3 → 4 → ...
```

최소 3점 이후:

- 첫 번째 점을 다시 클릭하거나
- 왼쪽 `Complete` 버튼

으로 완료합니다.

완료 후 자동으로 `Edit Points` 모드로 이동합니다.

### Edit Points

```text
점 Drag
→ 점 이동

Shift + 선분 클릭
→ 새 점 삽입

Alt + 점 클릭
→ 점 삭제
```

점 하나를 선택한 뒤 왼쪽 `Delete Selected Point`도 사용할 수 있습니다.

### Feather

오른쪽:

```text
Mask Editor → Feather (inward px)
```

Feather는 **Mask 안쪽으로만** 부드럽게 하도록 설계되어 있습니다.

Mask 외부로 효과가 번져 UV의 다른 부분을 수정하지 않기 위해서입니다.

---

# 9. Ellipse Mask를 다시 그리고 싶을 때

왼쪽:

```text
Draw Ellipse
```

선택 후 UV 위에서 마우스로 드래그합니다.

현재 선택된 Left 또는 Right Mask가 새 Ellipse로 교체됩니다.

---

# 10. 버튼 이름이나 설명을 바꾸는 방법

파일:

```text
src/App.tsx
```

예를 들어:

```tsx
<button>Open UV Texture</button>
```

를:

```tsx
<button>UV 불러오기</button>
```

로 바꾸면 됩니다.

기능 함수인 `onClick={...}` 부분은 지우지 마세요.

---

# 11. 사이트 색을 바꾸는 방법

파일:

```text
src/styles.css
```

대표적으로 현재 보라색 Accent는 `#9389de` 계열입니다.

찾기(Ctrl+F):

```text
#9389de
```

원하는 Accent HEX로 바꿀 수 있습니다.

---

# 12. Random 결과를 더 화려하게 만들기

파일:

```text
src/lib/random.ts
```

Random 범위를 수정합니다.

예:

```ts
next.highlight.size = 0.7 + rand() * 0.7
```

현재 약 0.7~1.4 사이입니다.

더 큰 Highlight도 나오게 하려면:

```ts
next.highlight.size = 0.6 + rand() * 1.2
```

처럼 범위를 넓힐 수 있습니다.

---

# 13. 코딩 없이 AI에게 수정시키는 추천 방식

수정하고 싶은 기능을 한 번에 너무 많이 요청하지 마세요.

좋은 예:

> v0.3 프로젝트를 수정해줘. `drawLowerMotif`에 `snowCrystal` motif 하나만 추가하고, UI의 Lower Motif 선택창에도 snowCrystal을 추가해줘. 기존 Polygon Mask와 Export는 절대 수정하지 마. build 오류도 확인해줘.

나쁜 예:

> 눈을 더 예쁘게 만들고 모든 기능도 개선해줘.

범위가 너무 넓으면 이미 정상인 Mask/Export를 AI가 다시 작성하면서 고장낼 수 있습니다.

---

# 14. 수정 후 PC에서 확인하기

프로젝트 폴더에서 터미널을 열고 최초 한 번:

```bash
npm install
```

실행:

```bash
npm run dev
```

수정 후 최종 확인:

```bash
npm run build
```

`npm run build`가 오류 없이 끝나야 Cloudflare 배포 성공 가능성이 높습니다.

---

# 15. 기존 GitHub v0.2를 v0.3으로 업데이트하기

가장 안전한 방법:

1. 다운로드한 `uv-eye-texture-studio-v0.3.zip` 압축 해제
2. GitHub의 기존 Repository 열기
3. v0.3 안 파일들을 기존 프로젝트와 같은 위치에 업로드
4. 같은 이름 파일은 새 버전으로 교체
5. Commit message:

```text
Upgrade UV Eye Texture Studio to v0.3
```

6. Commit

Cloudflare Pages가 GitHub Repository와 연결돼 있으면 자동 재배포됩니다.

### Cloudflare 설정은 그대로

```text
Build command: npm run build
Build output directory: dist
```

---

# 16. 수정 전에 꼭 백업하기

기능이 정상인 순간 GitHub Commit을 하나 만들어두세요.

예:

```text
v0.3 stable before motif changes
```

AI 수정 후 문제가 생겼을 때 이 Commit으로 돌아갈 수 있습니다.

---

# 17. 다음 버전에서 추천하는 추가 기능

v0.4 추천 순서:

1. Undo / Redo
2. Brush Mask + Eraser
3. 4/8/12 Variation Compare
4. Layer 순서 변경
5. Highlight 개별 오브젝트 추가/삭제
6. 사용자 PNG/SVG Motif Import
7. IndexedDB에 PNG Blob까지 저장
8. Auto iris candidate detect

