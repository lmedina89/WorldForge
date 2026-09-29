import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const sk=read('src/rts/skirmish-test.js');
const schema=read('src/core/schema.js');
const html=read('index.html');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.26'/);
assert.match(schema,/skirmish: '0\.7\.7'/);
assert.match(sk,/SKIRMISH_VERSION='0\.7\.7'/);

// Player intent is persistent state; route nodes are replaceable implementation detail.
assert.match(sk,/move\.requestedDestination=\{\.\.\.destination\}/);
assert.match(sk,/_repathPersistentMove\(e,\{reason='blocked'\}=\{\}\)/);
assert.match(sk,/preserveRecovery:true/);
assert.match(sk,/move\.repathCooldown=\.80/);

// Global route planning must not chase moving friendly vehicles.
assert.match(sk,/_routeBlockRects\(e,\{ignoreBuildingIds,includeDynamicUnits:false\}\)/);
assert.match(sk,/_segmentClearForUnit\(e,a,b,\{ignoreBuildingIds,includeDynamicUnits:false\}\)/);

// Locomotor owns local traffic avoidance and can briefly ignore unit collision only.
assert.match(sk,/_tryGroundUnitMove\(e,dx,dy,\{allowSteer=false\}=\{\}\)/);
assert.match(sk,/for\(const off of \[\.24,-\.24,\.46,-\.46,\.72,-\.72,1\.02,-1\.02\]\)/);
assert.match(sk,/unitCollisionGraceSeconds=\.70/);
assert.match(sk,/ignoreUnits=\(move\.unitCollisionGraceSeconds\|\|0\)>0/);
assert.match(sk,/Terrain and structures remain authoritative/);

// Infantry and vehicles share the same persistent stuck-recovery policy.
assert.match(sk,/_recoverPersistentMove\(e,dt,\{label:def\.label\|\|'Unit'\}\)/);
assert.match(sk,/_recoverPersistentMove\(e,dt,\{label:'Rifleman'\}\)/);
assert.match(sk,/re-routing to the requested destination/);
assert.match(sk,/clearing local traffic/);

// Explicit cancellation really cancels the persistent request.
assert.match(sk,/requestedDestination=null;e\.components\.move\.waypoints=\[\]/);
assert.match(sk,/c\.move\.requestedDestination=null;c\.move\.waypoints=\[\]/);

// Existing safe production egress remains independent of normal locomotion.
assert.match(sk,/controlledEgress:true/);
assert.match(sk,/_tryControlledEgressMove/);
assert.match(html,/PERSISTENT ORDERS \+ LOCOMOTOR CORE/);

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.26',
  skirmish:'0.7.7',
  persistentRequestedDestination:true,
  throttledRepath:true,
  staticGlobalRouting:true,
  locomotorTrafficAvoidance:true,
  unitOnlyCollisionGrace:true,
  sharedInfantryVehicleRecovery:true,
  controlledEgressPreserved:true
},null,2));
