# WorldForge v0.7.0 Test Report

## Protected building engines
Compared with v0.6.0, the following generator files are byte-identical:
- `src/generators/building.js` — Building Engine 1.0.0
- `src/generators/building-v1.1.js` — Building Engine 1.1.0
- `src/generators/building-v1.2.js` — Building Engine 1.2.0
- `src/generators/building-v1.3.js` — Building Engine 1.3.0

Representative recipes from all four engines were regenerated in v0.6.0 and v0.7.0:
- Exact nodes: PASS
- Exact materials: PASS

## Surface Engine 0.1.0
Matrix:
- 8 surface families
- 6 path patterns
- 2 seeds
- 96 cases total

Results:
- Validation failures: 0
- Determinism failures: 0
- Material determinism failures: 0

## Field Composer 0.1.0
Presets:
Village Well Square, Rural House Lane, Market Corner, Castle Courtyard, Castle Gate Approach, Mountain Path, Mine Entrance Clearing, Desert Market, Dockside Lane.

Matrix:
- 9 presets
- 3 seeds
- 27 cases total

Results at size 34 / Building Engine 1.3.0:
- Validation failures: 0
- Placement-overlap warnings: 0
- Determinism failures: 0
- Placement recipe determinism failures: 0

Edited field recipe test:
- Asset position round-trip: PASS
- Asset rotation round-trip: PASS

## Existing suites
- RPG Architecture Pack I: PASS
- RPG Architecture Pack II: PASS

## Headless export
`examples/field.recipe.json` was exported through `cli/worldforge.mjs`:
- Recipe JSON: PASS
- Scene JSON: PASS
- OBJ: PASS
- MTL: PASS

Default Village Well Square sample:
- 9 placements
- ~10.7k triangles
- 51 deduplicated materials

## Visual audit
Three representative field scenes were rendered from the neutral scene spec and inspected:
- Village Well Square
- Castle Courtyard
- Desert Market

The fields show coherent ground surfaces, paths/plazas, architecture, and props without the earlier coordinate-plane intersection issue.
