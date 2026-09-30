# ForgeRTS Terrain Port Plan

Current WorldForge visual candidate: **PBR V9 · ROAD RECOVERY**.

V9 is still a WorldForge evaluation renderer only. Do **not** port it into ForgeRTS until the target-device views are approved.

The v0.13.30 change is road-presentation-only: V8 terrain remains protected, ForgeRTS runtime-sync files remain byte-identical, and authored road geometry remains unchanged. If approved, port the compacted-earth road presentation and non-accumulating road-core blending as a separate rendering change rather than modifying navigation, terrain sampling, passability or road centerlines.
