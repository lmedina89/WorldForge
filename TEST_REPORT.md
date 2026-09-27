# WorldForge v0.13.4 — Skirmish Visual Readability Test Report

- **21/21 automated test files passed.**
- JavaScript syntax checks passed for `src/app.js`, `src/rts/skirmish-test.js`, `src/rts-map/rts-map-forge.js`, and `src/core/schema.js`.
- Added dedicated regression coverage for:
  - ground-vehicle contact shadows,
  - separate helicopter/air shadow behavior,
  - VIEW WIDE / VIEW CLOSE camera modes,
  - pinch/wheel zoom in Skirmish,
  - multi-touch suppression from battlefield tap/build placement,
  - no permanent selection ring,
  - terrain slope shading and road-shoulder rendering.
- The v0.13.2.1 large-refinery placement hotfix still passes: 22 CSS px placement tap tolerance and bounded nearest-legal placement search remain intact.
- Compared the package against v0.13.3: every changed source file is intentional. Protected `src/generators/`, `src/vehicle/`, `src/building/`, and `src/rts/sim/` files remain byte-identical.
- Approved master GLBs remain byte-identical to v0.13.3, including Aegis-X, HMMWV-50, Talon AH-X, Tactical Command Post v2.1, Field Power Node v1.0, Field Refinery v2 and Field Harvester v2.
- Exact approved Refinery SHA-256 remains `f195487716d52a1bc29cb9360fe35832d43bba2410578fd66f238345bc9edab2`.
- Exact approved Harvester SHA-256 remains `7485c6449fe7ac64eabc7f91d4bd920bc8ffeebf73a9521297e7500df0ba4c43`.
- No simulation tick, economy, resource, docking, combat, pathing, building legality or master-asset geometry behavior changed in this pass.
