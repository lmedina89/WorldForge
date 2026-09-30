# WorldForge v0.13.31 — Greater Iron Valley 0.1

This build begins the main-world expansion without replacing the terrain and road work that is finally behaving correctly on iPhone.

## New world

**Greater Iron Valley** is 2048×1536 m — about 7.1× the area of the original 768×576 benchmark. The original Iron Valley remains embedded at the center as a **protected 768×576 terrain core**. Its authored height, slope, splat/material distribution and macro tint remain numerically unchanged throughout that core, while the original six roads and South Creek definitions remain intact. Additive world-road and water overlays begin at selected legacy exits, but their terrain deformation and biome influence fade to zero inside the protected core. The separate **Iron Valley Benchmark** remains the exact v0.13.30 A/B visual reference.

The new regional skeleton adds eight surrounding world identities around that protected central terrain core:

- Ashgate — future town / industrial belt
- Pinebreak Highlands — greener highland flank
- Northwatch Ridge — rocky radar-height terrain
- Blackstone Quarry — exposed rock / industrial geology
- Eastmere Lowlands — wet river country
- Westfield — broad fertile/open farmland
- Southline — logistics / future airfield corridor
- Red Mesa Frontier — dry scrub / exposed earth and rock

Biome variation uses the same protected V8/V9 grass, dirt, rock and wet source materials. It changes distribution and macro tint only; it does not replace the PBR source textures or add another terrain shader.

## Infrastructure skeleton

The six original Iron Valley roads remain unchanged. Twelve additive world-road definitions extend the north pass and south flank outward, add low-grade Ashgate/Eastmere gateway approaches, then tie the region into a northern military road, Southline highway and secondary connectors. The gateways deliberately avoid forcing the 27 m legacy base shelves into world exits. Major branch points use shared authored junction coordinates so the terrain grade cannot jump at an accidental road crossing. All of them use the approved V9 compacted-earth presentation.

The original South Creek definition remains unchanged. Additive west/east continuations and an Eastmere side channel establish the first regional hydrology pass. Their carve/material influence fades to zero inside the protected terrain core so the approved benchmark terrain remains numerically identical.

All 17 authored vehicle-validation routes are currently within their slope limits.

## Performance foundation

The world is authored as twelve 512×512 logical sectors. They are metadata in this milestone — the player should not see seams. Future city buildings, vegetation, props and mission activation can use those sectors for LOD/streaming without changing the continuous terrain.

The new world uses a 5 m visual terrain cell, 3 m splat texel and 12 m macro texel to keep the 2048×1536 preview reasonable on mobile while retaining the protected direct-source material pipeline.

## What is intentionally NOT here yet

No city buildings, foliage overhaul, mission scripts, garrison systems, destructible infrastructure, bridges, rail assets or persistent-control logic have been added yet. Those come only after the regional skeleton is visually and navigationally approved.

## First iPhone check

Open **GAME TERRAIN → GREATER IRON VALLEY 0.1 → PBR V9 · ROAD RECOVERY → WIDE**.

Check the world silhouette and whether Pinebreak/Northwatch/Blackstone/Eastmere/Westfield/Southline/Red Mesa read as distinct but connected regions. Then use **TOP** to judge road hierarchy and world composition. Use **CLOSE** around the center to confirm the approved v0.13.30 terrain/road presentation is still intact. The world can add overlay roads/water beginning at legacy exits, but the underlying protected terrain core is unchanged; use **IRON VALLEY BENCHMARK** for the exact standalone A/B view.

The separate **IRON VALLEY BENCHMARK** button remains available for direct A/B comparison.
