# WorldForge Changelog

## v0.13.0 — Building Forge 0.1 / Master Asset Integration
- Added dedicated **RTS BLDG** workspace.
- Added exact Aegis Command Nexus HQ v1.3 and Grid Bastion Power Plant v1.0 master GLBs to `assets/buildings/`.
- Added shared master-building registry, required-root/socket validation and semantic faction material slots.
- Added five faction presets plus custom Base/Primary/Secondary/Accent color controls.
- Added functional preview animation for radar/fan roots.
- Added native Y-up building GLB export and reusable building-definition JSON export.
- Skirmish Lab 0.3 now replaces the blocky starting Construction Yard and Power Plant with their exact master GLBs.
- Updated gameplay footprints/build radius to match the real master-building scale.
- Added player/enemy faction-skin selection to Skirmish.
- Added real Aegis HMMWV-50 and Talon AH-X deploy buttons as simulation-owned reference-asset test units.
- Structures without approved masters continue using explicit fallback prototype geometry rather than being falsely labeled production-ready.
- All 15 protected `src/generators/*.js` files, RTS Map Forge, Vehicle Forge/Baker and existing Aegis vehicle GLBs remain byte-identical to v0.12.0.

## v0.12.0 — RTS Simulation Foundation 0.1 / Protected Skirmish Refactor
- Added a fixed 30 Hz simulation clock independent of render FPS.
- Added stable numeric entity IDs and a serializable `EntityStore`.
- Added an ordered command bus with tick scheduling and player/AI/script/system command sources.
- Added the shared RTS command vocabulary for move/stop/attack/guard/patrol/build/produce plus direct-drive, aim and fire adapters.
- Added central faction state for credits, power and entity ownership.
- Added data-driven building, locomotor, unit and weapon definitions separate from Three.js rendering.
- Migrated Aegis-X drive state, health, turret aim, weapon cooldown, construction progress, projectiles, damage and faction economy into simulation-owned data while preserving the existing Skirmish Lab UI and visuals.
- Added seeded simulation RNG, deterministic snapshots/state hashes and JSON snapshot export.
- Added pause/resume, single-tick stepping, live tick/entity/hash status and recent command log to Skirmish Lab.
- Kept the existing real `MuzzleSocket` as a compatibility adapter for exact shell spawn position; projectile motion/damage are now simulation-owned.
- Protected all 15 existing `src/generators/*.js` files byte-for-byte; RTS Map Forge, Vehicle Forge/Baker and packaged GLBs are unchanged.


## v0.11.0 — Skirmish Lab 0.1 / First Playable Combat + Construction Loop
- Added a dedicated SKIRMISH workspace using RTS Map Forge terrain as the playable battlefield.
- Added the exact articulated Aegis-X v2 GLB as the player test tank.
- Added direct tank driving with tracked-terrain validation, hull steering, independent turret traverse, gun pitch and structure collision.
- Added tap-to-aim and main-gun firing from the real `MuzzleSocket`.
- Added ballistic shell travel/drop, muzzle flash/light, impact particles, explosions, smoke and target damage/destruction.
- Added first gameplay-owned RTS structure set: Construction Yard, Power Plant, Refinery, Barracks, Vehicle Factory and Gun Turret.
- Added credits, power supply/use, build-radius validation, buildable-terrain validation, structure collision checks and in-place construction progress.
- Terrain generation remains building-free; the scenario layer owns the starting Construction Yard and all purchased structures.
- Added mobile drive pad + FIRE HUD and desktop WASD/arrow/Space controls.
- Existing Vehicle Forge, RTS Map Forge and protected RPG/world generators remain separate and unchanged except for integration wiring/version metadata.

# WorldForge Changelog

## v0.10.0 — RTS Map Forge 0.2 / Class Traversal + Bridge/Foliage Fix
- Fixed RTS Map Forge tree orientation. Three.js cone/cylinder foliage primitives are now rotated once into WorldForge Z-up; procedural trees randomize yaw/scale only and remain upright.
- Rebuilt river bridges around sampled banks/water: decks are raised above both banks and water, carry explicit clearance metadata, and include graded approach meshes on both sides.
- Added explicit bridge traversal links/endpoints and allowed ground movement classes to exported map metadata.
- Replaced the single generic walkability model with class-specific traversal for **tracked**, **wheeled**, **infantry**, **amphibious**, and **air** movement.
- Navigation grid now exports slope degrees, terrain flags, per-cell movement bitmasks, compact per-class movement costs, class profiles, and class-specific reachability audits.
- Tracked armor tolerates rougher/steeper terrain than wheeled vehicles; wheeled units strongly prefer roads; infantry can use steeper/narrower ground; amphibious units can cross water; air ignores ground slope/water restrictions.
- Added a selectable traversal preview overlay: efficient cells green, higher-cost cells amber/orange, blocked cells red, air blue.
- Tactical audit now reports enemy-start reachability separately for tracked/wheeled/infantry/amphibious/air.
- Forest density influences movement cost instead of randomly overturning or hard-blocking every ground unit.
- Map Forge still generates terrain/metadata only — no faction buildings or prebuilt bases.
- Existing 15 `src/generators/*.js` files remain protected and unchanged.

## v0.9.9 — RTS Map Forge 0.1 / Tactical Battlefield Foundation
- Added RTS Map Forge as a separate protected module alongside the existing RPG/world and Vehicle Forge systems.
- Added chunked 512 m, 768 m, 1,024 m, and 1,536 m battlefields designed for browser/mobile prototype testing.
- Tactical topology is generated before dressing: corner/edge start regions, mountain/ridge pockets, carved passes, valleys/ravines, high ground, hidden expansion bowls, flank routes, river crossings, and contested resource areas.
- Added temperate, drylands, and alpine visual palettes; scalable forest and rock dressing uses instanced meshes.
- Added optional river/bridge network and three-role road network (main route, flank route, central connector).
- Start regions are reservation/buildability metadata only. RTS Map Forge does **not** generate faction buildings or completed bases.
- Added 64×64 compact navigation metadata with sampled height plus walkable/buildable/water/cliff flags for later pathfinding/economy/gameplay prototyping.
- Added tactical audit metrics for route diversity, defensible regions, expansion options, spawn separation, passes, hidden pockets, and buildable land.
- Added editor 3/4, top-map, start-region, and close RTS camera presets.
- Added terrain-conforming fog-of-war preview and clickable minimap; fog preview is an editor/test aid, not yet the final skirmish visibility simulation.
- Added map recipe, gameplay metadata, terrain GLB, and screenshot export controls.
- Existing 15 `src/generators/*.js` files remain byte-identical to v0.9.8.

# WorldForge Changelog

## v0.9.8 — Vehicle Forge 0.3 / Aegis HMMWV + AH-X
- Adds the exact approved **Aegis HMMWV-50 v2** as a reference-grade Forge archetype.
- Adds the exact approved **Aegis Talon AH-X** attack helicopter as a reference-grade Forge archetype.
- Preserves the HMMWV articulation hierarchy: steering roots, wheel-spin roots, four door roots, turret traverse, gun pitch, muzzle/exhaust/headlight sockets.
- Preserves the helicopter articulation hierarchy: main/tail rotor roots, sensor turret, chin-gun yaw/pitch, weapon hardpoints and effect sockets.
- Adds palette recoloring for both reference assets while preserving geometry and hierarchy.
- Adds a Y-up generated/reference install path to Vehicle Baker 0.1.3 so reference GLBs retain their proper source coordinate system.
- Reference archetypes intentionally disable seed/style randomization until their full procedural grammars are generalized from these approved assets.
- Procedural Aegis MBT grammar remains unchanged.
- Existing RPG/building/field/settlement generator implementations remain protected and untouched.

---

# WorldForge Changelog

## v0.9.7 — Vehicle Forge 0.2 / Aegis-grade MBT grammar
- Replaces the crude MBT box grammar with a new purpose-built Aegis-X-quality procedural MBT generator.
- Adds Wedge, Heavy and Compact silhouette families with controlled proportion envelopes rather than unconstrained random dimensions.
- Adds faceted/sloped lower and upper hull geometry, long glacis, front cheek armor, segmented composite side skirts, engine deck breakup and rear power-pack detail.
- Adds proper tracked running gear: 6/7 road wheels, distinct idler and sprocket, return rollers and multi-piece track silhouette.
- Adds a low-profile faceted turret, cheek/applique armor, rear bustle/racks, independent GunPitchRoot with mantlet/thermal sleeve/bore evacuator/barrel, independent RWSRoot/RWSGunPitchRoot, cupolas, sights, APS panels, smoke banks and antennas.
- Adds production hierarchy/sockets: VehicleRoot, HullRoot, TurretSocket, TurretRoot, GunPitchRoot, RWSRoot, MuzzleSocket, RWSMuzzleSocket, smoke sockets and EngineEffectSocket.
- Adds MBT silhouette/detail/road-wheel controls and three example Aegis-grade MBT recipes.
- Existing non-MBT Vehicle Forge 0.1 families remain available unchanged until upgraded family-by-family to the same quality bar.
- Existing RPG/building/field/settlement generator implementations remain protected and untouched.

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
