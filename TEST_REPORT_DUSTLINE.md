# Dustline Studio v0.1 — Integration QA

## Source isolation
- Base: uploaded WorldForge v0.13.31 with separate 16-direction turret fix; not checked against newer GitHub HEAD.
- Original WorldForge files unchanged byte-for-byte: 178.
- Modified existing files: `index.html` (adds editor link), `README.md` (integration note).
- Preserved reference Dustline v0.2 files SHA256-identical: 39.
- Original terrain: 64 x 64m Y-up, 16,641 vertices, 32,768 triangles, master GLB untouched.
- Original baked 2048px basecolor, normal, roughness, AO and 16-bit elevation preserved.

## Functional changes
- New standalone `dustline-studio.html` within WorldForge, loading original PBR GLB scenery.
- View, terrain albedo tint brush, terrain mesh raise/lower/smooth, place/move/rotate/erase GLBs.
- JSON export/reimport of edits and placements, PNG color export, height JSON export, up to 24 undo states.
- v0.2 deterministic scatter remains visually in place, not individually editable.

## Validation
- JS module syntax checked: PASS.
- Node targeted tests: 7 PASS, 0 FAIL (Dustline Studio structural + existing Vehicle Baker tests).
- WorldForge file integrity (except new entry link and README): PASS.
- Exact Dustline source file SHA256 preservation: PASS.
- A browser run was attempted with headless Chromium, but navigation to localhost, file and data URLs was blocked by the testing environment (net::ERR_BLOCKED_BY_ADMINISTRATOR). Therefore **interactive scene rendering and iPhone Safari behavior remain unverified**, and this must be field-tested before trusting exports for production.

## Limitations
- Paint operates on the baked terrain base color; it does not yet blend material-library normal/roughness/metallic layers.
- Mesh sculpt brush modifies original 129x129 terrain vertices and saves edited 129x129 height JSON, not the 1024x1024 R16 texture.
- Moved objects do not automatically re-snap during subsequent terrain sculpting.
- Road splines and procedural scatter editing, Godot importer, WebGL performance profiling are future stages.
- Mobile download handling depends on browser policy; editing state should be saved using the JSON export before leaving the page.
