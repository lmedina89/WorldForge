# v0.13.30 — Battlefield Road Core Recovery

- Added **PBR V9 · ROAD RECOVERY** as an additive road-only renderer on top of the protected V8 terrain foundation.
- Preserved `terrain-renderer-v8.js` byte-for-byte. Grass/dirt/rock/wet PBR behavior, Iron Valley landforms, splat logic, river logic, camera framing, and all ForgeRTS runtime terrain authority remain unchanged.
- Added deterministic `road_compacted_dirt.png` + normal map derived from the existing authored road shoulder material and bundled CC0 ground-detail sources.
- Replaced the preview-only nearly-black asphalt presentation with a warm compacted dirt/gravel road core. Authored map JSON still points to the original road surface; V9 performs the visual override only inside WorldForge.
- Road cores now render at full alpha without the feather alpha map. This removes the alpha accumulation that made bends, intersections and overlapping road segments turn into irregular black blotches.
- Existing feathered shoulder mesh, shoulder width, centerlines and authored road widths are preserved exactly.
- Core longitudinal repeat increased from 8 m to 16 m to reduce obvious short-range repetition while keeping the shoulder presentation unchanged.
- No Iron Valley expansion or biome work is included in this patch. The current map remains the visual/geometry benchmark until roads are approved on-device.
