import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { StrategicTerrainSampler } from '../src/game-terrain/strategic-terrain-sampler.js';
import { TerrainSurfaceGenerator } from '../src/game-terrain/terrain-surface-generator.js';
const text=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=p=>crypto.createHash('sha256').update(bytes(p)).digest('hex');
const hashJson=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const canonicalHash=v=>crypto.createHash('sha256').update(JSON.stringify(v,Object.keys(v).sort())).digest('hex');
const map=JSON.parse(text('assets/game-terrain/worldforge_greater_iron_valley.json'));
const benchmark=JSON.parse(text('assets/game-terrain/worldforge_curated_battlefield.json'));
const manifest=JSON.parse(text('assets/game-terrain/runtime-sync-manifest.json'));
assert.match(text('src/core/schema.js'),/WORLDFORGE_VERSION = '0\.13\.32'/);
assert.match(text('src/game-terrain/terrain-workbench.js'),/GAME_TERRAIN_WORKBENCH_VERSION='0\.12\.0'/);
assert.match(text('index.html'),/GREATER IRON VALLEY 0\.2/);
assert.match(text('index.html'),/gameTerrainWorldPlan/);
assert.match(text('src/game-terrain/terrain-workbench.js'),/_buildWorldPlanDebug/);
assert.equal(map.version,2);assert.equal(map.world.phase,'regional-identity-0.2');
assert.deepEqual(map.size,{width:2048,depth:1536});
assert.equal(map.world.regions.length,9);assert.equal(map.world.sectors.length,12);
assert.equal(map.terrain.biomeZones.length,14);
assert.equal(map.world.naturalLandmarks.length,8);
assert.equal(map.world.poiFootprints.length,12);
assert.equal(map.world.bridgeSites.length,4);
assert.equal(map.world.railCorridors.length,2);
assert.equal(map.world.combatSpaces.length,9);
assert.equal(map.objects.length,0);assert.equal(map.players.length,0);assert.equal(map.triggerAreas.length,0);assert.equal(map.aiAnchors.length,0);
// v0.13.30 visual/runtime foundation is still protected.
for(const [p,h] of [
 ['src/game-terrain/terrain-renderer-v8.js','d36c8dd59d1fd1d9bed4430d823f7e63c633a3807a47ce92295074edcdc2162d'],
 ['src/game-terrain/terrain-renderer-v9.js','52ecf52ac9414045009d2c1efd7c70717eb74407698a573f72dcadbe42e4a21e'],
 ['src/game-terrain/terrain-sampler.js','d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a'],
 ['assets/game-terrain/worldforge_curated_battlefield.json','e33821b0a9aaaf2c23ad0e0fc1471e965b26e72391ed6ffbfb2341a5d8171fa1'],
 ['assets/game-terrain/forgerts_training_ground.json','b7f54a9792e6df5e90b635a7fe02b6d3e6ad3e2bbe5f0dfc6f0eba8e66c9bfc9'],
 ['assets/terrain/road_compacted_dirt.png','3b1ef98b6bd4bf0ea6b6ff3a494ba5ec0018bc72f98b87fbb8cac51ac2de15b3'],
 ['assets/terrain/road_shoulders.png','0c6ec4699e0a81719b90cb7686176e3701a718a2cecd767bf96c4c068a702ea1']]) assert.equal(sha(p),h,`protected file changed ${p}`);
for(const [file,meta] of Object.entries(manifest.files)){assert.equal(sha(file),meta.sha256);assert.equal(bytes(file).length,meta.bytes);}
// Road and hydrology meshes from the approved 0.1 skeleton remain unchanged.
const stableString=v=>JSON.stringify(v,Object.keys(v).sort());
// Compare exact arrays to frozen release hashes using ordinary JSON serialization order from the release.
assert.equal(crypto.createHash('sha256').update(JSON.stringify(map.roads)).digest('hex'),'984ec0b379bb21637b9a8bcee8d92f5edc692b82c1c9052dcd40bb46e5d4818e');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(map.water.rivers)).digest('hex'),'dc29dd4475141ff701c09a6834ecb7775c9c3413d3606b2d0df11d1fbfc26141');
assert.deepEqual(map.terrain.landforms.ridges,benchmark.terrain.landforms.ridges);
assert.deepEqual(map.terrain.landforms.valleys,benchmark.terrain.landforms.valleys);
assert.deepEqual(map.terrain.landforms.plateaus,benchmark.terrain.landforms.plateaus);
assert.deepEqual(map.terrain.landforms.pads,benchmark.terrain.landforms.pads);
assert.deepEqual(map.terrain.landforms.ramps,benchmark.terrain.landforms.ramps);
const coreT=new StrategicTerrainSampler(benchmark), worldT=new StrategicTerrainSampler(map),coreS=new TerrainSurfaceGenerator(benchmark,coreT),worldS=new TerrainSurfaceGenerator(map,worldT);
let dh=0,ds=0,dw=0,dt=0;
for(let z=-288;z<=288;z+=8)for(let x=-384;x<=384;x+=8)dh=Math.max(dh,Math.abs(coreT.heightAt(x,z)-worldT.heightAt(x,z)));
for(let z=-284;z<=284;z+=8)for(let x=-380;x<=380;x+=8){ds=Math.max(ds,Math.abs(coreT.slopeDeg(x,z,3.5)-worldT.slopeDeg(x,z,3.5)));const a=coreS.sample(x,z),b=worldS.sample(x,z);for(const k of ['grass','dirt','rock','wet','road','roadCore','moisture','slope'])dw=Math.max(dw,Math.abs(a[k]-b[k]));const ta=coreS.macroTint(x,z),tb=worldS.macroTint(x,z);for(let i=0;i<4;i++)dt=Math.max(dt,Math.abs(ta[i]-tb[i]));}
assert.equal(dh,0);assert.equal(ds,0);assert.equal(dw,0);assert.equal(dt,0);
const sampleRoute=(route,step=5)=>{let max=0;for(let i=0;i<route.points.length-1;i++){const a=route.points[i],b=route.points[i+1],L=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(L/step));for(let j=0;j<=n;j++){const q=j/n,x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q;max=Math.max(max,worldT.slopeDeg(x,z,3));}}return max;};
for(const r of map.navigation.validationRoutes){const max=sampleRoute(r);assert.ok(max<=r.maxSlopeDeg,`${r.id}: ${max.toFixed(2)} > ${r.maxSlopeDeg}`);}assert.equal(map.navigation.validationRoutes.length,23);
// Region identity is materially different while using the same four source materials.
const p=worldS.sample(-820,-625),n=worldS.sample(20,-650),q=worldS.sample(760,-555),e=worldS.sample(850,175),w=worldS.sample(-810,590),r=worldS.sample(830,625);
assert.ok(p.grass>.75&&p.rock>.06,'Pinebreak should stay greener but broken/highland');
assert.ok(n.rock>.20,'Northwatch crown should read rocky');
assert.ok(q.rock>.28,'Blackstone should read strongly rocky');
assert.ok(e.wet>.15,'Eastmere marsh should read wet');
assert.ok(w.grass>.85,'Westfield should read fertile/open');
assert.ok(r.dirt>.15&&r.rock>.30,'Red Mesa should read dry/rocky');
// Bridge-site coordinates must sit on both their referenced road and river centerlines within a few meters.
const segDist=(p,a,b)=>{const vx=b.x-a.x,vz=b.z-a.z,wx=p.x-a.x,wz=p.z-a.z,vv=vx*vx+vz*vz||1,t=Math.max(0,Math.min(1,(wx*vx+wz*vz)/vv)),x=a.x+vx*t,z=a.z+vz*t;return Math.hypot(p.x-x,p.z-z)};
const pathDist=(p,pts)=>Math.min(...pts.slice(0,-1).map((a,i)=>segDist(p,a,pts[i+1])));
const roads=Object.fromEntries(map.roads.map(x=>[x.id,x])),rivers=Object.fromEntries(map.water.rivers.map(x=>[x.id,x]));
for(const b of map.world.bridgeSites){assert.ok(pathDist(b,roads[b.roadId].points)<3,`${b.id} road mismatch`);assert.ok(pathDist(b,rivers[b.riverId].points)<3,`${b.id} river mismatch`);}
// Planning envelopes remain outside the protected core and do not place gameplay entities yet.
const core=map.world.protectedRects[0],inside=(x,z)=>Math.abs(x-core.x)<=core.width/2&&Math.abs(z-core.z)<=core.depth/2;
for(const p of map.world.poiFootprints)assert.equal(inside(p.x,p.z),false,`${p.id} center inside protected core`);
for(const rail of map.world.railCorridors)for(const p of rail.points)assert.equal(inside(p.x,p.z),false,`${rail.id} enters protected core`);
console.log(JSON.stringify({ok:true,worldforge:'0.13.32',terrainWorkbench:'0.12.0',routes:'23/23',biomes:14,landmarks:8,poiFootprints:12,bridges:4,railCorridors:2,protectedCore:true,protectedV9:true,protectedForgeRTS:true},null,2));
