# WorldForge v0.8.0 Test Report

## Protected modules
Compared with v0.7.0, these generator source files are byte-identical:
- `src/generators/building.js`
- `src/generators/building-v1.1.js`
- `src/generators/building-v1.2.js`
- `src/generators/building-v1.3.js`
- `src/generators/prop.js`
- `src/generators/surface.js`
- `src/generators/field.js` — protected Field Composer 0.1.0

Protected Field 0.1 regression:
- Node geometry: PASS
- Materials: PASS
- Placement layout / child seeds: PASS

## Foliage Engine 0.1.0
Matrix:
- 9 foliage families
- 7 biomes
- 2 seeds
- 126 family/biome cases

Results:
- Validation failures: 0
- Determinism failures: 0
- Material determinism failures: 0

Additional tree tests:
- oak: PASS
- pine: PASS
- birch: PASS
- fruit: PASS
- palm: PASS
- mixed: PASS
- healthy/dry/dead conditions: PASS

## Field Composer 0.2.0
All nine field presets were generated with natural dressing enabled:
- Village Well Square
- Rural House Lane
- Market Corner
- Castle Courtyard
- Castle Gate Approach
- Mountain Path
- Mine Entrance Clearing
- Desert Market
- Dockside Lane

Audit result:
- Validation failures: 0
- Placement-overlap warnings: 0
- Missing foliage placements: 0

Default dressed Village Well Square sample:
- 13 placements
- 4 foliage placements
- ~12.6k triangles
- 64 deduplicated materials
- validation warnings: 0

## Existing suites
- RPG Architecture Pack I: PASS
- RPG Architecture Pack II: PASS
- Surface Engine / Field Foundation suite: PASS
- 96 Surface determinism cases: PASS
- 27 field preset/seed determinism cases: PASS
- Field edit round-trip: PASS

## Headless export
Foliage recipe:
- Recipe JSON: PASS
- Scene JSON: PASS
- OBJ: PASS
- MTL: PASS

Field 0.2 dressed recipe:
- Recipe JSON: PASS
- Scene JSON: PASS
- OBJ: PASS
- MTL: PASS

## Visual audit
Standalone foliage gallery inspected:
- oak, pine, palm
- shrubs, flowers, crops
- fallen log, stump, rocks
- reeds, vines, dead tree

Dressed field gallery inspected:
- Village Well Square
- Mountain Path
- Desert Market
- Dockside Lane
