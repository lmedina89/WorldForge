import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RTS_DEFINITIONS_VERSION, UNIT_DEFINITIONS } from '../src/rts/data/rts-definitions.js';

const root=path.resolve(import.meta.dirname,'..');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const map=fs.readFileSync(path.join(root,'src/rts-map/rts-map-forge.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.25'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(schema,/skirmish: '0\.7\.7'/);
assert.equal(RTS_DEFINITIONS_VERSION,'0.6.1');

assert.match(map,/RTS_MAP_FORGE_VERSION='0\.2\.9'/);
assert.match(map,/road\.gradeAt=/,'authoritative road-grade function missing');
assert.match(map,/roadSurfaces/,'road surface registry missing');
assert.match(map,/roadLift=\.025/,'road render bias should stay tiny');
assert.match(map,/shoulderLift=\.008/,'road shoulder should stay nearly flush');
assert.match(map,/if\(best\)return best\.gradeAt\(x\)\+\(best\.topOffset\|\|\.025\)/,'unit surface height is not using the rendered road top');
assert.doesNotMatch(map,/biome\.road,\.18/,'legacy large road lift still present');

assert.match(sk,/SKIRMISH_VERSION='0\.7\.7'/);
assert.equal(UNIT_DEFINITIONS.aegisMbt.cost,1100);
assert.equal(UNIT_DEFINITIONS.aegisHmmwv.cost,450);
assert.equal(UNIT_DEFINITIONS.aegisHarvester.cost,800);
assert.equal(UNIT_DEFINITIONS.aegisMbt.buildSeconds,8);
assert.equal(UNIT_DEFINITIONS.aegisHmmwv.buildSeconds,4);
assert.equal(UNIT_DEFINITIONS.aegisHarvester.buildSeconds,6);
for(const phrase of [
  'produceVehicle(unitType)',
  '_factoryExitProfile(factory)',
  '_factoryRallySlot(factory,index)',
  '_spawnFactoryVehicleEntity(factory,unitType)',
  "buildingType==='vehicleFactory'",
  "['barracks','vehicleFactory']",
  "ev.type==='spawnSupportUnit'",
  "_startControlledEgress(e,factory,corridor,rally"
]) assert.ok(sk.includes(phrase),`missing vehicle production feature: ${phrase}`);
assert.match(sk,/WF_EXIT_PATH_0/);
assert.match(sk,/WF_EXIT_PATH_1/);
assert.match(sk,/WF_EXIT_PATH_2/);
assert.match(app,/queueSkirmishVehicle/);
assert.match(html,/BUILD AEGIS-X/);
assert.match(html,/BUILD HMMWV-50/);
assert.match(html,/BUILD HARVESTER/);

console.log(JSON.stringify({ok:true,worldforge:'0.13.25',mapForge:'0.2.9',skirmish:'0.7.7',definitions:'0.6.1',roadGrounding:true,vehicleFactoryProduction:true,exactFactoryExitSockets:true},null,2));
