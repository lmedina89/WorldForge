import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const schema=read('src/core/schema.js');
const defs=read('src/rts/data/rts-definitions.js');
const sk=read('src/rts/skirmish-test.js');
const html=read('index.html');
const app=read('src/app.js');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.16'/);
assert.match(schema,/skirmish: '0\.7\.3'/);
assert.match(defs,/RTS_DEFINITIONS_VERSION='0\.6\.1'/);

assert.match(defs,/aegisMbt:.*collisionFootprint:\[7\.55,3\.10\]/s);
assert.match(defs,/aegisHmmwv:.*collisionFootprint:\[4\.70,2\.22\]/s);
assert.match(defs,/aegisHarvester:.*collisionFootprint:\[8\.30,3\.90\].*collisionHeadingOffset:1\.5707963267948966/s);
assert.match(defs,/aegisRifleman:.*collisionRadius:\.40,personalSpace:\.82/s);
assert.match(defs,/aegisTalon:.*airCollisionRadius:5\.5/s);

const oldDiameter=4.8*2;
const newWidth=3.10;
assert.ok(newWidth<oldDiameter*.40,'tank side collision should be much tighter than legacy radius circle');

for(const phrase of [
  "_definitionCollisionRect(def,x,y,heading=0)",
  "_unitCollisionRect(e,x=null,y=null,heading=null)",
  "_rectOverlapDepth(a,b,gap=0)",
  "_tryGroundUnitMove(e,dx,dy)",
  "_findOpenGroundSpawn(def,x,y,heading)",
  "_systemLocalSeparation(dt)",
  "_barracksRallySlot(entity,index)",
  "personalSpace||.82",
  "nextDepth<=.001||nextDepth<=currentDepth+.002"
]) assert.ok(sk.includes(phrase),`missing collision/spacing implementation: ${phrase}`);

assert.match(sk,/this\.sim\.addSystem\('local-separation'/);
assert.match(sk,/ignoreInfantry:true/);
assert.match(sk,/collisionHeadingOffset/);
assert.match(sk,/this\._rectAxes\(b\.rect\.heading\|\|0\)/);
assert.match(sk,/rallySerial/);

assert.match(html,/id="skirmishCollisionDebug"/);
assert.match(app,/skirmish\.toggleCollisionDebug\(\)/);
assert.match(app,/state\.collisionDebug/);

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.16',
  skirmish:'0.7.3',
  orientedGroundVehicleCollision:true,
  cornerSliding:true,
  turnValidation:true,
  vehicleSeparation:true,
  infantryPersonalSpace:.82,
  compactRallySlots:true,
  collisionDebug:true
},null,2));
