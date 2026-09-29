# Game Terrain Workbench 0.9 — Direct-Source Terrain

## Purpose

GAME TERRAIN remains a WorldForge proving environment. It does not change ForgeRTS gameplay terrain authority.

## Current candidate

**PBR V8 · DIRECT SOURCE** fixes the main v0.13.28 failure: the Poly Haven albedo was technically loaded, but it was tiled at approximately physical scan scale (1.3–2.5 m). At a 200–600 m RTS view that creates dozens to hundreds of repetitions across the screen, so mipmapping averages the source into smooth color.

V8 uses separate scales:
- grass overview albedo: 18 m; physical normal/ARM detail: 2.5 m
- dirt overview albedo: 14 m; physical normal/ARM detail: 1.3 m
- rock overview albedo: 12 m; physical normal/ARM detail: 2.0 m
- wet-bank overview albedo: 10 m; physical normal/ARM detail: 2.0 m

The source photograph is the dominant color/detail signal. Palette correction is deliberately restrained.

## Roads

V7 dropped authored shoulder meshes and widened the dark road core. V8 restores `road.shoulder`, restores the exact authored road width, retains soft edge alpha, and keeps stable positive/polygon offsets for mobile WebGL.

## Camera

WIDE uses projected map bounds for both Iron Valley and the 640×480 ForgeRTS Training Ground. CLOSE/GROUND keep more battlefield context instead of filling the viewport with one road strip.

## Protected systems

ForgeRTS v0.6.6.8 TerrainSampler/TerrainRenderer/Training Ground remain byte-identical. Iron Valley strategic geometry, six validated routes, splat generation, source PBR assets, generators, and production GLBs are unchanged.

## Device check

Check **PBR V8 · DIRECT SOURCE** in WIDE first, then CLOSE/GROUND, then TOP. Verify visible grass/soil/rock texture structure, readable shoulders/road core, full-map WIDE framing, and no shimmer/z-fighting.
