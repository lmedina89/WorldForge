# WorldForge Changelog

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
