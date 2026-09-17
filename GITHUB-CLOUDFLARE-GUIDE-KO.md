# GitHub / Cloudflare Pages 초보 배포 가이드

## GitHub Desktop

### 이미 저장소가 있는 경우
1. GitHub Desktop에서 `uv-eye-texture-studio` 저장소 선택
2. `Repository > Show in Explorer`
3. v0.5 ZIP 압축 해제
4. ZIP 안의 `src`, `package.json`, `index.html` 등 내용물을 저장소 폴더에 덮어쓰기
5. GitHub Desktop으로 돌아가기
6. 왼쪽 Changes에 변경 파일 확인
7. Summary에 `Upgrade to v0.5` 입력
8. `Commit to main`
9. 위쪽 `Push origin`

### 새 저장소인 경우
README의 기존 GitHub Desktop 업로드 방식대로 새 Repository를 만든 뒤 ZIP 내용물을 넣으면 됩니다.

## Cloudflare Pages

GitHub가 이미 연결되어 있다면 따로 할 일이 없습니다. Push 후 자동 재배포됩니다.

처음 연결한다면:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 비워두기 (`package.json`이 저장소 최상단에 있을 경우)

빌드 실패 시 Cloudflare Deployment의 Build log를 전체 복사해서 확인하면 됩니다.
