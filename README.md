# WorldForge v0.6.0

WorldForge is a deterministic procedural RPG/world asset generator intended for browser, headless, and future standalone use.

## Building engines
- **1.0.0 — Protected Legacy**: frozen original building baseline.
- **1.1.0 — Variety Engine**: structural massing, facades, wealth/age, mixed construction.
- **1.2.0 — RPG Architecture I**: old RPG village + castle architecture.
- **1.3.0 — RPG Architecture II**: expanded world architecture for ports, temples, magic, ruins, deserts, mines, cities, sewers, and civic districts.

Old recipes retain their original engine. New projects default to Building Engine 1.3.0.

## RPG Architecture I
Peasant House, Farmhouse, Smithy, Chapel, Stable, Guild Hall, Merchant House, Watchtower, Gatehouse, Castle Keep, Castle Wall, Barracks.

## RPG Architecture II
Watermill, Windmill, Dock / Pier, Dock Warehouse, Temple, Mage Tower, Ruined Fort, Desert House, Desert Market, Mine Entrance, Grand City Gate, Sewer Entrance, Town Hall / Civic Hall.

Pack II assets use dedicated geometry rather than generic recolored houses. Examples include functional water/wind wheels, pier structure, temple porticos, tower spires, mine rails, portcullises, sewer channels, and clock towers.

## Other generators
WorldForge also retains:
- Prop Engine 0.1.0
- Terrain Engine 0.1.0
- Landscape Engine 0.2.0

## Determinism
A recipe + engine version + seed reproduces the same asset. Engine versions are explicit so future improvements do not silently change saved designs.

## Browser use
Upload the contents of this ZIP directly to the root of a GitHub repository and enable GitHub Pages. `index.html` is at the ZIP root.

## Headless use
```bash
node cli/worldforge.mjs --recipe examples/rpg2-architecture/mageTower.recipe.json --out out
```

The headless path exports the normalized recipe, neutral scene spec, OBJ, and MTL.

## Tests
```bash
node tests/rpg-architecture.test.mjs
node tests/rpg-architecture-pack2.test.mjs
```

See `TEST_REPORT.md` for the current validation summary.
