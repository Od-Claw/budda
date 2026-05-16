# Lamp Hotspots And Candle Size QA Report

Project: `D:\Documents\GitHub\budda\guji_buddha_hall_3d`

Date: 2026-05-17

## Scope

- Confirm formal cubemap view does not show cube face labels such as `nz`, `px`, `nx`, `py`, `ny`, or `pz`.
- Replace the lamp hotspot set for the promoted generated cubemap.
- Add an `altar` candle preset so altar lamps render as shorter, more delicate flames.
- Preserve offering flow, localStorage keys, fireflies, GitHub Actions, and cubemap assets.

## Code Changes

- `src/hotspots.ts`
  - Replaced the previous lamp hotspot list with promoted-cubemap positions.
  - Added front Buddha lamps, front niche lamps, three altar lamps, left/right wall lamps, and back niche lamps.
  - Added `size: "altar"` support in hotspot typing.
  - Restored readable labels such as `供佛`, `供桌左前燈`, `左側小佛燈`.

- `src/candles.ts`
  - Added `altar` lamp size preset.
  - Altar flame target: 32 px, glow target: 62 px.
  - Wall flame target: 46 px, glow target: 88 px.
  - Main flame target: 64 px, glow target: 125 px.
  - Added max-height clamp to prevent flicker from stretching into a light column.
  - Reduced altar glow opacity and spark height.

- `src/cubemapSkybox.ts`
  - No code change required. Face labels are already created only when `cubeDebug=1`.

## Build

- `npm run build`: passed.
- Vite emitted only the existing chunk-size warning.

## Test URLs

- Formal view: `http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k`
- Lamp debug: `http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&lampDebug=1`
- Cube debug: `http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&cubeDebug=1`

## Screenshots

- Formal page without cube labels: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\lamp-hotspots-candle-size\formal-no-cube-label.png`
- Lamp debug labels: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\lamp-hotspots-candle-size\lamp-debug.png`
- Altar-left lamp lit: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\lamp-hotspots-candle-size\altar-left-front-lit.png`
- Front small Buddha lamp lit: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\lamp-hotspots-candle-size\front-small-buddha-lit.png`
- Cube debug labels: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\lamp-hotspots-candle-size\cube-debug-label.png`

## Network / Console

- Formal view loaded `assets/cubemap/4k/px.jpg`, `nx.jpg`, `py.jpg`, `ny.jpg`, `pz.jpg`, and `nz.jpg`.
- Formal view loaded candle flame/glow textures successfully.
- Candidate cubemap loads: 0.
- HD patch loads: 0.
- Console runtime errors: none captured.
- WebGL texture errors: none captured.

## Functional Results

- Formal page does not show `nz`, `px`, `nx`, `py`, `ny`, or `pz` labels.
- `cubeDebug=1` still shows cube face labels for debugging.
- `lampDebug=1` shows lamp id labels and logs lon/lat in the console when clicking empty scene space.
- Altar-left lamp opens the lamp modal and can be confirmed.
- Front small Buddha lamp opens the lamp modal and can be confirmed.
- After confirming both test lamps, localStorage had 2 lamp records.
- Altar-left flame is shorter and no longer renders as a tall light column.
- Offering and firefly systems were not changed.

## Recommendation

Recommend deploying this refinement. The formal page is clean of cubemap debug text, the promoted cubemap has a fuller lamp hotspot set, and altar candle flames are now better proportioned.
