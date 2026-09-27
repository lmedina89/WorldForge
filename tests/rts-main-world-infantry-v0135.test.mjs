import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

function readGlbJson(rel){
  const buf=fs.readFileSync(path.join(root,rel));
  assert.ok(buf.length>64,`${rel} too small`);
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
const map=read('src/rts-map/rts-map-forge.js');
const defs=read('src/rts/data/rts-definitions.js');
const lib=read('src/rts/rts-asset-library.js');
const sk=read('src/rts/skirmish-test.js');
const html=read('index.html');
const app=read('src/app.js');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.19'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(schema,/rtsAssetLibrary: '0\.5\.1'/);
assert.match(schema,/skirmish: '0\.7\.6'/);

assert.match(map,/RTS_MAP_FORGE_VERSION='0\.2\.9'/);
assert.match(map,/Number\(input\.size\)\)\?Number\(input\.size\):1536/);
assert.match(map,/x:-H\*\.68/);
assert.match(map,/startRingRadius=size\*\.140/);
assert.match(map,/d<size\*\.085/);
assert.match(map,/size\*\.105/);
assert.match(map,/this\.roadFns\.some\(fn=>Math\.abs\(y-fn\(x\)\)/);
assert.match(map,/clearRadius:/);
assert.match(html,/value="1536" selected>Main World/);
assert.match(html,/value="fortified" selected>Mountain Bowl/);
assert.match(app,/size:\+\$\('mapSize'\)\.value\|\|1536/);
assert.match(app,/MAIN_WORLD_RTS_RECIPE/);
assert.match(app,/seed:731904,size:1536,players:4,biome:'temperate'/);
assert.match(app,/if\(!isMainWorldRecipe\(rtsMapForge\.recipe\)\)/);

const barracksRel='assets/buildings/aegis_field_barracks_v023.glb';
const rifleRel='assets/infantry/aegis_rifleman_v03.glb';
assert.ok(fs.statSync(path.join(root,barracksRel)).size>250000,'Barracks master missing/too small');
assert.ok(fs.statSync(path.join(root,rifleRel)).size>70000,'Rifleman asset missing/too small');

const barracks=readGlbJson(barracksRel);
const bNodes=new Set((barracks.nodes||[]).map(n=>n.name));
for(const n of ['FieldBarracksRoot','WF_SPAWN_INFANTRY','WF_ENTRY','WF_EXIT_PATH_0','WF_EXIT_PATH_1','WF_EXIT_PATH_2','WF_RALLY'])assert.ok(bNodes.has(n),`Barracks node missing ${n}`);
const bMats=new Set((barracks.materials||[]).map(m=>m.name));
for(const m of ['WF_BASE_ARMOR','WF_TEAM_PRIMARY','WF_TEAM_SECONDARY','WF_TEAM_ACCENT'])assert.ok(bMats.has(m),`Barracks material missing ${m}`);

const rifle=readGlbJson(rifleRel);
const clips=new Set((rifle.animations||[]).map(a=>a.name));
assert.ok(clips.has('CombatWalk'),'Rifleman CombatWalk clip missing');
assert.ok(clips.has('AimFire'),'Rifleman AimFire clip missing');

assert.match(defs,/barracks:.*masterAsset:'fieldBarracks'/s);
assert.match(defs,/infantryLight/);
assert.match(defs,/aegisRifle/);
assert.match(defs,/aegisRifleman/);
assert.match(lib,/fieldBarracks/);
assert.match(lib,/aegis_field_barracks_v023\.glb/);

assert.match(sk,/SKIRMISH_VERSION='0\.7\.6'/);
assert.match(sk,/RTS_COMMANDS\.PRODUCE/);
assert.match(sk,/trainRifleman\(\)/);
assert.match(sk,/_systemProduction\(dt\)/);
assert.match(sk,/_systemInfantryLocomotion\(dt\)/);
assert.match(sk,/_systemInfantryCombat\(dt\)/);
assert.match(sk,/spawnRifleman/);
assert.match(sk,/CombatWalk|walkClip/);
assert.match(sk,/AimFire|fireClip/);

for(const id of ['skirmishTrainRifleman','skirmishTrainRiflemanPanel'])assert.match(html,new RegExp(`id="${id}"`));
assert.match(html,/Field Barracks · v0\.2\.3/);
assert.match(app,/skirmish\.trainRifleman/);

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.19',
  mapForge:'0.2.9',
  skirmish:'0.7.6',
  mainWorldMeters:1536,
  barracksMaster:true,
  animatedRifleman:true,
  productionExitPath:true
},null,2));
