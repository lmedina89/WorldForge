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
