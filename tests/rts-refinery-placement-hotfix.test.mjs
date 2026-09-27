import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(sk,/SKIRMISH_VERSION='0\.5\.1'/);
assert.match(sk,/_nearestValidPlacement\(type,x,y/);
assert.match(sk,/maxRadius=66/);
assert.match(sk,/snapped \$\{Math\.round\(placement\.distance\)\} m to nearest legal footprint/);
assert.match(sk,/Try a clearer patch of terrain/);
assert.match(app,/pendingBuild\)\?22:8/);
assert.match(html,/IMMERSIVE COMBAT UI/);

// The hotfix must not loosen core placement validation itself.
for(const phrase of ['_isBuildableFootprint','_withinBuildRadius','_collidesBuilding','canAfford'])
  assert.ok(sk.includes(phrase),`placement rule missing: ${phrase}`);

console.log(JSON.stringify({ok:true,skirmish:'0.5.1',nearestLegalSnap:true,mobileTapTolerance:22,maxSnapMeters:66}));
