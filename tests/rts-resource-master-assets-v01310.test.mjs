import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const lib=fs.readFileSync(path.join(root,'src/rts/rts-asset-library.js'),'utf8');
const map=fs.readFileSync(path.join(root,'src/rts-map/rts-map-forge.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');

const resources={
  rich:{
    rel:'assets/resources/worldforge_mineral_rich_crystal_cluster_v0.3_flatfacets.glb',
    sha:'3fe4ead89946b35403d28dab0c9549f3049a984681f286c0783de0e1959b8951',
    assetId:'richCrystalCluster',richness:'rich',capacity:1250
  },
  dense:{
    rel:'assets/resources/worldforge_mineral_dense_crystal_cluster_v0.1.glb',
    sha:'6f3a3a33049a764cc7bb1fbe3ce481b49f053c8e4c0785d142124fa7594bbcc0',
    assetId:'denseCrystalCluster',richness:'dense',capacity:3000
  }
};

function glbJson(file){
  const b=fs.readFileSync(file);assert.equal(b.toString('ascii',0,4),'glTF');
  const len=b.readUInt32LE(12),type=b.toString('ascii',16,20);assert.equal(type,'JSON');
  return JSON.parse(b.subarray(20,20+len).toString('utf8').trim());
}
for(const r of Object.values(resources)){
  const file=path.join(root,r.rel);assert.ok(fs.statSync(file).size>100000,`${r.rel} missing/too small`);
  const sha=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');assert.equal(sha,r.sha,`${r.rel} must remain byte-identical to approved GLB`);
  const j=glbJson(file),nodes=new Set((j.nodes||[]).map(n=>n.name));
  for(const n of ['WF_RESOURCE_ROOT','WF_RESOURCE_CENTER','WF_HARVEST_POINT','WF_DEPLETION_CENTER'])assert.ok(nodes.has(n),`${r.rel} missing ${n}`);
  assert.match(lib,new RegExp(`${r.assetId}.*richness:'${r.richness}'`,'s'));
  assert.match(lib,new RegExp(`defaultCapacity:${r.capacity}`));
}
assert.match(lib,/RTS_ASSET_LIBRARY_VERSION='0\.5\.1'/);
assert.match(lib,/MASTER_RESOURCES/);
assert.match(lib,/instantiateMasterResource/);
assert.match(lib,/masterResourceForRichness/);
assert.match(map,/RTS_MAP_FORGE_VERSION='0\.2\.9'/);
assert.match(map,/Exact approved Rich\/Dense masters now form multi-cluster resource fields/);
assert.doesNotMatch(map,/OctahedronGeometry/,'legacy resource placeholder geometry should be removed');
assert.match(map,/richness=densityRank<denseShare\?'dense':'rich'/);
assert.match(map,/depositCount:1/);
assert.match(map,/visualClusterCount:visualClusters\.length/);
assert.match(map,/new THREE\.InstancedMesh/);
assert.match(map,/richness==='dense'\?5\+Math\.floor\(random\(\)\*4\):3\+Math\.floor\(random\(\)\*3\)/);
assert.match(map,/awaitResourceAssets/);
assert.match(app,/logical fields · GPU-instanced/);
assert.match(html,/exact approved Rich v0\.3 and Dense v0\.1 crystal-cluster GLBs/);
assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.17'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(schema,/rtsAssetLibrary: '0\.5\.1'/);
console.log(JSON.stringify({ok:true,worldforge:'0.13.17',mapForge:'0.2.9',assetLibrary:'0.5.1',resources:['rich','dense'],multiClusterFields:true,gpuInstanced:true,placeholderGeometryRemoved:true,exactHashesVerified:true},null,2));
