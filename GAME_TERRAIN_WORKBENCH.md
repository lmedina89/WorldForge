# Game Terrain Workbench 0.12 — Greater Iron Valley Regional Identity

Active renderer remains **PBR V9 · ROAD RECOVERY**. No renderer rewrite is part of v0.13.32.

## Greater Iron Valley 0.2

The 2048×1536 world keeps the original 768×576 Iron Valley terrain core protected while strengthening the surrounding regional identities with additional biome masks and landmark-scale authored landforms.

Fourteen total biome masks bias only the existing V8/V9 grass/dirt/rock/wet source materials. Roads and riverbanks continue to override biome paint, preserving the approved V9 road shoulders and wet-bank transitions.

## Strategic-plan overlay

The optional **Show strategic plan** toggle displays planning metadata only:

- reserved rail centerlines
- future POI footprint outlines
- bridge/causeway markers

The overlay does not participate in terrain generation, collision, navigation or rendering materials.

## Geography contracts

`world.naturalLandmarks` names the major terrain silhouettes.
`world.poiFootprints` reserves future city/industrial/military envelopes.
`world.bridgeSites` pins future crossings to actual road/river intersections.
`world.railCorridors` reserves future rail alignment without grading terrain yet.
`world.roadHierarchy`, `world.waterCorridors` and `world.combatSpaces` document the intended strategic structure.

All 23 vehicle-validation routes currently pass their authored slope limits.
