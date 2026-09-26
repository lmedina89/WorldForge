# WorldForge v0.9.6 Test Report — Vehicle Forge 0.1

Status: **PASS**

## Vehicle Forge 0.1
- New isolated `src/vehicle/vehicle-generator.js`: **PASS**.
- Deterministic seeded low-poly generation: **PASS (static/source audit)**.
- 11 silhouette families present: **MBT, light tank, tracked APC, 8×8 IFV, MRAP, SPG, MLRS, SAM carrier, SPAAG, recon vehicle, cargo truck**.
- 3 design languages: **Angular, Industrial, Compact**.
- 4 solid-color palettes: **Olive, Desert, Slate, Red faction**.
- Generated vehicle → Vehicle Baker integration: **PASS (static wiring)**.
- Generated vehicle GLB export wiring: **PASS (static wiring)**.
- Generated recipe export wiring: **PASS**.
- Imported BTR workflow remains available: **PASS**.

## Vehicle Baker 0.1.2
- 8-direction definitions: **PASS**.
- Auto-fit bake framing retained: **PASS**.
- 3× oversampled bake/downsample retained: **PASS**.
- Dedicated bake-light rig retained: **PASS**.
- Shadow-opacity ternary corrected: **PASS**.
- Included benchmark GLB: **199 meshes / 10 materials / 11 textures / 1 animation**.

## UI / packaging
- JavaScript syntax: **PASS** (`app.js`, `vehicle-generator.js`, `vehicle-baker.js`, `schema.js`).
- Browser control ID audit: **209 HTML IDs / 170 JS ID references / 0 missing**.
- Vehicle generator packaging test: **PASS**.
- Vehicle baker packaging test: **PASS**.

## Regression / compatibility
- `src/generators/*.js` compared byte-for-byte with v0.9.5.2: **15/15 unchanged**.
- Elevation / traversal suite: PASS.
- Foliage / natural dressing suite: PASS.
- Placement / alignment suite: PASS.
- Production metadata suite: PASS.
- RPG Architecture I suite: PASS.
- RPG Architecture II suite: PASS.
- Settlement Composer suite: PASS.
- Surface / Field Foundation suite: PASS.
- Vehicle Baker packaging suite: PASS.
- Vehicle Generator suite: PASS.

## Browser smoke-test note
WorldForge still uses its existing Three.js CDN import-map. This environment cannot fully GPU-smoke-test the hosted UI against that CDN. Syntax, wiring, deterministic definitions, package integrity, BTR compatibility, and all existing regression suites were checked locally. Final visual tuning of each generated silhouette should be done from the GitHub Pages build on the target phone/browser.
