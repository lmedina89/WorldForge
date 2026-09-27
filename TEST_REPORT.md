# WorldForge v0.13.3 — Skirmish Immersive Combat UI Test Report

- 20/20 automated test files passed.
- JavaScript syntax checks passed for `src/app.js` and `src/rts/skirmish-test.js`.
- Added dedicated regression coverage for immersive viewport mode, landscape/portrait CSS, BUILD drawer, placement banner, safe-area handling, VisualViewport resize handling and landscape camera tuning.
- The v0.13.2.1 large-refinery placement hotfix remains covered and passing: 22 CSS px build tap tolerance, 66 m nearest-legal placement search, authoritative terrain/build-radius/collision/affordability checks.
- Compared 24 protected files against v0.13.2.1: all were byte-identical, including every `src/generators/*.js`, RTS Map Forge, Vehicle Baker, Aegis-X, HMMWV-50, Talon AH-X, Tactical Command Post v2.1, Field Power Node v1.0, Field Refinery v2 and Field Harvester v2.
- Exact approved Refinery SHA-256 remains `f195487716d52a1bc29cb9360fe35832d43bba2410578fd66f238345bc9edab2`.
- Exact approved Harvester SHA-256 remains `7485c6449fe7ac64eabc7f91d4bd920bc8ffeebf73a9521297e7500df0ba4c43`.
- No simulation tick, economy, resource, combat, docking, pathing, build legality or GLB geometry behavior was changed in this pass.
