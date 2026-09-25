# Changelog

## 0.3.0

- Preserved Building Engine output as version `1.0.0`.
- Added explicit per-engine version fields to normalized recipes.
- Added `worldforge.asset.v1` metadata contract with bounds, footprint, anchor, facing, collision, occlusion and tags.
- Added Prop Engine 0.1.0:
  - village/roofed wells
  - straight/corner/gate/broken fence variants
  - signposts
  - crate/barrel supply clusters
  - clean/worn/abandoned condition support
- Added Terrain Engine 0.1.0:
  - grass
  - dirt
  - grass + path
  - worn village ground
- Added Props and Terrain tabs to browser UI.
- Fixed browser coordinate convention: neutral assets are Z-up and the Three.js camera/ground/grid now use Z-up consistently.
- Existing Landscape Engine retained.
- Browser/local-project recipe import/export now accepts all four asset types.
