# Dappled Sunlight Test Report

## 實作方式

- 新增 `src/dappledSunlight.ts`
  - `createDappledSunlight(...)`
    - 建立兩層全螢幕 canvas overlay
    - `dapple-shadow-overlay` 使用 `mix-blend-mode: multiply`
    - `dapple-glow-overlay` 使用 `mix-blend-mode: screen`
    - 低解析 canvas 內部繪製葉影、斑駁暖光、上方柔光與斜射光感
    - 以 deterministic seed 生成葉片與光斑，約 30fps 更新
  - `createSunbeamSprites(scene)`
    - 使用 `CanvasTexture` 生成 4 條淡金色 sunbeam sprites
    - additive blending
    - `depthWrite=false`
    - `depthTest=false`
- `src/main.ts`
  - 透過 URL 參數啟用/關閉 `sunDapple`
  - 在 animation loop 中呼叫 `dappledSunlight.update(elapsed)` 與 `sunbeams.update(elapsed)`
  - resize 時同步更新 overlay 尺寸
- `src/styles.css`
  - 新增 overlay 樣式
  - `#sceneCanvas` 固定在 `z-index: 1`
  - overlay 放在 `z-index: 2 / 3`
  - 原有 UI 仍維持高於 overlay 的層級

## 測試網址

- Default
  - `http://127.0.0.1:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k`
- Strong
  - `http://127.0.0.1:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDappleStrength=1.35&sunShadow=1.2&sunGlow=1.1`
- Off
  - `http://127.0.0.1:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDapple=0`
- Debug
  - `http://127.0.0.1:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDappleDebug=1`

## 截圖路徑

- `test-artifacts/dappled-sunlight/default.png`
- `test-artifacts/dappled-sunlight/strong.png`
- `test-artifacts/dappled-sunlight/off.png`

## 驗證結果

- 有斑駁陽光與樹葉陰影
  - `default.png` 可見上方柔光、中央大佛周圍暖光、供桌與地面光斑
  - `strong.png` 比 `default.png` 再強一級
  - `off.png` 不含這兩層 overlay 與 sunbeam 效果
- DOM 驗證
  - `default-dom.html` 內可找到 2 個 overlay class
  - `off-dom.html` 內 overlay class 計數為 0
- 點擊影響
  - overlay CSS 為 `pointer-events: none`
  - 本次未做 hotspot 自動點擊腳本，但設計上不會攔截 WebGL canvas 與 UI 事件
- UI 影響
  - UI 位於 overlay 之上，截圖中 top bar、提示面板、右上按鈕未被遮住
- Console / Network 狀態
  - `npm run build` 成功
  - `npm run preview` 成功
  - headless console 顯示
    - `[environment] cubemap loaded`
    - `sunDappleDebug=1` 時有 `[sunDapple] resize / active / created`
  - 未觀察到 app runtime exception 或 WebGL texture error
  - headless Chrome 有一條 `DEPRECATED_ENDPOINT` 的 Chrome/GCM 內部訊息，與本頁面功能無關

## 補充

- 本次未重新生成 cubemap
- 未改供佛、點燈、火焰、螢火蟲、localStorage、GitHub Actions
- 變更範圍只在 `src/dappledSunlight.ts`、`src/main.ts`、`src/styles.css`
