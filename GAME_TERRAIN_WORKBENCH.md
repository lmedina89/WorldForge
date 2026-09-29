# Game Terrain Workbench 0.3

WorldForge v0.13.23 develops terrain against the real ForgeRTS terrain path rather than a terrain GLB.

## CURRENT GAME

Uses the exact copied ForgeRTS v0.6.6.8 files:
- `src/game-terrain/terrain-sampler.js`
- `src/game-terrain/terrain-renderer.js`
- `assets/game-terrain/forgerts_training_ground.json`

Their hashes remain protected by `assets/game-terrain/runtime-sync-manifest.json`.

## SPLAT V3

Uses the same ForgeRTS map and TerrainSampler, then adds:
- `src/game-terrain/terrain-surface-generator.js`
- `src/game-terrain/terrain-renderer-v3.js`

The surface generator builds a map-resolution RGBA distribution texture and a separate macro-color texture when the terrain loads. These are deterministic from the map seed and terrain/road/water data.

Default Training Ground output:
- splat map: **256 × 192** at **2.5 m/texel**
- macro map: **80 × 60** at **8 m/texel**
- terrain visual mesh: **4 m cells**

The fourth splat channel is a real wet-bank surface using `temperate_wetbank.png` + `temperate_wetbank_normal.png`.

## What remains gameplay-authoritative

The V3 surface map is visual. It does not become movement truth. `TerrainSampler.heightAt`, navigation slope limits, river blocking, road grading and simulation state remain separate from presentation.

## Acceptance views

Use the same map and seed, then compare CURRENT GAME vs SPLAT V3 in:
- WIDE — macro variation and terrain readability
- CLOSE — material blending, roads and slopes
- GROUND — texture repetition, normals and bank transitions
- TOP — splat distribution and road/river integration

Do not promote V3 into ForgeRTS until the iPhone/Safari visual and performance check passes.
