import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const gen=fs.readFileSync(path.join(ROOT,'src/vehicle/vehicle-generator.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'src/app.js'),'utf8');

function parseGlb(file){
  const b=fs.readFileSync(file);
  assert.equal(b.toString('ascii',0,4),'glTF');
  assert.equal(b.readUInt32LE(8),b.length);
  let off=12,doc=null;
  while(off<b.length){
    const len=b.readUInt32LE(off),type=b.readUInt32LE(off+4);off+=8;
    const data=b.subarray(off,off+len);off+=len;
    if(type===0x4E4F534A)doc=JSON.parse(data.toString('utf8').trim());
  }
  assert.ok(doc,'GLB JSON missing');
  return doc;
}
function triCount(doc){
  let n=0;
  for(const mesh of doc.meshes||[])for(const prim of mesh.primitives||[]){
    const acc=doc.accessors?.[prim.indices];
    if(acc)n+=Math.floor(acc.count/3);
  }
  return n;
}
function nodeNames(doc){return new Set((doc.nodes||[]).map(n=>n.name).filter(Boolean));}

const hum=parseGlb(path.join(ROOT,'assets/aegis_hmmwv50_v2.glb'));
const heli=parseGlb(path.join(ROOT,'assets/aegis_talon_ahx.glb'));
const hn=nodeNames(hum),an=nodeNames(heli);
for(const name of ['VehicleRoot','ChassisRoot','BodyRoot','SteeringRoot_FL','SteeringRoot_FR','WheelSpinRoot_FL','WheelSpinRoot_FR','WheelSpinRoot_RL','WheelSpinRoot_RR','DoorRoot_FL','DoorRoot_FR','DoorRoot_RL','DoorRoot_RR','TurretRoot','GunPitchRoot','MuzzleSocket'])assert.ok(hn.has(name),`HMMWV missing ${name}`);
for(const name of ['AircraftRoot','FuselageRoot','MainRotorRoot','TailRotorRoot','SensorTurretRoot','GunYawRoot','GunPitchRoot','GunMuzzleSocket','Hardpoint_L_Inboard','Hardpoint_R_Inboard'])assert.ok(an.has(name),`AH-X missing ${name}`);
assert.equal(hum.meshes.length,336);
assert.equal(heli.meshes.length,127);
assert.equal(triCount(hum),7316);
assert.equal(triCount(heli),2900);
assert.match(gen,/AEGIS_REFERENCE_VEHICLES/);
assert.match(gen,/assets\/aegis_hmmwv50_v2\.glb/);
assert.match(gen,/assets\/aegis_talon_ahx\.glb/);
assert.match(gen,/applyAegisReferencePalette/);
assert.match(app,/isAegisReferenceVehicle/);
console.log(JSON.stringify({ok:true,hmmwv:{meshes:hum.meshes.length,triangles:triCount(hum)},attackHeli:{meshes:heli.meshes.length,triangles:triCount(heli)},articulated:true,paletteRecolor:true},null,2));
