# WorldForge v0.13.10 — Rich + Dense Crystal Resource Masters

WorldForge v0.13.10 replaces the RTS Map Forge mineral placeholder geometry with the two approved crystal-cluster GLBs. RTS Map Forge advances to **0.2.5** and RTS Asset Library to **0.5.1**. The Rich v0.3 and Dense v0.1 files are packaged byte-for-byte exactly as approved; neither GLB was rebuilt, recolored, simplified, or re-exported during integration.

## Resource master integration
- Added `richCrystalCluster` → `assets/resources/worldforge_mineral_rich_crystal_cluster_v0.3_flatfacets.glb`
- Added `denseCrystalCluster` → `assets/resources/worldforge_mineral_dense_crystal_cluster_v0.1.glb`
- Registered both as neutral `mineralResource` masters with their authored helper nodes: `WF_RESOURCE_ROOT`, `WF_RESOURCE_CENTER`, `WF_HARVEST_POINT`, and `WF_DEPLETION_CENTER`.
- Rich defaults to 1,250 capacity and Dense to 3,000 capacity as provisional gameplay metadata; actual economy tuning can change later without modifying the GLBs.

## Map Forge replacement
- Removed the procedural octahedron mineral placeholders.
- Every generated resource zone now receives one exact Rich or Dense master cluster with deterministic heading and terrain grounding.
- The resource-density control changes the proportion of Dense versus Rich nodes while keeping the strategic resource-zone count stable.
- Dense nodes are marked `contested`; Rich nodes are marked `standard` in exported gameplay metadata.
- Map GLB export now waits for the resource masters to finish loading so exported maps include the real crystal assets.
- Skirmish waits for the same resource load promise before starting, so the Main World and Skirmish share the same neutral mineral deposits.

# WorldForge v0.13.9 — Believable Terrain & Road Grounding

WorldForge v0.13.9 advances RTS Map Forge to **0.2.4** with a focused battlefield-believability pass. Terrain coloration now responds more coherently to elevation, slope, river moisture, and reserved base clearings, while road corridors are carved and lifted so they stay visually grounded across elevation changes. No RTS structure GLBs were rebuilt for this milestone.

## Terrain zoning improvements
- Lowlands near water read greener and cooler
- Midlands stay readable and playable for core maneuver space
- Uplands and steep slopes transition drier and rockier
- Reserved start and expansion clearings stay slightly more worn and faction-ready

## Road grounding improvements
- Road corridors now softly flatten into the local terrain
- Road shoulders and roadbeds ride slightly above the carved surface to avoid z-fighting and color flicker
- Road segmentation was increased so routes conform more cleanly to elevation changes

## Vegetation and rock placement logic
- Trees prefer wetter and gentler terrain
- Rocky cover prefers uplands and steeper ground
- Start areas, safe expansions, and road setbacks remain clearer for gameplay readability

# WorldForge v0.13.8 — Unit Collision & Infantry Spacing

WorldForge v0.13.8 builds on the v0.13.7 rotor/fan-axis and building-footprint cleanup with a full local unit-collision pass. No GLB was rebuilt for this milestone.

## Ground vehicle collision
Ground vehicles no longer rely on oversized circular collision radii for local movement. They now use oriented hull footprints:
- Aegis-X MBT: **7.55 × 3.10 m**
- HMMWV-50: **4.70 × 2.22 m**
- Field Harvester: **8.30 × 3.90 m** with its authored +90° footprint orientation accounted for
- Talon AH-X remains an air-volume unit while airborne

The player tank now validates its hull while translating and while rotating. Vehicle/building and vehicle/vehicle contact uses SAT oriented-rectangle collision.

## Building-corner sliding
When the Aegis-X meets a building or another ground vehicle, Skirmish now attempts movement projected along the contacted obstacle axes instead of simply rejecting the entire movement step. This allows the hull to slide along walls/corners rather than getting stuck on the old invisible diagonal bubble.

## Infantry spacing / local avoidance
- Rifleman physical radius reduced to **0.40 m**
- Desired personal spacing is **0.82 m center-to-center**
- Barracks production assigns compact deterministic rally slots instead of sending every Rifleman to the exact same coordinate
- A local-separation simulation pass gently resolves Infantry/Infantry overlap
- Infantry treat buildings and ground vehicles as hard local obstacles while other infantry remain a soft crowd
- Infantry already inside a vehicle footprint are pushed out locally rather than being left standing through the vehicle mesh

## Ground-unit spawn safety
Manual HMMWV/Harvester test spawns now search for a nearby open ground pose before creating the unit. This prevents freshly deployed test vehicles from starting overlapped with buildings or other ground units.

## Dock / deployment exceptions preserved
- Barracks Riflemen can still pass through their own authored deployment corridor while exiting
- The Refinery starter Harvester keeps its special dock relationship
- Air units remain excluded from ground OBB blocking while airborne

## Collision debug
The fullscreen Skirmish BUILD drawer now includes **DEV / COLLISION → COLLISION DEBUG**. It is off by default. When enabled it draws:
- yellow/red building physical footprints
- cyan ground-vehicle hull footprints
- green infantry physical radii

This is intended only for diagnosing invisible-wall or spacing issues.

## Preservation
- All 13 packaged GLB master assets are byte-identical to v0.13.7
- RTS Map Forge, RTS Asset Library, Vehicle Baker and Vehicle Generator remain unchanged
- Main World, Vehicle Factory / Guardian Turret integration, Barracks/Rifleman production, Refinery/Harvester docking, tank combat, fullscreen vehicle depot and camera systems remain intact

---

# WorldForge v0.13.7 — Rotor Axis + Building Collision Cleanup

WorldForge v0.13.7 is a focused runtime cleanup on top of the v0.13.6 Factory/Turret integration. No approved GLB was rebuilt or replaced.

## Correct functional spin axes
- Aegis Talon main rotor remains on local **Y**, matching the authored horizontal rotor plane.
- Aegis Talon tail rotor now spins around local **Z** instead of X, matching the authored tail-rotor axle.
- Field Power Node `CoolingFanRoot_*` nodes now spin around local **Z**.
- Field Refinery `DustCollectorFanRoot` now spins around local **Z**.
- Building Forge preview uses the same corrected fan axes as Skirmish.
- Functional animation rates are now delta-time based in Skirmish rather than frame-count based.

## Building collision / placement cleanup
- Removed the old diagonal-radius collision bubbles used for buildings.
- Mobile unit collision now tests against oriented rectangular building footprints with rounded unit-radius clearance.
- Tank collision includes the Aegis-X's actual collision radius.
- Rifleman collision includes the infantry collision radius while still ignoring its source Barracks during the authored deployment walk-out.
- Each buildable structure now has a tuned `collisionFootprint` smaller than its construction/placement footprint where decorative foundations, canopies or apron geometry should not behave like invisible walls.
- Building-vs-building placement now uses oriented-rectangle SAT overlap with a small physical gap instead of diagonal circle overlap, so corners no longer reserve huge empty bubbles.
- The construction footprint itself remains unchanged, preventing visual structure overlap.

## Preservation
- No vehicle, building, infantry or map GLB changed.
- Vehicle Factory, Guardian Turret, Barracks, Refinery, Power Node, Command Post and all vehicle masters are preserved byte-for-byte from v0.13.6.
- Main World, Rifleman production, Refinery/Harvester docking, fullscreen vehicle depot, tank combat and camera systems remain intact.

---

# WorldForge v0.13.6 — Vehicle Factory + Guardian Turret Integration

WorldForge v0.13.6 keeps the v0.13.5 Main World / Barracks / Rifleman foundation and replaces the remaining Vehicle Factory and Gun Turret placeholders with the approved detailed Aegis master assets.

## Aegis Vehicle Factory v0.2
- Buildable `vehicleFactory` now resolves to the exact Aegis Vehicle Factory master rather than the procedural placeholder.
- Production footprint stays in the existing ~30 × 23 m class.
- The master includes the recessed vehicle bay, deployment pad, operations wing, service wing, Aegis faction material slots, and rollout helper nodes.
- Game-ready GLB is normalized to the same Y-up import convention used by the existing master-building pipeline.
- Helper nodes retained for later real factory production: `WF_SPAWN_VEHICLE`, `WF_ENTRY`, `WF_EXIT_PATH_0/1/2`, `WF_RALLY`, `WF_SERVICE_BAY`, and `WF_DOOR_CENTER`.
- This pass replaces the visual placeholder only; vehicle-factory economy/production queues are intentionally not added yet.

## Aegis Guardian Turret v0.3
- Buildable `gunTurret` now resolves to the exact Guardian Turret master.
- The enemy Skirmish training target also uses the Guardian master with the enemy faction palette instead of the old procedural turret.
- The GLB is normalized to the game Y-up import convention.
- `MuzzleSocket` is parented beneath `GunPitchRoot` so future elevation/fire logic carries the muzzle with the barrel assembly.
- `TurretRoot`, `GunPitchRoot`, `MuzzleSocket`, and `SensorSocket` are exposed on the runtime building view for the future functional-defense pass.
- This milestone preserves the previous turret gameplay behavior; autonomous defensive targeting/firing remains a later feature.

## Fullscreen vehicle depot restored
The old side-panel test depot became inaccessible when Skirmish moved to the immersive fullscreen interface. The fullscreen BUILD drawer now contains a **DEPLOY TEST VEHICLES** section with:
- HMMWV-50
- Talon AH-X
- Field Harvester

These use the same approved support-unit spawn path as before, so fullscreen presentation no longer removes vehicle testing access.

## Preservation
- Main World remains the approved 1,536 m seed-731904 Skirmish world.
- Barracks → Rifleman production remains unchanged.
- Refinery → starter Harvester docking remains unchanged.
- Existing Aegis-X, HMMWV, Talon, Harvester, Command Post, Power Node, Refinery and Barracks masters remain unchanged.

---

# WorldForge v0.13.5 — Main World + Field Barracks Infantry

WorldForge v0.13.5 builds directly on the verified v0.13.4 Skirmish Visual Readability baseline. The existing Aegis-X, HMMWV-50, Talon AH-X, Field Harvester, Tactical Command Post, Field Power Node and Field Refinery masters remain preserved while Skirmish gains its first true infantry-production loop and a larger permanent battlefield.

## One 1,536 m Skirmish world
- Skirmish now restores one approved main-world recipe on entry: seed **731904**, 1,536 m, 4 starts, temperate biome, balanced tactical profile, maximum relief/forest recipe values, resource density 0.75, river + roads, fortified mountain starts.
- Start positions move inward enough to support larger bases without crowding the world boundary.
- Flat development reserves expand to roughly **260 m diameter** around each start before the mountain-bowl ring.
- Trees and rock cover are excluded from the enlarged start-development areas, safe expansion zones and road setbacks.
- Wilderness, ridges, mountain pockets, river crossings and forested outer regions remain intact so the larger clear bases do not flatten the whole battlefield.
- Map Forge remains editable, but entering Skirmish restores the approved main world for now.

## Field Barracks v0.2.3 — exact master asset
- Added the approved detailed **Aegis Field Barracks v0.2.3** GLB as a first-class military master asset.
- The Barracks uses the shared faction slots `WF_BASE_ARMOR`, `WF_TEAM_PRIMARY`, `WF_TEAM_SECONDARY`, and `WF_TEAM_ACCENT`.
- The finished deployment geometry is preserved: recessed interior exit, corrected shallow deployment apron, grounded perimeter/rear lights and readable exterior detail.
- Production sockets are validated from the asset: `WF_SPAWN_INFANTRY`, `WF_ENTRY`, `WF_EXIT_PATH_0`, `WF_EXIT_PATH_1`, `WF_EXIT_PATH_2`, and `WF_RALLY`.
- The old procedural Barracks remains only as a fallback path if the master fails to load.

## Aegis Rifleman v0.3 — animated 3D infantry
- Added the approved lightweight animated Rifleman GLB as the first infantry unit.
- Uses the real `CombatWalk` and `AimFire` clips from the asset.
- New `infantryLight` locomotor uses the existing Map Forge infantry traversal class instead of vehicle steering rules.
- A completed Barracks can train Riflemen for **$120** with a five-slot queue.
- Soldiers spawn out of sight inside the Barracks, follow the authored deployment corridor/apron path, then rally outside instead of popping into existence on the pad.
- Riflemen receive the same soft ground-contact presentation treatment used by other ground units.
- First combat pass provides simple automatic rifle engagement against nearby enemy targets with aim-facing, `AimFire`, muzzle/tracer feedback and damage.

## Protection / scope
- Existing approved vehicle and building GLBs were not modified.
- Refinery → starter Harvester docking remains unchanged.
- Existing tank driving, main-gun combat, mobile building placement, VIEW WIDE / VIEW CLOSE, pinch zoom, minimap, simulation snapshot and immersive mobile HUD remain intact.
- This milestone intentionally adds only the first Rifleman class. Rocket infantry, War Factory production, Helipad production and full unit-selection/order UX remain later work.

---

# WorldForge v0.13.4 — Skirmish Visual Readability + Terrain Pass

WorldForge v0.13.4 keeps the immersive v0.13.3 battlefield UI and adds a focused rendering/readability pass so the approved vehicle masters remain recognizable at RTS distance without adding a bright arcade selection ring.

## Skirmish Lab 0.5.1 — vehicle presentation
- Added soft ground-contact shadows to **all Skirmish ground vehicles**: Aegis-X, HMMWV-50, Field Harvester, and future units that use the same support-unit path.
- Helicopters use a separate softer ground-shadow profile. The shadow expands and fades with altitude instead of looking glued to the aircraft.
- The system supplements the normal directional shadow map; it does not alter the approved GLB geometry or authored materials.
- No permanent selection ring was added. The battlefield remains semi-realistic and uncluttered.

## Camera / model-detail pass
- Default **VIEW WIDE** preserves the landscape distance introduced in v0.13.3.
- New **VIEW CLOSE** tactical camera increases the apparent size of the exact vehicle models and lowers the viewing angle slightly so turret, hull, wheels/tracks and other authored detail remain visible.
- Pinch zoom on touch and wheel zoom on desktop now work while Skirmish follow mode is active.
- Two-finger pinch gestures are explicitly excluded from battlefield tap/build placement handling so zooming cannot accidentally place a structure.

## RTS Map Forge 0.2.2 — visual-only terrain refinement
- Temperate/drylands/alpine palettes now have stronger low/mid/high-ground separation while remaining muted enough for unit readability.
- Terrain vertices receive subtle slope darkening, which makes ridges, bowls and elevation transitions easier to read at gameplay distance.
- Roads now have a darker core plus a restrained earth shoulder, improving route visibility without changing navigation metadata.
- Lighting in Skirmish uses less flat ambient fill and a stronger map key light, revealing vehicle surface detail and terrain shape more clearly.
- Terrain geometry, height function, buildability, movement classes, bridge topology, resource locations and tactical metadata are unchanged.

## Protection
- Exact approved master GLBs remain byte-identical to v0.13.3: Aegis-X, HMMWV-50, Talon AH-X, Field Harvester v2, Tactical Command Post v2.1, Field Power Node v1.0, Field Refinery v2, Command Nexus and Grid Bastion.
- Protected RPG/world generators, Vehicle Forge/Baker, Building Forge and RTS simulation files remain byte-identical to v0.13.3.
- This pass changes presentation/camera and RTS-map visual rendering only; simulation, economy, docking, combat, pathing and construction legality are untouched.

## v0.13.3 immersive UI remains intact
- Full-viewport Skirmish mode, landscape-first HUD, BUILD drawer, mobile refinery placement hotfix, safe-area handling and exact refinery/harvester docking are retained.

WorldForge now includes the exact approved **Aegis Field Refinery v2.0** and **Aegis Field Harvester v2.0** as first-class master assets in Forge and Skirmish Lab.

## Building Forge 0.3
- Added exact `Aegis_Field_Refinery_v2.glb` master geometry.
- Refinery supports the same faction palette workflow as the Command Post and Field Power Node through `WF_TEAM_PRIMARY`, `WF_TEAM_SECONDARY`, and `WF_TEAM_ACCENT`.
- Master validation includes the real receiving/dock contract: Queue, Approach, Dock, Unload, Exit, Rally, receiver-pit and FX sockets.
- Functional preview recognizes the refinery dust-collector fan root.
- Faction-colored master GLB and building-definition export remain available.

## Vehicle Forge 0.4
- Added exact `Aegis_Field_Harvester_v2.glb` as a reference-grade vehicle family.
- The approved Harvester can be faction recolored, inspected, exported, and sprite-baked without procedurally recreating its geometry.
- Functional contract includes front steering, six wheel-spin roots, collector drum, gathering arms, intake belt, two bottom-dump door roots, resource/dump sockets and refinery alignment socket.

## Skirmish Lab 0.4
- The Refinery build button now uses the exact **Aegis Field Refinery v2.0** master instead of prototype block geometry.
- Every completed player Refinery includes exactly one bundled **Aegis Field Harvester v2.0** starter unit.
- The starter Harvester is positioned by matching the Refinery's `HarvesterDockSocket` directly to the Harvester's `RefineryDockAlignSocket`; it is not placed with a guessed world offset.
- The vehicle is rotated for the refinery's one-way drive-through lane and starts parked over the real receiving grate.
- A manual **DEPLOY HARVESTER** asset-depot button is also available for visual/skirmish testing.
- The Harvester is simulation-owned and carries resource/docked state, but the full autonomous harvest → return → unload → credits loop is intentionally deferred to the next economy-system pass.

## Exact master preservation
- Packaged Field Refinery SHA-256: `f195487716d52a1bc29cb9360fe35832d43bba2410578fd66f238345bc9edab2`
- Packaged Field Harvester SHA-256: `7485c6449fe7ac64eabc7f91d4bd920bc8ffeebf73a9521297e7500df0ba4c43`
- These match the approved source GLBs byte-for-byte.

## Historical asset protection
- All protected RPG/world generator files remain byte-identical to their protected baselines.
- Vehicle Baker and the approved master-asset geometry remain unchanged.
- RTS Map Forge gameplay topology/navigation remains unchanged; v0.13.4 intentionally changes only its visual palette, slope shading, road shoulders and lighting profile.
- Existing Aegis-X, HMMWV-50, Talon AH-X, Command Post, Field Power Node, Field Refinery, Field Harvester, Command Nexus, Grid Bastion and BTR GLBs remain byte-identical.


## v0.13.2.1 mobile refinery placement hotfix
- Skirmish building placement now searches for the nearest legal footprint around the tapped point when the exact center is blocked/non-buildable.
- Search is bounded to 66 m and still obeys affordability, construction radius, terrain buildability and building-collision rules.
- iPhone build-placement taps allow 22 CSS px of finger drift while a building is selected; normal aim/interaction remains at the original 8 px threshold.
- Exact Aegis Field Refinery v2 and Aegis Field Harvester v2 GLBs are unchanged byte-for-byte.
