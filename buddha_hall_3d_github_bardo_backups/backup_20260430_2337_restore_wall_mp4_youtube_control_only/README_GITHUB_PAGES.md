# 3D 超渡佛堂 GitHub Pages 靜態版

這是專門用於超渡法會的 3D 佛堂版本，仍可部署到 GitHub Pages。此版本不依賴 Python API，也不會在瀏覽器中直接寫回伺服器檔案。

## 本機預覽

```powershell
cd D:\buddha_hall_3d_github_bardo
python -m http.server 8094
```

打開：

```text
http://localhost:8094/
http://localhost:8094/admin.html
```

不要直接用 `file://` 雙擊開啟，瀏覽器可能阻擋 JSON、影片、貼圖或 ES module 載入。

## 前台功能

- 主尊只保留「地藏王菩薩」與「金剛薩埵」。
- 預設主尊為「地藏王菩薩」。
- 左右佛龕改為兩排佛像：上排地藏王菩薩、下排金剛薩埵。
- 每側 2 排 x 20 欄，共 40 格；左右合計 80 格，預留較多超渡名位容量。
- 佛像下方名牌顯示超渡名位，未填或到期顯示「待填名位」。
- 左牆播放 YouTube 超渡影片，預設靜音自動播放；第一次有聲播放需點擊「啟用超渡聲音」以符合瀏覽器 autoplay 限制。
- 「啟用超渡聲音」控制列位於畫面最上方，靠近操作按鈕，避免遮住佛龕與影片牆。
- 左上角「名單」按鈕可顯示有效超渡名單，方便回向時誦念。
- 「影片控制」可暫停左牆 YouTube，並立即在佛堂中央顯示同一支 YouTube；底部控制列支援播放、暫停、重新開始、進度拖曳、音量與關閉。
- 右牆可顯示「法照 / 供養照片」相框，照片資料由 `assets/data/photos.json` 或本機 `localStorage` 提供。

## 超渡名單資料

資料檔位置：

```text
assets/data/bardo_names.json
```

資料格式：

```json
[
  {
    "id": "bardo-left-row0-col0",
    "side": "left",
    "row": 0,
    "col": 0,
    "deity": "地藏王菩薩",
    "name": "亡者姓名或歷代宗親",
    "startDate": "2026-04-29",
    "endDate": "2026-06-17",
    "enabled": true,
    "notes": ""
  }
]
```

後台共 80 格。輸入 `startDate` 後會自動計算 `endDate = startDate + 49 days`。匯入少於 80 格的 JSON 時會自動補齊。前台若偵測到今天已超過 `endDate`，該格會顯示「待填名位」，不列入左上角超渡名單。

## 後台使用

後台：

```text
admin.html
```

可管理：

- 超渡名位 / 超渡人名
- 起始日期
- 到期日期
- 啟用狀態
- 備註
- 匯出 `bardo_names.json`
- 匯入 `bardo_names.json`
- 右牆照片資料
- 匯出 / 匯入 `photos.json`

GitHub Pages 是靜態網站，後台按「儲存全部」只會儲存在目前瀏覽器的 `localStorage`。若要所有設備看到最新資料：

1. 在 `admin.html` 編輯名單。
2. 匯出 `bardo_names.json`。
3. 上傳覆蓋 repo 中的 `assets/data/bardo_names.json`。
4. commit 後等待 GitHub Pages 更新。

## 右牆照片管理

照片資料檔：

```text
assets/data/photos.json
```

照片檔案資料夾：

```text
assets/images/photos/
```

後台的「照片管理」可新增、編輯、刪除、啟用 / 停用照片資料，欄位包含 `id`、`title`、`image`、`caption`、`enabled`、`durationSeconds`。GitHub Pages 靜態版無法直接上傳圖片或寫回伺服器；若要所有設備看到更新後的照片，請先把圖片放到 `assets/images/photos/`，在後台填入相對路徑，匯出 `photos.json`，再上傳覆蓋 `assets/data/photos.json` 並 commit。

## 超渡影片

本版本影片使用 YouTube，不需要上傳 MP4：

```text
https://www.youtube.com/watch?v=wC9kd8zd9BU&t=260s
```

YouTube video id：`wC9kd8zd9BU`  
起始秒數：`260`

GitHub Pages 不需要載入 `assets/videos/bardo/videoplayback.mp4`。若資料夾內仍保留本機 MP4 或原始大檔，只作本機備份用途，請不要上傳到 GitHub。

### 影片聲音與控制

- 左牆 YouTube 預設靜音播放，確保畫面可先出現。
- 若需要持續有聲超渡，請先點擊「啟用超渡聲音」。啟用後本瀏覽器會記住設定，之後會嘗試恢復有聲播放；若瀏覽器阻擋，仍需再點一次。
- 進入中央影片控制模式時，左牆 YouTube 會暫停，中央 YouTube 從同一時間點開始。
- 關閉中央影片後，左牆 YouTube 會同步到中央影片目前時間並繼續播放。
- 中央影片控制列在底部，避免遮住主尊與影片中央內容；進度條使用 YouTube IFrame API 拖曳定位。

## 佛樂與圖片

佛樂位置：

```text
assets/audio/buddha-music/
assets/audio/buddha-music/music_manifest.json
```

佛像、供品、八吉祥位置：

```text
assets/images/deities/
assets/images/offerings/
assets/images/symbols/
```

替換圖片時建議使用 PNG、透明背景、長邊至少 1024px。

## 上傳 GitHub Pages

將此資料夾內容放到 GitHub repo 根目錄，並在 repo 設定：

- Pages source: `main`
- Folder: `/ root`

需要包含：

- `index.html`
- `admin.html`
- `.nojekyll`
- `assets/`
- `README_GITHUB_PAGES.md`

超渡名單資料要一起上傳；影片使用 YouTube，不需要上傳 MP4：

- `assets/data/bardo_names.json`
- `assets/data/photos.json`
