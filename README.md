# WorldForge v0.13.1 — Compact Military Master Swap

WorldForge now uses the newest compact military building masters directly in **Building Forge** and **Skirmish Lab**.

## Building Forge 0.2
- Added exact **Aegis Tactical Command Post v2.1** master GLB.
- Added exact **Aegis Field Power Node v1.0** master GLB.
- Military defaults remain faction-ready through `WF_TEAM_PRIMARY`, `WF_TEAM_SECONDARY`, and `WF_TEAM_ACCENT` material slots.
- Existing large **Command Nexus** and **Grid Bastion** masters are preserved and reclassified in the Forge UI as civilian / neutral infrastructure.
- The master registry continues to validate required roots/sockets and exports faction-colored GLB variants plus building-definition JSON.
- Functional preview supports Command Post radar movement and Field Power Node cooling-fan movement.

## Skirmish Lab 0.3.1
- Starting Construction Yard role now uses the exact **Tactical Command Post v2.1** GLB.
- Purchased Power Plants now use the exact **Field Power Node v1.0** GLB.
- Building simulation remains authoritative for economy, construction, footprints, power, and placement.
- `BUILDING_DEFINITIONS.masterAsset` is now honored explicitly before role fallback, so Skirmish always uses the intended approved master.
- Aegis-X remains the direct-drive combat unit; HMMWV-50 v2 and Talon AH-X remain deployable master test assets.
- Refinery, Barracks, Vehicle Factory and Gun Turret remain prototype fallback geometry until approved master GLBs exist.

## Current compact gameplay footprints
- Tactical Command Post: **32 × 24 m** gameplay footprint.
- Field Power Node: **24 × 21 m** gameplay footprint.
- The old large civilian assets remain available in Building Forge and are not deleted.

## Protection
This update does not modify the protected RPG/world generators, RTS Map Forge, Vehicle Forge/Baker, or existing Aegis vehicle GLBs.
