import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.23'/);
assert.match(schema,/skirmish: '0\.7\.7'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(sk,/SKIRMISH_VERSION='0\.7\.7'/);

for(const phrase of [
  'harvesterDockProfile',
  'HarvesterApproachSocket',
  'HarvesterExitSocket',
  'HarvesterRallySocket',
  '_routeBlockRects(e',
  '_segmentClearForUnit(e',
  '_nearestOpenUnitDestination(e',
  '_planGroundRoute(e',
  '_containingBuilding(e)',
  '_findBuildingEgressPoint(e',
  'exitBuildingUntilIndex',
  're-routing to the requested destination',
  "r.state==='docking'"
]) assert.ok(sk.includes(phrase),`missing base-egress/order feature: ${phrase}`);

assert.match(sk,/_startControlledEgress\(e,factory,corridor,rally/);
assert.match(sk,/controlledEgress:true/);
assert.match(sk,/dockState=.*departing.*docking.*unloading/s);
assert.match(html,/id="skirmishCommandHint"/);
assert.match(app,/skirmishCommandHint/);
assert.match(app,/state\.commandHint/);
assert.match(css,/\.skirmishCommandHint/);
assert.match(sk,/HARVESTER: TAP CRYSTALS = HARVEST · TAP TERRAIN = MOVE/);
assert.match(sk,/nearest traversable ground|No traversable destination|_nearestOpenUnitDestination/);

console.log(JSON.stringify({ok:true,worldforge:'0.13.23',skirmish:'0.7.7',mapForge:'0.2.9',buildingAwareOrders:true,refineryEgress:true,factoryEgressRecovery:true,stuckRepath:true,mobileCommandHint:true},null,2));
