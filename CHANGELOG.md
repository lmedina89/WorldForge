# WorldForge Changelog

## v0.9.6 — Vehicle Forge 0.1
- Added deterministic low-poly Vehicle Forge generator as a separate vehicle engine.
- 11 silhouette families: MBT, light tank, tracked APC, 8×8 IFV, MRAP, SPG, MLRS, SAM carrier, SPAAG, recon vehicle, cargo truck.
- 3 design languages and 4 solid-color palettes.
- Seeded dimensional/detail variation keeps related vehicles distinct without changing the family role.
- Generated vehicles can be exported directly as GLB or passed into the existing 8-direction Sprite Baker.
- Imported BTR workflow remains available and separate.
- Existing Building / Field / Settlement / Terrain generator implementations remain untouched.

# WorldForge Changelog

## v0.9.5.2 — Vehicle Baker readability pass
- Vehicle Baker bumped to 0.1.1.
- Auto-fit bake framing so 8-direction sprites fill more of each square frame.
- Higher-resolution bake with downsampling for cleaner 96/128/192/256px sheets.
- Dedicated bake-light rig for brighter, more readable RTS sprite exports.
- Softer/lighter bake shadow to reduce muddy low-size output.

# WorldForge v0.9.5.1 — Vehicle Baker UI Hotfix

## Fixed
- Added a global `[hidden]{display:none!important}` safeguard so styled controls honor the HTML hidden state.
- Settlement Playtest HUD no longer overlays Vehicle Baker on mobile.
- Procedural-only controls such as Seed stay hidden in Vehicle mode.

## Compatibility
- No procedural generator source files changed.
- Vehicle Baker geometry/camera/bake logic is unchanged from v0.9.5.

---

# WorldForge v0.9.5 — Vehicle Baker 0.1

## Added
- Separate **VEHICLE** tab and `src/vehicle/vehicle-baker.js` module.
- GLB import plus included BTR-82 benchmark loader.
- Automatic Y-up → WorldForge Z-up conversion, centering, grounding, and normalized preview scale.
- Fixed orthographic RTS camera with 8 deterministic direction rotations.
- Transparent horizontal 8-frame PNG bake at 96/128/192/256 px per frame.
- Optional soft transparent shadow catcher.
- `worldforge.vehicle-sprite.v1` JSON metadata export with frame rectangles, direction order, camera preset, source stats, calibration, and pivot.
- Static packaging regression test for the Vehicle Baker and included benchmark.

## Compatibility
- Protected WorldForge generator source tree is byte-identical to the v0.9.4 baseline.
- BTR benchmark materials were converted from archived spec/gloss declarations to standard metallic/roughness glTF for current Three.js compatibility; geometry, textures, hierarchy, and animation data remain present.

---

# WorldForge v0.9.4 — Settlement Playtest Pass

## Added
- Settlement **PLAYTEST** mode with viewport overlay controls.
- Walk-zone / transition debug overlay toggle.
- Follow-camera toggle for the preview walker.
- Persistent `characterSpawn` in settlement recipes/projects.
- Simple automatic building fade to keep the preview walker visible near structures.
- Character contact shadow / grounding polish.

## Compatibility
- Settlement grammar generation remains deterministic.
- Protected building/field/traversal/foliage/source generators remain untouched in behavior.

---

# WorldForge v0.9.2 — Production Metadata + Sockets

## Added
- Production Metadata Engine 0.1 (`worldforge.production.v1`).
- Building entry sockets derived from real generated door geometry where available.
- Road sockets projected outward from primary entrances.
- Portal-through sockets for gatehouses, city gates, mine entrances, and sewer entrances.
- Wall/fence structural connection sockets and dock land/water connection hints.
- Walk-surface metadata for porches, loading docks, piers, surfaces, terrain, bridges, stairs, slopes, terraces, and cliffs.
- Simplified collision profiles with primitive hints and entry/portal openings.
- Navigation, occlusion, facing, and placement-rule metadata.
- Field-level production metadata with per-placement records and the existing multi-level walk graph.
- Browser **GAME META** export.
- Browser **UPGRADE OLD SCENE** workflow.
- CLI `--scene` retroactive enrichment mode.
- Standard CLI generation now exports `.production.json`.

## Compatibility
- 13 protected generator implementation files remain byte-identical to v0.9.1.
- Existing engine versions remain unchanged.
- Representative v0.9.1 recipes reproduce exact node/material geometry in v0.9.2.
- Retroactive scene upgrade is guarded so nodes, materials, and recipes cannot be modified by the upgrader.

---

# WorldForge v0.9.1 — Placement + Alignment Pass

## Added
- Precision field placement editor with selectable nudge step: 0.10 / 0.25 / 0.50 / 1.00 units.
- Exact X / Y / Z / rotation numeric editing for selected field assets.
- Configurable rotation snapping: 15°, 30°, 45°, or 90°.
- XY grid snapping.
- Nearest walk-level Z snapping using the existing Field 0.3 walk graph.
- Ground Z=0 snap.
- Nearest asset-edge alignment for quickly joining stairs, terraces, buildings, walls, bridges, and props.
- Placement guides: yellow footprint, blue anchor cross, red traversal connection points.
- Z nudge now uses the selected precision step.
- Existing duplicate/regenerate/delete/level filters remain available.

## Compatibility
- All generator source files are unchanged from v0.9.0.
- Existing Building, Surface, Prop, Foliage, Traversal, and Field engines are preserved.
- Edited field transforms continue to round-trip through deterministic field recipes.
