# WorldForge v0.13.24 — Game Terrain PBR Material Foundation

WorldForge now previews the same ForgeRTS heightfield/roads/water with a PBR V4 experimental terrain path using real 1K CC0 Poly Haven ground materials. CURRENT GAME is retained for exact A/B comparison.

## PBR V4 material set

- Grass Ground — 2.5 m scan — grass / worn turf
- Brown Mud Leaves 01 — 1.3 m scan — exposed organic soil
- Rocks Ground 02 — 2 m scan — rocky/exposed ground
- Dry River Pebbles — 2 m scan — riverbank / gravel
- Rocky Terrain 02 — 90 m scan — large-scale rocky macro breakup

The live candidate uses diffuse/color, OpenGL normal and ARM maps. Displacement files are intentionally not shipped in the runtime candidate yet.

## Safe ForgeRTS workflow

Approve PBR V4 visually and performance-wise in WorldForge first. Then port only the validated renderer/material settings into ForgeRTS. TerrainSampler, pathfinding, passability, water blocking and deterministic gameplay authority remain unchanged.
