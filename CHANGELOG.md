# WorldForge v0.9.2 — Production Metadata + Sockets

## Added
- Production Metadata Engine 0.1 (`worldforge.production.v1`).
- Building entry sockets derived from real generated door geometry where available.
- Road sockets projected outward from primary entrances.
- Portal-through sockets for gatehouses, city gates, mine entrances, and sewer entrances.
- Wall/fence structural connection sockets and dock land/water connection hints.
- Walk-surface metadata for porches, loading docks, piers, surfaces, terrain, bridges, stairs, slopes, terraces, and cliffs.
- Simplified collision profiles with primitive hints and entry/portal openings.
- Navigation, occlusion, facing, and placement-rule metadata.
- Field-level production metadata with per-placement records and the existing multi-level walk graph.
- Browser **GAME META** export.
- Browser **UPGRADE OLD SCENE** workflow.
- CLI `--scene` retroactive enrichment mode.
- Standard CLI generation now exports `.production.json`.

## Compatibility
- 13 protected generator implementation files remain byte-identical to v0.9.1.
- Existing engine versions remain unchanged.
- Representative v0.9.1 recipes reproduce exact node/material geometry in v0.9.2.
- Retroactive scene upgrade is guarded so nodes, materials, and recipes cannot be modified by the upgrader.

---

# WorldForge v0.9.1 — Placement + Alignment Pass

## Added
- Precision field placement editor with selectable nudge step: 0.10 / 0.25 / 0.50 / 1.00 units.
- Exact X / Y / Z / rotation numeric editing for selected field assets.
- Configurable rotation snapping: 15°, 30°, 45°, or 90°.
- XY grid snapping.
- Nearest walk-level Z snapping using the existing Field 0.3 walk graph.
- Ground Z=0 snap.
- Nearest asset-edge alignment for quickly joining stairs, terraces, buildings, walls, bridges, and props.
- Placement guides: yellow footprint, blue anchor cross, red traversal connection points.
- Z nudge now uses the selected precision step.
- Existing duplicate/regenerate/delete/level filters remain available.

## Compatibility
- All generator source files are unchanged from v0.9.0.
- Existing Building, Surface, Prop, Foliage, Traversal, and Field engines are preserved.
- Edited field transforms continue to round-trip through deterministic field recipes.
