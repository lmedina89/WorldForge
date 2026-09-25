# WorldForge v0.3.0 Test Report

## Protected Building Engine regression

Compared neutral geometry + material node hashes against the v0.2 baseline for:

- building seed 73519 — MATCH
- abandoned shop seed 184203 — MATCH
- town building seed 90217 — MATCH

Result: **3 / 3 exact geometry/material matches**.

## Determinism / validation sweep

Tested 63 generator cases across:

- 4 prop families
- 4 prop styles
- 3 prop conditions
- 4 terrain patch types at multiple roughness values
- ridge / mesa / ravine landscape generation

Results:

- Validation failures: **0**
- Determinism failures: **0**

## Browser integration checks

- JavaScript syntax checks passed for modified modules.
- UI IDs for Building / Props / Terrain / Landscape are wired to the shared recipe pipeline.
- Z-up browser viewport convention corrected to match neutral scene coordinates.

## Known scope limit

Field composition is intentionally not included yet. v0.3.0 establishes the asset contract and first supporting generators before adding scene placement logic.
