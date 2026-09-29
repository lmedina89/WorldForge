# WorldForge v0.13.29 — Direct-Source Terrain Recovery

This is a narrowly scoped GAME TERRAIN correction built from v0.13.28. It changes only the experimental Game Terrain renderer, road presentation, and Game Terrain camera framing.

- **PBR V8 · DIRECT SOURCE** keeps the actual Poly Haven photographs readable at RTS camera distance instead of repeating 1–3 m albedo tiles hundreds of times until they average into flat color.
- Source albedo now uses RTS-readable overview scales: grass 18 m, dirt 14 m, rock 12 m, wet bank 10 m. Physical scan scale remains reserved for normal/ARM detail.
- V7's gain-based `sourceDominant` recoloring is removed. Palette correction is restrained; the source photograph remains the dominant color/detail signal.
- Road shoulders are restored. Road surfaces use the authored road width rather than the V7 widened black strip. Stable positive offsets and polygon offset remain for mobile WebGL.
- WIDE now uses bounds-derived fitting for **both** Iron Valley and the ForgeRTS Training Ground. CLOSE/GROUND are less excessively zoomed.
- The exact ForgeRTS v0.6.6.8 terrain runtime snapshot, Training Ground map, Iron Valley strategic geometry/routes, source PBR assets, generators, and production GLBs remain unchanged.

**Do not port PBR V8 into ForgeRTS until the target-device views are visually approved.**
