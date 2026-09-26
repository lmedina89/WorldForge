# WorldForge v0.9.5.2 Test Report — Vehicle Baker readability pass

Status: **PASS**

## Vehicle Baker 0.1.1
- Auto-fit bake framing added: **PASS**.
- Higher-resolution bake + downsample added: **PASS**.
- Dedicated brighter bake-light rig added: **PASS**.
- Softer/lighter bake shadow tuning added: **PASS**.
- Vehicle tab/UI static wiring: **PASS**.
- JavaScript syntax (`app.js`, `vehicle-baker.js`, `schema.js`): **PASS**.
- Browser control ID audit: **201 IDs / 162 JS references / 0 missing / 0 duplicates**.
- 8-direction definition: **N, NE, E, SE, S, SW, W, NW — PASS**.
- Included benchmark GLB: **199 meshes / 21,483 triangles / 10 materials / 11 textures / 1 animation**.
- Vehicle Baker packaging test: **PASS**.

## Regression / compatibility
- Entire `src/generators/*.js` tree remains untouched from v0.9.4/v0.9.5.1 baseline: **15/15 byte-identical**.
- Elevation / traversal suite: PASS.
- Foliage / natural dressing suite: PASS.
- Placement / alignment suite: PASS.
- Production metadata suite: PASS.
- RPG Architecture I suite: PASS.
- RPG Architecture II suite: PASS.
- Settlement Composer suite: PASS.
- Surface / Field Foundation suite: PASS.
- Vehicle Baker packaging suite: PASS.

## Browser smoke-test note
The package uses the same Three.js CDN import-map approach as the existing WorldForge build. This sandbox cannot reach that CDN, so final GPU rendering / click-through should still be smoke-tested from GitHub Pages or another internet-connected browser. Static syntax, asset-format compatibility, UI wiring, package integrity, and all existing generator regressions were checked here.
