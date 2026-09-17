# GitHub / Cloudflare 업데이트 방법

이미 v0.5가 GitHub + Cloudflare에 올라가 있다면 새 사이트를 만들 필요가 없습니다.

1. `uv-eye-texture-studio-v0.6.zip` 압축을 풉니다.
2. 기존 컴퓨터의 `uv-eye-texture-studio` GitHub 로컬 폴더를 엽니다.
3. **v0.6 폴더 자체를 넣지 말고, v0.6 안의 파일과 폴더를 전부 기존 폴더에 덮어씁니다.**
4. GitHub Desktop을 엽니다.
5. Changes에 수정 파일이 나타나는지 확인합니다.
6. Summary에 `Upgrade UV Eye Texture Studio to v0.6` 입력.
7. `Commit to main` 클릭.
8. `Push origin` 클릭.
9. Cloudflare Pages가 연결되어 있다면 자동으로 새 배포가 시작됩니다.

Cloudflare 설정은 기존 그대로입니다.

- Build command: `npm run build`
- Build output directory: `dist`

배포 실패 시 Cloudflare의 Build log 전체를 복사해 ChatGPT에 보내면 됩니다.
