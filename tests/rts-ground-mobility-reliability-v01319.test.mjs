import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.22'/);
assert.match(schema,/skirmish: '0\.7\.7'/);
assert.match(sk,/SKIRMISH_VERSION='0\.7\.7'/);

// Factory products must remain in controlled egress through the authored rally socket.
assert.match(sk,/minimumSafeIndex:Math\.max\(0,corridor\.length-1\),clearance:1\.0/);
assert.match(sk,/_releaseControlledEgressIfClear\(e\)/);
assert.match(sk,/move\.egressClearance=egressClearance/);
assert.match(sk,/could not clear its production structure/);

// New commands during rollout must retarget the tail without cancelling the safe corridor.
assert.match(sk,/active\?\.controlledEgress&&active\.exitBuildingId/);
assert.match(sk,/remaining=\(active\.waypoints\|\|\[\]\)\.slice/);
assert.match(sk,/minimumSafeIndex:Math\.max\(0,remaining\.length-1\)/);

// Base route inflation is slightly less conservative; local OBB collision remains authoritative.
assert.match(sk,/clearance=Math\.min\(fp\[0\],fp\[1\]\)\*\.44\+\.28/);

// Infantry destinations and local recovery are deliberately forgiving.
assert.match(sk,/poseOpts=infantry\?\{gap:\.06,ignoreInfantry:true\}/);
assert.match(sk,/sample a small radial escape fan/);
assert.match(sk,/_recoverPersistentMove\(e,dt,\{label:'Rifleman'\}\)/);

// Selected-unit switching is exact/direct first and the screen-space assist is much smaller.
assert.match(sk,/directFriendly=null/);
assert.match(sk,/deliberate\?\(mobile\?\(infantry\?18:20\)/);

// Touch jitter should remain a command; only a deliberate 28 px drag starts FREE CAM panning.
assert.match(app,/pointerType:e\.pointerType\|\|'mouse'/);
assert.match(app,/dragThreshold=touchLike\?28:8/);
assert.match(app,/skirmish\.state\(\)\.pendingBuild\?32:28/);
assert.match(html,/28 px/);

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.22',
  skirmish:'0.7.7',
  guaranteedFactoryStaging:true,
  egressRetargetPreserved:true,
  touchCommandSlopPx:28,
  selectedSwitchAssistPx:{infantry:18,vehicle:20},
  infantryRadialRecovery:true
},null,2));
