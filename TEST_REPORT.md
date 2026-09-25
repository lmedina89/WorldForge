# WorldForge v0.6.0 Test Report

## Protected engine checks
The following source files in v0.6.0 match v0.5.0 byte-for-byte:
- `src/generators/building.js` — Building Engine 1.0.0
- `src/generators/building-v1.1.js` — Building Engine 1.1.0
- `src/generators/building-v1.2.js` — Building Engine 1.2.0

## Legacy recipe regressions
Four representative recipes from Building Engines 1.0, 1.1, and 1.2 were regenerated in v0.5 and v0.6.
- Exact node match: PASS
- Exact material match: PASS

A v0.5 recipe with no explicit engine resolves to Building Engine 1.2.0: PASS.

## RPG Architecture Pack I
Existing Pack I suite:
- 76 RPG cases: PASS
- 3 protected legacy regression cases: PASS

## RPG Architecture Pack II
Families tested:
Watermill, Windmill, Dock, Dock Warehouse, Temple, Mage Tower, Ruined Fort, Desert House, Desert Market, Mine Entrance, City Gate, Sewer Entrance, Town Hall.

Matrix:
- 13 families
- 3 conditions
- 2 seeds per condition
- 78 Pack II cases total

Results:
- Scene validation failures: 0
- Determinism failures: 0
- Material determinism failures: 0

Engine 1.3 compatibility wrapper was also compared against Engine 1.2 for an existing Smithy recipe:
- Geometry match: PASS
- Material match: PASS

## Visual audit
Reference gallery:
`examples/rpg2-gallery/rpg_architecture_pack2_gallery.png`

The gallery was reviewed after correcting windmill blade axis, strengthening temple/city-gate/civic silhouettes, and breaking up the mine entrance rock mass.
