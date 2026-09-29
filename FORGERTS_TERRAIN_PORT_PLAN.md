# ForgeRTS terrain port plan — PBR V4

1. Approve PBR V4 in WorldForge on iPhone Safari and desktop.
2. Keep ForgeRTS TerrainSampler and all simulation terrain authority unchanged.
3. Copy the approved PBR renderer + terrain surface generator and the selected 1K runtime texture maps.
4. Add the approved `terrain.visual` material-set settings to ForgeRTS map loading.
5. A/B ForgeRTS current terrain against the WorldForge-approved seed/camera views.
6. Run full gameplay/pathfinding/collision regression tests before replacing the default renderer.

No terrain GLB is involved.
