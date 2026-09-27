import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
function glbJson(rel){
  const buf=fs.readFileSync(path.join(root,rel));assert.equal(buf.toString('ascii',0,4),'glTF',`${rel} not GLB`);
  let off=12;while(off<buf.length){const len=buf.readUInt32LE(off),type=buf.readUInt32LE(off+4);off+=8;const chunk=buf.subarray(off,off+len);off+=len;if(type===0x4E4F534A)return JSON.parse(chunk.toString('utf8').replace(/\u0000+$/,'').trim());}throw new Error(`${rel} missing JSON`);
}
function sha(rel){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');}
const refineryRel='assets/buildings/aegis_field_refinery_v2.glb', harvesterRel='assets/aegis_field_harvester_v2.glb';
assert.equal(sha(refineryRel),'f195487716d52a1bc29cb9360fe35832d43bba2410578fd66f238345bc9edab2','refinery must remain exact approved GLB');
assert.equal(sha(harvesterRel),'7485c6449fe7ac64eabc7f91d4bd920bc8ffeebf73a9521297e7500df0ba4c43','harvester must remain exact approved GLB');
const r=glbJson(refineryRel), h=glbJson(harvesterRel);
const rn=new Set((r.nodes||[]).map(n=>n.name).filter(Boolean)), hn=new Set((h.nodes||[]).map(n=>n.name).filter(Boolean));
for(const n of ['HarvesterQueueSocket','HarvesterApproachSocket','HarvesterDockSocket','HarvesterUnloadSocket','HarvesterExitSocket','HarvesterRallySocket','ApronFeederRoot','DustCollectorFanRoot'])assert.ok(rn.has(n),`refinery missing ${n}`);
for(const n of ['RefineryDockAlignSocket','BottomDumpSocket','DumpFXSocket','CollectorDrumRoot','IntakeBeltRoot','HopperDoorLeftRoot','HopperDoorRightRoot','FrontLeftSteerRoot','FrontRightSteerRoot'])assert.ok(hn.has(n),`harvester missing ${n}`);
for(const j of [r,h]){const mats=new Set((j.materials||[]).map(m=>m.name));for(const m of ['WF_TEAM_PRIMARY','WF_TEAM_SECONDARY','WF_TEAM_ACCENT'])assert.ok(mats.has(m),`missing team material ${m}`);}
const defs=fs.readFileSync(path.join(root,'src/rts/data/rts-definitions.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'src/rts/rts-asset-library.js'),'utf8');
const vehicle=fs.readFileSync(path.join(root,'src/vehicle/vehicle-generator.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(defs,/refinery:.*masterAsset:'fieldRefinery'.*starterUnit:'aegisHarvester'/s);
assert.match(defs,/aegisHarvester:Object\.freeze/);
assert.match(defs,/wheeledHeavy:Object\.freeze/);
assert.match(lib,/fieldRefinery:Object\.freeze/);
assert.match(vehicle,/fieldHarvester:/);
assert.match(vehicle,/aegis_field_harvester_v2\.glb/);
assert.match(sk,/_spawnStarterHarvesterForRefinery/);
assert.match(sk,/getObjectByName\('HarvesterDockSocket'\)/);
assert.match(sk,/getObjectByName\(def\.dockAlignSocket\|\|'RefineryDockAlignSocket'\)/);
assert.match(sk,/root\.rotation\.z=\(refinery\.components\.transform\.heading\|\|0\)\+Math\.PI/);
assert.match(sk,/starterUnitSpawned=true/);
assert.match(html,/Field Refinery · v2\.0/);
assert.match(html,/Aegis Field Harvester v2 · Refinery-Matched/);
assert.match(html,/id="skirmishSpawnHarvester"/);
console.log(JSON.stringify({ok:true,exactAssets:true,dockSocketPair:true,starterHarvester:true}));
