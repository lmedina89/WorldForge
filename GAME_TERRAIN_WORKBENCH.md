# Game Terrain Workbench 0.8 — Source Detail + Bounds-Based Camera

## Purpose

GAME TERRAIN remains a WorldForge proving environment. It does not change ForgeRTS gameplay terrain authority.

## Current candidate

**PBR V7 · SOURCE DETAIL** preserves the actual Poly Haven source albedo as the dominant surface signal. Grass, soil, rock and wet-bank textures receive only restrained average-color correction toward the authored RTS palette; the shader no longer replaces their photographic color structure with a flat palette.

Color texture detail is left to texture mipmapping at distance. Normal-map contribution is distance-aware so CLOSE/GROUND retain useful surface relief while WIDE remains readable.

## Camera correction

Iron Valley is 768×576 m. The previous shared orthographic camera retained a 400 m far plane even when WIDE/TOP camera positions were farther away than that, which could clip most of the map. Workbench 0.8 scales the far plane to the battlefield and computes strategic WIDE framing from the actual map bounds plus sampled terrain height range.

## Protected systems

The following remain unchanged: Iron Valley landform geometry, the strategic sampler, splat generation, roads/water, validation routes, production GLBs, protected generators, and the byte-identical ForgeRTS v0.6.6.8 runtime snapshot.

## Device check

On iPhone Safari, check **PBR V7 · SOURCE DETAIL** in WIDE first (whole battlefield should remain visible), then CLOSE/GROUND (source grass/soil/rock texture should be visibly photographic rather than flat color), then TOP.
