# WorldForge v0.8.0 — Foliage + Natural Dressing

WorldForge is a deterministic procedural RPG/world asset generator intended for browser, headless, and future standalone use.

## Protected systems
The existing architecture and field foundations remain available as explicit engine versions:
- Building 1.0.0 — Protected Legacy
- Building 1.1.0 — Variety Engine
- Building 1.2.0 — RPG Architecture I
- Building 1.3.0 — RPG Architecture II
- Prop 0.1.0
- Surface 0.1.0
- Field Composer 0.1.0 — protected v0.7 layout behavior

The protected building, prop, surface, and Field 0.1 generator source files are byte-identical to v0.7.0.

## New in v0.8.0

### Foliage Engine 0.1.0
Deterministic low-poly / 2.5D-friendly natural assets:
- Trees: oak, pine, birch, fruit tree, palm, mixed/auto
- Shrub clusters
- Flower patches
- Crop patches
- Fallen logs
- Stumps
- Vines
- Rock clusters
- Reeds
- Healthy, dry, and dead conditions where relevant

Biome palettes:
- Temperate
- Forest
- Mountain
- Farmland
- Swamp
- Desert
- Ruins

Controls include scale, density, and spread. The same recipe reproduces the same geometry.

### Field Composer 0.2.0
Field Composer 0.2 adds biome-aware natural dressing to the nine existing field presets while retaining exact child recipes and transforms.

Examples:
- Village Well Square: oak/fruit trees, flowers, shrubs, optional stump
- Rural House Lane: fruit tree, oak, crops, wildflowers
- Mountain Path: pine trees, alpine shrubs, rock cluster
- Mine Entrance Clearing: dead tree, fallen log, rocks, optional stump
- Desert Market: palms, dry shrubs, desert rocks
- Dockside Lane: reeds, harbor tree, shrubs

The existing `Dressing` slider now affects both surface detail and natural field dressing.

### Backward compatibility
Field generation changed, so it is versioned rather than silently replacing v0.7 behavior:
- A recipe with `engineVersion: "0.1.0"` uses the protected v0.7 Field Composer.
- New fields use `engineVersion: "0.2.0"` and receive foliage dressing.
- Saved v0.7 field recipes with explicit placements continue to recreate their exact layout.

## Browser use
Upload the contents of the ZIP directly to the root of a GitHub repository and enable GitHub Pages. `index.html` is at the ZIP root.

A new **FOLIAGE** tab exposes family, biome, variant, condition, scale, density, and spread controls.

## Headless use
Foliage:
```bash
node cli/worldforge.mjs --recipe examples/foliage.recipe.json --out out-foliage
```

Dressed field:
```bash
node cli/worldforge.mjs --recipe examples/field-v0.2-dressed.recipe.json --out out-field
```

The CLI exports normalized recipe, neutral scene JSON, OBJ and MTL.

## Efficiency
Foliage is intentionally low-poly and deterministic. A default dressed Village Well Square is roughly 12.6k triangles across 13 placements, including four foliage placements. Field composition continues to deduplicate identical material definitions.

Future optimization can add true Three.js instancing for repeated grass/crop/flower elements without changing recipes.

## Roadmap
- **v0.9** — elevation/traversal: cliffs, slopes, stairs, bridges, retaining walls, upper/lower walkable levels.
- **v1.0** — first complete RPG field-building workflow.

See `TEST_REPORT.md` for regression and determinism results.
