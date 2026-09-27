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
