import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.19'/);
assert.match(schema,/skirmish: '0\.7\.6'/);
assert.match(sk,/SKIRMISH_VERSION='0\.7\.6'/);

// Repeated terrain commands must keep selection stable instead of toggling it off.
assert.match(sk,/Re-tapping the already-selected unit keeps selection locked/);
assert.doesNotMatch(sk,/Selection cleared · battlefield taps return to manual tank aim/);

// Large touch assist is retained for first selection, but switching while selected is deliberate.
assert.match(sk,/_assistedFriendlyPick\(clientX,clientY,rect,\{excludeId=null,deliberate=false\}/);
assert.match(sk,/deliberate\?\(mobile\?\(infantry\?18:20\)/);
assert.match(sk,/switchTarget=this\._assistedFriendlyPick\(clientX,clientY,rect,\{excludeId:selected\.id,deliberate:true\}\)/);
assert.match(sk,/Once a unit is selected, commands own the battlefield/);

// Route graph now accounts for nearby vehicles as temporary dynamic blockers.
assert.match(sk,/includeDynamicUnits=false/);
assert.match(sk,/kind:'unit',dynamic:true/);
assert.match(sk,/_routeBlockRects\(e,\{ignoreBuildingIds,includeDynamicUnits:true\}\)/);
assert.match(sk,/_segmentClearForUnit\(e,a,b,\{ignoreBuildingIds,includeDynamicUnits:true\}\)/);

// Ground vehicles receive a real side-step option even when heading straight into another hull.
assert.match(sk,/candidates\.push\(\[tx\*mag\*\.88,ty\*mag\*\.88\],\[-tx\*mag\*\.88,-ty\*mag\*\.88\]\)/);

// Riflemen now have stronger sliding plus a stuck watchdog / route recovery.
assert.match(sk,/progressively stronger sidesteps/);
assert.match(sk,/move\.stuckSeconds>\.55&&move\.destination/);
assert.match(sk,/Rifleman finding a clear step around obstruction/);
assert.match(sk,/Rifleman route blocked · choose another destination/);
assert.match(sk,/order:'barracksDeploy',destination:\{x:rally\.x,y:rally\.y\}/);

// Explicit blocked feedback rather than a silent failed tap.
assert.match(sk,/BLOCKED · no traversable destination near that tap/);
assert.match(sk,/fire\(\)\{const e=this\.tank/); // command reliability pass must not drop manual fire
assert.match(html,/Repeated terrain taps now keep the current selection locked/);

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.19',
  skirmish:'0.7.6',
  stableRepeatedCommands:true,
  deliberateSelectionSwitch:true,
  dynamicVehicleAvoidance:true,
  vehicleSideStep:true,
  infantryStuckRecovery:true,
  explicitBlockedFeedback:true
},null,2));
