# WorldForge v0.13.30 Test Report

Scope: road-core presentation only.

## Passed

- `game-terrain-road-recovery-v01330.test.mjs`
  - V8 terrain renderer byte-identical to v0.13.29
  - road centerline/width/shoulder geometry hashes unchanged for Iron Valley and ForgeRTS Training Ground
  - road shoulder texture + normal byte-identical to v0.13.29
  - V9 inherits V8
  - renderer-only compacted-dirt substitution present
  - road core no longer uses the feather alpha map
  - road core remains authored width
  - shoulder geometry/feather path preserved
  - protected ForgeRTS runtime-sync manifest hashes pass

- JavaScript/MJS syntax validation across the project.

## Visual limitation

The container does not provide a trustworthy iPhone Safari/WebGL visual pass. Final road appearance must be judged on the target device. No claim is made that the road is visually approved until that check is completed.
