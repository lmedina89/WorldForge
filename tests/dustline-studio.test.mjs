import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const studio=fs.readFileSync(path.join(root,'dustline-studio.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dir=path.join(root,'assets/dustline');
const map=JSON.parse(fs.readFileSync(path.join(dir,'map.json'),'utf8'));
const asset=x=>path.join(dir,x);

test('WorldForge entry links to a standalone, non-breaking Dustline editor',()=>{
  assert.match(index,/id="dustlineStudioLink"/);
  assert.match(index,/href="\.\/dustline-studio.html"/);
  assert.match(studio,/id="studioPanel"/);
  assert.match(studio,/id="studioToggle"/);
  assert.match(studio,/worldforge\.dustline-edit\.v1/);
});
test('Original source map and 2048p texture are retained',()=>{
  assert.equal(map.bounds_m.max_x-map.bounds_m.min_x,64);
  assert.equal(map.bounds_m.max_z-map.bounds_m.min_z,64);
  for(const p of [map.terrainMesh,map.albedo,map.normal,map.roughness,map.ambientOcclusion,map.splatmap.file,map.heightmap.file]){
    assert.ok(fs.statSync(asset(p)).size>1000,`${p} is missing or empty`);
  }
  const b=fs.readFileSync(asset(map.albedo));
  assert.equal(b.readUInt32BE(16),2048);assert.equal(b.readUInt32BE(20),2048);
});
test('All referenced master GLBs are present and valid GLB files',()=>{
  for(const p of [...map.placements.map(p=>'assets/models/'+p.asset), 'assets/models/environment/Dustline_RubbleCluster_A_YUp.glb','assets/models/environment/Dustline_BrokenWall_YUp.glb','assets/models/environment/Dustline_BurnedCar_YUp.glb','assets/models/environment/Dustline_UtilityPole_YUp.glb']){
    const b=fs.readFileSync(asset(p));
    assert.equal(b.toString('ascii',0,4),'glTF',p);
    assert.equal(b.readUInt32LE(8),b.length,p);
  }
});
test('Interactive editing & export controls are wired',()=>{
  for(const id of ['paintLayer','sculptType','assetPick','studioPanel','rotateChosen','removeChosen','undoEdit','resetEdit','saveProject','loadProject','saveColor','saveHeights','projectFile'])
    assert.match(studio,new RegExp(`id="${id}"`));
  for(const fn of ['function wireStudio','function restoreProject','function prepareEditTerrain','function rebuildPaint','function rebuildSculpt','function groundHit','function modelHit'])
    assert.ok(studio.includes(fn),`Missing ${fn}`);
  for(const tool of ['view','paint','sculpt','place','move','erase'])
    assert.ok(studio.includes(`data-tool="${tool}"`),tool);
});
test('Editor preserves original shading & 16-direction Vehicle Baker entry',()=>{
  assert.match(studio,/normalMap:normal/);
  assert.match(studio,/roughnessMap:rough/);
  assert.match(studio,/aoMap:ao/);
  assert.match(studio,/terrain_basecolor_2048\.png/);
  assert.ok(fs.existsSync(path.join(root,'src/vehicle/vehicle-baker.js')));
  assert.match(fs.readFileSync(path.join(root,'src/vehicle/vehicle-baker.js'),'utf8'),/turretSpritePivotPxByDirection/);
});
