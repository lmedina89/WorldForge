# WorldForge v0.13.0 Test Report — Building Forge 0.1 / Master Asset Integration

Status: **PASS**

## New master-asset coverage
- Command Nexus HQ v1.3 packaged and registered: **PASS**.
- Grid Bastion Power Plant v1.0 packaged and registered: **PASS**.
- Five faction presets plus custom color-slot wiring: **PASS**.
- Required root/socket registry for both master buildings: **PASS**.
- Native Y-up Building Forge export path: **PASS**.
- Skirmish master replacement for Construction Yard + Power Plant: **PASS**.
- Real HMMWV-50 / Talon AH-X skirmish test-depot hooks: **PASS**.
- Building Forge functional-root preview hooks: **PASS**.
- DOM audit: **279 IDs / 279 unique / 238 unique app references / 0 missing / 0 duplicates**.

## Regression / compatibility
- Full automated suite: **16/16 PASS**.
- Entire `src/generators/*.js` tree vs v0.12.0: **15/15 byte-identical**.
- RTS Map Forge vs v0.12.0: **byte-identical**.
- Vehicle Generator / Vehicle Baker vs v0.12.0: **byte-identical**.
- Existing Aegis-X / HMMWV-50 / Talon GLBs vs v0.12.0: **byte-identical**.
- New master-building assets are additive under `assets/buildings/`.

## Browser smoke-test note
The container can serve the build locally, but outbound DNS is unavailable, so the browser cannot fetch the Three.js CDN modules used by the GitHub Pages build. JavaScript syntax, DOM wiring, asset packaging, master registry, simulation integration and all automated regression suites pass. GitHub Pages/iPhone remains the visual runtime smoke test.

---

# WorldForge v0.12.0 Test Report — RTS Simulation Foundation 0.1

Status: **PASS**

## Simulation foundation
- Fixed 30 Hz stepping and bounded accumulator behavior: **PASS**.
- Pause + single-tick stepping: **PASS**.
- Stable entity IDs and serializable entity snapshots: **PASS**.
- Ordered tick-scheduled command queue and command source metadata: **PASS**.
- Deterministic seeded simulation state/hash repeatability: **PASS**.
- Shared building/locomotor/unit/weapon definitions: **PASS**.
- Tracked / wheeled / helicopter locomotor profiles present: **PASS**.
- Semantic RTS command vocabulary includes MOVE / STOP / ATTACK / BUILD / PRODUCE plus direct-drive adapters: **PASS**.
- Skirmish drive, aim, fire and build placement are routed through the command stream: **PASS**.
- Simulation-owned tank health/transform/turret/weapon cooldown, building construction, projectile state and damage: **PASS**.
- Live simulation debug UI, pause, step, command log and snapshot export: **PASS**.
- DOM audit: **263 IDs / 263 unique / 222 unique app references / 0 missing / 0 duplicates**.

## Regression / compatibility
- Full automated suite: **15/15 PASS**.
- Entire `src/generators/*.js` tree vs v0.11.0: **15/15 byte-identical**.
- `src/rts-map/rts-map-forge.js` vs v0.11.0: **byte-identical**.
- Vehicle Generator 0.3 and Vehicle Baker 0.1.3 vs v0.11.0: **byte-identical**.
- All packaged GLB assets vs v0.11.0: **byte-identical**.
- RTS Map Forge traversal/bridge/foliage tests: **PASS**.
- Vehicle Forge / Aegis reference tests: **PASS**.
- Settlement / field / surface / placement / production metadata regression tests: **PASS**.

## Browser smoke-test note
Chromium is installed in this container, but the environment blocks local/file-page navigation by administrator policy, so I could not execute a final GPU click-through. JavaScript syntax, DOM wiring, data-layer behavior, deterministic simulation tests, packaged assets, and all regression suites pass. The first GitHub Pages/iPhone launch remains the final visual/runtime smoke test.

---

# WorldForge v0.11.0 Test Report — Skirmish Lab 0.1

Status: **PASS**

## First playable RTS loop
- Dedicated SKIRMISH workspace and mobile HUD: **PASS**.
- Exact Aegis-X v2 articulated GLB packaged: **PASS**.
- Required vehicle hierarchy strings (`VehicleRoot`, `HullRoot`, `TurretRoot`, `GunPitchRoot`, `MuzzleSocket`): **PASS**.
- Direct tracked-terrain tank driving and structure collision: **PASS**.
- Independent turret yaw and gun pitch: **PASS**.
- Main-gun projectile fired from real `MuzzleSocket`: **PASS**.
- Ballistic drop, muzzle flash/light, impact particles, explosion/smoke, damage and destruction state: **PASS**.
- Gameplay construction loop: **PASS**.
- Building set: Construction Yard / Power Plant / Refinery / Barracks / Vehicle Factory / Gun Turret: **PASS**.
- Credits / power / build radius / footprint buildability / building collision: **PASS**.
- Mobile directional hold controls + FIRE; desktop WASD/arrows + Space: **PASS**.
- DOM audit: **258 IDs / 258 unique / 217 app references / 0 missing / 0 duplicates**.

## Regression / compatibility
- Full automated suite: **14/14 PASS**.
- Entire `src/generators/*.js` tree vs v0.10.0: **15/15 byte-identical**.
- RTS Map Forge 0.2.1 traversal/bridge/foliage tests: PASS.
- Vehicle Forge / Aegis reference tests: PASS.
- Vehicle Baker tests: PASS.
- Settlement / field / surface / placement / production metadata regression tests: PASS.

## Browser smoke-test note
The container has Playwright installed but no browser binary, so I could not execute a final GPU/browser click-through here. JavaScript syntax, DOM wiring, packaged assets, skirmish integration, protected-source regression, and all automated tests passed. The first GitHub Pages/iPhone run remains the visual/runtime smoke test.
