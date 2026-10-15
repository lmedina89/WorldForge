# Dustline Studio 0.1 — First world-editor integration

Access: select **OPEN DUSTLINE 3D MAP STUDIO** in WorldForge.

This is an incremental, isolated editor that uses the **exact v0.2 Dustline files** under `assets/dustline/` rather than rebuilding terrain procedurally. The existing WorldForge UI stays operational.

- **View** orbit/pinch/zoom and inspect native 3D geometry with original normal/roughness/AO and painted base color.
- **Paint** applies feathered tint stamps to the 2048px baked color map and exports an edited PNG, leaving normal/roughness unchanged.
- **Sculpt** deforms the original 129x129 mesh vertices without replacing its UVs; edits export as height JSON. A rebuild may move scenery relative to the ground: resnap placements if needed.
- **Place/Move/Erase** operate on main GLB placement records, not procedurally scattered instanced grass and debris.
- **Undo** preserves up to 24 prior edits, in session.
- **Save/Load** handles project JSON with all paint strokes, sculpt strokes and main GLB placements, using the included original textures/GLBs. Data is downloaded; it is not silently uploaded or stored in the browser.

**Next milestone:** road spline editing, material-aware PBR splat painting (normal/roughness layer blending), reusable prop placement/scatter editing, navigation export and a Godot importer. Do not mistake the current baked-color brush for material-layer painting.
