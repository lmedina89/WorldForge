# WorldForge v0.13.2 — Refinery + Harvester Master Pair

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

## Protection
- All 15 protected RPG/world generator files remain byte-identical to v0.13.1.
- RTS Map Forge and Vehicle Baker remain byte-identical to v0.13.1.
- Existing Aegis-X, HMMWV-50, Talon AH-X, Command Post, Field Power Node, Command Nexus, Grid Bastion and BTR GLBs remain byte-identical.


## v0.13.2.1 mobile refinery placement hotfix
- Skirmish building placement now searches for the nearest legal footprint around the tapped point when the exact center is blocked/non-buildable.
- Search is bounded to 66 m and still obeys affordability, construction radius, terrain buildability and building-collision rules.
- iPhone build-placement taps allow 22 CSS px of finger drift while a building is selected; normal aim/interaction remains at the original 8 px threshold.
- Exact Aegis Field Refinery v2 and Aegis Field Harvester v2 GLBs are unchanged byte-for-byte.
