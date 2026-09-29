# WorldForge v0.13.23 — Game Terrain Splat + Macrotexture Foundation

WorldForge v0.13.23 advances **Game Terrain Workbench to 0.3** and replaces the weak experimental per-vertex three-way terrain blend with a runtime-generated **RGBA splat/distribution map + macro-color map** candidate. Terrain is still data/runtime generated; no terrain GLB is introduced.

The bundled **CURRENT GAME** path remains the exact ForgeRTS v0.6.6.8 `TerrainSampler`, `TerrainRenderer`, and Training Ground map for A/B comparison. **SPLAT V3** uses the same ForgeRTS heightfield, road paths and water paths, but changes only visual surface generation/rendering.

## SPLAT V3

- Runtime RGBA distribution map at 2.5 m/texel by default:
  - R = healthy/natural grass
  - G = exposed/compacted dirt
  - B = rock
  - A = damp/wet riverbank soil
- Material distribution is driven by slope, road distance, river distance/moisture, broad exposure fields, and deterministic breakup noise.
- Road corridors now influence the terrain material map; the old full-width shoulder ribbon is removed from V3. The visible road core uses feathered alpha over the terrain-painted shoulder zone.
- River edges now paint a separate wet-bank channel and suppress grass immediately beside water.
- A separate macro-color map creates coherent green, dry, cool and lowland variation at map scale instead of shader sine-wave color breakup.
- Rock uses triplanar color **and triplanar normal detail**.
- Added a dedicated derived wet-bank albedo/normal pair.
- Material edges use a small micro-height-assisted blend while the splat texture remains the authoritative large-scale distribution.
- Terrain mesh density remains selectable independently from splat-map resolution.

## Exact-preview correction

GAME TERRAIN now stays in ForgeRTS native **Y-up** coordinates. This avoids rotating shader normals/projection inside WorldForge and makes slope, texture projection and lighting behavior much closer to the code that will be moved into ForgeRTS.

## Safe boundary

This release does **not** modify the authoritative ForgeRTS gameplay terrain sampler or the copied CURRENT GAME renderer. Gameplay terrain heights, slope queries, roads, water, navigation and passability remain unchanged.

The intended workflow is:

1. Develop and visually approve terrain in **WorldForge → GAME TERRAIN → SPLAT V3**.
2. Export the ForgeRTS-format map JSON containing the approved `terrain.visual` settings.
3. Port only `terrain-surface-generator.js` + the approved V3 rendering path into ForgeRTS.
4. Keep ForgeRTS `TerrainSampler` and gameplay/passability systems unchanged unless a later gameplay requirement explicitly needs a change.
5. Run ForgeRTS regression/hash tests and compare the same Training Ground map in both projects before promotion.

See `FORGERTS_TERRAIN_PORT_PLAN.md` for the exact integration sequence.
