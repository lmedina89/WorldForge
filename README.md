# WorldForge v0.9.0 — Elevation + Traversal

WorldForge is a deterministic procedural RPG/world asset generator intended for browser, headless, and future standalone use.

## Protected systems
v0.9 expands around the existing systems instead of replacing them:
- Building 1.0.0 — Protected Legacy
- Building 1.1.0 — Variety Engine
- Building 1.2.0 — RPG Architecture I
- Building 1.3.0 — RPG Architecture II
- Prop 0.1.0
- Surface 0.1.0
- Foliage 0.1.0
- Field Composer 0.1.0 — protected v0.7 behavior
- Field Composer 0.2.0 — protected v0.8 foliage/dressing behavior

The protected generator source files are byte-identical to v0.8.0.

## New in v0.9.0

### Traversal Engine 0.1.0
Deterministic elevation/traversal assets:
- Stone/wood/rope bridges
- Stairs
- Slopes / ramps
- Cliffs / ledges
- Raised terraces
- Retaining walls

Each traversal asset exports gameplay metadata in addition to geometry:
- Walkable surfaces
- Entry/exit connection points
- Elevation/rise
- Bridge pass-under flag and clearance where applicable
- Footprint / bounds / collision metadata

### Field Composer 0.3.0
Field 0.3 adds real multi-level scene composition while preserving Field 0.1 and 0.2.

New elevated field presets:
- Mountain Village Path
- Stone Bridge Crossing
- Cliffside Town Lane

Existing presets with new elevation layouts include:
- Castle Courtyard
- Castle Gate Approach
- Mountain Path
- Mine Entrance Clearing
- Rural House Lane

The field recipe now includes an `elevation` control. Field 0.3 exports a `walkGraph` with detected walk levels and traversal segments so later game movement code can consume the same data.

### Editor additions
- Dedicated **ELEVATION** tab
- Generate bridge/stairs/slope/cliff/terrace/retaining-wall pieces independently
- Field elevation-strength control
- Selected asset `LEVEL +0.5` / `LEVEL -0.5`
- L0 / L1 / L2 field visibility filters
- Existing move/rotate/duplicate/regenerate/delete tools remain available

## Backward compatibility
Field changes are versioned rather than silently altering old projects:
- `engineVersion: "0.1.0"` → protected v0.7 Field Composer
- `engineVersion: "0.2.0"` → protected v0.8 dressed-field composer
- `engineVersion: "0.3.0"` → new elevation/traversal composer
- A saved recipe marked `generatorVersion: "0.8.0"` without an explicit field engine resolves to Field 0.2 rather than silently upgrading.

## Browser use
Upload the **contents** of the ZIP directly to the root of a GitHub repository and enable GitHub Pages. `index.html` is directly at the ZIP root.

## Headless use
Traversal asset:
```bash
node cli/worldforge.mjs --recipe examples/traversal-stone-bridge.recipe.json --out out-bridge
```

Elevated field:
```bash
node cli/worldforge.mjs --recipe examples/field-v0.3-elevated.recipe.json --out out-field
```

The CLI exports normalized recipe JSON, neutral scene JSON, OBJ and MTL.

## Gameplay-facing metadata
Field 0.3 stores:
- `metadata.walkGraph.levels`
- `metadata.walkGraph.segments`
- transformed traversal connection points
- walk-surface descriptions
- pass-under / clearance information for elevated bridges

This is intentionally a foundation for v1.0 movement/collision integration rather than a fake visual-only elevation system.

## Roadmap
- **v1.0** — first complete RPG field-building workflow: field-generation polish, traversal/collision export, field save/export workflow, and game-facing integration cleanup.

See `TEST_REPORT.md` for regression, determinism and compatibility results.
