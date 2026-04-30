# GitHub Pages 上傳清單

此資料夾可作為 GitHub Pages 靜態網站根目錄上傳。Repo 根目錄應直接包含 `index.html`、`admin.html`、`assets/`、`.nojekyll`。

## 應上傳

- `index.html`
- `admin.html`
- `README_GITHUB_PAGES.md`
- `UPLOAD_TO_GITHUB.md`
- `.nojekyll`
- `.gitignore`
- `assets/data/bardo_names.json`
- `assets/data/photos.json`
- `assets/images/`
- `assets/audio/`
- `assets/videos/bardo/videoplayback.mp4`

## 不要上傳

- `assets/videos/bardo/original_videoplayback_203mb.mp4`
- `screenshots/`
- `backups/`
- 任何 `*_backup*`
- 任何本機測試暫存檔
- `*.log`
- `.DS_Store`
- `Thumbs.db`

## 靜態網站注意事項

GitHub Pages 是靜態網站，`admin.html` 的儲存只會存在目前瀏覽器的 `localStorage`。若要讓所有設備同步超渡名單或照片資料，請在後台匯出 JSON，並上傳覆蓋：

- `assets/data/bardo_names.json`
- `assets/data/photos.json`

替換超渡影片時，請確認正式上傳的 `assets/videos/bardo/videoplayback.mp4` 小於 GitHub 單檔 100MB 限制。原始大檔請保留在本機，不要 push。
