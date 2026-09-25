# Changelog

## v0.2.0

- Refactored monolithic prototype into reusable core/generator/adapter/storage layers.
- Added versioned deterministic recipe and neutral scene schemas.
- Added browser-independent headless CLI that uses the same generator modules as the web UI.
- Added OBJ/MTL and neutral scene JSON output in headless mode.
- Added IndexedDB local project library.
- Added recipe import, recipe export, scene export, GLB export, and PNG render controls.
- Added building families: cottage, house, shop, inn, shack, barn, warehouse.
- Added wood, timber/plaster, stone, brick, and metal material systems.
- Added clean, worn, and abandoned conditions; abandoned buildings can receive boarded openings and deterministic debris.
- Retained ridge, mesa, and ravine landscape generation with adjustable mesh resolution.
- Added validation statistics and deterministic test coverage.
- Reduced browser renderer pixel ratio and shadow-map size from the prototype to keep the authoring UI lighter on mobile hardware.
