# Game Terrain Workbench 0.5 — Curated Strategic Battlefield

## Default showcase: Iron Valley

WorldForge now opens GAME TERRAIN on a fixed 768 × 576 m authored battlefield rather than requiring slider tuning. Iron Valley deliberately separates terrain *composition* from texture noise: strategic routes are established first, then mountain masses, valleys, terraces, ramps, roads and PBR materials are layered around those routes.

The showcase uses `StrategicTerrainSampler`, a WorldForge-only authoring candidate. The original `src/game-terrain/terrain-sampler.js` remains unchanged for the ForgeRTS Training Ground comparison.

### Authored landforms

- elevated west/east base plateaus with flat build pads
- middle terraces stepping down toward the main valley
- low central armored corridor
- central 32 m command mesa with west/east graded ramps
- northern mountain wall with authored passes
- southern flank corridor with two elevated overlooks and valid ramps
- six road surfaces following the intended strategic connections
- decorative south creek outside the primary armored lanes

### Validation

`navigation.validationRoutes[]` is sampled against the same terrain object used by the renderer. The UI reports each route's worst sampled slope against its authored limit. The optional route overlay renders valid routes green and failures red.

Advanced tuning is intentionally collapsed. The fixed showcase is the visual/gameplay target; sliders are now for deliberate experiments only.

---

# Game Terrain Workbench 0.4 — PBR V5 True Color

PBR V5 True Color keeps the ForgeRTS v0.6.6.8 heightfield, roads and water and replaces only the candidate terrain presentation.

The candidate uses an RGBA splat map (grass / dirt / rock / riverbank), macro-color map, real-scale Poly Haven PBR textures, ARM roughness/AO, OpenGL normal maps and triplanar rocky ground.

Use CURRENT GAME vs PBR V5 True Color with the same map/seed. Primary acceptance views: WIDE for material distribution, CLOSE for repetition/blend quality, GROUND for normal/roughness scale, TOP for road and bank masks.
