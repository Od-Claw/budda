# 古蹟佛堂 3D 全景

Vite + TypeScript + Three.js 專案。使用 2:1 高清環景圖建立可拖拽旋轉觀看的戶外古蹟佛堂，並保留供佛、點燈、螢火蟲、localStorage 紀錄與回到佛前功能。

## 本機開發

```bash
npm install
npm run dev
```

開發網址：

```text
http://localhost:5173/
```

## 正式建置與預覽

```bash
npm run build
npm run preview
```

因為 GitHub Pages 會部署在 project site 子路徑，正式建置使用 Vite `base: "/guji_buddha_hall_3d/"`。

本機 `npm run preview` 後，請用下面路徑測試：

```text
http://localhost:4173/guji_buddha_hall_3d/
```

## 必要素材

請確認此檔案存在，且檔名大小寫完全一致：

```text
public/assets/guji_360_panorama_4096x2048.jpg
```

程式會透過 `import.meta.env.BASE_URL` 組合素材路徑，避免 GitHub Pages 上誤抓 domain root 的 `/assets/...`。

供品素材位於：

```text
public/assets/offerings/
```

## GitHub Pages 部署

此專案已提供：

```text
.github/workflows/deploy.yml
```

請到 GitHub repo：

```text
Settings -> Pages
```

將 Source 設為：

```text
GitHub Actions
```

不要選 `main/root`，因為這是 Vite 專案，應部署 `npm run build` 產出的 `dist`。

## 調整熱點

燈位與供佛熱點集中在：

```text
src/hotspots.ts
```

修改 `lon` / `lat` 後重新 build 即可。若需要定位輔助，可用：

```text
http://localhost:5173/?lampDebug=1
```

一般網址不會顯示 debug 文字。
