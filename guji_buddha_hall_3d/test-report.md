# Guji Buddha Hall 3D QA Test Report

Test date: 2026-05-16  
Project: `D:\Documents\GitHub\budda\guji_buddha_hall_3d`  
Preview base URL: `http://localhost:4173/budda/guji_buddha_hall_3d/`

## 1. Commands Run

```powershell
cd D:\Documents\GitHub\budda\guji_buddha_hall_3d
npm install
npm run build
```

Preview status:

- Port `4173` was already listening.
- Verified `http://localhost:4173/budda/guji_buddha_hall_3d/` returned `200`.
- Verified built JS `http://localhost:4173/budda/guji_buddha_hall_3d/assets/index-CAMl46vz.js` returned `200`.

Generated cubemap pipeline checks:

```powershell
npm run generate:cubemap
npm run upscale:cubemap
npm run validate:cubemap
```

Results:

- `generate:cubemap` stopped correctly because `OPENAI_API_KEY` is missing.
- `upscale:cubemap` stopped correctly because there are no candidate runs yet.
- `validate:cubemap` checked legacy `generated/` and failed because no generated files exist. This is expected before image generation.

Build result:

- `npm run build` passed.
- Vite emitted only the existing chunk-size warning.

## 2. Browser / Screenshot Method

Browser testing used local Chrome through DevTools Protocol with a clean temporary browser profile.

Screenshot folder:

`D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42`

Additional offering placement tuning screenshots:

`D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\offering-tune-2026-05-16T07-27-31`

`D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\offering-lower-2026-05-16T07-29-06`

Raw collected Network / Console data:

`D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\qa-results.json`

## 3. Equirect 8K Test

URL opened:

`http://localhost:4173/budda/guji_buddha_hall_3d/?env=equirect&quality=8k`

Screenshots:

- Full view: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\equirect_full.png`
- Buddha crop: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\equirect_buddha_crop.png`
- Side/niche view: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\equirect_side_niches.png`

Network image requests:

- `200 assets/buddha_candle_flame_spritesheet_12x256.png`
- `200 assets/buddha_candle_gold_glow_256.png`
- `200 assets/guji_360_panorama_8192x4096_sharp_q95.jpg`

Console:

- `[panorama] loading Object`
- `[environment] equirectangular panorama loaded`
- One non-blocking `favicon.ico` 404.
- No WebGL texture error.

Result:

- The 8K equirect image is actually loading.
- The image file exists and is `8192x4096`.
- Visual quality is still soft in the Buddha crop. This is not a fallback/path issue; the loaded image itself does not contain enough native detail for close inspection.

## 4. Cubemap 4K Formal Test

URL opened:

`http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&cubeDebug=1`

Screenshots:

- Front / nz: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\cubemap_front_debug.png`
- Side wall: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\cubemap_left_or_right_wall.png`
- Upward view: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\cubemap_top.png`
- Lower/side view: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\cubemap_down.png`

Network image requests:

- `200 assets/cubemap/4k/px.jpg`
- `200 assets/cubemap/4k/nx.jpg`
- `200 assets/cubemap/4k/py.jpg`
- `200 assets/cubemap/4k/ny.jpg`
- `200 assets/cubemap/4k/pz.jpg`
- `200 assets/cubemap/4k/nz.jpg`
- `200 assets/buddha_candle_flame_spritesheet_12x256.png`
- `200 assets/buddha_candle_gold_glow_256.png`

Not loaded:

- No `assets/patches/*.jpg` request was observed. HD patches are not being loaded unless explicitly requested.

Console:

- `[cubemap] loaded Object`
- `[environment] cubemap loaded`
- No runtime errors.
- No WebGL texture errors.

Result:

- Cubemap is truly loading.
- `nz.jpg` is the front face and shows the Buddha in front.
- Side rotation shows side wall / niche content.
- Upward view shows canopy/tree detail.
- The formal cubemap is more spatially stable than the equirect, but it is still not truly sharp. The six `4096x4096` faces are present, but the source detail appears soft/compressed.

Asset metadata checked:

- `guji_360_panorama_8192x4096_sharp_q95.jpg`: `8192x4096`, `11618333` bytes
- `guji_360_panorama_4096x2048.jpg`: `4096x2048`, `2762026` bytes
- `cubemap/4k/px.jpg`: `4096x4096`, `3582478` bytes
- `cubemap/4k/nx.jpg`: `4096x4096`, `3330132` bytes
- `cubemap/4k/py.jpg`: `4096x4096`, `4594834` bytes
- `cubemap/4k/ny.jpg`: `4096x4096`, `3438726` bytes
- `cubemap/4k/pz.jpg`: `4096x4096`, `3134955` bytes
- `cubemap/4k/nz.jpg`: `4096x4096`, `3652994` bytes

The cubemap is not falling back. The remaining blur is mainly source-image detail/quality, not Three.js loading failure.

## 5. Offering Position Test

URL opened:

`http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&cubeDebug=1&offeringDebug=1`

Operation:

1. Clicked near the front altar/table hotspot.
2. Added all offerings through the offering buttons:
   - flower
   - lotus
   - water
   - fruit
   - incense
   - butterLamp
   - gold

Screenshot:

`D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\offerings_after_add.png`

Network offering image requests:

- `200 assets/offerings/flower.png`
- `200 assets/offerings/lotus.png`
- `200 assets/offerings/water.png`
- `200 assets/offerings/fruit.png`
- `200 assets/offerings/incense.png`
- `200 assets/offerings/lamp.png`
- `200 assets/offerings/gold.png`

Console:

- `Offering button clicked ...`
- `Offering added ...`
- `Offerings root screen position Object`
- No runtime errors.

Storage:

- `guji-temple-offerings` was written with seven offering records.

Visual result:

- Offering creation works.
- Offering assets load.
- The current default placement is not ideal. In tuning screenshots, default placement appears too high/back, closer to the raised altar/stair area rather than the lower central red main table.
- It is centered horizontally.
- It does not block the Buddha.
- It does not appear massively oversized.
- It needs lower screen placement and slightly stronger scale to sit visually on the front main table.

Tuning screenshots:

- Default: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\offering-lower-2026-05-16T07-29-06\lower0755.png`
- Lower: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\offering-lower-2026-05-16T07-29-06\lower0770.png`
- Lower/larger: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\offering-lower-2026-05-16T07-29-06\lower0800_larger.png`

Suggested next parameters to try:

```text
offX=0.50
offY=0.800
offD=42
offScale=0.78
```

If that feels too low, use:

```text
offX=0.50
offY=0.770
offD=48
offScale=0.62
```

## 6. Lamp / Candle Test

URL opened:

`http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&cubeDebug=1&flameScale=1`

Operation:

1. Clicked a main-left lamp hotspot.
2. Name modal opened.
3. Entered test name.
4. Confirmed lighting.
5. Clicked the lit hotspot again.

Screenshots:

- After lighting: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\lamp_lit.png`
- Info modal after clicking lit lamp again: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\qa-2026-05-16T07-25-42\lamp_info_after_second_click.png`

Network:

- `200 assets/buddha_candle_flame_spritesheet_12x256.png`
- `200 assets/buddha_candle_gold_glow_256.png`
- Cubemap 4K faces loaded successfully.

Console:

- No runtime errors.
- No WebGL texture errors.

Storage:

- `guji-temple-lamps` was written.
- Clicking an already-lit lamp opened the info modal with name/time.

Visual result:

- Lamp workflow works.
- Name modal works.
- Re-click info modal works.
- Flame/glow texture assets load.
- The flame at `flameScale=1` is too subtle in the screenshot. It is not visually obvious enough as a candle flame from the current viewing distance.
- The tested flame does not appear to be on the Buddha head; it is around the main altar/lamp region, but too small/low-contrast to judge fine placement confidently from the screenshot.

Recommended next test before changing code:

```text
?flameScale=1.3
?flameScale=1.5
```

If those look correct, set a slightly higher default target pixel size or default `flameScale`.

## 7. Generated Cubemap Candidate Pipeline

Environment:

- `OPENAI_API_KEY` is missing in the current shell.

Command result:

```powershell
npm run generate:cubemap
```

Output:

```text
Missing OPENAI_API_KEY. Cannot generate images.
```

Result:

- Correct behavior.
- It did not create fake files.
- It did not overwrite formal `public/assets/cubemap/4k/`.

Other checks:

- `npm run upscale:cubemap` reports no candidates, as expected.
- `npm run validate:cubemap` fails for empty legacy `generated/`, as expected before generation.
- `public/cubemap-review/index.html` is copied into `dist/cubemap-review/index.html`.

## 8. Current Problems

1. **Image quality is still not truly high definition.**
   - The app is loading the intended equirect 8K and cubemap 4K assets.
   - There is no evidence of fallback to lower-res assets in the tested URLs.
   - The visible softness comes from the image assets themselves, not from a missing texture request.

2. **Cubemap formal assets are present but still visually soft.**
   - All six `4k` faces are `4096x4096`, but file sizes are only around 3-4.6 MB each.
   - The images look compressed/soft at close inspection.
   - This confirms the earlier suspicion: the current assets are not native high-detail enough.

3. **Offerings are functional but not perfectly seated on the main table.**
   - Default placement is too high/back.
   - Better trial result: `offX=0.50&offY=0.800&offD=42&offScale=0.78`.

4. **Lamp workflow works, but flame visibility is weak at default scale.**
   - The flame/glow assets load.
   - The lit state persists and info modal works.
   - Flame is too subtle at `flameScale=1`.

5. **Only non-app console error observed:**
   - `favicon.ico` 404 in the equirect test.
   - This does not affect WebGL or app behavior.

## 9. Recommended Next Steps

1. **Do not spend more time tuning Three.js sampling for sharpness.**
   The correct assets are loading. The remaining blur is source asset quality.

2. **Run the multi-candidate cubemap generation pipeline with an API key.**

   ```powershell
   $env:OPENAI_API_KEY="..."
   $env:CUBEMAP_VARIANTS="2"
   $env:CUBEMAP_IMAGE_SIZE="2880x2880"
   $env:OPENAI_IMAGE_QUALITY="high"

   npm run generate:cubemap
   npm run upscale:cubemap
   ```

   Then review:

   ```text
   http://localhost:4173/budda/guji_buddha_hall_3d/cubemap-review/
   http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeSource=candidate&cubeSet=<runId>&cubeDebug=1
   ```

3. **Only promote a candidate after visual review.**

   ```powershell
   npm run promote:cubemap -- <runId>
   ```

4. **Next code change, if approved:**
   - Update default offering placement to:
     `screenX=0.50`, `screenY=0.800`, `distance=42`, `scale=0.78`
   - Test flame default with `flameScale=1.3` or `1.5`; if good, raise default flame target pixels slightly.

5. **Optional cleanup:**
   Add a favicon to remove the harmless `favicon.ico` 404.

