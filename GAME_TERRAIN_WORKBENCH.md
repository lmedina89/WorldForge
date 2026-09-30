# Game Terrain Workbench 0.10 — Road Recovery

Active experimental renderer: **PBR V9 · ROAD RECOVERY**.

V9 subclasses the protected V8 renderer. Terrain albedo, normal/ARM detail, splat weights, macro variation, strategic landforms, water, and camera framing remain V8 behavior.

## Road-specific correction

The v0.13.29 road center used a very dark asphalt texture plus the same feather alpha map used by the road edge. At bends/intersections, transparent road fragments could overlap and visually accumulate into darker blotches. V9 keeps the existing feathered shoulder but makes the core fully opaque within the transparent render queue, so one road segment overwrites another rather than darkening it.

The preview uses `assets/terrain/road_compacted_dirt.png` and its matching normal map for roads authored with the legacy asphalt surface. This substitution is renderer-only; bundled ForgeRTS and Iron Valley map JSON is unchanged.

### Protected from v0.13.29

- V8 terrain renderer source
- Poly Haven terrain source assets
- road centerlines and widths
- road shoulder texture/normal and feather profile
- Iron Valley heightfield/landforms/routes
- ForgeRTS Training Ground runtime-sync files
- rivers and bank transitions

### Device check

Check CLOSE first. Inspect straight road, a bend, an intersection, and a road next to grass/river-bank terrain. The center should stay consistently compacted-earth colored with no black overlap blocks. The existing mottled green/brown shoulder transition should remain intact.
