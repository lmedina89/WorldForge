# v0.13.31 — Greater Iron Valley 0.1 · Regional Skeleton

- Added **Greater Iron Valley — Regional World Skeleton**, a new 2048×1536 main-world candidate built around the protected 768×576 Iron Valley benchmark.
- Kept the existing Iron Valley benchmark JSON, ForgeRTS Training Ground JSON, V8 terrain renderer, V9 road renderer, compacted-road assets, shoulder assets, and protected ForgeRTS runtime files byte-for-byte unchanged.
- Added a 12-sector (4×3, 512 m) world partition metadata layer for future streaming/LOD work. No visible sector seams are introduced.
- Added eight surrounding regional biome masks using only the existing protected grass/dirt/rock/wet source materials: Ashgate transition belt, Pinebreak Highlands, Northwatch Ridge, Blackstone Quarry, Eastmere Lowlands, Westfield, Southline, and Red Mesa Frontier.
- Biome masks alter material distribution and restrained macro tint only; no new terrain shader or source texture pipeline was introduced.
- Added additive regional landforms outside the protected core: mountain backbones, corridors, plateaus, future base/depot pads, and explicit graded access ramps.
- Added 12 regional road definitions while preserving the six original Iron Valley roads exactly. North-pass and south-flank continuations plus low-grade Ashgate/Eastmere gateways connect the old battlefield to the northern military road, Southline highway and regional connectors without forcing new grades through the 27 m legacy base shelves.
- Extended South Creek into the surrounding world and added an Eastmere side channel while keeping the original South Creek entry byte-for-byte unchanged.
- Reworked major road crossings into explicit shared junction nodes (north-pass/northern-road and south-flank/Southline) to prevent grade discontinuities. Added 17 validation routes total; all 17 pass their authored slope limits against the same StrategicTerrainSampler used by the preview.
- Added named region/landmark/reserved-base metadata for future Ashgate city, Blackstone Quarry, Northwatch Radar Hill, Westfield village, Southline airfield/depot, Eastmere crossings, and Red Mesa objectives.
- This milestone deliberately contains **no new placed buildings, no mission scripts, and no new renderer experiment**. It is terrain + biome + hydrology + road/navigation skeleton only.
