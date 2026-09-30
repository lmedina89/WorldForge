# WorldForge v0.13.31 Test Report

Scope: **Greater Iron Valley 0.1 — Regional Skeleton**, built on the protected v0.13.30 V8 terrain / V9 road baseline.

## Current milestone regression — PASS

- `tests/game-terrain-greater-iron-valley-v01331.test.mjs`
  - 2048×1536 world dimensions
  - 12 exact 512×512 logical world sectors
  - 9 named regions / 8 biome masks
  - no new placed buildings, players, mission triggers or mission AI anchors
  - V8 terrain renderer hash unchanged
  - V9 road renderer hash unchanged
  - protected `terrain-sampler.js` hash unchanged
  - original Iron Valley benchmark map hash unchanged
  - ForgeRTS Training Ground map hash unchanged
  - compacted-road + shoulder assets unchanged
  - protected ForgeRTS runtime-sync manifest hashes pass
  - original Iron Valley ridges / valleys / plateaus / pads / ramps remain exact in the new world data
  - first six world roads are the exact original Iron Valley roads
  - first world river is the exact original South Creek
  - full 768×576 protected rectangle has zero sampled raw/final height delta; a 4 m inset has zero derived slope, splat-weight and macro-tint delta
  - historical v0.13.30 benchmark surface sample hash still reproduces exactly
  - major regional road branches use explicit shared junction nodes rather than accidental grade-crossings
  - all 17 legacy/world validation routes remain below their authored slope limits
  - Blackstone / Eastmere / Westfield / Red Mesa material-family assertions pass

- JavaScript/MJS syntax validation: **99 files passed `node --check`**.
- `game-terrain-strategic-battlefield-v01325.test.mjs` and `game-terrain-pbr-truecolor-v01326.test.mjs` also pass against the protected map/material foundation.

## Historical test-suite note

The repository intentionally carries many old version-pinned regression files. Some assert an older `WORLDFORGE_VERSION`, while others import sibling historical source folders such as `/mnt/data/worldforge-v0.8.0` that are not part of a GitHub-ready ZIP. Those are archival regression fixtures, so running every historical test unchanged is not a valid current-release gate. The v0.13.31 focused regression, protected hashes, current strategic-terrain checks and project-wide syntax checks pass.

## Visual limitation

The container cannot provide a trustworthy iPhone Safari/WebGL pass because this project imports Three.js from the CDN and the execution environment cannot reproduce the target mobile browser/GPU path. Final world composition, biome readability and target-device performance still require the iPhone check.
