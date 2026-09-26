import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'src/app.js'),'utf8');
const baker=fs.readFileSync(path.join(ROOT,'src/vehicle/vehicle-baker.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'style.css'),'utf8');
const glb=fs.readFileSync(path.join(ROOT,'assets/low_poly_btr_82.glb'));

assert.match(html,/data-mode="vehicle"/);
assert.match(css,/\[hidden\]\{display:none!important\}/,'styled hidden elements must remain hidden');
for(const id of ['vehiclePanel','vehicleLoadBenchmark','vehicleImport','vehicleDirection','vehicleFrameSize','vehicleForwardOffset','vehicleBake','vehicleExportMeta'])assert.match(html,new RegExp(`id="${id}"`));
assert.match(app,/VehicleBaker/);
assert.match(baker,/VEHICLE_BAKER_VERSION = '0\.1\.0'/);
assert.match(baker,/\{ id:'N'/);
assert.match(baker,/\{ id:'NW'/);

assert.equal(glb.toString('ascii',0,4),'glTF');
const total=glb.readUInt32LE(8);assert.equal(total,glb.length);
let offset=12,doc=null;
while(offset<glb.length){
  const len=glb.readUInt32LE(offset),type=glb.readUInt32LE(offset+4);offset+=8;
  const data=glb.subarray(offset,offset+len);offset+=len;
  if(type===0x4E4F534A)doc=JSON.parse(data.toString('utf8').trim());
}
assert.ok(doc,'GLB JSON chunk missing');
assert.ok(!doc.extensionsRequired?.includes('KHR_materials_pbrSpecularGlossiness'),'benchmark still requires unsupported spec/gloss extension');
assert.ok(!doc.extensionsUsed?.includes('KHR_materials_pbrSpecularGlossiness'),'benchmark still declares unsupported spec/gloss extension');
assert.equal(doc.meshes?.length,199);
assert.equal(doc.materials?.length,10);
assert.equal(doc.textures?.length,11);
assert.equal(doc.animations?.length,1);
assert.ok(doc.materials.every(m=>m.pbrMetallicRoughness),'all benchmark materials must use metallic/roughness');

console.log(JSON.stringify({ok:true,vehicleBaker:'0.1.0',benchmarkMeshes:doc.meshes.length,materials:doc.materials.length,textures:doc.textures.length,animations:doc.animations.length,directions:8},null,2));
