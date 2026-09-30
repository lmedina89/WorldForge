# WorldForge v0.13.33 — Greater Iron Valley 0.2R

This recovery milestone restores the visually approved v0.13.31 terrain-surface distribution while preserving the useful strategic-geography work from v0.13.32.

## What was wrong in v0.13.32

v0.13.32 did not create a true authored biome map. It added six extra elliptical material-bias masks on top of the eight existing regional masks. In rocky regions those masks pushed the same V8/V9 grass/dirt/rock/wet splat toward rock too aggressively, so broad terrain could read as speckled/rocky grass rather than as a distinct biome.

## Recovery rule

The complete `terrain.biomeZones` array is restored to the exact v0.13.31 definition. No renderer, texture, road, river or protected Iron Valley core change is used to hide the regression.

The v0.13.32 strategic-geography additions remain: landmark-scale landforms, planning metadata, bridge/rail/POI contracts, additional route validation and the optional strategic-plan overlay.

## Still deferred

True biome authoring, cities, vegetation passes, bridges, rail meshes, mission scripting, garrisons, persistent territorial control and world streaming remain deferred. The next biome pass should use explicit named-region masks and preserve V8/V9 surface character rather than using additive material-bias patches.
