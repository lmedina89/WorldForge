import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const text=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const shaBytes=b=>crypto.createHash('sha256').update(b).digest('hex');
const sha=p=>shaBytes(bytes(p));
const canonicalRoadGeometry=map=>map.roads.map(r=>({id:r.id,width:r.width,shoulderWidth:r.shoulderWidth,points:r.points}));
const stableStringify=v=>Array.isArray(v)?'['+v.map(stableStringify).join(',')+']':(v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stableStringify(v[k])).join(',')+'}':JSON.stringify(v));
const stableRoadHash=map=>shaBytes(Buffer.from(stableStringify(canonicalRoadGeometry(map))));

const schema=text('src/core/schema.js');
const wrapper=text('src/game-terrain/terrain-workbench.js');
const v9=text('src/game-terrain/terrain-renderer-v9.js');
const html=text('index.html');
const app=text('src/app.js');
const showcase=JSON.parse(text('assets/game-terrain/worldforge_curated_battlefield.json'));
const training=JSON.parse(text('assets/game-terrain/forgerts_training_ground.json'));
const manifest=JSON.parse(text('assets/game-terrain/runtime-sync-manifest.json'));

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.30'/);
assert.match(schema,/gameTerrainWorkbench: '0\.10\.0'/);
assert.match(wrapper,/GAME_TERRAIN_WORKBENCH_VERSION='0\.10\.0'/);
assert.match(wrapper,/EXPERIMENTAL_TERRAIN_RENDERER_VERSION='0\.9\.0'/);
assert.match(wrapper,/TerrainRendererV9/);
assert.match(html,/PBR V9 · ROAD RECOVERY/);
assert.match(app,/PBR V9 road-recovery active/);

// V8 terrain foundation remains byte-for-byte protected.
assert.equal(sha('src/game-terrain/terrain-renderer-v8.js'),'d36c8dd59d1fd1d9bed4430d823f7e63c633a3807a47ce92295074edcdc2162d');
assert.equal(sha('assets/terrain/road_shoulders.png'),'0c6ec4699e0a81719b90cb7686176e3701a718a2cecd767bf96c4c068a702ea1');
assert.equal(sha('assets/terrain/road_shoulders_normal.png'),'45bb005645ee0d2d4ca8702f5a8531d98d4157eddb6c1f52fb93f1fbbe80362f');
assert.equal(sha('assets/terrain/polyhaven/grass_ground_diff_1k.jpg'),'a79cc5ed65af0f80261b39a383b64a8c5272c5144d724deb43dbc29f0e4cd19b');

// The authored road network geometry and widths are unchanged from v0.13.29.
assert.equal(stableRoadHash(showcase),'b0965686ecbaf48e6aeeeaa835524e5dec6bf393bc348197a816f5ca48080e25');
assert.equal(stableRoadHash(training),'293ac4c9cc28ce89876319bdc6917f29413aa8bec2067c3252407c5094e9a850');
for(const map of [showcase,training]) for(const road of map.roads){
  assert.equal(road.surface,'assets/terrain/road_asphalt.png');
  assert.equal(road.shoulder,'assets/terrain/road_shoulders.png');
}
assert.match(v9,/surfacePath=road\.surface==='assets\/terrain\/road_asphalt\.png'\?'assets\/terrain\/road_compacted_dirt\.png':road\.surface/,'road visual override must remain renderer-only');

assert.ok(bytes('assets/terrain/road_compacted_dirt.png').length>100000,'compacted dirt albedo missing/unexpectedly tiny');
assert.ok(bytes('assets/terrain/road_compacted_dirt_normal.png').length>10000,'compacted dirt normal missing/unexpectedly tiny');
assert.match(v9,/extends TerrainRendererV8/,'V9 must inherit the protected V8 terrain renderer');
assert.match(v9,/transparent:true,[\s\S]*opacity:1,[\s\S]*depthWrite:false/,'road core must overwrite instead of alpha-darkening overlaps');
const coreBlock=v9.match(/_roadCoreMaterial\(tex,normal\)\{([\s\S]*?)\n  \}\n\n  async _buildRoads/);
assert.ok(coreBlock,'road core material block missing');
assert.doesNotMatch(coreBlock[1],/alphaMap/,'road core must not reuse the feather alpha map');
assert.match(v9,/makeStripGeometry\(pts,road\.width\?\?8,this\.terrain,\.082,16\)/,'road core must preserve authored width and use the longer repeat scale');
assert.match(v9,/makeStripGeometry\(pts,\(road\.width\?\?8\)\+\(road\.shoulderWidth\?\?4\)\*2,this\.terrain,\.055,8\)/,'existing shoulder geometry must remain unchanged');
assert.match(v9,/coreAlphaAccumulation:false/);

for(const [file,meta] of Object.entries(manifest.files)){
  assert.equal(sha(file),meta.sha256,`protected ForgeRTS runtime changed: ${file}`);
  assert.equal(bytes(file).length,meta.bytes,`protected ForgeRTS runtime size changed: ${file}`);
}

console.log(JSON.stringify({ok:true,worldforge:'0.13.30',terrainWorkbench:'0.10.0',renderer:'PBR V9 ROAD RECOVERY',v8TerrainProtected:true,roadGeometryProtected:true,roadCoreOverlapDarkeningRemoved:true,shoulderFeatherProtected:true,protectedForgeRTS:true},null,2));
