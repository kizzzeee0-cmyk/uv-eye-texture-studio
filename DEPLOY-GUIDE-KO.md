# UV Eye Texture Studio v0.2 — 초보자용 업로드/배포 가이드

## 1. GitHub에 올리기

1. ZIP 파일을 다운로드하고 압축을 풉니다.
2. GitHub에 로그인합니다.
3. 우측 상단 `+` → `New repository`를 누릅니다.
4. Repository name에 `uv-eye-texture-studio`를 입력합니다.
5. Public을 선택합니다.
6. README / .gitignore / License는 GitHub에서 새로 추가하지 말고 빈 저장소로 만듭니다.
7. 생성된 저장소에서 `Add file` → `Upload files`를 누릅니다.
8. 압축을 푼 폴더 자체가 아니라, 폴더 안에 있는 파일과 `src` 폴더 등을 모두 선택해 업로드합니다.
9. 아래 구조가 GitHub 저장소 최상단에서 바로 보여야 합니다.

```text
package.json
vite.config.ts
index.html
src/
public/
README.md
DEPLOY-GUIDE-KO.md
```

10. Commit message에 `Upload UV Eye Texture Studio v0.2`라고 적고 커밋합니다.

## 2. Cloudflare Pages 배포

1. Cloudflare Dashboard에 로그인합니다.
2. `Workers & Pages`로 이동합니다.
3. `Create application`을 누릅니다.
4. `Pages`를 선택합니다.
5. `Connect to Git` 또는 `Import an existing Git repository`를 선택합니다.
6. GitHub 계정을 연결합니다.
7. `uv-eye-texture-studio` 저장소를 선택합니다.
8. Build 설정을 다음처럼 입력합니다.

```text
Production branch: main
Build command: npm run build
Build output directory: dist
```

9. Root directory는 비워 둡니다.
10. Save and Deploy를 누릅니다.
11. 성공하면 `프로젝트이름.pages.dev` 주소가 생성됩니다.

## 3. 이후 업데이트

새 버전을 받은 경우 GitHub 저장소의 파일을 새 버전 파일로 교체/업로드하고 commit하면 Cloudflare Pages가 자동으로 다시 배포합니다.
