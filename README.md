# WorldForge v0.13.32 — Greater Iron Valley 0.2

This milestone deepens Greater Iron Valley without reopening the terrain/road renderer that is now behaving correctly on iPhone.

## Regional identity + strategic geography

The 2048×1536 main-world candidate still contains the protected 768×576 Iron Valley core. The current V8 direct-source terrain presentation, V9 compacted-road presentation, original Iron Valley landforms, 18-road regional network and four-river hydrology from v0.13.31 remain protected.

Greater Iron Valley 0.2 adds a second, restrained biome-identity layer and landmark-scale authored geography outside the protected core. Pinebreak is greener and broken, Northwatch has a stronger exposed crown, Blackstone gains stepped quarry benches, Eastmere gains a broader wet floodplain, Westfield remains fertile/open, and Red Mesa gains a warmer dry bench with twin-butte skyline. All of this still uses the same grass/dirt/rock/wet source materials; no V10 renderer was created.

## Strategic planning metadata

Added planning-only contracts for:

- 8 named natural landmarks
- 12 future POI footprints
- 4 bridge/causeway sites at real road/river intersections
- 2 reserved rail corridors
- road hierarchy metadata
- 2 water-corridor groups
- 9 combat-space roles

No buildings, mission scripts, AI anchors or placed gameplay entities are spawned from this metadata yet.

The Game Terrain Workbench now has an optional **Show strategic plan** overlay. It draws reserved rail centerlines, future POI footprints and bridge sites without changing the terrain renderer.

## Navigation

23 authored vehicle-validation routes now cover both the original tactical core and the new regional spaces. All 23 pass their authored slope limits against the same StrategicTerrainSampler used by the preview.

## Protection rules

- Original Iron Valley raw/final height remains numerically identical throughout the full protected rectangle.
- Derived slope, surface weights and macro tint remain identical from the protected inset used by the slope stencil.
- V8/V9 terrain/road renderer files remain byte-for-byte unchanged.
- v0.13.31 roads and rivers remain unchanged.
- ForgeRTS v0.6.6.8 runtime-sync files remain byte-for-byte protected.

## Still intentionally deferred

Actual bridges, rail meshes/grade engineering, city buildings, vegetation passes, mission scripting, garrisons, persistent territorial control and world streaming are not implemented in this milestone.
