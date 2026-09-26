# WorldForge v0.9.5 — Vehicle Baker 0.1

WorldForge v0.9.5 adds the first RTS-oriented pipeline **beside** the existing RPG/world generators. The protected generator stack remains unchanged. The new **VEHICLE** tab loads a GLB, normalizes it into WorldForge's Z-up scene, previews it with a fixed RTS orthographic camera, and bakes a deterministic 8-direction transparent sprite sheet.

## Vehicle Baker 0.1
- New **VEHICLE** tab; no existing Building/Field/Settlement generator was repurposed.
- Import a local `.glb` or load the included BTR-82 benchmark.
- Fixed RTS 3/4 orthographic camera and automatic center/ground/scale normalization.
- Preview and bake directions: **N, NE, E, SE, S, SW, W, NW**.
- 96 / 128 / 192 / 256 px frame presets.
- Optional soft baked shadow on a transparent PNG.
- Horizontal 8-frame PNG output plus a separate **EXPORT META JSON** control for `worldforge.vehicle-sprite.v1` metadata with frame rectangles, direction rotations, camera preset, source stats, and sprite pivot.
- Forward-axis calibration for GLBs whose nose is not +X; the included BTR is pre-calibrated to −90°.

## Included benchmark
`assets/low_poly_btr_82.glb` is the user's BTR-82 test vehicle. Its original Sketchfab spec/gloss material declarations were mapped to standard metallic/roughness glTF so the asset loads in the current Three.js runtime while preserving geometry, textures, hierarchy, and animation data. See `ATTRIBUTION.md` for the required CC BY 4.0 credit.

## Compatibility
All existing WorldForge generator source files are unchanged from the v0.9.4 Playtest Pass baseline. Vehicle Baker is implemented separately in `src/vehicle/vehicle-baker.js`.

---

# WorldForge v0.9.4 — Settlement Playtest Pass

WorldForge v0.9.4 keeps the protected generation stack intact and builds a better settlement review loop around the v0.9.3 composer. This pass adds a quick **playtest mode** for the temporary pixel walker, a walk-zone debug overlay, a follow-camera toggle, character spawn persistence, and simple automatic building fade when the character moves behind structures.

## Added
- Enter/exit **PLAYTEST** directly from the settlement tab.
- Mobile-friendly on-screen playtest pad overlay.
- **Walk debug** overlay for settlement walk zones and transition ramps/stairs.
- **Follow camera** toggle for the settlement preview character.
- **Set current as spawn** so a preferred test start point persists with the settlement recipe/project.
- Character grounding/contact shadow polish and simple building occlusion fade.

## Compatibility
- Existing building, field, traversal, foliage, prop, terrain, surface, and settlement generators remain additive and unchanged in intent.
- Existing settlement recipes continue to load; recipes without `characterSpawn` receive grammar defaults.

---

# WorldForge v0.9.2 — Production Metadata + Sockets

WorldForge v0.9.2 adds the first game-production layer **without changing existing generated geometry**. Buildings, props, traversal pieces, foliage, and fields now receive deterministic gameplay metadata that a game runtime or later WorldForge export stage can consume directly.

## Retroactive compatibility
This update is deliberately additive. Existing WorldForge recipes and scene files remain valid. The protected Building, Prop, Surface, Foliage, Traversal, Terrain, Landscape, and Field generator implementations are unchanged from v0.9.1.

An older `.scene.json` can be upgraded in either place:
- Browser: **UPGRADE OLD SCENE**
- CLI: `node cli/worldforge.mjs --scene old.scene.json --out upgraded`

The upgrade adds `production` metadata while preserving the original `nodes`, `materials`, and `recipe` exactly. This means towns and assets already created do not need to be rebuilt to gain the new production information.

## Production metadata 0.1
Generated assets now include `worldforge.production.v1` metadata with:
- local or world-space bounds
- door / entry sockets
- road-connection sockets
- castle-wall / fence connection sockets
- gate, mine, sewer, dock and traversal portal sockets
- walkable porch/deck/traversal surfaces
- collision strategy and simplified primitive collision hints
- collision openings tied to entry/portal sockets
- navigation mode and entry links
- occlusion volumes
- placement rules and facing hints

Fields expose the same information per placement plus the existing multi-level walk graph.

## Browser exports
In addition to recipe, scene, asset, GLB and PNG exports, v0.9.2 adds:
- **GAME META** — exports `.production.json`
- **UPGRADE OLD SCENE** — adds production metadata to an existing WorldForge scene without changing its geometry

## Headless examples
Fresh generation:
```bash
node cli/worldforge.mjs --recipe examples/building.recipe.json --out out
```

Retroactive scene enrichment:
```bash
node cli/worldforge.mjs --scene examples/deep-village-test-out/worldforge_field_731904.scene.json --out upgraded
```

The fresh-generation path now exports recipe JSON, scene JSON, production JSON, OBJ, and MTL.

---

# WorldForge v0.9.1 — Placement + Alignment Pass

WorldForge v0.9.1 keeps the v0.9.0 generation stack intact and adds a precision editor for correcting field composition. Select an asset in FIELD mode, then use exact XYZ/rotation fields, configurable nudge increments, grid/rotation/walk-level snapping, nearest-edge alignment, and placement guides. All edits are stored in the deterministic field recipe.

## Precision editor quick use
1. Open **FIELD** and generate/load a field.
2. Tap a building, stair, bridge, wall, prop, or foliage asset.
3. Choose a nudge step or type exact X/Y/Z/rotation values.
4. Use snap tools when useful: XY Grid, Rotation, Nearest Walk Level, Ground, or Nearest Asset Edge.
5. Export/save the field recipe; transforms recreate exactly.

---

# WorldForge v0.9.0 — Elevation + Traversal

WorldForge is a deterministic procedural RPG/world asset generator intended for browser, headless, and future standalone use.

## Protected systems
v0.9 expands around the existing systems instead of replacing them:
- Building 1.0.0 — Protected Legacy
- Building 1.1.0 — Variety Engine
- Building 1.2.0 — RPG Architecture I
- Building 1.3.0 — RPG Architecture II
- Prop 0.1.0
- Surface 0.1.0
- Foliage 0.1.0
- Field Composer 0.1.0 — protected v0.7 behavior
- Field Composer 0.2.0 — protected v0.8 foliage/dressing behavior

The protected generator source files are byte-identical to v0.8.0.

## New in v0.9.0

### Traversal Engine 0.1.0
Deterministic elevation/traversal assets:
- Stone/wood/rope bridges
- Stairs
- Slopes / ramps
- Cliffs / ledges
- Raised terraces
- Retaining walls

Each traversal asset exports gameplay metadata in addition to geometry:
- Walkable surfaces
- Entry/exit connection points
- Elevation/rise
- Bridge pass-under flag and clearance where applicable
- Footprint / bounds / collision metadata

### Field Composer 0.3.0
Field 0.3 adds real multi-level scene composition while preserving Field 0.1 and 0.2.

New elevated field presets:
- Mountain Village Path
- Stone Bridge Crossing
- Cliffside Town Lane

Existing presets with new elevation layouts include:
- Castle Courtyard
- Castle Gate Approach
- Mountain Path
- Mine Entrance Clearing
- Rural House Lane

The field recipe now includes an `elevation` control. Field 0.3 exports a `walkGraph` with detected walk levels and traversal segments so later game movement code can consume the same data.

### Editor additions
- Dedicated **ELEVATION** tab
- Generate bridge/stairs/slope/cliff/terrace/retaining-wall pieces independently
- Field elevation-strength control
- Selected asset `LEVEL +0.5` / `LEVEL -0.5`
- L0 / L1 / L2 field visibility filters
- Existing move/rotate/duplicate/regenerate/delete tools remain available

## Backward compatibility
Field changes are versioned rather than silently altering old projects:
- `engineVersion: "0.1.0"` → protected v0.7 Field Composer
- `engineVersion: "0.2.0"` → protected v0.8 dressed-field composer
- `engineVersion: "0.3.0"` → new elevation/traversal composer
- A saved recipe marked `generatorVersion: "0.8.0"` without an explicit field engine resolves to Field 0.2 rather than silently upgrading.

## Browser use
Upload the **contents** of the ZIP directly to the root of a GitHub repository and enable GitHub Pages. `index.html` is directly at the ZIP root.

## Headless use
Traversal asset:
```bash
node cli/worldforge.mjs --recipe examples/traversal-stone-bridge.recipe.json --out out-bridge
```

Elevated field:
```bash
node cli/worldforge.mjs --recipe examples/field-v0.3-elevated.recipe.json --out out-field
```

The CLI exports normalized recipe JSON, neutral scene JSON, OBJ and MTL.

## Gameplay-facing metadata
Field 0.3 stores:
- `metadata.walkGraph.levels`
- `metadata.walkGraph.segments`
- transformed traversal connection points
- walk-surface descriptions
- pass-under / clearance information for elevated bridges

This is intentionally a foundation for v1.0 movement/collision integration rather than a fake visual-only elevation system.

## Roadmap
- **v1.0** — first complete RPG field-building workflow: field-generation polish, traversal/collision export, field save/export workflow, and game-facing integration cleanup.

See `TEST_REPORT.md` for regression, determinism and compatibility results.
