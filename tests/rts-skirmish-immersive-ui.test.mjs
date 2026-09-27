import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.6'/);
assert.match(sk,/SKIRMISH_VERSION='0\.6\.1'/);
for(const id of ['skirmishBuildToggle','skirmishBuildDrawer','skirmishBuildClose','skirmishPlacementBanner','skirmishPlacementCancel','skirmishHudEconomy','skirmishHudSelected','skirmishHudFollow','skirmishRotateHint'])
  assert.match(html,new RegExp(`id="${id}"`),`missing immersive HUD node ${id}`);
assert.match(css,/body\.skirmish-mode #app\{[\s\S]*height:100dvh/);
assert.match(css,/body\.skirmish-mode \.panel\{display:none!important\}/);
assert.match(css,/@media \(orientation:landscape\)/);
assert.match(css,/@media \(orientation:portrait\)/);
assert.match(css,/safe-area-inset-top/);
assert.match(css,/overscroll-behavior:none/);
assert.match(app,/function setSkirmishBuildDrawer\(open\)/);
assert.match(app,/function syncSkirmishViewport\(\)/);
assert.match(app,/skirmishBuildToggle.*setSkirmishBuildDrawer/s);
assert.match(app,/skirmishPlacementBanner.*hidden=!placing/s);
assert.match(app,/window\.visualViewport\?\.addEventListener\('resize',resize\)/);
assert.match(sk,/landscape=hostAspect>=1\.2/);
assert.match(sk,/span=tactical\?\(landscape\?40:46\):\(landscape\?62:58\)/);
assert.match(sk,/new THREE\.Vector3\(78,-98,58\)/);
assert.match(sk,/new THREE\.Vector3\(54,-68,42\)/);
console.log(JSON.stringify({ok:true,worldforge:'0.13.6',skirmish:'0.6.1',immersiveViewport:true,landscapeHud:true,buildDrawer:true,safeArea:true}));
