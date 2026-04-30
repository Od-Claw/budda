# GitHub Pages 上傳清單

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
- 本機測試暫存檔
- `*.log`
- `.DS_Store`
- `Thumbs.db`

## 影片設定

- 左牆影片使用本機 MP4：`assets/videos/bardo/videoplayback.mp4`，需要上傳到 GitHub。
- 左牆 MP4 以 Three.js `VideoTexture` 貼在佛堂左牆，不使用 YouTube iframe。
- 中央「影片控制」模式才使用 YouTube：`https://www.youtube.com/watch?v=wC9kd8zd9BU&t=260s`。
- YouTube 起始秒數為 `260`；同步規則為 YouTube 秒數 = `260 + 左牆 MP4 currentTime`。

## 靜態資料同步

GitHub Pages 是靜態網站，`admin.html` 儲存只會存在本瀏覽器 `localStorage`。若要所有設備同步超渡名單或照片資料，請在後台匯出 JSON 後上傳覆蓋：

- `assets/data/bardo_names.json`
- `assets/data/photos.json`
