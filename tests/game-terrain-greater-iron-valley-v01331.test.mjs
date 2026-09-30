import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { StrategicTerrainSampler } from '../src/game-terrain/strategic-terrain-sampler.js';
import { TerrainSurfaceGenerator } from '../src/game-terrain/terrain-surface-generator.js';

const text=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=p=>crypto.createHash('sha256').update(bytes(p)).digest('hex');
const hashJson=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

const schema=text('src/core/schema.js');
const wrapper=text('src/game-terrain/terrain-workbench.js');
const html=text('index.html');
const app=text('src/app.js');
const world=JSON.parse(text('assets/game-terrain/worldforge_greater_iron_valley.json'));
const benchmark=JSON.parse(text('assets/game-terrain/worldforge_curated_battlefield.json'));
const manifest=JSON.parse(text('assets/game-terrain/runtime-sync-manifest.json'));

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.32'/);
assert.match(schema,/gameTerrainWorkbench: '0\.12\.0'/);
assert.match(wrapper,/GAME_TERRAIN_WORKBENCH_VERSION='0\.12\.0'/);
assert.match(wrapper,/loadWorld\(\)/);
assert.match(html,/GREATER IRON VALLEY 0\.2/);
assert.match(app,/Greater Iron Valley regional identity/);
assert.match(app,/gameTerrainLoadWorld/);

// v0.13.30 terrain and road presentation remain byte-for-byte protected.
assert.equal(sha('src/game-terrain/terrain-renderer-v8.js'),'d36c8dd59d1fd1d9bed4430d823f7e63c633a3807a47ce92295074edcdc2162d');
assert.equal(sha('src/game-terrain/terrain-renderer-v9.js'),'52ecf52ac9414045009d2c1efd7c70717eb74407698a573f72dcadbe42e4a21e');
assert.equal(sha('src/game-terrain/terrain-sampler.js'),'d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a');
assert.equal(sha('assets/game-terrain/worldforge_curated_battlefield.json'),'e33821b0a9aaaf2c23ad0e0fc1471e965b26e72391ed6ffbfb2341a5d8171fa1');
assert.equal(sha('assets/game-terrain/forgerts_training_ground.json'),'b7f54a9792e6df5e90b635a7fe02b6d3e6ad3e2bbe5f0dfc6f0eba8e66c9bfc9');
assert.equal(sha('assets/terrain/road_compacted_dirt.png'),'3b1ef98b6bd4bf0ea6b6ff3a494ba5ec0018bc72f98b87fbb8cac51ac2de15b3');
assert.equal(sha('assets/terrain/road_shoulders.png'),'0c6ec4699e0a81719b90cb7686176e3701a718a2cecd767bf96c4c068a702ea1');
for(const [file,meta] of Object.entries(manifest.files)){
  assert.equal(sha(file),meta.sha256,`protected ForgeRTS runtime changed: ${file}`);
  assert.equal(bytes(file).length,meta.bytes,`protected ForgeRTS runtime size changed: ${file}`);
}

assert.equal(world.id,'worldforge_greater_iron_valley');
assert.deepEqual(world.size,{width:2048,depth:1536});
assert.equal(world.world.phase,'regional-identity-0.2');
assert.equal(world.world.sectors.length,12);
assert.equal(world.world.regions.length,9);
assert.ok(world.terrain.biomeZones.length>=8);
assert.equal(world.world.protectedRects[0].width,768);
assert.equal(world.world.protectedRects[0].depth,576);
assert.deepEqual(world.world.protectedRects[0].protect,['expansion-landforms','expansion-road-grade','expansion-river-carve','biome-bias']);
assert.equal(world.objects.length,0,'regional skeleton must not add placed buildings yet');
assert.equal(world.players.length,0,'regional skeleton must not become a mission yet');
assert.equal(world.triggerAreas.length,0,'regional skeleton must not add mission triggers yet');
assert.equal(world.aiAnchors.length,0,'regional skeleton must not add mission AI anchors yet');
assert.equal(world.roads.length,18);
assert.equal(world.water.rivers.length,4);
assert.ok(world.terrain.landforms.expansion.ridges.length>=5);
assert.ok(world.terrain.landforms.expansion.valleys.length>=8);
assert.ok(world.terrain.landforms.expansion.plateaus.length>=7);
assert.ok(world.terrain.landforms.expansion.ramps.length>=5);

// Original authored content remains the exact foundation; Greater Iron Valley only appends to it.
assert.deepEqual(world.terrain.landforms.ridges,benchmark.terrain.landforms.ridges);
assert.deepEqual(world.terrain.landforms.valleys,benchmark.terrain.landforms.valleys);
assert.deepEqual(world.terrain.landforms.plateaus,benchmark.terrain.landforms.plateaus);
assert.deepEqual(world.terrain.landforms.pads,benchmark.terrain.landforms.pads);
assert.deepEqual(world.terrain.landforms.ramps,benchmark.terrain.landforms.ramps);
assert.deepEqual(world.roads.slice(0,benchmark.roads.length),benchmark.roads);
assert.deepEqual(world.water.rivers[0],benchmark.water.rivers[0]);
for(const r of world.roads.slice(benchmark.roads.length))assert.equal(r.expansionOnly,true,`${r.id} must be additive world infrastructure`);
for(const r of world.water.rivers.slice(1))assert.equal(r.expansionOnly,true,`${r.id} must be additive world hydrology`);

// Every world sector is a 512 m square and the 4x3 grid exactly spans the map.
const sectorKeys=new Set();
for(const s of world.world.sectors){
  assert.equal(s.xMax-s.xMin,512,`${s.id} width`);assert.equal(s.zMax-s.zMin,512,`${s.id} depth`);
  assert.ok(s.xMin>=-1024&&s.xMax<=1024,`${s.id} x bounds`);assert.ok(s.zMin>=-768&&s.zMax<=768,`${s.id} z bounds`);
  const key=`${s.xMin}:${s.zMin}`;assert.ok(!sectorKeys.has(key),`duplicate sector ${key}`);sectorKeys.add(key);
}
assert.equal(sectorKeys.size,12);

const coreTerrain=new StrategicTerrainSampler(benchmark);
const worldTerrain=new StrategicTerrainSampler(world);
const coreSurface=new TerrainSurfaceGenerator(benchmark,coreTerrain);
const worldSurface=new TerrainSurfaceGenerator(world,worldTerrain);

// The complete 768x576 benchmark core keeps exact raw/final heights. Derived slope
// samples inspect neighboring points, so their exact-protection audit uses a 4 m inset;
// this is larger than the 3.5 m slope stencil and still covers effectively the full core.
let maxRawHeightDelta=0,maxHeightDelta=0,maxSlopeDelta=0,maxSurfaceDelta=0,maxTintDelta=0;
for(let z=-288;z<=288;z+=8)for(let x=-384;x<=384;x+=8){
  maxRawHeightDelta=Math.max(maxRawHeightDelta,Math.abs(coreTerrain.rawHeightAt(x,z)-worldTerrain.rawHeightAt(x,z)));
  maxHeightDelta=Math.max(maxHeightDelta,Math.abs(coreTerrain.heightAt(x,z)-worldTerrain.heightAt(x,z)));
}
for(let z=-284;z<=284;z+=8)for(let x=-380;x<=380;x+=8){
  maxSlopeDelta=Math.max(maxSlopeDelta,Math.abs(coreTerrain.slopeDeg(x,z,3.5)-worldTerrain.slopeDeg(x,z,3.5)));
  const a=coreSurface.sample(x,z),b=worldSurface.sample(x,z);
  for(const k of ['grass','dirt','rock','wet','road','roadCore','moisture','slope'])maxSurfaceDelta=Math.max(maxSurfaceDelta,Math.abs(a[k]-b[k]));
  const ta=coreSurface.macroTint(x,z),tb=worldSurface.macroTint(x,z);for(let i=0;i<4;i++)maxTintDelta=Math.max(maxTintDelta,Math.abs(ta[i]-tb[i]));
}
assert.equal(maxRawHeightDelta,0);assert.equal(maxHeightDelta,0);assert.equal(maxSlopeDelta,0);assert.equal(maxSurfaceDelta,0);assert.equal(maxTintDelta,0);

// The changed surface generator must still reproduce the exact v0.13.30 benchmark samples.
const legacySamples=[];
for(let z=-250;z<=250;z+=50)for(let x=-350;x<=350;x+=50){
  const q=coreSurface.sample(x,z),m=coreSurface.macroTint(x,z);
  legacySamples.push([x,z,+coreTerrain.heightAt(x,z).toFixed(8),+coreTerrain.slopeDeg(x,z,3.5).toFixed(8),...['grass','dirt','rock','wet','road','roadCore','moisture'].map(k=>+q[k].toFixed(8)),...m.map(v=>+v.toFixed(8))]);
}
assert.equal(hashJson(legacySamples),'6db178943a90236d7410c1af76f0551a900272b32ef7385addbcb215238d8dc8');

// Roads join at explicit shared nodes instead of crossing with mismatched grade segments.
const roadById=Object.fromEntries(world.roads.map(r=>[r.id,r]));
const hasPoint=(road,x,z)=>road.points.some(p=>p.x===x&&p.z===z);
for(const [road,x,z] of [
  [roadById.north_pass_west_extension,-760,-505],[roadById.northern_military_road,-760,-505],
  [roadById.north_pass_east_extension,820,-505],[roadById.northern_military_road,820,-505],
  [roadById.south_flank_west_extension,-760,535],[roadById.southline_highway,-760,535],
  [roadById.south_flank_east_extension,760,545],[roadById.southline_highway,760,545]
])assert.ok(hasPoint(road,x,z),`${road.id} missing shared junction ${x},${z}`);

// All authored world routes must be driveable against the same sampler used by rendering.
const sampleRoute=(route,step=5)=>{let max=0;for(let i=0;i<route.points.length-1;i++){const a=route.points[i],b=route.points[i+1],L=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(L/step));for(let j=0;j<=n;j++){const q=j/n,x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q;max=Math.max(max,worldTerrain.slopeDeg(x,z,3));}}return max;};
const routeAudit=[];
for(const r of world.navigation.validationRoutes){const maxSlope=sampleRoute(r);routeAudit.push({id:r.id,maxSlope:+maxSlope.toFixed(2),limit:r.maxSlopeDeg});assert.ok(maxSlope<=r.maxSlopeDeg,`${r.id} max slope ${maxSlope.toFixed(2)} exceeds ${r.maxSlopeDeg}`);}
assert.ok(routeAudit.length>=17);

// Biome masks create distinct terrain families while using the same protected source materials.
const quarry=worldSurface.sample(650,-560),westfield=worldSurface.sample(-820,620),eastmere=worldSurface.sample(900,170),redmesa=worldSurface.sample(800,650);
assert.ok(quarry.rock>.25,'Blackstone should visibly bias toward rock');
assert.ok(westfield.grass>.90,'Westfield should remain broad grass/farmland');
assert.ok(eastmere.wet>.08,'Eastmere should carry wet-lowland material');
assert.ok(redmesa.dirt>.20&&redmesa.rock>.10,'Red Mesa should read drier and rockier');

console.log(JSON.stringify({ok:true,worldforge:'0.13.32',terrainWorkbench:'0.12.0',map:world.name,size:world.size,sectors:world.world.sectors.length,regions:world.world.regions.length,biomeZones:world.terrain.biomeZones.length,routes:`${routeAudit.length}/${routeAudit.length}`,protectedCore:{maxRawHeightDelta,maxHeightDelta,maxSlopeDelta,maxSurfaceDelta,maxTintDelta},protectedV9:true,protectedForgeRTS:true},null,2));
