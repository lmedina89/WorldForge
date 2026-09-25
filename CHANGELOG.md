# WorldForge v0.6.0 — RPG Architecture Pack II

## Added
- Building Engine 1.3.0 — RPG Architecture Pack II.
- 13 new RPG-world architecture families:
  - Watermill
  - Windmill
  - Dock / Pier
  - Dock Warehouse
  - Temple
  - Mage Tower
  - Ruined Fort
  - Desert House
  - Desert Market
  - Mine Entrance
  - Grand City Gate
  - Sewer Entrance
  - Town Hall / Civic Hall
- New RPG-world styles:
  - River Village
  - Harbor Town
  - High Temple
  - Arcane
  - Ancient Ruins
  - Desert Town
  - Mining Town
  - Grand City
  - Sewerworks
- New structure templates for every Pack II archetype.
- New roof choices for Engine 1.3: Dome and Spire.
- Dedicated procedural details including water wheels, windmill sails, dock posts/rails/crane, temple columns/pediments, mage-tower spires/crystals, ruin rubble, adobe parapets, bazaar awnings, mine supports/rails, city-gate portcullises, sewer channels/grates, and civic clock towers.

## Compatibility
- Building Engine 1.0.0 preserved byte-for-byte.
- Building Engine 1.1.0 preserved byte-for-byte.
- Building Engine 1.2.0 preserved byte-for-byte.
- v0.5 recipes without an explicit engine are migrated to Building Engine 1.2.0 rather than silently changing to 1.3.
- Engine 1.3 delegates Pack I/core families through the protected 1.2 path and preserves their generated geometry/materials.

## Testing
- 78 Pack II deterministic generation cases passed.
- 4 cross-version legacy regression recipes passed.
- Existing RPG Pack I test suite still passes: 76 cases.
- Zero validation or determinism failures in the Pack II matrix.
