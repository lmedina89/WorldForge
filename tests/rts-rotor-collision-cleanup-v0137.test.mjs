import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

function readGlbJson(rel){
  const buf=fs.readFileSync(path.join(root,rel));
  assert.equal(buf.toString('ascii',0,4),'glTF',`${rel} is not GLB`);
  let off=12;
  while(off<buf.length){
    const len=buf.readUInt32LE(off),type=buf.readUInt32LE(off+4);off+=8;
    const chunk=buf.subarray(off,off+len);off+=len;
    if(type===0x4E4F534A)return JSON.parse(chunk.toString('utf8').replace(/\u0000+$/,'').trim());
  }
  throw new Error(`JSON chunk missing from ${rel}`);
}

const schema=read('src/core/schema.js');
const sk=read('src/rts/skirmish-test.js');
const forge=read('src/building/building-forge.js');
const defs=read('src/rts/data/rts-definitions.js');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.8'/);
assert.match(schema,/buildingForge: '0\.3\.1'/);
assert.match(schema,/skirmish: '0\.6\.3'/);
assert.match(sk,/SKIRMISH_VERSION='0\.6\.3'/);
assert.match(forge,/BUILDING_FORGE_VERSION='0\.3\.1'/);

// Functional-axis cleanup: main rotor remains Y; Talon tail rotor and flat rooftop fans use local Z.
assert.match(sk,/rotorMain\.rotation\.y\+=dt\*10\.8/);
assert.match(sk,/rotorTail\.rotation\.z\+=dt\*14\.4/);
assert.doesNotMatch(sk,/rotorTail\.rotation\.x\+=/);
assert.match(sk,/for\(const f of v\.functional\.fans\)f\.rotation\.z\+=dt\*4\.2/);
assert.match(sk,/dustFan\.rotation\.z\+=dt\*9\.6/);
assert.match(forge,/CoolingFanRoot_\$\{i\}`\);if\(fan\)fan\.rotation\.z\+=dt\*4\.2/);
assert.match(forge,/DustCollectorFanRoot'\);if\(dustFan\)dustFan\.rotation\.z\+=dt\*9\.6/);

// GLB authoring confirms why those axes are correct.
const talon=readGlbJson('assets/aegis_talon_ahx.glb');
const tBy=new Map(talon.nodes.map((n,i)=>[n.name,i]));
const tail=talon.nodes[tBy.get('TailRotorRoot')];
assert.ok(tail,'TailRotorRoot missing');
assert.ok(tail.children?.some(i=>/TailRotorBlade_/.test(talon.nodes[i].name||'')),'tail rotor blades missing');
const main=talon.nodes[tBy.get('MainRotorRoot')];
assert.ok(main.children?.some(i=>/MainRotorBlade_/.test(talon.nodes[i].name||'')),'main rotor blades missing');

const power=readGlbJson('assets/buildings/aegis_field_power_node_v1.glb');
const pNames=new Set(power.nodes.map(n=>n.name));
assert.ok(pNames.has('CoolingFanRoot_1')&&pNames.has('CoolingFanRoot_2'),'Power Node cooling fan roots missing');
const refinery=readGlbJson('assets/buildings/aegis_field_refinery_v2.glb');
assert.ok(refinery.nodes.some(n=>n.name==='DustCollectorFanRoot'),'Refinery dust fan root missing');

// Building placement now uses rectangle SAT instead of diagonal collision circles.
assert.match(sk,/_rectsOverlap\(a,b,gap=1\.25\)/);
assert.match(sk,/_buildingCollisionRect\(e\)/);
assert.match(sk,/_rectOverlapDepth\(a,b,gap=0\)/);
assert.match(sk,/collisionFootprint/);
assert.doesNotMatch(sk,/Math\.hypot\(def\.footprint\[0\],def\.footprint\[1\]\)\*\.48/);
assert.doesNotMatch(sk,/Math\.hypot\(fp\[0\],fp\[1\]\)\*\.46\+3/);
assert.match(sk,/_unitCollisionRect\(e,x=null,y=null,heading=null\)/);
assert.match(sk,/ignoreBuildingId:move\.exitBuildingId|move\.exitBuildingId/);

for(const id of ['constructionYard','powerPlant','refinery','barracks','vehicleFactory','gunTurret']){
  assert.match(defs,new RegExp(`${id}:Object\\.freeze\\(\\{[^}]*collisionFootprint:`,'s'),`${id} missing tuned collisionFootprint`);
}

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.8',
  skirmish:'0.6.3',
  tailRotorAxis:'z',
  coolingFanAxis:'z',
  dustFanAxis:'z',
  buildingCollision:'oriented-rectangle',
  placementCollision:'oriented-rectangle',
  glbRebuilds:false
},null,2));
