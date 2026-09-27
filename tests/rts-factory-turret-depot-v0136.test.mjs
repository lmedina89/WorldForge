import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

function readGlb(rel){
  const buf=fs.readFileSync(path.join(root,rel));
  assert.equal(buf.toString('ascii',0,4),'glTF',`${rel} not GLB`);
  let off=12,json=null,bin=null;
  while(off<buf.length){
    const len=buf.readUInt32LE(off),type=buf.readUInt32LE(off+4);off+=8;
    const chunk=buf.subarray(off,off+len);off+=len;
    if(type===0x4E4F534A)json=JSON.parse(chunk.toString('utf8').replace(/\u0000+$/,'').trim());
    if(type===0x004E4942)bin=chunk;
  }
  return {json,bin};
}

function sceneBounds({json,bin}){
  const mins=[],maxs=[];
  function posAccessor(ai){
    const a=json.accessors[ai],bv=json.bufferViews[a.bufferView],bo=(bv.byteOffset||0)+(a.byteOffset||0);
    return new Float32Array(bin.buffer,bin.byteOffset+bo,a.count*3);
  }
  function walk(ni,parent=[0,0,0]){
    const n=json.nodes[ni],t=n.translation||[0,0,0],world=[parent[0]+t[0],parent[1]+t[1],parent[2]+t[2]];
    if(n.mesh!==undefined){
      for(const prim of json.meshes[n.mesh].primitives){
        const arr=posAccessor(prim.attributes.POSITION);
        let mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];
        for(let i=0;i<arr.length;i+=3){
          for(let k=0;k<3;k++){const v=arr[i+k]+world[k];mn[k]=Math.min(mn[k],v);mx[k]=Math.max(mx[k],v);}
        }
        mins.push(mn);maxs.push(mx);
      }
    }
    for(const ci of n.children||[])walk(ci,world);
  }
  for(const ri of json.scenes[json.scene||0].nodes)walk(ri);
  const mn=[0,1,2].map(k=>Math.min(...mins.map(v=>v[k])));
  const mx=[0,1,2].map(k=>Math.max(...maxs.map(v=>v[k])));
  return mx.map((v,k)=>v-mn[k]);
}

const schema=read('src/core/schema.js');
const defs=read('src/rts/data/rts-definitions.js');
const lib=read('src/rts/rts-asset-library.js');
const sk=read('src/rts/skirmish-test.js');
const html=read('index.html');
const app=read('src/app.js');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.13'/);
assert.match(schema,/rtsAssetLibrary: '0\.5\.1'/);
assert.match(schema,/skirmish: '0\.7\.0'/);
assert.match(defs,/vehicleFactory:.*masterAsset:'fieldVehicleFactory'/s);
assert.match(defs,/gunTurret:.*masterAsset:'guardianTurret'/s);
assert.match(lib,/fieldVehicleFactory/);
assert.match(lib,/guardianTurret/);

const factory=readGlb('assets/buildings/aegis_vehicle_factory_v021.glb');
const turret=readGlb('assets/buildings/aegis_guardian_turret_v031.glb');
const factoryNames=new Set(factory.json.nodes.map(n=>n.name));
const turretNames=new Set(turret.json.nodes.map(n=>n.name));

for(const n of ['AegisVehicleFactoryRoot','WF_SPAWN_VEHICLE','WF_ENTRY','WF_EXIT_PATH_0','WF_EXIT_PATH_1','WF_EXIT_PATH_2','WF_RALLY','WF_SERVICE_BAY','WF_DOOR_CENTER'])
  assert.ok(factoryNames.has(n),`factory missing ${n}`);
for(const n of ['GuardianTurretRoot','TurretRoot','GunPitchRoot','MuzzleSocket','SensorSocket','WF_CONSTRUCTION','WF_DAMAGE_CENTER'])
  assert.ok(turretNames.has(n),`turret missing ${n}`);

const fb=sceneBounds(factory),tb=sceneBounds(turret);
// Correct game-ready glTF convention: Y is vertical before WorldForge's standard import wrapper.
assert.ok(fb[0]>28&&fb[0]<31&&fb[1]>7&&fb[1]<9&&fb[2]>21&&fb[2]<24,`factory Y-up dimensions wrong: ${fb}`);
assert.ok(tb[0]>8&&tb[0]<10&&tb[1]>4&&tb[1]<6&&tb[2]>8&&tb[2]<10,`turret Y-up dimensions wrong: ${tb}`);

const tByName=new Map(turret.json.nodes.map((n,i)=>[n.name,i]));
assert.ok(turret.json.nodes[tByName.get('GunPitchRoot')].children.includes(tByName.get('MuzzleSocket')),'muzzle must pitch with gun');
assert.ok(!turret.json.nodes[tByName.get('TurretRoot')].children.includes(tByName.get('MuzzleSocket')),'muzzle must not bypass GunPitchRoot');

for(const id of ['skirmishDrawerSpawnHmmwv','skirmishDrawerSpawnTalon','skirmishDrawerSpawnHarvester'])
  assert.match(html,new RegExp(`id="${id}"`),`fullscreen deploy control missing ${id}`);
assert.match(app,/skirmishDrawerSpawnHmmwv/);
assert.match(app,/skirmishDrawerSpawnTalon/);
assert.match(app,/skirmishDrawerSpawnHarvester/);
assert.match(app,/deploySkirmishSupport/);
assert.match(sk,/await this\._spawnTrainingTarget\(\)/);
assert.match(sk,/ENEMY_GuardianTurret/);

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.13',
  skirmish:'0.7.0',
  factoryMaster:true,
  guardianTurretMaster:true,
  gameReadyYUp:true,
  muzzleHierarchy:true,
  fullscreenVehicleDepot:true
},null,2));
