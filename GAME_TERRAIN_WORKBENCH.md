# Game Terrain Workbench 0.2

WorldForge v0.13.22 develops terrain against the real ForgeRTS terrain data path rather than a terrain GLB.

## A/B truth boundary

**CURRENT GAME** uses the byte-for-byte ForgeRTS v0.6.6.8 snapshots:

- `src/game-terrain/terrain-sampler.js` ← ForgeRTS `engine/maps/terrain-sampler.js`
- `src/game-terrain/terrain-renderer.js` ← ForgeRTS `renderer/terrain-renderer.js`
- `assets/game-terrain/forgerts_training_ground.json` ← ForgeRTS `maps/training_ground.json`
- current grass/dirt/rock/road albedo textures

`assets/game-terrain/runtime-sync-manifest.json` continues to verify those exact files.

**EXPERIMENTAL V2** keeps the same TerrainSampler, map JSON, material weights, road paths, water paths and heightfield but renders them through `src/game-terrain/terrain-renderer-v2.js`. This is the candidate renderer to evaluate before any change is made to ForgeRTS itself.

## Experimental V2 visual changes

- selectable 3/4/5/6 m visual terrain mesh cells; default 4 m
- macro color variation
- dual-scale de-tiling for grass and dirt
- close-range normal detail with distance fade
- triplanar rock projection on slopes
- surface contrast control
- normal-mapped asphalt and road shoulders
- the current terrain height and splat logic remains unchanged

The added normal maps are derived from the currently bundled terrain textures so this pass can test rendering quality without introducing an unrelated external asset pack.

## Export

Map export remains ForgeRTS JSON. Experimental settings are written under `terrain.visual` (`cellMeters`, `macroVariation`, `normalStrength`, `surfaceContrast`, `detailMix`). Current ForgeRTS ignores those optional fields today; a future approved renderer can consume them directly.

## What is not in this milestone

This pass does not yet add vegetation instancing, building-ground contact masks, tire tracks, craters, biome texture packs, or runtime terrain deformation. Those come after the base surface shader is visually accepted on iPhone.
