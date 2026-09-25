# WorldForge v0.2.0

WorldForge is a deterministic procedural 3D world-asset generator intended to grow from a browser tool into a reusable standalone generation engine.

## What changed in v0.2.0

- Generation logic is separated from the Three.js browser UI.
- Every asset starts from a versioned deterministic recipe.
- The shared core emits a neutral `worldforge.scene.v1` scene specification.
- Browser adapter converts that neutral scene into real Three.js geometry.
- Headless Node CLI uses the same generator code and can regenerate recipes without a browser.
- Browser-local project storage uses IndexedDB.
- Recipe import/export and neutral scene export added.
- Basic validation reports malformed geometry, missing materials, node counts, and approximate triangle counts.
- Building families: cottage, house, shop, inn, shack, barn, warehouse.
- Building conditions: clean, worn, abandoned.
- Material sets: wood, timber/plaster, stone, brick, metal.
- Landscape generator retained and now shares the same recipe/scene architecture.

## Run in the browser

Because WorldForge uses JavaScript modules, serve the folder instead of double-clicking `index.html`:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

It also works as a static GitHub Pages site.

Generated assets live in browser memory until you save/export them. `SAVE LOCAL` writes the recipe to IndexedDB on that device/browser. Export buttons download files through the browser; GitHub Pages itself does not store generated files.

## Headless / chat-friendly mode

Requires Node.js 18+ and no npm packages:

```bash
node cli/worldforge.mjs --recipe examples/building.recipe.json --out out
```

Outputs:

- normalized recipe JSON
- neutral WorldForge scene JSON
- OBJ
- MTL

The browser and headless CLI call the same generator modules under `src/generators/`.

GLB and PNG export are currently browser-side because those use Three.js/WebGL. The neutral scene format is the stable handoff between browser, CLI, future desktop app, and chat tooling.

## Architecture

```text
src/core/        deterministic RNG, recipe schema, materials, scene spec, validation
src/generators/  building + landscape generators
src/adapters/    scene-spec -> Three.js
src/storage/     browser project persistence
cli/             headless Node entry point + OBJ export
examples/        reproducible recipes
```

## Design rules

1. Same generator version + same normalized recipe must recreate the same asset.
2. Generator logic must not depend on DOM/browser state.
3. UI, renderer, exporters, and storage are adapters around the core.
4. New generators should emit the same neutral scene specification.
5. Recipes and scene schemas are versioned so future migrations can be explicit.
