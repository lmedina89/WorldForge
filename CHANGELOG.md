# WorldForge v0.7.0 — Surface + Field Foundation

## Added
- Surface Engine 0.1.0.
- Eight surface families: grass, dirt, worn village, stone, cobblestone, mud, sand, rocky.
- Six path layouts: none, straight, curve, T junction, crossroads, plaza.
- Seeded non-grid-looking surface breakup, wear patches, path variation, small stones/tufts/flowers, and edge breakup.
- Field Composer 0.1.0.
- Nine initial RPG field presets:
  - Village Well Square
  - Rural House Lane
  - Market Corner
  - Castle Courtyard
  - Castle Gate Approach
  - Mountain Path
  - Mine Entrance Clearing
  - Desert Market
  - Dockside Lane
- Exact placement recipes embedded in generated field recipes.
- Field overlap validation using generated asset footprints.
- Browser FIELD editor with asset selection, nudge, rotate, duplicate, regenerate-selected, delete, clear selection, and center-selection controls.
- Placement grouping in the Three.js adapter for reliable field selection.
- Field material deduplication to reduce duplicate materials when multiple generated assets share identical materials.
- Surface and field example recipes plus headless field export example.

## Protected compatibility
- Building Engine 1.0.0 source unchanged from v0.6.0.
- Building Engine 1.1.0 source unchanged from v0.6.0.
- Building Engine 1.2.0 source unchanged from v0.6.0.
- Building Engine 1.3.0 source unchanged from v0.6.0.
- Representative recipes from all four building engines reproduce exact node/material output compared with v0.6.0.

## Validation
- 96 Surface Engine determinism/validation cases passed.
- 27 Field Composer preset/seed determinism cases passed with zero overlap warnings at the default field size.
- Edited field recipe placement transform round-trip passed.
- Existing RPG Architecture I and II test suites continue to pass.
