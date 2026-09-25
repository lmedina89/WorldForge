# WorldForge v0.9.0 — Elevation + Traversal

## Added
- Traversal Engine 0.1.0.
- Bridge, stairs, slope, cliff, terrace and retaining-wall families.
- Stone, wood, earth and rope material styles.
- Walk-surface and traversal-connection metadata.
- Bridge pass-under and clearance metadata.
- Field Composer 0.3.0.
- New Mountain Village Path, Stone Bridge Crossing and Cliffside Town Lane presets.
- Elevation layouts for Castle Courtyard, Castle Gate Approach, Mountain Path, Mine Entrance Clearing and Rural House Lane.
- Field recipe `elevation` parameter.
- Field `walkGraph` metadata with detected levels and traversal segments.
- Browser ELEVATION tab.
- Field LEVEL ±0.5 editing controls.
- L0/L1/L2 visibility filters.
- Standalone traversal and elevated-field example recipes.

## Compatibility
- Field 0.1 and Field 0.2 remain separate protected implementations.
- Building 1.0/1.1/1.2/1.3, Prop 0.1, Surface 0.1, Foliage 0.1, Field 0.1 and Field 0.2 source files remain byte-identical to v0.8.0.
- v0.8 field recipes without an explicit field engine migrate to Field 0.2, not Field 0.3.

## Validation
- 48 traversal family/style/seed determinism cases passed.
- 16 elevated field preset/seed cases passed with zero validation or placement warnings.
- Z-level edit round-trip passed.
- Existing foliage, surface/field, RPG Architecture I and RPG Architecture II suites continue to pass.
- Browser UI ID audit reports zero unresolved controls.
