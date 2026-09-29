# ForgeRTS Terrain V3 Port Plan

## Goal
Move only the visually approved WorldForge terrain presentation into ForgeRTS while preserving the current gameplay terrain authority.

## Phase 1 — Visual approval in WorldForge
- Keep ForgeRTS v0.6.6.8 unchanged.
- Tune SPLAT V3 against Training Ground and imported ForgeRTS maps.
- Approve material distribution, macro color, road transitions, riverbanks, close-camera normals and iPhone performance.

## Phase 2 — Renderer-only ForgeRTS integration
1. Add a renderer-side terrain surface generator equivalent to WorldForge `terrain-surface-generator.js`.
2. Add/replace the ForgeRTS terrain rendering candidate with the approved `terrain-renderer-v3.js` logic.
3. Copy the approved wet-bank material textures.
4. Read `terrain.visual` from map JSON; old maps with no `terrain.visual` receive safe defaults.
5. Do **not** change `engine/maps/terrain-sampler.js`, pathfinding, passability, movement slope authority, water blocking or deterministic simulation state.

## Phase 3 — Verification gate
- Existing ForgeRTS tests must stay green.
- Existing production GLB hashes remain unchanged.
- Training Ground `heightAt`, road grades, river levels and navigation samples must match the pre-port build.
- Compare WorldForge SPLAT V3 and ForgeRTS using the same map/seed/camera class.
- Test WIDE/CLOSE/GROUND on iPhone Safari.

## Phase 4 — Promote
After visual/performance acceptance, make V3 the normal ForgeRTS terrain renderer and keep the older renderer available temporarily as a regression fallback.

## Future authoring extension
The current V3 splat is generated deterministically. A later WorldForge terrain-painting milestone can export authored splat override data/masks while preserving the same renderer contract.
