# WorldForge v0.13.32 Test Report

## Release gates

- `game-terrain-regional-identity-v01332.test.mjs`: PASS
  - 2048×1536 world / 12 sectors / 9 named regions
  - 14 biome masks
  - 8 natural landmarks
  - 12 future POI footprints
  - 4 bridge sites validated against their referenced road + river centerlines
  - 2 reserved rail corridors
  - 23/23 authored vehicle routes within slope limits
  - protected Iron Valley core height/slope/surface/tint unchanged
  - V8/V9 terrain + road renderer hashes unchanged
  - ForgeRTS v0.6.6.8 runtime-sync hashes unchanged
- `game-terrain-greater-iron-valley-v01331.test.mjs`: PASS as the preserved 0.1-invariant regression under the 0.2 superset.
- JS/MJS syntax gate: PASS across 100 files under `src`, `tests`, and `cli`.
- JSON parse gate: PASS across all project JSON files.

## Protected 0.1 infrastructure

The v0.13.31 18-road array and four-river array are unchanged in v0.13.32. The new rail/bridge/POI work is planning metadata and optional debug presentation only; it does not replace the approved V9 road or river geometry.

## Historical test note

The repository intentionally carries older release-pinned regressions (for example tests that require `WORLDFORGE_VERSION = 0.13.30`). Those archival tests are expected to reject a newer version string even when their protected implementation files are byte-identical. Current release gating therefore uses the v0.13.32 regression plus direct hashes of the protected historical files/contracts rather than treating old version-string assertions as current-release failures.

## Visual limitation

The package is structurally and numerically validated in the container, but final WebGL appearance/performance still requires the real iPhone Safari check. The strategic-plan overlay is optional and defaults off.
