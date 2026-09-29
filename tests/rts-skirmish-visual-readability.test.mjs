import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const map=fs.readFileSync(path.join(root,'src/rts-map/rts-map-forge.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.23'/);
assert.match(sk,/SKIRMISH_VERSION='0\.7\.7'/);
assert.match(map,/RTS_MAP_FORGE_VERSION='0\.2\.9'/);
assert.match(html,/id="skirmishHudView"/);
assert.match(app,/skirmishHudView.*toggleFreeCamera/s);
assert.match(app,/controls\.minZoom=skirmishMode\?\.85/);
assert.match(app,/controls\.maxZoom=skirmishMode\?2\.35/);
assert.match(app,/canvasMultiTouch=true/);
assert.match(app,/if\(wasMulti\)\{pointerDown=null/);
assert.match(app,/setVisualProfile\('skirmish'\)/);
assert.match(sk,/_makeSoftShadowTexture\(\)/);
assert.match(sk,/GroundUnitContactShadow/);
assert.match(sk,/AirUnitGroundShadow/);
assert.match(sk,/loc\.movementClass==='air'/);
assert.match(sk,/viewMode='overview'/);
assert.match(sk,/span=tactical\?\(landscape\?40:46\):\(landscape\?62:58\)/);
assert.match(sk,/new THREE\.Vector3\(54,-68,42\)/);
assert.doesNotMatch(sk,/SelectionRing/,'visual pass should not add a permanent arcade selection ring');
assert.match(map,/roadShoulder/);
assert.match(map,/slopeShade/);
assert.match(map,/riverProximity/);
assert.match(map,/RoadShoulder_/);
assert.match(css,/#skirmishHudFollow\.active,#skirmishHudView\.active/);

console.log(JSON.stringify({ok:true,worldforge:'0.13.23',skirmish:'0.7.7',rtsMapForge:'0.2.9',groundVehicleShadows:true,airShadowProfile:true,freeCamera:true,pinchZoom:true,terrainReadability:true,permanentSelectionRing:false}));
