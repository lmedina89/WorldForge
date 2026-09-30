# WorldForge v0.13.33 Test Report

Release purpose: recover the v0.13.32 regional-surface regression without discarding the useful v0.13.32 strategic-geography work.

## Release gates

- `game-terrain-regional-recovery-v01333.test.mjs`: PASS
  - exact v0.13.31 eight-zone biome/surface distribution restored
  - six v0.13.32 secondary material-bias masks absent
  - v0.13.32 strategic geography / landmarks / POI / bridge / rail planning retained
  - 23/23 authored vehicle routes pass
  - protected Iron Valley core remains exact
  - protected V8/V9 renderer and ForgeRTS runtime hashes pass
- `game-terrain-greater-iron-valley-v01331.test.mjs`: PASS
  - 2048×1536 world, 12 sectors, 9 regions
  - protected core height/slope/surface/tint deltas = 0
- `game-terrain-road-recovery-v01330.test.mjs`: PASS
  - V9 road core recovery, shoulder feathering and road geometry remain protected
- JS/MJS syntax: 100/100 PASS
- JSON parse: 23/23 PASS

## Recovery finding

v0.13.32 added six secondary elliptical material-bias masks on top of the original eight regional masks. Those masks did not create true biome authoring; they increased rock/dirt/wet weights inside broad regions and could make otherwise-good grass read as speckled or rocky. v0.13.33 removes only those secondary masks and restores the exact v0.13.31 surface-distribution array.

No terrain-renderer rewrite, texture replacement, road rewrite, river rewrite or ForgeRTS runtime change is part of this recovery.
