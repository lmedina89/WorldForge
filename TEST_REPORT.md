# WorldForge v0.13.5 Test Report

## Main World + Field Barracks + Rifleman integration

Result: **PASS**

### Focused regression suite
- 14 / 14 current RTS, map, asset, simulation, mobile UI, vehicle and new infantry tests passed.
- JavaScript syntax checks passed for every changed production module.
- Protected baseline comparison passed for 22 previously approved vehicle/building master and generator files.

### New feature validation
- Skirmish version: 0.6.0
- RTS Map Forge: 0.2.3
- RTS Asset Library: 0.4.0
- WorldForge: 0.13.5
- Main-world size: 1536 m
- Main-world seed: 731904
- Enlarged start/base reserve: ~260 m diameter
- Barracks master registered and validated: yes
- Barracks deployment sockets validated: yes
- Rifleman GLB animations `CombatWalk` and `AimFire` validated: yes
- Barracks production queue / Rifleman production command path: yes
- Infantry movement class / physical deployment waypoint path: yes
- Existing Refinery → starter Harvester regression: pass
- Existing immersive Skirmish HUD + mobile placement regression: pass
- Existing vehicle readability / close-wide camera / contact shadows regression: pass

### Protected asset checks
The following approved assets were byte-compared against the v0.13.4 GitHub-ready baseline and remained unchanged:
- Aegis-X MBT
- Aegis HMMWV-50
- Aegis Talon AH-X
- Aegis Field Harvester v2
- Tactical Command Post v2.1
- Field Power Node v1.0
- Field Refinery v2.0
- Command Nexus
- Grid Bastion

Protected RPG/world generators and Vehicle Forge/Baker files included in the comparison were also unchanged.

### New asset hashes
- Field Barracks v0.2.3: `f758e0acabae94d089a98851b0c82231ae1bd40e7a61bd17e8d0241b204ea650`
- Aegis Rifleman v0.3: `5a8592b0ff90d2c54fcc217846c26d74e6dc7ae5cefa9b7946c8ce58cc1a1371`

### Legacy test note
Several older historical tests in the repository reference versioned sibling directories such as `/mnt/data/worldforge-v0.4.0`, `/mnt/data/worldforge-v0.5.0`, etc. Those external baselines are not packaged in this working directory, so they are not part of the focused v0.13.5 regression run. Their protected-file intent was covered independently by byte-comparing the current protected files directly against the supplied v0.13.4 GitHub-ready baseline.
