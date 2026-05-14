# 古蹟佛堂 3D 全景

Vite + TypeScript + Three.js 的古蹟佛堂全景互動專案，包含拖拽觀看、供佛、點燈、螢火蟲與 localStorage 紀錄。

## 本機開發

```bash
npm install
npm run dev
```

開發網址：

```text
http://localhost:5173/
```

## 建置與預覽

```bash
npm run build
npm run preview
```

這個專案正式部署在 GitHub Pages repo 子路徑：

```text
https://od-claw.github.io/budda/guji_buddha_hall_3d/
```

因此 production Vite base 必須是：

```text
/budda/guji_buddha_hall_3d/
```

本機 preview 請測試：

```text
http://localhost:4173/budda/guji_buddha_hall_3d/
```

如果 4173 被占用，Vite 會改用下一個可用 port，路徑仍然要包含 `/budda/guji_buddha_hall_3d/`。

## 必要素材

請確認高清環景圖存在：

```text
public/assets/guji_360_panorama_4096x2048.jpg
```

供品素材位於：

```text
public/assets/offerings/
```

程式會透過 `import.meta.env.BASE_URL` 組合 public asset 路徑，避免 GitHub Pages project site 誤抓 domain root 的 `/assets/...`。

## GitHub Pages 部署

GitHub Actions workflow 位於 repo 根目錄：

```text
.github/workflows/deploy-guji.yml
```

請到 GitHub repo：

```text
Settings -> Pages
```

將 Source 設為：

```text
GitHub Actions
```

不要選 `Deploy from a branch`、`main/root` 或 `main/docs`。這是 Vite 專案，必須由 Actions 執行 `npm run build`，再部署 build 出來的 `dist`。

## 調整燈位

燈位座標集中在：

```text
src/hotspots.ts
```

一般網址不顯示工程 debug；若要微調燈位，可使用：

```text
http://localhost:5173/?lampDebug=1
```
