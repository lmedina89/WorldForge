# WorldForge v0.9.7 Test Report — Vehicle Forge 0.2 Aegis-grade MBT

Status: **PASS**

## Vehicle Forge 0.2
- Generator version: **0.2.0**.
- New MBT silhouette families: **Wedge / Heavy / Compact**.
- Controlled MBT proportion envelopes: **PASS**.
- Purpose-built faceted/sloped hull geometry: **PASS**.
- Segmented skirts + 6/7 wheel tracked running gear: **PASS**.
- Faceted low-profile turret / cheeks / bustle / optics / APS / smoke / RWS: **PASS**.
- Functional hierarchy names present: **VehicleRoot → HullRoot → TurretSocket → TurretRoot → GunPitchRoot**, plus **RWSRoot/RWSGunPitchRoot** and production sockets.
- Deterministic Wedge acceptance recipe (`seed 93044 / angular / slate / enhanced / 7 wheels`) structural runtime harness: **159 nodes / 146 meshes / ~4,200 triangles**.
- Corrected Aegis-X v2 reference envelope used for comparison: **158 nodes / 146 meshes / ~4,088 triangles**.
- Three example MBT recipes included: Wedge / Heavy / Compact.
- Non-MBT vehicle families remain explicitly on the legacy 0.1 grammar pending dedicated family upgrades.

## UI / package
- New MBT silhouette/detail/road-wheel controls: **PASS**.
- Browser control ID audit: **212 IDs / 173 JS references / 0 missing / 0 duplicates**.
- JavaScript syntax (`app.js`, `vehicle-generator.js`, `vehicle-baker.js`, `schema.js`): **PASS**.
- Vehicle Baker 0.1.2 remains available for imported/generated GLBs and 8-direction sprite baking.

## Regression / compatibility
- Existing `src/generators/*.js` implementations compared with WorldForge v0.9.6: **15/15 byte-identical**.
- Elevation / traversal suite: PASS.
- Foliage / natural dressing suite: PASS.
- Placement / alignment suite: PASS.
- Production metadata suite: PASS.
- RPG Architecture I suite: PASS.
- RPG Architecture II suite: PASS.
- Settlement Composer suite: PASS.
- Surface / Field Foundation suite: PASS.
- Vehicle Baker packaging suite: PASS.
- Vehicle Forge 0.2 packaging/structure suite: PASS.

## Rendering smoke-test note
Static/runtime structural QA is complete. The hosted app still loads Three.js through its existing CDN import map, so final GPU appearance on the real Three.js renderer should be smoke-tested from GitHub Pages. The generator is intentionally built to the same mesh/detail complexity envelope as the corrected Aegis-X reference, but visual acceptance remains the Aegis-X quality bar.
