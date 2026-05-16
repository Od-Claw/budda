# Direct Generated Cubemap Round 2 QA Report

Project: `D:\Documents\GitHub\budda\guji_buddha_hall_3d`

Date: 2026-05-16

Scope: Generated three new direct Codex image-generation cubemap candidates without OPENAI_API_KEY, without using old panorama/cubemap crops, without promoting to formal `public/assets/cubemap/4k`.

## Commands Run

- Generated native PNG faces with Codex built-in image generation.
- Upscaled each native face to 4096x4096 JPG with Sharp/Lanczos3, quality 95.
- Created contact sheets and manifests for all three runs.
- Ran `npm run build`: passed.
- Ran local preview/browser tests against `http://localhost:4173/budda/guji_buddha_hall_3d/`.

## Test URLs

- direct-gen-20260516-171619-a: `http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeSource=candidate&cubeSet=direct-gen-20260516-171619-a&cubeDebug=1&flameScale=1`
- direct-gen-20260516-171619-b: `http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeSource=candidate&cubeSet=direct-gen-20260516-171619-b&cubeDebug=1&flameScale=1`
- direct-gen-20260516-171619-c: `http://localhost:4173/budda/guji_buddha_hall_3d/?env=cubemap&cubeSource=candidate&cubeSet=direct-gen-20260516-171619-c&cubeDebug=1&flameScale=1`

## Candidate Summary

| runId | native size | upscaled size | clarity | seam | front Buddha | side walls | recommend promote |
|---|---:|---:|---:|---:|---|---|---|
| direct-gen-20260516-171619-a | 1254x1254 | 4096x4096 | 5/5 | 3/5 | Yes | Yes | ????? promote??? seam ????? |
| direct-gen-20260516-171619-b | 1254x1254 | 4096x4096 | 4/5 | 4/5 | Yes | Yes | ??????????????????? |
| direct-gen-20260516-171619-c | 1254x1254 | 4096x4096 | 5/5 | 4/5 | Yes | Yes | ?????????????? seam??????? promote? |

Seam score: 5 means least visible seam.

## direct-gen-20260516-171619-a

- Contact sheet: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-a\contact-sheet.jpg` (1.01 MB)
- Manifest: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-a\manifest.json`
- Native faces: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-a\native`
- Upscaled 4K faces: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-a\upscaled_4k`
- Native dimensions: 1254x1254 for px/nx/py/ny/pz/nz.
- Upscaled dimensions: 4096x4096 for px/nx/py/ny/pz/nz.
- Network candidate face loads: [object Object],[object Object],[object Object],[object Object],[object Object],[object Object] / 6.
- Console runtime errors: .
- Browser failed requests: [object Object]; no blocking runtime/WebGL error observed in captured summaries.
- Clarity score: 5/5.
- Seam score: 3/5.
- Front Buddha: ???????????????????? cubemap ??
- Left/right walls: ?????????????????????
- Notes: ???????????????????????
- Promote recommendation: ????? promote??? seam ?????

Screenshots:
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-a\candidate-initial.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-a\candidate-right-seam.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-a\candidate-left-seam.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-a\candidate-back.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-a\candidate-top.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-a\candidate-floor.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-a\candidate-offering-flame.png`

## direct-gen-20260516-171619-b

- Contact sheet: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-b\contact-sheet.jpg` (0.96 MB)
- Manifest: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-b\manifest.json`
- Native faces: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-b\native`
- Upscaled 4K faces: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-b\upscaled_4k`
- Native dimensions: 1254x1254 for px/nx/py/ny/pz/nz.
- Upscaled dimensions: 4096x4096 for px/nx/py/ny/pz/nz.
- Network candidate face loads: [object Object],[object Object],[object Object],[object Object],[object Object],[object Object] / 6.
- Console runtime errors: .
- Browser failed requests: [object Object]; no blocking runtime/WebGL error observed in captured summaries.
- Clarity score: 4/5.
- Seam score: 4/5.
- Front Buddha: ?????????????????????? A/C?
- Left/right walls: ????????????? A ???
- Notes: ???? A ??????????
- Promote recommendation: ???????????????????

Screenshots:
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-b\candidate-initial.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-b\candidate-right-seam.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-b\candidate-left-seam.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-b\candidate-back.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-b\candidate-top.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-b\candidate-floor.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-b\candidate-offering-flame.png`

## direct-gen-20260516-171619-c

- Contact sheet: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-c\contact-sheet.jpg` (0.98 MB)
- Manifest: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-c\manifest.json`
- Native faces: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-c\native`
- Upscaled 4K faces: `D:\Documents\GitHub\budda\guji_buddha_hall_3d\public\assets\cubemap\candidates\direct-gen-20260516-171619-c\upscaled_4k`
- Native dimensions: 1254x1254 for px/nx/py/ny/pz/nz.
- Upscaled dimensions: 4096x4096 for px/nx/py/ny/pz/nz.
- Network candidate face loads: [object Object],[object Object],[object Object],[object Object],[object Object],[object Object] / 6.
- Console runtime errors: .
- Browser failed requests: [object Object]; no blocking runtime/WebGL error observed in captured summaries.
- Clarity score: 5/5.
- Seam score: 4/5.
- Front Buddha: ??????????????????????????????
- Left/right walls: ????????????????? seam???? A ???
- Notes: ????????? seam ???????
- Promote recommendation: ?????????????? seam??????? promote?

Screenshots:
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-c\candidate-initial.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-c\candidate-right-seam.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-c\candidate-left-seam.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-c\candidate-back.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-c\candidate-top.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-c\candidate-floor.png`
- `D:\Documents\GitHub\budda\guji_buddha_hall_3d\test-artifacts\round2-direct-gen-20260516-171619-c\candidate-offering-flame.png`

## Best Candidate

bestCandidateRunId: `direct-gen-20260516-171619-c`

Reason: Candidate C has the strongest balance of front clarity and reduced seam visibility. Its dark stone/foliage transitions at side boundaries are more forgiving than A, while the front Buddha remains clearer and more vivid than B. It still has visible seam artifacts around side/back transitions, so it should not be promoted automatically.

## Current Issues

- All three candidates still have some cubemap seam, especially near side/back transitions.
- Candidate A has the brightest front but the most noticeable right-side seam.
- Candidate B is more coherent but visually darker and less crisp at the main front view.
- Candidate C is the best current candidate, but manual review is still required before promotion.

## Recommendation

Do not promote automatically. If the remaining seam is acceptable because the main usage starts at the front Buddha view, candidate C is the strongest manual-review candidate. If the seam must be cleaner, generate another 3 candidates with even stronger dark foliage/stone-column edge transitions and lower brightness at face borders.

## Git/Deployment Notes

- Formal `public/assets/cubemap/4k` was not overwritten.
- Candidate folders remain under `public/assets/cubemap/candidates`, which is ignored by git.
- No promote step was run.
