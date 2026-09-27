# v0.13.19 — Ground Mobility Reliability 2

- WorldForge advanced to **0.13.19** and Skirmish to **0.7.6**. RTS Map Forge remains **0.2.9** and RTS Definitions remain **0.6.1**.
- Vehicle Factory products now remain in controlled egress through the authored rally point and require a full-hull exterior clearance margin before ordinary collision/pathfinding resumes.
- Added an automatic farther exterior staging fallback when an authored rollout point is not far enough for the complete unit OBB.
- MOVE orders issued during factory/refinery egress preserve the remaining safe corridor and retarget only the route after the unit clears the source structure.
- Reduced global building-route inflation slightly while retaining exact local OBB collision for close movement.
- Touch input now allows **28 px** of finger drift before FREE CAM panning; building placement allows 32 px.
- Selected-unit switching now favors direct mesh hits and uses a smaller 18/20 px mobile assist so terrain MOVE taps are not stolen.
- Infantry destination snapping ignores other Riflemen as hard blockers, and local movement adds a radial escape fan plus a 0.55 s stuck recovery.
- No approved production GLB was rebuilt or modified.

# v0.13.18 — Ground Command Reliability

- WorldForge advanced to **0.13.18** and Skirmish to **0.7.5**. RTS Map Forge remains **0.2.9** and RTS Definitions remain **0.6.1**.
- Selection is now sticky: tapping the already-selected friendly no longer clears it, preventing accidental loss of command context on touch screens.
- Split friendly touch assistance into generous first-selection radii and smaller deliberate switch radii while a unit is already selected, so repeated terrain taps are no longer stolen by nearby friendlies.
- Preserved contextual Harvester resource targeting and Aegis-X hostile aiming ahead of terrain MOVE fallback.
- Added explicit `BLOCKED` feedback when no traversable destination can be resolved.
- Added nearby ground vehicles as temporary dynamic route obstacles, including detour corner nodes and a short start-of-route escape allowance for already-crowded units.
- Added true tangential local sidestep candidates for vehicles blocked head-on by another hull.
- Improved Rifleman local avoidance with multi-strength sidesteps plus a 0.60-second stuck watchdog and automatic re-pathing to the original command destination.
- Barracks deployment now records order/destination/stuck metadata so deploying Riflemen can recover if their exit lane becomes obstructed.
- No approved GLB was rebuilt or modified.

# v0.13.17 — Ground Deployment + Enemy Sandbox

- WorldForge advanced to **0.13.17** and Skirmish to **0.7.4**. RTS Map Forge remains **0.2.9** and RTS Definitions remain **0.6.1**.
- Replaced fragile factory/refinery departure with a controlled source-building egress phase that follows authored exit corridors before handing units back to ordinary A* movement and OBB collision.
- Added full-footprint exterior validation before a vehicle leaves controlled egress, with safe exterior continuation when an authored helper is not sufficient.
- Reduced building inflation used by ground route planning so narrow-but-valid base lanes are not sealed by a vehicle's full longitudinal footprint.
- Added magenta controlled-egress corridor visualization to collision debug.
- Added runtime player/enemy material palette handling for existing unit masters; no duplicate enemy GLBs are required.
- Added a deterministic premade **Crimson** hostile forward base at the opposing start with Command Post, Power Node, Refinery, Barracks, Vehicle Factory, two Guardian Turrets, Aegis-X, HMMWV-50, Harvester, Talon, and four Riflemen.
- Guardian Turrets now acquire and fire on opposing units in range; rifle combat is owner-relative so hostile Riflemen can defend their base.
- Projectile collision now supports hostile units and buildings, allowing the Aegis-X main gun to damage/destroy the premade enemy base.
- Added hostile minimap coloring and contextual Aegis-X tap-hostile aiming guidance.
- Full enemy economy/production/attack-wave AI remains intentionally outside this milestone.
- No approved production GLB was rebuilt or modified.

# v0.13.16 — Mobile Command UX + Free Camera

- WorldForge advanced to **0.13.16** and Skirmish to **0.7.3**. RTS Map Forge remains **0.2.9** and RTS Definitions remain **0.6.1**.
- Added screen-space friendly-unit touch assist: larger for infantry, smaller for vehicles, without changing visible unit scale.
- Added Harvester-only resource-field touch assist so crystal nodes are easy to select without preventing normal combat units from receiving MOVE orders near resources.
- Replaced terrain-mesh-dependent move tapping with a map-height ray fallback; ordinary battlefield taps now resolve to an X/Y terrain position even when the ray first encounters decorative geometry or misses a small terrain triangle.
- MOVE taps now resolve through the existing nearest-open-unit destination search and immediately show the yellow command marker at the legal destination.
- Increased normal Skirmish tap slop to **14 CSS px** while retaining the 22 px building-placement allowance.
- Replaced the top HUD `VIEW WIDE` control with **FREE CAM / FOLLOW**. FREE CAM uses one-finger drag with a 14 px drag threshold, retains pinch zoom, clamps pan to map bounds, and FOLLOW tracks the selected unit (or the Aegis-X fallback).
- Existing building-aware routes, refinery/factory egress, Harvester economy, road/river fixes, and production systems remain intact.
- No approved GLB was rebuilt or modified.

# v0.13.15 — Base Egress + Building-Aware RTS Orders

- WorldForge advanced to **0.13.15** and Skirmish to **0.7.2**. RTS Map Forge remains **0.2.9** and RTS Definitions remain **0.6.1**.
- Added building-aware local route planning layered over the existing terrain A* route. Structure collision rectangles are expanded by the moving unit footprint so vehicles plan around actual buildings rather than attempting to drive through them.
- Added automatic egress handling for units that begin an order inside a structure collision footprint.
- Vehicle Factory deployment now clears its temporary factory-collision exception after `WF_EXIT_PATH_2`, before the final rally step.
- Field Refinery now records and uses `HarvesterApproachSocket`, `HarvesterDockSocket`, `HarvesterExitSocket`, and `HarvesterRallySocket` as an authored Harvester dock/egress profile.
- Returning Harvesters route to the exterior approach first, then perform a short controlled docking move into the Refinery. Departing Harvesters exit through the authored exit/rally path before resuming the field route.
- Refined refinery collision-ignore semantics so the Refinery is ignored only while actually parked/departing/docking/unloading, not indefinitely while the Harvester is elsewhere on the map.
- Added progress/stuck recovery: a ground unit that stops making progress automatically re-plans around base obstructions and reports the re-route once.
- Added an always-visible mobile command hint for unit selection, movement, and Harvester crystal-field orders.
- No production GLBs were rebuilt or modified.

# v0.13.14 — Road Grounding + Vehicle Factory Production

- WorldForge advanced to **0.13.14**, Skirmish to **0.7.1**, RTS Map Forge to **0.2.9**, and RTS Definitions to **0.6.1**.
- Replaced the previous elevated road-profile behavior with one authoritative smoothed grade shared by terrain carving, road rendering, and unit surface-height queries.
- Reduced visible road lift to **0.025 m** and shoulder lift to **0.008 m**, eliminating the large floating-road gap visible over vehicles while preserving z-fight protection.
- Added `roadSurfaces` grounding metadata so units on the road core use the rendered road top instead of the underlying terrain sample.
- Preserved the continuous river / bridge water-surface repair from v0.13.12.
- Added real Aegis Vehicle Factory production queues for Aegis-X, HMMWV-50, and Field Harvester.
- Added prototype production costs/times: Aegis-X **$1,100 / 8.0 s**, HMMWV-50 **$450 / 4.0 s**, Harvester **$800 / 6.0 s**.
- Produced vehicles roll out through the exact factory helper path: `WF_SPAWN_VEHICLE` → `WF_ENTRY` → `WF_EXIT_PATH_0/1/2` → `WF_RALLY`.
- Produced ground vehicles use the same selection, routed movement, OBB collision, and Harvester economy systems as manually deployed units.
- Talon remains development-only; no air factory was invented in this milestone.
- No approved GLB was rebuilt or modified.

# v0.13.13 — Skirmish Economy & RTS Command Foundation

- WorldForge advanced to **0.13.13**, Skirmish to **0.7.0**, RTS Map Forge to **0.2.8**, and RTS Definitions to **0.6.0**.
- Added contextual friendly-unit selection and a selected-unit HUD state.
- Added routed `MOVE` and `STOP` handling; ground units use lightweight A* navigation over the existing tactical nav grid while retaining local collision/sliding.
- Added `HARVEST` and `RETURN_CARGO` simulation commands.
- Added a complete first Harvester economy loop: select Harvester → tap resource field → route and harvest → fill cargo → return to completed Refinery → unload → player credits increase → repeat.
- Field Harvester prototype economy data now includes a 1,200-unit cargo capacity, harvest rate, unload rate, and credit conversion.
- Registered Rich/Dense Map Forge deposits as finite simulation resource entities without multiplying capacity for their visual cluster instances.
- Added stepwise visual crystal-field depletion and minimap depletion using the existing instanced resource presentation; approved Rich/Dense GLBs remain unchanged.
- Cached the Refinery's authored Harvester dock and added resolved traversable approach points for resource and refinery routing.
- Manual Aegis-X driving remains available and cancels its RTS move order; battlefield taps with no selection preserve the legacy turret-aim behavior.
- Enemy AI, combat/turret behavior, and full vehicle-production economy are deliberately outside this milestone.
- No approved vehicle, building, infantry, or crystal GLBs were rebuilt.

# v0.13.12 — Road Surface + River Continuity Fix

- WorldForge advanced to **0.13.12** and RTS Map Forge to **0.2.7**.
- Replaced edge-sampled road ribbons with a smoothed shared profile used by both road shoulder and road core.
- Kept the dark road core above the shoulder to prevent brown sections caused by clipping/grade mismatch.
- Added a dedicated river-surface profile above the carved channel; water no longer folds into terrain and disappear in isolated spans.
- Bridge water height now comes from the same river-surface profile.
- No approved vehicle, building, infantry, or Rich/Dense crystal GLBs were rebuilt.

# v0.13.11 — Multi-Cluster Mineral Fields

- WorldForge advanced to **0.13.11** and RTS Map Forge to **0.2.6**; RTS Asset Library remains **0.5.1**.
- Rich resource zones now display **3–5** approved Rich v0.3 clusters.
- Dense resource zones now display **5–8** approved Dense v0.1 clusters.
- Preserved one logical deposit/capacity per field so visual richness does not silently multiply economy value.
- Added deterministic cluster spread, rotation, and restrained scale variation.
- Reworked resource rendering to use GPU instancing per source mesh so repeated fields do not multiply draw calls by every GLB copy.
- Added per-instance resource-zone mapping metadata for future selection/harvest interaction.
- Prepared world-space `harvestPoint` metadata from the authored `WF_HARVEST_POINT` helper.
- Both approved crystal GLBs remain byte-identical; no resource asset was rebuilt or edited.

# v0.13.10 — Rich + Dense Crystal Resource Integration

- WorldForge advanced to **0.13.10**, RTS Map Forge to **0.2.5**, and RTS Asset Library to **0.5.1**.
- Added the approved Rich v0.3 and Dense v0.1 mineral-cluster GLBs under `assets/resources/` without modifying their bytes.
- Added `MASTER_RESOURCES`, `instantiateMasterResource`, and richness-based resource lookup to the RTS master-asset registry.
- Removed the old procedural `OctahedronGeometry` resource placeholders from Map Forge.
- Resource zones now instantiate the exact Rich or Dense GLB at deterministic map positions and rotations.
- Resource-density settings now influence Rich/Dense prevalence rather than generating more placeholder shards.
- Added per-zone/deposit metadata for resource asset ID, richness, capacity, terrain position, and heading.
- Map GLB export and Skirmish startup now wait for exact resource-master loading.
- Preserved all existing terrain, road, navigation, structure, vehicle, infantry, and collision systems.

# v0.13.9 — Believable Terrain & Road Grounding

- WorldForge advanced to **0.13.9** and RTS Map Forge to **0.2.4**.
- Reworked battlefield terrain coloration to blend elevation, slope, river moisture, and base-clearing influence.
- Added more coherent lowland, midland, upland, and rocky zone transitions for the RTS main world.
- Added road-corridor terrain carving and increased road mesh lift to reduce z-fighting, terrain fall-through, and color flicker on elevation changes.
- Increased road strip segmentation so routes conform more cleanly to varied relief.
- Updated foliage placement to prefer wetter flatter ground and updated rock placement to prefer steeper uplands.
- Preserved gameplay readability by keeping start areas, safe expansions, and road setbacks cleaner.
- No RTS structure GLBs were rebuilt or modified.

# v0.13.8 — Unit Collision & Infantry Spacing

- WorldForge advanced to **0.13.8**, Skirmish Lab to **0.6.3**, and RTS Definitions to **0.5.3**.
- Added oriented collision footprints for the Aegis-X, HMMWV-50 and Field Harvester.
- Kept Talon AH-X on air-volume collision while airborne.
- Added oriented-rectangle vehicle/building and vehicle/vehicle collision.
- Added tank rotation validation so the rear hull cannot freely swing through structures.
- Added wall/corner sliding when vehicle movement is partially blocked.
- Added safe open-pose search for manually deployed ground support vehicles.
- Added compact Barracks rally-slot assignment.
- Added 0.82 m Rifleman personal spacing and a local infantry-separation pass.
- Added Infantry/Vehicle separation so soldiers do not remain inside ground vehicles.
- Added fullscreen Collision Debug footprint visualization.
- Preserved Barracks deployment and Refinery docking exemptions.
- No GLB assets were rebuilt or modified.

# v0.13.7 — Rotor Axis + Collision Cleanup

- WorldForge advanced to **0.13.7**, Skirmish Lab to **0.6.2**, Building Forge to **0.3.1**, and RTS Definitions to **0.5.2**.
- Corrected Talon tail-rotor runtime spin from local X to local Z; main rotor remains local Y.
- Corrected Power Node cooling fans and Refinery dust fan to local Z in both Skirmish and Building Forge preview.
- Converted rotor/fan animation rates to delta-time updates in Skirmish.
- Replaced building diagonal-circle movement collision with oriented rectangular footprints plus per-unit clearance.
- Added tuned collision footprints for all six buildable RTS structures.
- Replaced building placement circle overlap with oriented-rectangle SAT overlap while preserving the original construction footprints.
- No GLB assets were rebuilt or modified.

# v0.13.6 — Vehicle Factory + Guardian Turret Integration

- WorldForge advanced to **0.13.6**, Skirmish Lab to **0.6.1**, RTS Asset Library to **0.5.0**, and RTS Definitions to **0.5.1**.
- Added game-ready Y-up **Aegis Vehicle Factory v0.2.1** master and connected `vehicleFactory` to it.
- Added game-ready Y-up **Aegis Guardian Turret v0.3.1** master and connected `gunTurret` to it.
- Replaced the procedural enemy training turret with the Guardian Turret master using the enemy faction palette.
- Corrected Guardian turret hierarchy so `MuzzleSocket` follows `GunPitchRoot`.
- Exposed factory/turret functional sockets in Skirmish building views for later production/defense systems.
- Restored HMMWV-50, Talon AH-X and Field Harvester deploy buttons inside the fullscreen Skirmish BUILD drawer.
- Preserved the existing 1,536 m Main World, Barracks/Rifleman loop, Refinery/Harvester docking, tank controls and immersive mobile HUD.

# v0.13.5 — Main World + Field Barracks Infantry

- WorldForge advanced to **0.13.5**; Skirmish Lab to **0.6.0**; RTS Map Forge to **0.2.3**; RTS Asset Library to **0.4.0**.
- Locked playable Skirmish to the approved 1,536 m temperate main world (seed 731904) while leaving Map Forge available for experimentation.
- Enlarged start development reserves to roughly 260 m diameter and moved starts inward for more construction room.
- Added vegetation/rock setbacks around base-development areas, safe expansions and road corridors while preserving mountainous/forested wilderness.
- Added exact **Aegis Field Barracks v0.2.3** master GLB with faction-material slots and validated infantry deployment sockets.
- Added exact **Aegis Rifleman v0.3** GLB with `CombatWalk` and `AimFire`.
- Added Barracks production queue, $120 Rifleman training, hidden interior spawn, physical exit/apron traversal and rally movement.
- Added infantry locomotion using Map Forge's infantry navigation class and small soft contact shadows.
- Added first-pass Rifleman combat: target facing, service-rifle cooldown/range/damage, AimFire playback and tracer/muzzle feedback.
- Preserved all previously approved vehicle/building masters, refinery/Harvester docking, tank combat, construction placement and mobile Skirmish UI.

# v0.13.4 — Skirmish Visual Readability + Terrain Pass

- Skirmish Lab advanced to 0.5.1; RTS Map Forge visual version advanced to 0.2.2.
- Added soft contact shadows for every ground vehicle spawned through Skirmish, including Aegis-X, HMMWV-50 and Field Harvester.
- Added a separate altitude-aware helicopter shadow profile that becomes broader/fainter with height.
- Deliberately did **not** add a permanent selection ring; unit readability comes from lighting, shadows, terrain contrast and camera scale instead.
- Added VIEW WIDE / VIEW CLOSE camera modes. Wide preserves the existing landscape overview; Close uses a tighter orthographic span and lower follow-camera angle to reveal the real master-model detail.
- Enabled wheel/pinch zoom while Skirmish is active. Multi-touch gestures are suppressed from tap/build placement so pinch zoom cannot accidentally place structures.
- Reduced flat ambient fill in Skirmish and strengthened the dedicated map key light for better normals/silhouette readability.
- Refined RTS terrain colors with subtle slope-based darkening and darker road cores plus earth shoulders. Navigation, terrain heights and gameplay metadata are unchanged.
- All approved master GLBs, protected RPG/world generators, Vehicle Forge/Baker, Building Forge, simulation/economy, refinery/harvester docking and construction legality remain unchanged.

# v0.13.3 — Skirmish Immersive Combat UI

- Skirmish Lab advanced to 0.5.0.
- Entering Skirmish now hides the entire WorldForge editor panel and gives the battlefield the full available browser viewport.
- Added iPhone safe-area handling, page-scroll/overscroll suppression, touch-callout/text-selection suppression, and viewport resync on resize/orientation changes.
- Added a compact in-game top HUD for credits/power, Aegis-X health, follow state, BUILD, and EXIT.
- Moved construction selection into an in-battlefield BUILD drawer; selecting a building closes the drawer and shows a compact placement banner with CANCEL.
- Added a portrait rotate hint while keeping portrait functional.
- Landscape camera is slightly wider and lower-angle for better base/battlefield readability.
- Minimap, drive pad and FIRE control were resized/repositioned for landscape mobile play.
- Refinery placement hotfix remains intact.
- No master GLB, protected generator, Map Forge, Vehicle Baker, simulation/economy rules, refinery/harvester docking logic, or construction legality rules were changed.

# v0.13.2.1 — Refinery Placement Hotfix

- Fixed large-building placement on mobile, especially the 34 × 26 m Field Refinery.
- Tapping near a legal site now snaps to the nearest valid footprint center instead of requiring a pixel-perfect legal center.
- Increased tap-drift tolerance only while a Skirmish building is selected.
- Existing construction constraints remain authoritative.
- No master GLB geometry was modified.

# WorldForge Changelog

## v0.13.2 — Refinery + Harvester Master Pair
- Added exact Aegis Field Refinery v2.0 master GLB to Building Forge and Skirmish.
- Added exact Aegis Field Harvester v2.0 master GLB to Vehicle Forge and Skirmish.
- Building Forge bumped to 0.3.0; master registry now validates the Refinery receiving/docking socket contract.
- Vehicle Generator/Forge reference layer bumped to 0.4.0 with the Field Harvester as a reference-grade family.
- Shared RTS definitions now bind `refinery.masterAsset = fieldRefinery` and `refinery.starterUnit = aegisHarvester`.
- Added `wheeledHeavy` locomotor profile and Aegis Harvester unit definition.
- Skirmish Lab bumped to 0.4.0. A completed Refinery automatically creates one starter Harvester aligned by `HarvesterDockSocket` ↔ `RefineryDockAlignSocket` and parked over the unloading grate.
- Added manual DEPLOY HARVESTER test action.
- Added exact-asset SHA validation and refinery/harvester pairing regression test.
- Protected generators, Map Forge, Vehicle Baker and all previously approved master GLBs remain unchanged.

## v0.13.1 — Compact Military Master Swap
- Added `Aegis_Tactical_Command_Post_v2_1.glb` to the RTS master-building registry.
- Added `Aegis_Field_Power_Node_v1.glb` to the RTS master-building registry.
- Building Forge bumped to 0.2.0 with military and civilian/neutral master groups.
- Tactical Command Post v2.1 is now the explicit `constructionYard` master.
- Field Power Node v1.0 is now the explicit `powerPlant` master.
- Reclassified the older Command Nexus and Grid Bastion assets as civilian/neutral master infrastructure while preserving them in Forge.
- Skirmish Lab bumped to 0.3.1 and now resolves a building definition's `masterAsset` explicitly before role fallback.
- Updated compact gameplay footprints to 32 × 24 m for the Command Post and 24 × 21 m for the Field Power Node.
- No protected RPG/world generator, Map Forge, Vehicle Forge/Baker, or vehicle master geometry was modified.

## v0.13.0 — Building Forge 0.1 / Master Asset Integration
- Added exact Aegis Command Nexus HQ v1.3 and Grid Bastion Power Plant v1.0 master GLBs to `assets/buildings/`.
- Added Building Forge master-asset integration, faction palettes, custom color slots, hierarchy validation, functional animation preview, and export.
- Skirmish Lab 0.3 replaced the blocky Construction Yard and Power Plant with exact master GLBs.
- Added HMMWV-50 v2 and Talon AH-X master-asset deployment hooks for Skirmish.
