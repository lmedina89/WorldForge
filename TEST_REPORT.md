# WorldForge v0.13.28 Test Report

## Scope

Focused GAME TERRAIN correction only: **PBR V7 · SOURCE DETAIL** plus bounds/frustum-safe camera framing. No terrain geometry, splat layout, roads, water, route definitions, production GLBs, protected generators, or ForgeRTS runtime snapshot files were changed.

## Validation completed

- PASS — 94 JS/MJS files pass `node --check` syntax validation.
- PASS — all 5 `game-terrain-*.test.mjs` regression tests pass.
- PASS — 34 tests that are self-contained inside this GitHub-ready ZIP pass.
- NOT RUN — 7 historical regression tests require older `worldforge-v0.x` directories outside this ZIP; those baseline directories are not bundled in this artifact.
- PASS — protected ForgeRTS v0.6.6.8 runtime files still match `runtime-sync-manifest.json` SHA-256 hashes.
- PASS — all 16 production GLBs are byte-identical to the v0.13.27 input build.
- PASS — all bundled terrain source assets, including the Poly Haven PBR files, are byte-identical to the v0.13.27 input build.
- PASS — Iron Valley remains 768×576 m and all six authored vehicle validation routes retain their prior validated slope results.

## PBR V7 checks

- PASS — active experimental renderer is `TerrainRendererV7` / renderer version 0.7.0.
- PASS — Poly Haven albedo is sampled directly and remains the dominant material-color signal.
- PASS — V6's distance-based albedo suppression is absent from V7.
- PASS — source-average color correction is restrained per material rather than replacing photographic color variation.
- PASS — normal detail persists through CLOSE/GROUND distances and fades before WIDE becomes noisy.
- PASS — Three.js mipmap filtering, anisotropy cap, tone mapping, and output color-space chunks remain present.
- PASS — road overlay stabilization from v0.13.27 remains intact.

## Camera checks

- PASS — Game Terrain camera far plane now scales to at least `max(1800, mapMaxDimension × 3)`; Iron Valley resolves to 2304 m instead of the old shared 400 m far plane.
- PASS — Iron Valley WIDE camera distance is about 522 m, so the old 400 m far plane was capable of clipping most of the battlefield.
- PASS — strategic WIDE orthographic span is derived from projected map bounds plus sampled terrain height range instead of a hand-guessed fixed span.
- PASS — TOP fits both 768×576 map dimensions against the actual viewport aspect.

## Device validation still required

This environment could not perform a trustworthy browser/WebGL visual capture of the GitHub Pages app, so final appearance remains an on-device iPhone Safari check. Test in this order: **WIDE → CLOSE → GROUND → TOP**. WIDE should keep the full battlefield visible; CLOSE/GROUND should visibly show the actual grass/soil/rock source texture character rather than flat palette color.
