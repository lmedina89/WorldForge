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
