# 古蹟佛堂 3D 全景互動

這是一個 Vite + TypeScript + Three.js 製作的戶外古蹟佛堂互動全景專案。畫面直接使用 2:1 高清 360 全景圖建立全景球，並保留佛前供佛、左右佛燈點燈、動態燭火、螢火蟲與 localStorage 紀錄。

## 安裝與啟動

```bash
npm install
npm run dev
```

開啟：

```text
http://localhost:5173/
```

## 全景圖片

目前程式直接載入：

```text
public/assets/guji_360_panorama_4096x2048.jpg
```

對應瀏覽器 URL：

```text
/assets/guji_360_panorama_4096x2048.jpg
```

如果此檔案不存在，請把提供的高清 4096x2048 2:1 全景圖放到：

```text
D:\佛堂專案\guji_buddha_hall_3d\public\assets\guji_360_panorama_4096x2048.jpg
```

## 功能

- 拖拽旋轉觀看 360 全景佛堂。
- 滾輪縮放視角。
- 點擊佛前供桌開啟供佛面板。
- 可供鮮花、蓮花、水杯、果盤、香、酥油燈、金色供品。
- 供品會以小型 3D 物件放在佛前供桌區域，並保存到 localStorage。
- 點擊左右佛燈需輸入名字後才會點亮。
- 已點亮佛燈會顯示動態燭火並保存到 localStorage。
- 螢火蟲為純裝飾，不會影響熱點點擊。

## 調整熱點

熱點座標集中在：

```text
src/hotspots.ts
```

可調整 `lon` / `lat` 來對齊全景圖中的供桌與左右佛燈位置。
