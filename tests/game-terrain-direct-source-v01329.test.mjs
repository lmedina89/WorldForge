import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const text=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=p=>crypto.createHash('sha256').update(bytes(p)).digest('hex');
const schema=text('src/core/schema.js');
const wrapper=text('src/game-terrain/terrain-workbench.js');
const renderer=text('src/game-terrain/terrain-renderer-v8.js');
const app=text('src/app.js');
const html=text('index.html');
const manifest=JSON.parse(text('assets/game-terrain/runtime-sync-manifest.json'));

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.29'/);
assert.match(schema,/gameTerrainWorkbench: '0\.9\.0'/);
assert.match(wrapper,/GAME_TERRAIN_WORKBENCH_VERSION='0\.9\.0'/);
assert.match(wrapper,/EXPERIMENTAL_TERRAIN_RENDERER_VERSION='0\.8\.0'/);
assert.match(wrapper,/TerrainRendererV8/);
assert.match(renderer,/overviewTileMeters:18/,'grass source albedo must stay readable at RTS overview scale');
assert.match(renderer,/overviewTileMeters:14/,'dirt source albedo must stay readable at RTS overview scale');
assert.match(renderer,/overviewTileMeters:12/,'rock source albedo must stay readable at RTS overview scale');
assert.match(renderer,/overviewTileMeters:10/,'wet-bank source albedo must stay readable at RTS overview scale');
assert.match(renderer,/restrainedTint\(sourceColor\(uGrass[\s\S]*uGrassTint,\.20\)/,'source texture must remain dominant over palette correction');
assert.doesNotMatch(renderer,/sourceDominant\(/,'V8 must not use the V7 gain-based recoloring path');
assert.match(renderer,/RoadShoulder:/,'road shoulder meshes must be restored');
assert.match(renderer,/makeStripGeometry\(pts,road\.width\?\?8,this\.terrain,\.095\)/,'road surface must use authored width instead of oversized black strip');
assert.match(renderer,/makeStripGeometry\(pts,\(road\.width\?\?8\)\+\(road\.shoulderWidth\?\?4\)\*2,this\.terrain,\.055\)/,'authored shoulder width must be restored');
assert.match(wrapper,/_fitBoundsView\(a,setSpan/,'WIDE must use projected bounds on both Training Ground and Iron Valley');
assert.doesNotMatch(wrapper,/setSpan\(max\*\.78\)/,'baseline WIDE must no longer use the cropped hand-guessed span');
assert.match(wrapper,/camera\.far=Math\.max\(2200,max\*3\.4\)/,'far plane must remain safe for both maps');
assert.match(html,/PBR V8 · DIRECT SOURCE/);
assert.match(app,/PBR V8 direct-source terrain active/);

for(const [file,meta] of Object.entries(manifest.files)){
  assert.equal(sha(file),meta.sha256,`protected ForgeRTS runtime changed: ${file}`);
  assert.equal(bytes(file).length,meta.bytes,`protected ForgeRTS runtime size changed: ${file}`);
}
for(const p of [
  'assets/terrain/polyhaven/grass_ground_diff_1k.jpg',
  'assets/terrain/polyhaven/grass_ground_nor_gl_1k.png',
  'assets/terrain/polyhaven/grass_ground_arm_1k.jpg',
  'assets/terrain/polyhaven/brown_mud_leaves_01_diff_1k.jpg',
  'assets/terrain/polyhaven/rocks_ground_02_col_1k.jpg',
  'assets/terrain/polyhaven/dry_river_pebbles_diff_1k.jpg',
  'assets/terrain/polyhaven/rocky_terrain_02_diff_1k.jpg'
]) assert.ok(bytes(p).length>100000,`source terrain asset missing or unexpectedly tiny: ${p}`);

console.log(JSON.stringify({ok:true,worldforge:'0.13.29',terrainWorkbench:'0.9.0',renderer:'PBR V8 DIRECT SOURCE',sourceReadableScale:true,roadShouldersRestored:true,boundsFitAllMaps:true,protectedForgeRTS:true},null,2));
