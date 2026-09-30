# Game Terrain Workbench 0.11 — Greater Iron Valley Regional Skeleton

Active renderer remains **PBR V9 · ROAD RECOVERY**. No V10 renderer was created for this milestone.

## Three battlefield sources

1. **Greater Iron Valley 0.1** — new 2048×1536 regional world skeleton.
2. **Iron Valley Benchmark** — protected 768×576 v0.13.30 authored battlefield.
3. **ForgeRTS Training Ground** — protected runtime comparison map.

## Protected center

Greater Iron Valley declares a 768×576 protected terrain rectangle matching the original benchmark. Expansion landforms, expansion road grading, expansion river carving and biome bias all fade to zero inside that rectangle. Regression tests verify exact raw/final height across the complete protected rectangle, plus zero delta in derived slope, surface weights and macro tint from a 4 m inset (outside the derivative stencil at the expansion seam).

Additive road/water meshes can begin at the existing edge exits so the regional network is visually continuous, but they do not rewrite the protected core terrain field. The separate Iron Valley Benchmark remains the exact standalone v0.13.30 visual reference.

## Regional landform layer

`terrain.landforms.expansion` is an additive WorldForge authoring layer. It supports the same authored ridge/valley/plateau/pad/ramp primitives as the original strategic sampler, but applies them only outside protected world rectangles.

This keeps the original benchmark behavior stable while allowing a much larger authored world around it.

## Biome masks

`terrain.biomeZones` biases the existing grass/dirt/rock/wet splat distribution and macro tint using feathered, noise-distorted elliptical regions. These masks do not introduce new materials, new PBR textures or a new renderer.

Road and river transitions continue to override biome paint so the good v0.13.30 shoulder/bank behavior is preserved.

## World metadata

`world.sectors` defines twelve 512×512 future streaming/LOD sectors.
`world.regions` defines named gameplay regions.
`world.reservedSites` and `world.reservedBaseZones` are planning anchors only; no buildings or mission scripts are spawned from them in 0.1.
