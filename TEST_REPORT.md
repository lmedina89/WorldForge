# WorldForge v0.13.27 Test Report

## Terrain recovery checks

- PASS — all 92 JS/MJS source and test files parse with `node --check`.
- PASS — Game Terrain focused test set.
- PASS — exact ForgeRTS v0.6.6.8 runtime-sync hashes remain unchanged.
- PASS — Iron Valley all 6 validation routes remain under their configured slope limits.
- PASS — strategic height tiers remain 27 m west base / ~19 m mid terrace / 6.6 m main valley / 32 m command mesa.
- PASS — PBR V6 contains Three.js tone-mapping + colorspace output chunks.
- PASS — distance-aware micro-detail fade and RTS palette separation are present.
- PASS — road overlay stability controls (positive offset + polygon offset + depthWrite false) are present.
- PASS — road terrain blend is capped at 5.5 m in the authored showcase.
- PASS — protected runtime sampler, renderer, Training Ground and legacy synced textures match `runtime-sync-manifest.json`.

### Environment limitation

A true headless WebGL screenshot could not be produced in this container because Chromium cannot initialize EGL/ANGLE here. Visual acceptance still needs the real iPhone Safari path; the source/geometry/hash/static tests above are complete.

# WorldForge v0.13.26 Test Report

## Curated Strategic Battlefield + Valid Landforms

- Current self-contained suite: **31 / 31 PASS**, including the new strategic-landform/route validation regression.
- Seven inherited legacy tests still require historical fixture directories not shipped in this package; unchanged test-environment limitation.
- Existing production GLBs vs v0.13.24 baseline: **16 / 16 byte-for-byte unchanged**.
- All `src/generators/*.js` files vs v0.13.24 baseline: **15 / 15 byte-for-byte unchanged**.
- Exact ForgeRTS v0.6.6.8 comparison snapshots remain byte-identical:
  - `terrain-sampler.js` SHA-256 `d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a`
  - `terrain-renderer.js` SHA-256 `a8d560b49db1652ef5b306b96f66412cd4010480775d0e90e3f7c6d721754c1c`
  - Training Ground map SHA-256 `b7f54a9792e6df5e90b635a7fe02b6d3e6ad3e2bbe5f0dfc6f0eba8e66c9bfc9`
- Iron Valley strategic route audit:
  - main armored valley: **10.55° max / 18° limit**
  - central mesa route: **16.64° max / 22° limit**
  - southern flank: **7.72° max / 20° limit**
  - northern mountain pass: **7.02° max / 20° limit**
  - southwest overlook ramp: **11.52° max / 20° limit**
  - southeast overlook ramp: **10.29° max / 20° limit**
- Key authored elevation tiers resolve at approximately **27 m base shelf → 19 m middle terrace → 6.6 m main valley**, with the central command mesa at **32 m**.
- New/modified JavaScript syntax checks: **PASS**.
- DOM ID/reference audit: **PASS**.

## On-device acceptance

Open **GAME TERRAIN**; Iron Valley loads automatically. Do not open Advanced Terrain Tuning for the first evaluation. Inspect WIDE, CLOSE, GROUND and TOP. Optionally enable **Show validated routes**: all six authored ground routes should be green. Primary acceptance is whether the plateaus, stepped elevations, mountain walls, valley corridors and ramps finally read like an intentional RTS battlefield rather than noise-driven terrain.

---

# WorldForge v0.13.24 Test Report

## Game Terrain PBR Material Foundation

- New Game Terrain Workbench 0.4 regression: **PASS**.
- Current self-contained suite: **30 / 30 PASS**.
- Seven inherited legacy tests still require historical fixture directories not shipped in this package; unchanged test-environment limitation.
- Existing production GLBs vs v0.13.23 baseline: **16 / 16 byte-for-byte unchanged**.
- All `src/generators/*.js` files vs v0.13.23 baseline: **15 / 15 byte-for-byte unchanged**.
- Exact ForgeRTS v0.6.6.8 CURRENT GAME snapshots remain byte-identical:
  - `terrain-sampler.js` SHA-256 `d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a`
  - `terrain-renderer.js` SHA-256 `a8d560b49db1652ef5b306b96f66412cd4010480775d0e90e3f7c6d721754c1c`
  - Training Ground map SHA-256 `b7f54a9792e6df5e90b635a7fe02b6d3e6ad3e2bbe5f0dfc6f0eba8e66c9bfc9`
- Default PBR V5 True Color splat distribution map: **320 × 240** (2 m/texel).
- Default macro-color map: **80 × 60** (8 m/texel).
- Poly Haven runtime material files: **13 maps + CC0 note**, all present.
- Candidate shader uses 15 fragment texture samplers: 2 generated maps + 4 albedo/color + 4 OpenGL normals + 4 ARM + 1 rocky macro; within the WebGL2 minimum 16-sampler budget.
- New/modified JavaScript syntax checks: **PASS**.
- DOM ID/reference audit: **PASS**.

## Visual acceptance still required

Automated validation does not replace iPhone/Safari inspection. In GAME TERRAIN, compare CURRENT GAME vs PBR V5 True Color in WIDE, CLOSE, GROUND and TOP. Check real-world texture scale, repetition, material transitions, brightness, road integration, riverbank read, normal shimmer and frame rate. ForgeRTS itself remains unchanged until this candidate is approved.

---

# WorldForge v0.13.23 Test Report

## Game Terrain Splat + Macrotexture Foundation

- New Game Terrain Workbench 0.3 regression: **PASS**.
- Current self-contained suite: **30 / 30 PASS**.
- Seven inherited legacy tests still require historical fixture directories not shipped in this package; unchanged test-environment limitation.
- Existing production GLBs vs v0.13.22 baseline: **16 / 16 byte-for-byte unchanged**.
- All `src/generators/*.js` files vs v0.13.22 baseline: **15 / 15 byte-for-byte unchanged**.
- Protected v0.9.2 generator manifest still contains the inherited stale `src/generators/index.js` hash; the actual file is unchanged from v0.13.22.
- Exact ForgeRTS v0.6.6.8 CURRENT GAME snapshots remain byte-identical:
  - `terrain-sampler.js` SHA-256 `d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a`
  - `terrain-renderer.js` SHA-256 `a8d560b49db1652ef5b306b96f66412cd4010480775d0e90e3f7c6d721754c1c`
  - Training Ground map SHA-256 `b7f54a9792e6df5e90b635a7fe02b6d3e6ad3e2bbe5f0dfc6f0eba8e66c9bfc9`
- Default SPLAT V3 distribution map: **256 × 192** (2.5 m/texel).
- Default macro-color map: **80 × 60** (8 m/texel).
- Road-core sample resolves >90% dirt channel; river-edge sample resolves >50% wet-bank channel.
- New/modified JavaScript syntax checks: **PASS**.
- DOM ID/reference audit: **PASS**.

## Visual acceptance still required

Automated validation cannot replace iPhone/Safari inspection. In GAME TERRAIN, compare CURRENT GAME vs SPLAT V3 in WIDE, CLOSE, GROUND and TOP. Primary acceptance points are material-boundary quality, grass color breakup, road shoulder integration, riverbank transitions, rock projection, shimmer and rebuild/render performance. ForgeRTS itself remains unchanged until this candidate is approved.

---

# WorldForge v0.13.22 Test Report

## Game Terrain Visual Foundation A/B

- New Game Terrain Workbench 0.2 regression: **PASS**.
- Current self-contained suite: **30 / 30 PASS**.
- Seven legacy tests still depend on historical external fixture directories (`/mnt/data/worldforge-v0.4.0` through `/mnt/data/worldforge-v0.9.1`) and are not shipped in the current package; these are unchanged inherited test-environment failures.
- Protected procedural generator comparison vs v0.13.21 baseline: **14 / 14 byte-for-byte unchanged**.
- Existing production GLBs vs v0.13.21 baseline: **16 / 16 byte-for-byte unchanged**.
- Exact ForgeRTS v0.6.6.8 current-runtime snapshots remain unchanged:
  - `terrain-sampler.js` SHA-256 `d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a`
  - `terrain-renderer.js` SHA-256 `a8d560b49db1652ef5b306b96f66412cd4010480775d0e90e3f7c6d721754c1c`
  - bundled current Training Ground map SHA-256 `b7f54a9792e6df5e90b635a7fe02b6d3e6ad3e2bbe5f0dfc6f0eba8e66c9bfc9`
- Experimental renderer source syntax check: **PASS**.
- App / workbench / schema syntax checks: **PASS**.
- DOM ID/reference audit including the new A/B and visual controls: **PASS**.
- Added five derived normal-map textures for terrain/roads; no approved model asset was rebuilt.

## Visual acceptance still required

Automated validation confirms source wiring, preservation, map compatibility and deterministic terrain sampling. It does not replace an iPhone/Safari visual check. The intended acceptance test is to open **GAME TERRAIN**, flip between **CURRENT GAME** and **EXPERIMENTAL V2**, then inspect WIDE, CLOSE and GROUND views for texture repetition, slope quality, normal shimmer, road grounding and performance.

---

# WorldForge v0.13.20 Test Report

## Persistent Orders + Locomotor Core

Result: **PASS — focused source/regression validation**

- Focused `tests/rts-*.test.mjs` suite: **25 / 25 PASS**, including new v0.13.20 persistent-order/locomotor regression coverage.
- JavaScript syntax checks pass for Skirmish, app wiring, and schema.
- New regression coverage verifies persistent requested destinations, throttled re-pathing, static-only global routing, locomotor steering around local traffic, short unit-only collision grace, shared Rifleman/vehicle recovery, explicit cancellation semantics, and preservation of controlled production egress.
- Existing economy, enemy sandbox, resource fields, roads/rivers, free camera, mobile touch, collision/spacing, production, and asset-master regressions remain in the focused suite.
- Production asset hashes are compared to v0.13.19 before packaging; no approved GLB is intentionally modified by this release.

### On-device validation focus
On iPhone, select one HMMWV after it has fully cleared the factory and issue at least **five destinations in a row** without reselecting it. Park another friendly vehicle near its path and confirm the HMMWV bends around or clears the traffic while still pursuing the last requested destination. Repeat with a Rifleman through the same base area. Also retarget a factory vehicle during rollout to confirm controlled egress remains independent of normal locomotion.

### Scope boundary
Combat/health rebalance and strategic enemy AI remain intentionally outside this pass until repeated ground MOVE commands are proven boringly reliable on-device.

# WorldForge v0.13.19 Test Report

## Ground Mobility Reliability 2

Result: **PASS — focused source/regression validation**

- Focused `tests/rts-*.test.mjs` suite: **24 / 24 PASS**.
- `node --check` passes for the modified Skirmish, app, and schema modules.
- New v0.13.19 regression coverage verifies guaranteed Vehicle Factory exterior staging, preservation of the safe egress corridor when MOVE is retargeted during rollout, reduced route inflation, 28 px mobile command slop, tighter selected-unit switching, infantry destination tolerance, and radial local recovery.
- Existing enemy sandbox, Harvester economy, production, FREE CAM, road/river, resource fields, collision/spacing, master-asset, and simulation-foundation suites remain green.
- Production asset hash comparison against the packaged v0.13.18 baseline: **16 / 16 GLBs byte-identical**.

### On-device validation focus
On iPhone, produce an HMMWV, Aegis-X, and Harvester from the Vehicle Factory. Issue a MOVE order even while the unit is still rolling out; the unit should preserve its factory exit corridor, clear the structure completely, then continue to the new destination. Repeat several MOVE orders afterward without re-selecting. For Riflemen, select once and issue several quick taps with normal finger drift; taps under the new 28 px threshold should remain MOVE commands, while a deliberate drag should pan FREE CAM. Soldiers should sidestep/recover around parked vehicles and building corners rather than staying indefinitely in `MOVING`.

### Scope boundary
This release intentionally stays focused on mobility/control reliability. Health/armor rebalance, full ATTACK/STOP/GUARD command UI, strategic enemy harvesting/production AI, and victory/defeat remain the next larger gameplay milestone after on-device movement is confirmed.

# WorldForge v0.13.18 Test Report

## Ground Command Reliability

Result: **PASS — focused source/regression validation**

- Focused `tests/rts-*.test.mjs` suite: **23 / 23 PASS**.
- `node --check` passes for the modified Skirmish, app, and schema modules.
- New v0.13.18 regression coverage verifies sticky selection, deliberate selection switching, dynamic vehicle route obstacles, head-on vehicle sidestepping, Rifleman stuck recovery, Barracks deployment recovery metadata, and explicit blocked-command feedback.
- Existing controlled factory/refinery egress, enemy sandbox, mobile FREE CAM, Harvester economy, production, resource fields, road/river, collision, visual, master-asset, and simulation-foundation suites remain green.
- Production asset hash comparison against the v0.13.17 working baseline: **16 / 16 GLBs byte-identical**.

### On-device validation focus
On iPhone, select one ground vehicle and issue **several consecutive MOVE orders** without re-selecting it. The selection should stay locked and every accepted tap should flash the yellow destination marker. Repeat with an HMMWV/Aegis-X near other friendly vehicles to confirm it routes or sidesteps around them instead of freezing after its first order. Then select a Rifleman, move it repeatedly around buildings/vehicles, and verify it re-routes if locally blocked rather than sitting forever in `MOVING`.

### Scope boundary
This pass intentionally does not rebalance health/damage or add strategic enemy AI. Those remain the next milestone after ground orders are proven reliable on-device.

# WorldForge v0.13.17 Test Report

## Ground Deployment + Enemy Sandbox

Result: **PASS — focused source/regression validation**

- Focused `tests/rts-*.test.mjs` suite: **22 / 22 PASS**.
- `node --check` passes for the modified Skirmish, app, and schema modules.
- New v0.13.17 regression coverage verifies controlled Vehicle Factory egress, Refinery/Harvester departure, reduced route inflation, runtime enemy faction variants, premade hostile base composition, active Guardian Turrets, and hostile building/unit projectile targets.
- Existing mobile command/free-camera, Harvester economy, Vehicle Factory production, resource fields, collision/spacing, road/river, master-asset, and simulation-foundation suites remain green.
- Enemy variants use cloned runtime materials; approved GLB bytes are not rewritten.
- Production asset hash comparison against the v0.13.16 release: **16 / 16 GLBs byte-identical**.

### On-device validation still required
The regression suite validates source wiring and deterministic rules, but it does not reproduce iPhone Safari touch/camera/render behavior. On-device, first verify that a newly produced HMMWV/Aegis-X/Harvester visibly clears the Vehicle Factory before normal routing begins, and that the starter/returning Harvester clears the Refinery before heading to a resource field. Then scout the opposing Crimson base, approach a Guardian Turret, and use the Aegis-X tap-hostile + FIRE flow to confirm combat presentation and damage feel.

### Scope boundary
The enemy base is deliberately premade and defensive in this milestone. Full enemy harvesting, production decisions, moving attack groups, strategic AI, and win/defeat flow are future work after ground deployment and combat interaction are proven on-device.

# WorldForge v0.13.16 Test Report

## Mobile Command UX + Free Camera

Result: **PASS — focused source/regression validation**

- Focused `tests/rts-*.test.mjs` suite: **21 / 21 PASS**.
- `node --check` passes for the modified Skirmish, app, and schema modules.
- New v0.13.16 regression coverage verifies screen-space friendly-unit assist, Harvester resource assist, terrain ray fallback, nearest-valid destination snapping, 14 px touch slop, FREE CAM one-finger drag, FOLLOW-selected behavior, and removal of the `VIEW WIDE` HUD control.
- Existing building egress/repath, Harvester economy, Vehicle Factory production, resource depletion, collision/spacing, terrain/road/river, master-asset, and simulation suites remain green.
- All **16 production GLBs** are SHA-256 byte-identical to the v0.13.15 working baseline; this milestone modifies gameplay/input/UI code only.

### On-device focus
On iPhone, select a tiny Rifleman or vehicle without pixel-perfect tapping, then tap several open-looking destinations including road edges, near trees/rocks, and beside buildings. Each accepted MOVE tap should immediately flash the yellow destination ring and the unit should route to the nearest legal point. Toggle FREE CAM, drag with one finger around the map, pinch zoom, then tap FOLLOW and confirm the camera returns to the selected unit. A small finger wobble should still count as a tap rather than a pan.

# WorldForge v0.13.15 Test Report

## Focused RTS validation

- **20/20 `tests/rts-*.test.mjs` suites pass.**
- `node --check` passes for the modified Skirmish and app modules.
- New v0.13.15 coverage verifies building-aware route helpers, refinery approach/exit/rally sockets, factory egress lifetime, stuck re-routing, docking state transition, and the mobile command hint.
- Existing terrain/road/river, resource field, collision/spacing, economy, production, infantry, master-building, visual-readability, and simulation-foundation suites remain green.
- All **16 packaged GLBs** are SHA-256 byte-identical to the v0.13.14 package; this milestone changes gameplay/navigation/UI code only.

## On-device focus

Test a starter Harvester parked in the Refinery by selecting it and tapping a crystal field. It should leave the unload bay, clear the base, route around structures, harvest, return to the exterior Refinery approach, dock/unload, and leave again. Also produce an HMMWV/Harvester/Aegis-X from the Vehicle Factory and issue a move order after rollout; the unit should not remain wedged against the factory or adjacent structures.

# WorldForge v0.13.14 Test Report

## Road Grounding + Vehicle Factory Production

Result: **PASS — focused source/regression validation**

- Focused `rts-*.test.mjs` suite: **19 / 19 PASS**.
- JavaScript syntax checks pass for Map Forge, Skirmish, app wiring, RTS Definitions, and schema modules.
- New v0.13.14 regression coverage verifies the authoritative road-grade path, tiny road/shoulder render biases, road-aware `surfaceHeightAt()`, removal of the old large road lift, Vehicle Factory queue wiring, exact factory helper sockets, costs/times, rollout collision exception, and UI production controls.
- Existing Harvester economy, routed movement, resource-field depletion, river continuity, bridge agreement, collision/spacing, master-building, resource-master, and simulation-foundation regressions remain passing.
- Production GLB hash comparison against the extracted v0.13.12 release: **16 / 16 byte-identical**.

### Mobile validation still required
The screenshot-driven road issue was caused by the rendered road and unit ground-height paths disagreeing. The source fix now forces them to the same grade, but the final visual confirmation still needs an iPhone/GitHub Pages play test. Vehicle Factory rollout should likewise be checked on-device for camera/readability and exit spacing.

# WorldForge v0.13.13 Test Report

## Skirmish Economy & RTS Command Foundation

Result: **PASS — focused source/regression validation**

- Focused `rts-*.test.mjs` suite: **18 / 18 PASS**.
- JavaScript syntax checks pass for the modified Map Forge, Skirmish, app, command, definition, and schema modules.
- New v0.13.13 economy/order regression coverage verifies version wiring, `MOVE`/`HARVEST`/`RETURN_CARGO`, Harvester cargo/rates, selection, routed movement, resource depletion, Refinery unloading, credit delivery, and UI/help integration.
- Existing resource-field, visual-readability, collision/spacing, road/river, structure-master, and simulation-foundation regressions remain passing.
- Production GLB hash comparison against the v0.13.12 release: **16 / 16 byte-identical**. Rich v0.3 and Dense v0.1 retain their approved SHA-256 hashes.

### Runtime scope
The automated checks validate source wiring and deterministic regression behavior. They do **not** substitute for an actual Safari/GitHub Pages play test, so mobile route feel, tap targeting, Harvester approach behavior, and visual depletion should be checked on-device after deployment.

### Deliberately not included
Enemy AI, Guardian Turret combat, broad health/destruction combat, and the complete vehicle-production economy are not part of v0.13.13.

# WorldForge v0.13.12 Test Report

Focused regression scope: road rendering continuity, river rendering continuity, bridge/water height agreement, existing RTS systems.

- `node --check src/rts-map/rts-map-forge.js`: PASS
- Dedicated v0.13.12 road/river regression assertions: PASS
- Focused `rts-*` suite: **17 / 17 PASS**.
- Approved production GLBs: unchanged by this terrain-only patch.

# WorldForge v0.13.11 Test Report

## Multi-Cluster Mineral Fields

Result: **PASS**

### Validation
- **16 / 16** focused `rts-*.test.mjs` tests pass.
- JavaScript syntax checks pass for the updated RTS Map Forge, application wiring, and schema modules.
- Rich and Dense resource hashes remain exactly the approved v0.13.10 hashes.
- Resource-field tests verify one logical deposit per field, Rich **3–5** visual clusters, Dense **5–8**, GPU instancing, and prepared harvest-point metadata.

### Runtime design
- Repeated crystal clusters are `visualOnly`; field capacity stays at the zone/deposit level.
- Resource instance metadata maps every visible cluster back to its logical resource-zone ID.
- Instancing uses the exact GLB mesh geometry/materials with per-instance field transforms instead of cloning complete GLB trees.
- Skirmish remains 0.6.3; no combat, economy, production, or AI rules were changed in this patch.

# WorldForge v0.13.10 Test Report

## Rich + Dense Crystal Resource Masters

Result: **PASS**

### Validation
- All `rts-*.test.mjs` focused RTS tests pass after the resource integration.
- New resource-master test verifies both packaged crystal GLBs are byte-identical to the approved source files by SHA-256.
- Rich SHA-256: `3fe4ead89946b35403d28dab0c9549f3049a984681f286c0783de0e1959b8951`.
- Dense SHA-256: `6f3a3a33049a764cc7bb1fbe3ce481b49f053c8e4c0785d142124fa7594bbcc0`.
- Both GLBs contain all four required resource helper nodes.
- All 14 GLBs already present in the v0.13.9 package were SHA-256 compared and remain unchanged.
- JavaScript syntax checks pass for the changed RTS Asset Library, RTS Map Forge, application wiring, and schema modules.

### Map integration
- Legacy mineral `OctahedronGeometry` placeholder rendering is removed.
- Rich and Dense masters are selected deterministically from resource density and embedded in exported resource metadata.
- Map export waits for the crystal assets to load before serializing the map GLB.
- Skirmish waits for the same neutral resource assets before starting.

# WorldForge v0.13.9 Test Report

## Believable Terrain & Road Grounding

Result: **PASS**

### Validation
- Focused RTS terrain/map tests passed: `rts-map-forge`, `rts-map-traversal-v020`, `rts-skirmish-visual-readability`, `rts-skirmish-immersive-ui`, and `rts-main-world-infantry-v0135`.
- JavaScript syntax/load checks passed for the updated RTS Map Forge module.
- No RTS structure GLB assets were rebuilt or modified for this milestone.

### Terrain
- Terrain coloration now blends elevation, slope, river moisture, and reserved-base clearing influence.
- Lowland, midland, upland, and rocky zones now read more distinctly while staying stylized and playable.
- Tree placement now prefers wetter and gentler terrain; rocks prefer uplands and steeper slopes.

### Roads
- Road corridors now carve gently into terrain before the visible road surface is laid down.
- Road shoulders and roadbeds use higher ground offset to reduce z-fighting and slope flicker.
- Road strip tessellation was increased so routes conform more cleanly to height changes.


# WorldForge v0.13.8 Test Report

## Unit Collision & Infantry Spacing

Result: **PASS**

### Validation
- 17 / 17 focused RTS / map / simulation / UI / vehicle tests passed.
- JavaScript syntax checks passed for all changed production modules.
- 13 packaged GLB assets were SHA-256 compared against v0.13.7 and remained byte-identical.
- RTS Map Forge, RTS Asset Library, Vehicle Baker and Vehicle Generator remained byte-identical.

### Ground vehicle collision
Oriented hull footprints now replace circular movement collision for:
- Aegis-X MBT: 7.55 × 3.10 m
- HMMWV-50: 4.70 × 2.22 m
- Field Harvester: 8.30 × 3.90 m with +90° collision-heading offset

The Talon AH-X remains excluded from ground OBB blocking while airborne.

### Runtime behavior
- SAT oriented-rectangle vehicle/building collision
- SAT vehicle/vehicle collision
- Tank turn validation
- Building/vehicle corner sliding using obstacle tangent projections
- Safe open-pose search for manually spawned ground support vehicles
- Barracks deployment and Refinery docking exceptions preserved

### Infantry
- Rifleman physical radius: 0.40 m
- Desired personal spacing: 0.82 m
- Compact deterministic Barracks rally slots
- Pairwise soft infantry separation
- Infantry/ground-vehicle separation
- Hard avoidance of buildings and ground vehicles during movement

### Debug
Fullscreen BUILD drawer now includes Collision Debug:
- building footprints
- vehicle hull footprints
- infantry physical radii

Debug visualization is off by default.
