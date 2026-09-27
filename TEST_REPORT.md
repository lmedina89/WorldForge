# WorldForge v0.13.2 Test Report — Refinery + Harvester Master Pair

## Result
**PASS — 18 / 18 automated test files passed.**

## Exact master validation
- Aegis Field Refinery v2 packaged: PASS.
- Aegis Field Harvester v2 packaged: PASS.
- Refinery SHA-256 matches approved source exactly: PASS.
- Harvester SHA-256 matches approved source exactly: PASS.
- Refinery `WF_TEAM_PRIMARY / SECONDARY / ACCENT` materials: PASS.
- Harvester `WF_TEAM_PRIMARY / SECONDARY / ACCENT` materials: PASS.

## Refinery dock contract
- `HarvesterQueueSocket`: PASS.
- `HarvesterApproachSocket`: PASS.
- `HarvesterDockSocket`: PASS.
- `HarvesterUnloadSocket`: PASS.
- `HarvesterExitSocket`: PASS.
- `HarvesterRallySocket`: PASS.
- `ApronFeederRoot` / `DustCollectorFanRoot`: PASS.

## Harvester functional contract
- `RefineryDockAlignSocket`: PASS.
- `BottomDumpSocket` / `DumpFXSocket`: PASS.
- `CollectorDrumRoot` / `IntakeBeltRoot`: PASS.
- Left/right gathering arms: PASS.
- Left/right bottom-dump door roots: PASS.
- Front steering roots: PASS.
- Six wheel-spin roots: PASS.

## Physical dock envelope
- Harvester exported bounds: ~4.10 m wide × 3.87 m high × 8.90 m long.
- Refinery declared vehicle envelope: <=4.60 m wide × <=4.80 m high × <=10.00 m long.
- Physical envelope fit: PASS.
- One-way 180° drive-through orientation encoded in Skirmish pairing: PASS.
- Socket-to-socket placement used instead of hard-coded offset: PASS.

## Forge / Skirmish integration
- Building Forge lists exact Field Refinery v2 master: PASS.
- Vehicle Forge lists exact Field Harvester v2 reference master: PASS.
- Faction palette recolor path recognizes Harvester team materials: PASS.
- Shared Refinery definition explicitly binds `fieldRefinery`: PASS.
- Shared Refinery definition declares starter `aegisHarvester`: PASS.
- Skirmish completion hook creates bundled starter Harvester: PASS.
- Starter Harvester simulation state records refinery/docked relationship: PASS.
- Manual Harvester deployment UI/action: PASS.

## Regression protection
- 15 protected `src/generators/*.js` files byte-identical to v0.13.1: PASS.
- RTS Map Forge byte-identical to v0.13.1: PASS.
- Vehicle Baker byte-identical to v0.13.1: PASS.
- Existing Aegis-X, HMMWV-50, Talon AH-X and BTR GLBs byte-identical: PASS.
- Existing Tactical Command Post, Field Power Node, Command Nexus and Grid Bastion GLBs byte-identical: PASS.
- DOM ID/app reference audit: PASS.
- Map traversal regression: PASS.
- Simulation foundation regression: PASS.

## Runtime note
Automated tests validate exact packaged bytes, GLB node/material contracts, source/UI bindings, dock-pairing logic and protected-file regression. Final visual smoke testing should still be performed on the target GitHub Pages/mobile browser build.
