# WorldForge v0.13.28 — Source Detail + Camera Recovery

This is a narrowly scoped GAME TERRAIN follow-up to v0.13.27. It changes only the experimental terrain presentation path and Game Terrain camera framing.

- **PBR V7 · SOURCE DETAIL** keeps the actual Poly Haven albedo visible instead of reducing it to tiny brightness variation under flat palette colors.
- RTS palette values are now restrained color correction targets, not replacement colors.
- Normal-map detail remains strongest in CLOSE/GROUND and fades before tactical WIDE distances become noisy.
- Iron Valley WIDE now derives its orthographic framing from battlefield bounds and terrain height range.
- The Game Terrain camera far plane now scales to the map, fixing the clipping that could leave only a small strip of terrain visible on iPhone Safari.
- Iron Valley geometry, splat layout, road/water data, strategic routes, ForgeRTS runtime snapshots, generators, and production GLBs are unchanged.

**Do not port PBR V7 into ForgeRTS until the corrected WIDE/CLOSE/GROUND/TOP views are approved on-device.**

---

# WorldForge v0.13.27 — Game Terrain Recovery

WorldForge v0.13.27 is a focused recovery pass for GAME TERRAIN after the Iron Valley + PBR V5 changes produced poor mobile presentation.

## What changed

- **PBR V6 · RTS BLEND** replaces PBR V5 as the experimental presentation path.
- The authored Iron Valley heightfield/landforms, road routes, water, validation routes and deterministic seed are preserved.
- Grass/dirt/rock/wet channels now use a restrained **RTS-readable palette** while Poly Haven 1K CC0 maps provide close-range PBR detail instead of controlling the entire battlefield hue.
- Micro albedo/normal detail fades with camera distance to stop the noisy/repetitive gravel/mud look in WIDE/CLOSE views.
- Natural dirt breakup is reduced and road shoulder blending is tightened so the battlefield no longer turns into broad muddy bands.
- Road overlays use a larger terrain offset, polygon offset and no depth write to prevent broken/z-fighting strips on iPhone/WebGL.
- Strategic WIDE/CLOSE/GROUND camera presets are higher and more top-down so the authored terrain reads as an RTS battlefield instead of a tilted terrain sheet.
- Preview lighting for standard road/water materials is raised for readability.

## Protected baseline

The exact ForgeRTS v0.6.6.8 runtime snapshot remains protected and unchanged:

- `src/game-terrain/terrain-sampler.js`
- `src/game-terrain/terrain-renderer.js`
- `assets/game-terrain/forgerts_training_ground.json`
- legacy temperate terrain/road textures listed in `runtime-sync-manifest.json`

WorldForge remains the proving ground. **Do not port PBR V6 into ForgeRTS until it is visually approved on-device.**

## Acceptance views

Check the same map in **WIDE → CLOSE → GROUND → TOP**. The main acceptance points are: material separation, readable green/soil/rock distribution, reduced repetition, stable roads, clean river banks, no harsh blend grids, and no mobile shimmer/z-fighting.
