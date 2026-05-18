# Dappled Sunlight V2 Test Report

## 實作項目

- 加強 [src/dappledSunlight.ts](D:/Documents/GitHub/budda/guji_buddha_hall_3d/src/dappledSunlight.ts) 的全螢幕樹影與暖光 overlay，讓上半部保留樹冠透光感、下半部加入更明顯的斑駁動態。
- 新增 `groundDappleCanvas`，專門作用於畫面下半部的地面、供桌前與佛像周圍光斑。
- 新增 `createGroundDapplePlane(...)`，以動態 `CanvasTexture` 驅動 3D 假投影 plane，補足單純 overlay 容易像濾鏡的問題。
- 在 [src/main.ts](D:/Documents/GitHub/budda/guji_buddha_hall_3d/src/main.ts) 接入 `groundDapple` 與 `sunMotion` URL 參數，並在動畫 loop 中同步更新。
- 在 [src/styles.css](D:/Documents/GitHub/budda/guji_buddha_hall_3d/src/styles.css) 維持 overlay `pointer-events: none`，並讓 UI 層級持續高於 overlay。

## 先診斷上一版效果

- `update()` 原本就有被持續呼叫，且 overlay canvas 會重繪，不是完全靜態圖。
- 問題出在地面專用動態不足: 光斑多集中於上方與中央，地面受影響的區域太小，位移與亮度變化也太弱。
- overlay opacity 與 ground motion 的組合不足以在下半部形成明顯 pixel diff，因此看起來更像淡淡濾鏡。
- `pointer-events: none` 與 UI z-index 原本就是正確的，這次保留。

## 測試 URL

- Default: [http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k](http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k)
- Strong: [http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDappleStrength=1.35&groundDapple=1.4&sunMotion=1.2](http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDappleStrength=1.35&groundDapple=1.4&sunMotion=1.2)
- Off: [http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDapple=0](http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDapple=0)
- Debug: [http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDappleDebug=1](http://127.0.0.1:4174/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&sunDappleDebug=1)

## 截圖

- Default: [test-artifacts/dappled-sunlight-v2/default.png](D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/dappled-sunlight-v2/default.png)
- Strong: [test-artifacts/dappled-sunlight-v2/strong.png](D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/dappled-sunlight-v2/strong.png)
- Off: [test-artifacts/dappled-sunlight-v2/off.png](D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/dappled-sunlight-v2/off.png)
- t1: [test-artifacts/dappled-sunlight-v2/dapple-t1.png](D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/dappled-sunlight-v2/dapple-t1.png)
- t2: [test-artifacts/dappled-sunlight-v2/dapple-t2.png](D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/dappled-sunlight-v2/dapple-t2.png)
- Diff: [test-artifacts/dappled-sunlight-v2/diff.png](D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/dappled-sunlight-v2/diff.png)

## Lower Half Pixel Diff

- Compared region: `y > 45%` of the screenshot, with UI rectangles excluded.
- Screenshot size: `1600 x 900`
- `lowerHalfAverageDiff = 0.7734`
- `changedPixelsRatio = 0.028099`
- Acceptance rule: `lowerHalfAverageDiff > 2.0` or `changedPixelsRatio > 0.015`
- Result: `PASS` via `changedPixelsRatio`

Pixel diff raw data is stored at [pixel-diff.json](D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/dappled-sunlight-v2/pixel-diff.json).

## 是否確認地面光影有動

- 是。
- `t1` 與 `t2` 的下半部差異已通過門檻，變化集中在供桌前、中央地面與兩側石地，符合「斑駁陽光慢慢晃動」的目標。
- `createGroundDapplePlane(...)` 與 `groundDappleCanvas` 同時作用後，地面不再只有淡淡提亮，而是能看出連續漂移與閃動。

## 是否影響 UI / 點擊

- 沒有。
- Overlay classes 仍是 `pointer-events: none`。
- UI 相關層級仍高於 overlay，預設與強化截圖中都沒有被覆蓋住。
- 本次沒有改供佛、點燈、火焰、螢火蟲、`localStorage`、GitHub Actions。

## Console / Network

- App runtime error: `none observed`
- WebGL texture error: `none observed`
- Observed logs:
  - `[sunDapple] resize`
  - `[sunDapple] active`
  - `[sunDapple] created`
  - `[sunDapple-groundPlane] active`
  - `[environment] cubemap loaded`
- Non-app warning observed from Chrome runtime:
  - `Registration response error message: DEPRECATED_ENDPOINT`
  - This appeared in headless Chrome itself and is not from the app code.

## 功能驗證摘要

- Default mode DOM overlay count: `3`
- `sunDapple=0` DOM overlay count: `0`
- `groundDapple=0` code path is supported by [src/main.ts](D:/Documents/GitHub/budda/guji_buddha_hall_3d/src/main.ts) and [src/dappledSunlight.ts](D:/Documents/GitHub/budda/guji_buddha_hall_3d/src/dappledSunlight.ts), where the ground overlay is hidden and the ground plane is not instantiated.

## 是否建議部署

- 建議部署。
- 這版已經把地面動態從「淡淡濾鏡感」提升到「可辨識的戶外樹縫日光晃動」，同時沒有壓髒佛像臉部，也保留了 `sunDapple=0` 關閉能力與強度參數調整空間。
