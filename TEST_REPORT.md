# WorldForge v0.13.6 Test Report

## Vehicle Factory + Guardian Turret + Fullscreen Vehicle Depot

Result: **PASS**

### Focused regression suite
- 15 / 15 current RTS / map / simulation / asset / immersive-UI / vehicle tests passed.
- JavaScript syntax checks passed for all changed production modules.
- 22 protected files were SHA-256 compared directly against the v0.13.5 GitHub-ready build; all remained byte-identical.

### New master assets
- Aegis Vehicle Factory game master: `assets/buildings/aegis_vehicle_factory_v021.glb`
- Aegis Guardian Turret game master: `assets/buildings/aegis_guardian_turret_v031.glb`
- Both are stored as glTF Y-up assets so the existing WorldForge master-building import wrapper places them upright in the Z-up game world.
- Vehicle Factory source dimensions validate at approximately 29.4 m X × 7.92 m Y(height) × 22.97 m Z.
- Guardian Turret composed source dimensions validate at approximately 8.95 m X × 4.86 m Y(height) × 8.95 m Z.
- Guardian `MuzzleSocket` is verified as a child of `GunPitchRoot`.

### Runtime integration
- `vehicleFactory` resolves through `masterAsset:'fieldVehicleFactory'`.
- `gunTurret` resolves through `masterAsset:'guardianTurret'`.
- Player-built versions use the normal faction-palette path.
- Enemy training target now uses the Guardian master with the enemy palette.
- Runtime building views expose turret articulation and vehicle-factory rollout sockets for later gameplay systems.

### Fullscreen vehicle depot
The immersive Skirmish BUILD drawer now contains working deploy controls for:
- HMMWV-50
- Talon AH-X
- Field Harvester

The original side-panel deploy controls remain wired as well, so the feature is restored rather than moved destructively.

### Preserved systems
- 1,536 m Main World / Map Forge v0.2.3
- Aegis-X tank controls and combat
- Barracks / animated Rifleman production
- Refinery / starter Harvester docking
- VIEW WIDE / VIEW CLOSE, follow mode and pinch zoom
- Existing approved vehicle/building/infantry masters
