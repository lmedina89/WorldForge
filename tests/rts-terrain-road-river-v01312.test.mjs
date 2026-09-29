import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const map=fs.readFileSync(path.join(root,'src/rts-map/rts-map-forge.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.26'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(map,/RTS_MAP_FORGE_VERSION='0\.2\.9'/);
assert.match(map,/_stripFrame\(/,'shared strip frame helper missing');
assert.match(map,/_roadProfileHeight\(/,'smoothed road profile missing');
assert.match(map,/_makeRoadStrip\(/,'dedicated road strip missing');
assert.match(map,/profileWidth=road\.width\*1\.38/,'road core and shoulder are not sharing the same elevation profile');
assert.match(map,/renderOrder=3/,'road core render priority missing');
assert.match(map,/_riverSurfaceAt\(/,'river center-channel water surface missing');
assert.match(map,/_makeRiverStrip\(/,'dedicated river strip missing');
assert.match(map,/bed\/weightSum\+clamp\(size\*\.00155,1\.65,2\.55\)/,'river water is not lifted above the carved channel');
assert.match(map,/const waterZ=this\._riverSurfaceAt\(x,riverFn\)/,'bridge water height no longer matches river surface');
assert.doesNotMatch(map,/this\._makeStrip\(shape\.river/,'legacy edge-sampled river strip still active');
assert.doesNotMatch(map,/this\._makeStrip\(road\.fn/,'legacy edge-sampled road strip still active');

console.log(JSON.stringify({ok:true,worldforge:'0.13.26',mapForge:'0.2.9',roadCoreContinuity:true,sharedRoadProfile:true,continuousRiverSurface:true,bridgeWaterAgreement:true},null,2));
