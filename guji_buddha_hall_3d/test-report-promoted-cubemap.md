# Promoted Cubemap QA Report

Project: `D:\Documents\GitHub\budda\guji_buddha_hall_3d`

Promoted runId: `direct-gen-20260516-171619-c`

Promotion command: `npm run promote:cubemap -- direct-gen-20260516-171619-c`

Backup path: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\backups\backup-20260516-222533`

## Formal 4K Cubemap Assets

| face | path | dimensions | size | modified |
|---|---|---:|---:|---|
| px.jpg | `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\4k\px.jpg` | 4096x4096 | 6.05 MB | 2026-05-16T10:45:42.588Z |
| nx.jpg | `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\4k\nx.jpg` | 4096x4096 | 6.12 MB | 2026-05-16T10:45:45.397Z |
| py.jpg | `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\4k\py.jpg` | 4096x4096 | 6.69 MB | 2026-05-16T10:45:47.416Z |
| ny.jpg | `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\4k\ny.jpg` | 4096x4096 | 6.36 MB | 2026-05-16T10:45:49.162Z |
| pz.jpg | `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\4k\pz.jpg` | 4096x4096 | 5.88 MB | 2026-05-16T10:45:51.457Z |
| nz.jpg | `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\4k\nz.jpg` | 4096x4096 | 6.06 MB | 2026-05-16T10:45:53.767Z |

## Build Result

- `npm run build`: passed.
- Vite emitted only the existing chunk-size warning; no TypeScript or runtime build error.

## Preview Test

URL tested: `http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeQuality=4k&cubeDebug=1`

Screenshots:
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\front.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\right.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\left.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\back.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\top.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\floor.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\offerings.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\flame.png`

## Network Evidence

Formal cubemap image URLs loaded (6/6 unique):
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/4k/px.jpg
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/4k/nx.jpg
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/4k/py.jpg
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/4k/nz.jpg
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/4k/ny.jpg
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/cubemap/4k/pz.jpg

Additional relevant assets loaded:
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/buddha_candle_gold_glow_256.png (200)
- http://localhost:4173/budda/guji_buddha_hall_3d/assets/buddha_candle_flame_spritesheet_12x256.png (200)

Candidate path loads: 0.
HD patch path loads: 0.

## Visual QA

- Front/nz: promoted candidate C is active; the main Buddha, altar, side niches, and stone wall are clear.
- Right/px and left/nx: both side views show the new niche-wall cubemap faces, with visibly sharper detail than the previous formal cubemap.
- Back/pz: the back face shows a stone passage/wall scene, not another main Buddha.
- Top/py: the top face shows forest canopy and warm overhead light.
- Floor/ny: the bottom face shows stone paving and ground detail.
- Seam: side/back seams are still visible in places, but the main front-view quality is substantially improved and the remaining seam is acceptable for this promoted pass.
- Overall clarity: clearer than the previous formal cubemap, especially in the front Buddha, altar, and side niche-wall details.

## Functional QA

- Offering panel opened via hotspot: true.
- Offerings added: 7.
- Lamp modal opened via hotspot: true.
- Lamp records after confirm: 1.
- Flame visual screenshot captured: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\promoted-cubemap-direct-gen-20260516-171619-c\flame.png`.
- Fireflies remained active visually during preview; no related console error captured.

## Console Errors

No runtime errors captured. No WebGL texture error captured.

## Deployment Recommendation

Recommend deploying to GitHub Pages after commit. Formal cubemap now uses `direct-gen-20260516-171619-c`; candidates and test screenshots were not staged.
