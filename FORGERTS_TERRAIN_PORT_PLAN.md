# ForgeRTS Terrain Port Plan

Current approved WorldForge visual baseline remains **PBR V9 · ROAD RECOVERY** from v0.13.30.

v0.13.31 adds **Greater Iron Valley 0.1** as a WorldForge-only regional authoring/proving map. Do **not** port the new world directly into ForgeRTS yet.

## Protected runtime

The ForgeRTS v0.6.6.8 runtime-sync files, `terrain-sampler.js`, `terrain-renderer.js`, Training Ground map, V8 terrain presentation, V9 road presentation and original Iron Valley benchmark remain protected. Greater Iron Valley may add regional overlay roads/water from selected legacy exits, but expansion grading/carving and biome bias are suppressed inside the protected 768×576 terrain core; the benchmark/runtime sources remain untouched.

## What must be proven before a ForgeRTS world-map port

- target-device frame time and memory at 2048×1536
- no visible sector seams when world streaming/LOD is implemented
- regional route/path validation at gameplay scale
- bridge/water crossing contract
- city building LOD / collision / garrison contract
- mission-anchor / scenario separation
- persistent world-state serialization

Greater Iron Valley should remain an authoring target until those contracts are explicit. WorldForge must not become a runtime dependency of ForgeRTS.
