# WorldForge v0.13.29 Test Report

## Scope

Focused GAME TERRAIN visual correction only: **PBR V8 · DIRECT SOURCE**, road presentation, and Game Terrain camera framing. No ForgeRTS gameplay terrain authority, Training Ground map data, Iron Valley strategic geometry/routes, Poly Haven source files, production GLBs, or protected generators were changed.

## Validation completed

- PASS — 96 JS/MJS files pass `node --check` syntax validation.
- PASS — all 6 `game-terrain-*.test.mjs` focused regression tests pass.
- PASS — protected ForgeRTS v0.6.6.8 runtime files match `runtime-sync-manifest.json` SHA-256 hashes and byte sizes.
- PASS — all 16 production GLBs are byte-identical to the v0.13.28 input build.
- PASS — all 14 bundled Poly Haven terrain source files are byte-identical to the v0.13.28 input build.
- PASS — Iron Valley remains 768×576 m and all six authored vehicle validation routes retain their validated slope results.
- PASS — ForgeRTS Training Ground splat remains 320×240 and macro map remains 80×60 at the authored workbench sampling scales.

## PBR V8 checks

- PASS — active experimental renderer is `TerrainRendererV8` / renderer version 0.8.0.
- PASS — overview albedo scale is separated from physical normal/ARM scale: grass 18 m / 2.5 m, dirt 14 m / 1.3 m, rock 12 m / 2.0 m, wet bank 10 m / 2.0 m.
- PASS — V7 `sourceDominant` gain-based recoloring is absent from V8.
- PASS — source photographs remain the dominant material-color signal; palette influence is restrained.
- PASS — road shoulders are restored and the road core uses the authored width rather than `road.width + 2.2`.
- PASS — stable positive road offsets, alpha feathering, polygon offset, and disabled depth writes remain in place for mobile WebGL.

## Camera checks

- PASS — WIDE uses projected map bounds for both Iron Valley and the ForgeRTS Training Ground.
- PASS — the old baseline `max × 0.78` WIDE span is removed.
- PASS — Game Terrain far plane scales to at least `max(2200, mapMaxDimension × 3.4)`.
- PASS — CLOSE/GROUND spans are less aggressive so terrain materials can be judged with battlefield context.

## Device validation still required

The container cannot initialize a trustworthy Chromium WebGL context, so final appearance cannot be honestly certified from a headless browser here. The target-device check remains iPhone Safari: **WIDE → CLOSE → GROUND → TOP**, on both **IRON VALLEY SHOWCASE** and **FORGERTS TRAINING GROUND**.
