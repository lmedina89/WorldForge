# WorldForge v0.13.11 Test Report

## Multi-Cluster Mineral Fields

Result: **PASS**

### Validation
- **16 / 16** focused `rts-*.test.mjs` tests pass.
- JavaScript syntax checks pass for the updated RTS Map Forge, application wiring, and schema modules.
- Rich and Dense resource hashes remain exactly the approved v0.13.10 hashes.
- Resource-field tests verify one logical deposit per field, Rich **3–5** visual clusters, Dense **5–8**, GPU instancing, and prepared harvest-point metadata.

### Runtime design
- Repeated crystal clusters are `visualOnly`; field capacity stays at the zone/deposit level.
- Resource instance metadata maps every visible cluster back to its logical resource-zone ID.
- Instancing uses the exact GLB mesh geometry/materials with per-instance field transforms instead of cloning complete GLB trees.
- Skirmish remains 0.6.3; no combat, economy, production, or AI rules were changed in this patch.

# WorldForge v0.13.10 Test Report

## Rich + Dense Crystal Resource Masters

Result: **PASS**

### Validation
- All `rts-*.test.mjs` focused RTS tests pass after the resource integration.
- New resource-master test verifies both packaged crystal GLBs are byte-identical to the approved source files by SHA-256.
- Rich SHA-256: `3fe4ead89946b35403d28dab0c9549f3049a984681f286c0783de0e1959b8951`.
- Dense SHA-256: `6f3a3a33049a764cc7bb1fbe3ce481b49f053c8e4c0785d142124fa7594bbcc0`.
- Both GLBs contain all four required resource helper nodes.
- All 14 GLBs already present in the v0.13.9 package were SHA-256 compared and remain unchanged.
- JavaScript syntax checks pass for the changed RTS Asset Library, RTS Map Forge, application wiring, and schema modules.

### Map integration
- Legacy mineral `OctahedronGeometry` placeholder rendering is removed.
- Rich and Dense masters are selected deterministically from resource density and embedded in exported resource metadata.
- Map export waits for the crystal assets to load before serializing the map GLB.
- Skirmish waits for the same neutral resource assets before starting.

# WorldForge v0.13.9 Test Report

## Believable Terrain & Road Grounding

Result: **PASS**

### Validation
- Focused RTS terrain/map tests passed: `rts-map-forge`, `rts-map-traversal-v020`, `rts-skirmish-visual-readability`, `rts-skirmish-immersive-ui`, and `rts-main-world-infantry-v0135`.
- JavaScript syntax/load checks passed for the updated RTS Map Forge module.
- No RTS structure GLB assets were rebuilt or modified for this milestone.

### Terrain
- Terrain coloration now blends elevation, slope, river moisture, and reserved-base clearing influence.
- Lowland, midland, upland, and rocky zones now read more distinctly while staying stylized and playable.
- Tree placement now prefers wetter and gentler terrain; rocks prefer uplands and steeper slopes.

### Roads
- Road corridors now carve gently into terrain before the visible road surface is laid down.
- Road shoulders and roadbeds use higher ground offset to reduce z-fighting and slope flicker.
- Road strip tessellation was increased so routes conform more cleanly to height changes.


# WorldForge v0.13.8 Test Report

## Unit Collision & Infantry Spacing

Result: **PASS**

### Validation
- 17 / 17 focused RTS / map / simulation / UI / vehicle tests passed.
- JavaScript syntax checks passed for all changed production modules.
- 13 packaged GLB assets were SHA-256 compared against v0.13.7 and remained byte-identical.
- RTS Map Forge, RTS Asset Library, Vehicle Baker and Vehicle Generator remained byte-identical.

### Ground vehicle collision
Oriented hull footprints now replace circular movement collision for:
- Aegis-X MBT: 7.55 × 3.10 m
- HMMWV-50: 4.70 × 2.22 m
- Field Harvester: 8.30 × 3.90 m with +90° collision-heading offset

The Talon AH-X remains excluded from ground OBB blocking while airborne.

### Runtime behavior
- SAT oriented-rectangle vehicle/building collision
- SAT vehicle/vehicle collision
- Tank turn validation
- Building/vehicle corner sliding using obstacle tangent projections
- Safe open-pose search for manually spawned ground support vehicles
- Barracks deployment and Refinery docking exceptions preserved

### Infantry
- Rifleman physical radius: 0.40 m
- Desired personal spacing: 0.82 m
- Compact deterministic Barracks rally slots
- Pairwise soft infantry separation
- Infantry/ground-vehicle separation
- Hard avoidance of buildings and ground vehicles during movement

### Debug
Fullscreen BUILD drawer now includes Collision Debug:
- building footprints
- vehicle hull footprints
- infantry physical radii

Debug visualization is off by default.
