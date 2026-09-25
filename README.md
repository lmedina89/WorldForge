# WorldForge v0.3.0

WorldForge is a deterministic procedural world-asset generator designed to grow from a browser tool into a reusable standalone world-building system.

## v0.3.0 milestone

This release keeps the existing Building Engine intact and adds the first shared field-asset foundation around it.

### Engines

- **Building Engine 1.0.0** — preserved baseline. Existing building recipes keep the same geometry/material output.
- **Landscape Engine 0.2.0** — existing ridge / mesa / ravine generator retained.
- **Prop Engine 0.1.0** — wells, fences, signposts, crate/barrel supply clusters.
- **Terrain Engine 0.1.0** — grass, dirt, grass+path, and worn-village ground patches.

Every generated scene now also receives a `worldforge.asset.v1` metadata record containing engine version, bounds, footprint, anchor, facing, collision hints, occlusion hints, and tags. This is the contract future field composition will use.

## Important compatibility rule

The Building Engine is a protected module. v0.3.0 was tested against the v0.2 baseline and three representative building recipes produced identical geometry/material node hashes. Future building changes must be explicitly versioned instead of silently changing old recipes.

## Browser viewport coordinate fix

WorldForge's neutral scene format is **Z-up**. Earlier browser builds placed the Three.js ground/grid on a Y-up plane, which could make correct buildings look sideways or cut through the ground. v0.3.0 makes the browser viewport Z-up too:

- camera up = +Z
- field ground = XY plane at Z=0
- grid = XY plane

The generator geometry itself was not changed to fix this.

## Run in browser / GitHub Pages

Serve the folder locally:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

The project is also static-hosting friendly for GitHub Pages. Generated assets remain local to the browser until saved/exported.

## Headless / chat-friendly mode

Requires Node.js 18+ and no npm install:

```bash
node cli/worldforge.mjs --recipe examples/building.recipe.json --out out
node cli/worldforge.mjs --recipe examples/prop-well.recipe.json --out out
node cli/worldforge.mjs --recipe examples/terrain-village.recipe.json --out out
```

Outputs normalized recipe JSON, neutral scene JSON, OBJ, and MTL.

## Architecture

```text
src/core/        RNG, recipes, scene spec, materials, validation, asset metadata
src/generators/  building, prop, terrain, landscape
src/adapters/    neutral scene -> Three.js
src/storage/     browser-local project recipes
cli/             headless generator + OBJ/MTL export
examples/        reproducible recipes
```

## Next planned module

**Field Composer 0.1** will consume the shared asset metadata and place buildings, props, and terrain together into a first Village Well Square field without replacing the current Building Engine.
