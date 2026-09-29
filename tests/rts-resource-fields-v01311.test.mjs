import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const map=fs.readFileSync(path.join(root,'src/rts-map/rts-map-forge.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.26'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(map,/RTS_MAP_FORGE_VERSION='0\.2\.9'/);
assert.match(map,/Each field remains one logical economy deposit; the repeated crystals are visual instances only/);
assert.match(map,/clusterCount=richness==='dense'\?5\+Math\.floor\(random\(\)\*4\):3\+Math\.floor\(random\(\)\*3\)/);
assert.match(map,/visualClusterCount:visualClusters\.length/);
assert.match(map,/depositCount:1/);
assert.match(map,/new THREE\.InstancedMesh/);
assert.match(map,/worldForgeResourceInstances:true/);
assert.match(map,/fieldCapacity:zone\.capacity/);
assert.match(map,/zone\.harvestPoint=/);
assert.match(app,/resource fields \/ \$\{clusterCount\} Rich\/Dense crystal clusters loading/);
assert.match(app,/logical fields · GPU-instanced/);
console.log(JSON.stringify({ok:true,worldforge:'0.13.26',mapForge:'0.2.9',logicalFields:true,richVisualClusters:'3-5',denseVisualClusters:'5-8',gpuInstanced:true,harvestPointPrepared:true},null,2));
