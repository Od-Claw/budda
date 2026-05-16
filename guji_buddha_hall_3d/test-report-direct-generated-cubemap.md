# Direct Generated Cubemap QA Report

Run ID: `direct-gen-20260516-163451`

## Generation Method

- Used Codex built-in image generation.
- Did not use `OPENAI_API_KEY`.
- Did not use the existing equirectangular panorama.
- Did not crop, resize, or wash the old cubemap.
- Built-in image generation in this environment produced native `1254x1254` PNG images, recorded honestly below.
- `upscaled_4k` images are Lanczos3 upscales to `4096x4096` JPEG quality 95 for candidate testing only.
- `referenceSupported`: false. The built-in tool did not expose a verifiable fixed seed/reference-image cubemap workflow, so consistency is prompt-based rather than guaranteed.

## Files

Contact sheet:
`D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/contact-sheet.jpg`

Manifest:
`D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/manifest.json`

| Face | Native PNG | Native size | Native bytes | Upscaled JPG | Upscaled size | Upscaled bytes |
|---|---|---:|---:|---|---:|---:|
| px | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/native/px.png` | 1254x1254 | 3304764 | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/px.jpg` | 4096x4096 | 6078513 |
| nx | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/native/nx.png` | 1254x1254 | 3325927 | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/nx.jpg` | 4096x4096 | 6119686 |
| py | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/native/py.png` | 1254x1254 | 3727370 | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/py.jpg` | 4096x4096 | 7258842 |
| ny | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/native/ny.png` | 1254x1254 | 3457258 | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/ny.jpg` | 4096x4096 | 6331168 |
| pz | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/native/pz.png` | 1254x1254 | 3377705 | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/pz.jpg` | 4096x4096 | 6341059 |
| nz | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/native/nz.png` | 1254x1254 | 3236611 | `D:/Documents/GitHub/budda/guji_buddha_hall_3d/public/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/nz.jpg` | 4096x4096 | 5756491 |

## Three.js Test

URL tested:
`http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeSource=candidate&cubeSet=direct-gen-20260516-163451&cubeDebug=1`

Build:
- `npm run build` passed.
- Vite chunk-size warning only; no TypeScript/build error.

Screenshots:
- Initial/front: `D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/direct-gen-direct-gen-20260516-163451/candidate-initial.png`
- Side view: `D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/direct-gen-direct-gen-20260516-163451/candidate-side.png`
- Offering flow check: `D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/direct-gen-direct-gen-20260516-163451/candidate-offering.png`
- Flame visual check: `D:/Documents/GitHub/budda/guji_buddha_hall_3d/test-artifacts/direct-gen-direct-gen-20260516-163451/candidate-flame.png`

## Network

Candidate cubemap loads:
- 200 http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/px.jpg
- 200 http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/nx.jpg
- 200 http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/pz.jpg
- 200 http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/ny.jpg
- 200 http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/py.jpg
- 200 http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/candidates/direct-gen-20260516-163451/upscaled_4k/nz.jpg

Patch loads:
- 0 `assets/patches` requests. HD patches were not loaded.

Console errors:
- None

## Visual QA

- `nz` is the front Buddha face and is substantially clearer than the current formal cubemap.
- `px` and `nx` are side Buddha-niche walls.
- `pz` is a rear courtyard / rear wall view and does not show the central main Buddha.
- `py` is forest canopy / upper ruins.
- `ny` is stone ground.
- No obvious text, UI, watermark, or people were visible in the face images during manual contact-sheet review.
- The style is coherent enough for a prototype candidate, but it is not a true seamless cubemap. In the Three.js view, a visible vertical seam appears near the right edge of the front view.
- Because faces were independently generated and reference/seed control was not available, geometry continuity is not guaranteed.

## App QA

- Candidate cubemap loads via `cubeSource=candidate&cubeSet=direct-gen-20260516-163451`.
- Offering flow still writes localStorage; test added one offering record successfully.
- Flame visual still works with the candidate environment.
- Fireflies and existing UI were not changed by this task.
- Formal `public/assets/cubemap/4k` was not overwritten.
- Candidate folder remains under ignored `public/assets/cubemap/candidates/`.

## Recommendation

Do not promote automatically yet.

This candidate is visually sharper and a strong prototype, especially `nz`, `px`, and `nx`. However, because the built-in generation path cannot guarantee cubemap continuity, the seam is visible and manual review is needed before promotion. If you accept the seam for a sharper prototype, promote this run manually with:

`npm run promote:cubemap -- direct-gen-20260516-163451`

If you want cleaner geometry continuity, generate another candidate run and compare contact sheets / in-browser seams before promoting.
