# Game Terrain Workbench 0.7 — Recovery Baseline

## Purpose

GAME TERRAIN is still a WorldForge proving environment. It must not silently change ForgeRTS gameplay terrain authority.

## Current candidate

**PBR V6 · RTS BLEND** keeps the same authored heightfield, roads and water and changes only the candidate presentation/surface masks/camera framing.

The key correction is separation of scales:

- authored splat weights decide *where* grass, dirt, rock and wet-bank materials appear;
- an RTS-readable palette decides their broad battlefield color family;
- Poly Haven albedo/normal/ARM maps provide micro-detail only;
- micro-detail and normals fade with distance instead of dominating WIDE/CLOSE views;
- macro variation stays low-frequency and restrained.

Roads now use a stable elevated overlay with polygon offset and no depth write. Terrain-under-road dirt blending is deliberately narrower than the previous candidate.

## A/B workflow

Use **LEGACY SURFACE** for the preserved current renderer and **PBR V6 · RTS BLEND** for the experimental renderer. Test WIDE, CLOSE, GROUND and TOP on iPhone Safari before approving a ForgeRTS port.

## Protected ForgeRTS baseline

`runtime-sync-manifest.json` remains authoritative for the exact ForgeRTS v0.6.6.8 snapshot. The legacy `terrain-sampler.js`, `terrain-renderer.js`, Training Ground JSON and synced legacy textures must remain hash-identical.
