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

正式 GitHub Pages 網址：

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

## HD spherical patches

Stable builds do not load HD patches by default. The multi-patch layer is currently experimental because the patch images are not exported from one consistent 3D scene/camera rig; perspective, scale, lighting, and content can drift between patches.

Use the normal stable view without patches:

```text
https://od-claw.github.io/budda/guji_buddha_hall_3d/?quality=8k
```

Enable the experimental multi-patch layer manually:

```text
?quality=8k&hdPatches=1
?quality=8k&hdPatches=1&hdPatchDebug=1
```

The 8K panorama is still a single 360-degree equirectangular image, so its pixels are spread across the full sphere. True close-up clarity needs native high-detail local patch images, not just an upscaled panorama.

Place optional high-detail spherical patch assets here:

```text
public/assets/patches/guji_patch_front_8192x4096.jpg
public/assets/patches/guji_patch_left_4096x4096.jpg
public/assets/patches/guji_patch_right_4096x4096.jpg
public/assets/patches/guji_patch_back_4096x4096.jpg
public/assets/patches/guji_patch_ceiling_4096x2048.jpg
public/assets/patches/guji_patch_floor_4096x2048.jpg
```

If a patch file is missing, the app logs a warning and skips only that patch. Use these query parameters for comparison:

```text
?quality=8k&hdPatches=1&hdPatchDebug=1
?quality=8k&hdPatches=1&hdPatchDebug=1&textureDebug=1
?quality=8k&hdPatches=1&hdPatchOpacity=0.4
?quality=8k&hdPatches=1&hdYaw=5
```

Offering placement can be calibrated without changing code:

```text
?offeringDebug=1&offX=0.5&offY=0.705&offD=48&offScale=0.62
```

In offering debug mode, use Arrow keys for screen position, PageUp/PageDown for distance, and `[` / `]` for scale. The console prints a tuned URL that can be copied back into the defaults.

Patch source guidance:
- `front`: central Buddha, side small Buddhas, altar, old stone wall, no text or UI, 8192x4096.
- `left-wall` / `right-wall`: side stone walls and small shrine niches, 4096x4096.
- `back`: rear historic environment, stone wall, plants, light, 4096x4096.
- `ceiling`: canopy, sky glow, leaves, 4096x2048.
- `floor`: stone floor, plants, foreground ground detail, 4096x2048.

If these images are only cropped and enlarged from the current blurry panorama, clarity will remain limited. For a real improvement, replace them with natively high-detail regenerated, AI detail-upscaled, or inpainted patch images using the same filenames.

For a production-quality high-resolution result, prefer one of these source workflows instead of mixing unrelated patch images:

- Render a cubemap or equirectangular panorama from Blender, Unreal, or another coherent 3D scene.
- Generate a true native high-detail 16K equirectangular panorama.
- Export all spherical patches from the same 3D scene with matching projection, lighting, and camera origin.
