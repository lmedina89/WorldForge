# WorldForge v0.7.0 — Surface + Field Foundation

WorldForge is a deterministic procedural RPG/world asset generator intended for browser, headless, and future standalone use.

## Protected architecture engines
- **Building 1.0.0 — Protected Legacy**
- **Building 1.1.0 — Variety Engine**
- **Building 1.2.0 — RPG Architecture I**
- **Building 1.3.0 — RPG Architecture II**

All four building-engine source files are preserved byte-for-byte from v0.6.0. Existing building recipes remain reproducible.

## New in v0.7.0

### Surface Engine 0.1.0
Creates deterministic field surfaces designed to sit under WorldForge architecture rather than replace it.

Surface families:
- Grass
- Dirt
- Worn village ground
- Stone
- Cobblestone
- Mud
- Sand
- Rocky ground

Path patterns:
- None
- Straight
- Curved
- T junction
- Crossroads
- Plaza

Surface generation includes seeded broad variation patches, wear marks, edge breakup, path ribbons, stones, grass tufts, flowers, and other lightweight dressing. The goal is to avoid an obvious repeating checkerboard while retaining a lightweight field surface.

### Field Composer 0.1.0
Combines protected Building Engines, Prop Engine, and Surface Engine into deterministic RPG field scenes.

Initial presets:
- Village Well Square
- Rural House Lane
- Market Corner
- Castle Courtyard
- Castle Gate Approach
- Mountain Path
- Mine Entrance Clearing
- Desert Market
- Dockside Lane

Each composed field records exact child recipes, transforms, engine versions, facing/footprint metadata, and placement IDs. Saving/exporting the field recipe reproduces the edited scene rather than rerunning the original layout.

### Field editing
In FIELD mode, tap/click a generated asset to select it. The browser tool can then:
- Nudge it north/south/east/west
- Rotate ±15°
- Duplicate it
- Regenerate only that selected asset
- Delete it
- Center the camera on it

The surface placement is locked and excluded from normal object selection.

### Shared placement metadata
Generated assets carry:
- anchor
- footprint
- bounds
- facing
- collision hint
- occlusion hint
- engine version

Field composition validates basic footprint overlaps and records warnings rather than silently accepting obvious intersections.

## Existing generators retained
- Prop Engine 0.1.0
- Terrain Engine 0.1.0 (legacy terrain patches retained)
- Landscape Engine 0.2.0

## Efficiency work
Field composition deduplicates identical material definitions across child assets. The default Village Well Square uses about 10k triangles while remaining fully deterministic and editable.

## Browser use
Upload the contents of the ZIP directly to the root of a GitHub repository and enable GitHub Pages. `index.html` is at the ZIP root.

## Headless use
Surface:
```bash
node cli/worldforge.mjs --recipe examples/surface.recipe.json --out out-surface
```

Field:
```bash
node cli/worldforge.mjs --recipe examples/field.recipe.json --out out-field
```

The CLI exports normalized recipe, neutral scene spec, OBJ, and MTL. For fields, the normalized recipe contains the exact generated placements.

## Roadmap
- **v0.8** — foliage and natural dressing: trees, bushes, flowers, logs, stumps, vines, crop patches, rock clusters.
- **v0.9** — elevation and traversal: cliffs, slopes, stairs, bridges, retaining walls, upper/lower walkable levels.
- **v1.0** — first complete RPG field-building workflow.

See `TEST_REPORT.md` for regression and determinism results.
