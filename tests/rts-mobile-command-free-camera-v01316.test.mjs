import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.22'/);
assert.match(schema,/skirmish: '0\.7\.7'/);
assert.match(sk,/SKIRMISH_VERSION='0\.7\.7'/);
for(const phrase of ['_assistedFriendlyPick','_assistedResourcePick','_terrainPointFromPointer','_showCommandMarker','panFreeCamera','toggleFreeCamera']) assert.ok(sk.includes(phrase),`missing mobile command feature: ${phrase}`);
assert.match(sk,/infantry\?54:46/);
assert.match(sk,/radius=rect\.width<900\?62:40/);
assert.match(sk,/for\(let i=0;i<5;i\+\+\)/);
assert.match(sk,/_nearestOpenUnitDestination\(selected,terrainPoint\.x,terrainPoint\.y\)/);
assert.match(app,/dragThreshold=touchLike\?28:8/);
assert.match(app,/skirmish\.state\(\)\.pendingBuild\?32:28/);
assert.match(app,/skirmish\.panFreeCamera/);
assert.match(app,/skirmishHudView.*toggleFreeCamera/s);
assert.match(app,/skirmish\.follow\?'FREE CAM':'FOLLOW'/);
assert.match(html,/id="skirmishHudView"[^>]*>FREE CAM<\/button>/);
assert.match(html,/one-finger drag to pan/);
assert.doesNotMatch(html,/>VIEW WIDE<\/button>/);

console.log(JSON.stringify({ok:true,worldforge:'0.13.22',skirmish:'0.7.7',touchSlopPx:28,unitTouchAssist:true,resourceTouchAssist:true,terrainFallback:true,destinationSnap:true,freeCamera:true,followSelected:true},null,2));
