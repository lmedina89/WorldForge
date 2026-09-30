# WorldForge v0.13.30 — Battlefield Road Core Recovery

This build is deliberately narrow. **The v0.13.29 V8 terrain is protected.** The only visual target is the inconsistent dark road core seen on iPhone Safari.

## What changed

- **PBR V9 · ROAD RECOVERY** inherits V8 unchanged for terrain.
- Road edges/shoulders that already looked good are preserved.
- The road center is now a compacted dirt/gravel presentation instead of the dark asphalt-like ribbon.
- Road-core alpha feathering was removed so overlapping bends/junctions cannot stack transparency into black patches.
- Road paths, widths, shoulders, terrain heights and ForgeRTS map data are unchanged.

## Test order on iPhone

Open **GAME TERRAIN → IRON VALLEY SHOWCASE → PBR V9 · ROAD RECOVERY → CLOSE** and inspect long straight sections, bends, T-junctions and road/river-adjacent areas. Then check WIDE and the ForgeRTS Training Ground. The road should remain consistently earthy through bends instead of alternating between good soil-colored sections and black smears.

Do not evaluate future Iron Valley expansion from this patch. The expanded main-world map will be designed separately after this road baseline is accepted.
