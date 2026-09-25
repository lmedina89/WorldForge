# WorldForge v0.8.0 — Foliage + Natural Dressing

## Added
- Foliage Engine 0.1.0.
- Nine natural asset families: tree, shrub, flowers, crops, fallen log, stump, vines, rock cluster, reeds.
- Tree variants: oak, pine, birch, fruit, palm, mixed/auto.
- Seven biome palettes: temperate, forest, mountain, farmland, swamp, desert, ruins.
- Healthy, dry, and dead foliage conditions.
- Foliage scale, density, and spread controls.
- Browser FOLIAGE tab.
- Headless foliage recipe/export example.
- Field Composer 0.2.0 with biome-aware natural dressing for all nine field presets.
- New dressed-field example recipe and visual audit galleries.
- Foliage collision/occlusion metadata: trees/logs/stumps/rock clusters can block; lightweight flowers/crops/reeds/vines remain non-blocking.

## Compatibility
- Field Composer 0.1.0 is preserved as `src/generators/field.js` and used by recipes that explicitly request engine 0.1.0.
- Field Composer 0.2.0 lives alongside it and is the new default.
- Building 1.0/1.1/1.2/1.3, Prop 0.1 and Surface 0.1 generator source files remain byte-identical to v0.7.0.

## Validation
- 126 foliage family/biome/seed determinism cases passed.
- All tree variants validated.
- Healthy/dry/dead tree conditions validated.
- All nine dressed field presets validated with zero placement-overlap warnings on the audit seed.
- Existing Surface/Field Foundation, RPG Architecture I, and RPG Architecture II suites continue to pass.
- Protected Field 0.1 geometry/material output matches v0.7.0.
