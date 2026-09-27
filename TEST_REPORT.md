# WorldForge v0.13.7 Test Report

## Rotor Axis + Building Collision Cleanup

Result: **PASS**

### Validation
- 16 / 16 focused RTS / map / simulation / UI / vehicle tests passed.
- JavaScript syntax validation passed for the changed runtime modules.
- 14 packaged binary assets were SHA-256 compared with v0.13.6 and remained byte-identical.
- Protected Map Forge, RTS Asset Library, Vehicle Generator and Vehicle Baker source files remained byte-identical.

### Rotor / fan axis corrections
The authored GLB geometry was inspected before changing runtime animation axes:
- Aegis Talon `MainRotorRoot`: broad in source X/Z with a thin Y dimension, so local **Y** remains the correct axle.
- Aegis Talon `TailRotorRoot`: broad in source X/Y with only ~0.2 m thickness in Z, so local **Z** is the correct axle. Runtime was incorrectly using X.
- Field Power Node `CoolingFanRoot_1/2`: broad X/Y fan disks with ~0.18 m Z thickness, so local **Z** is the correct axle.
- Field Refinery `DustCollectorFanRoot`: broad X/Y fan disk with ~0.16 m Z thickness, so local **Z** is the correct axle.

Skirmish now uses delta-time-based animation:
- Main rotor: local Y
- Tail rotor: local Z
- Cooling fans: local Z
- Refinery dust fan: local Z
- Command-post radar remains local Y

Building Forge preview uses the same corrected cooling/dust-fan axes.

### Collision cleanup
The previous runtime used diagonal-radius circles for structure collision. That substantially over-reserved the corners of rectangular buildings.

v0.13.7 now uses:
- oriented rectangular SAT overlap for building placement;
- oriented rectangular / rounded-clearance tests for unit-vs-building movement;
- the actual unit collision radius for the Aegis-X and Rifleman;
- a small 0.30 m runtime safety clearance;
- separate tuned collision footprints for physical building bodies while leaving construction footprints unchanged.

Tuned runtime collision footprints:
- Tactical Command Post: 29.5 × 21.5 m
- Field Power Node: 21.5 × 18.5 m
- Field Refinery: 30.5 × 22.5 m
- Field Barracks: 16.8 × 11.4 m
- Aegis Vehicle Factory: 27.0 × 20.0 m
- Guardian Turret: 8.2 × 8.2 m

The normal construction footprints remain unchanged, so this reduces invisible-wall distance without allowing buildings to visually overlap during placement.

### Preservation
No GLB was rebuilt or edited for this milestone.
The Main World, Factory/Turret integration, fullscreen vehicle depot, Barracks/Rifleman loop, Refinery/Harvester docking, tank combat, camera modes and approved master assets remain intact.
