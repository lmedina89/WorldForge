# ForgeRTS Terrain Port Plan

Current approved WorldForge visual baseline remains **PBR V9 · ROAD RECOVERY** from v0.13.30.

v0.13.32 advances **Greater Iron Valley 0.2** as a WorldForge-only main-world authoring/proving map. Do **not** port the expanded world directly into ForgeRTS yet.

## Protected runtime

ForgeRTS v0.6.6.8 runtime-sync files, the current TerrainSampler/TerrainRenderer, Training Ground map, V8 terrain presentation, V9 road presentation and original Iron Valley benchmark remain protected.

Greater Iron Valley 0.2 adds only WorldForge-side authored geography and planning metadata around that baseline. Its rail corridors and POI footprints are reservations, not runtime systems.

## Before a ForgeRTS world-map port

- target-device frame time and memory at 2048×1536
- streaming/LOD contract with no visible sector seams
- bridge destruction/path reroute contract
- rail rendering and grade/path contract
- city collision/garrison/building-LOD contract
- mission-anchor/scenario separation
- persistent world-state serialization

WorldForge remains the authoring tool; it must not become a ForgeRTS runtime dependency.
