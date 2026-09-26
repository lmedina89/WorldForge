# WorldForge v0.9.5 Test Report — Vehicle Baker 0.1

Status: **PASS**

## Vehicle Baker 0.1
- Vehicle tab/UI static wiring: **PASS**.
- JavaScript syntax (`app.js`, `vehicle-baker.js`, schema): **PASS**.
- Browser control ID audit: **201 IDs / 162 JS references / 0 missing / 0 duplicates**.
- 8-direction definition: **N, NE, E, SE, S, SW, W, NW — PASS**.
- Included benchmark GLB: **199 meshes / 21,483 triangles / 10 materials / 11 textures / 1 animation**.
- Benchmark compatibility conversion: archived spec/gloss requirement removed; all 10 materials now expose standard metallic/roughness declarations; geometry, node hierarchy, textures, and animation data remain present.
- Vehicle Baker packaging test: **PASS**.

## Regression / compatibility
- Entire `src/generators/*.js` tree compared against the v0.9.4 Playtest Pass source ZIP: **15/15 byte-identical**.
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

---

# WorldForge v0.9.3 Test Report

Status: **PASS**

## Settlement Composer 0.1
- Grammars tested: Ring Village, Crossroads Village, Hillside Village.
- Determinism matrix: **9/9 PASS** (3 grammars × 3 seeds).
- Settlement recipe save/reopen: **exact nodes/materials/placements PASS**.
- Ring Village audit: 18 buildings / 42 placements / ~49,896 triangles.
- Crossroads Village audit: 20 buildings / 45 placements / ~53,094 triangles.
- Hillside Village audit: 17 buildings / 44 placements / ~45,026 triangles / 3 walk levels.
- Production metadata exports for all three settlements: PASS.
- Road/district/walk-zone metadata: PASS.
- Hillside stair walk-transition metadata: PASS.

## Compatibility / safety
- Protected pre-v0.9.3 generator implementations checked against v0.9.2: **13/13 byte-identical** (router/index excluded because it must register the new engine).
- Previous WorldForge test suites: PASS.
- Browser JS-ID audit: **0 missing controls**.
- JavaScript syntax audit: PASS.
- Character preview controls: present and statically wired; full browser interaction should still be smoke-tested on the user's device because the hosted app loads Three.js from CDN.

---

# WorldForge v0.9.2 Test Report

Status: **PASS**

## Production metadata / compatibility
- Protected generator implementation files vs v0.9.1: **13/13 byte-identical**.
- Representative geometry/material regression recipes: **4/4 exact matches**.
- Building production metadata coverage: **32 RPG/general building families**.
- Production metadata determinism: **PASS**.
- Traversal endpoint socket/walk-surface checks: **PASS**.
- Retroactive v0.9.1 deep-village upgrade: **PASS**.
  - placements preserved: 64
  - production sockets added: 54
  - nodes preserved exactly: PASS
  - materials preserved exactly: PASS
  - recipe preserved exactly: PASS
- Browser UI ID audit: **0 missing controls**.
- JavaScript syntax audit: **PASS**.

## Existing suites
- Placement / alignment: PASS.
- Elevation / traversal: PASS — 48 traversal cases, 16 elevated fields.
- Foliage / natural dressing: PASS — 126 foliage cases, 9 dressed fields.
- RPG Architecture Pack I: PASS — 76 cases.
- RPG Architecture Pack II: PASS — 78 cases.
- Surface / Field Foundation: PASS — 96 surface cases, 27 field cases.
- Legacy field/building compatibility checks: PASS.

---

# WorldForge v0.9.1 Test Report

Status: **PASS**

## Placement / Alignment
- Protected generator files checked against v0.9.0: 14/14 byte-identical.
- Exact X/Y/Z transform recipe round-trip: PASS.
- Exact rotation recipe round-trip: PASS.
- Grid snap math: PASS.
- Rotation snap math: PASS.
- Nearest walk-level snap math: PASS.
- Nearest asset-edge alignment math: PASS.
- Traversal connection world-transform guide math: PASS.
- Browser UI ID audit: 0 missing controls.
- JavaScript syntax audit: PASS.

## Existing suites
- Elevation / traversal: PASS — 48 traversal cases, 16 elevated fields.
- Foliage / natural dressing: PASS — 126 foliage cases, 9 dressed fields.
- RPG Architecture Pack I: PASS — 76 cases.
- RPG Architecture Pack II: PASS — 78 cases.
- Surface / Field Foundation: PASS — 96 surface cases, 27 field cases.
- Legacy field/building compatibility checks: PASS.
