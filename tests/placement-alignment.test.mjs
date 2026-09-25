import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { generateScene } from '../src/generators/index.js';
import { snapScalar, snapRotationRadians, nearestLevel, nearestEdgeAdjustment } from '../src/core/placement-tools.js';

function hashFile(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
const oldDir='../worldforge-v0.9.1/src/generators', newDir='src/generators';
const protectedFiles=fs.readdirSync(newDir).filter(f=>f.endsWith('.js')&&f!=='index.js').sort();
for(const f of protectedFiles) assert.equal(hashFile(`${newDir}/${f}`),hashFile(`${oldDir}/${f}`),`${f} changed; production metadata must not alter generator implementations`);

assert.equal(snapScalar(2.13,.25),2.25);
assert.equal(snapScalar(-1.12,.25),-1);
assert.ok(Math.abs(snapRotationRadians(0.61,15)-(Math.PI/6))<1e-12);
assert.equal(nearestLevel(2.74,[0,2.5,5]),2.5);

const field=generateScene({type:'field',engineVersion:'0.3.0',seed:9091,preset:'mountainVillagePath',size:38,density:.55,surface:'auto',buildingEngine:'1.3.0',dressing:.62,elevation:.72});
assert.equal(field.validation.errors.length,0);
const edited=structuredClone(field.recipe);
const selectedMeta=field.metadata.placements.find(p=>p.recipe.type==='building'&&!p.locked);
assert.ok(selectedMeta,'expected editable building');
const selected=edited.placements.find(p=>p.id===selectedMeta.id);
selected.position=[snapScalar(selected.position[0]+.37,.25),snapScalar(selected.position[1]-.44,.25),nearestLevel((selected.position[2]||0)+.31,field.metadata.walkGraph.levels)];
selected.rotation=snapRotationRadians((selected.rotation||0)+.34,15);
const roundtrip=generateScene(edited);
const out=roundtrip.recipe.placements.find(p=>p.id===selected.id);
assert.deepEqual(out.position,selected.position,'exact XYZ edit failed to round-trip');
assert.equal(out.rotation,selected.rotation,'rotation edit failed to round-trip');

const records=field.metadata.placements.filter(p=>p.selectable!==false&&p.recipe.type!=='surface'&&p.recipe.type!=='foliage');
const a=records[0], others=records.slice(1);
assert.ok(a&&others.length,'need records for edge snap');
const adjustment=nearestEdgeAdjustment(a,others,0);
assert.ok(adjustment&&['x','y'].includes(adjustment.axis)&&Number.isFinite(adjustment.delta),'edge snap adjustment invalid');

console.log(JSON.stringify({ok:true,protectedGeneratorFiles:protectedFiles.length,exactTransformRoundtrip:true,snapMath:true,edgeSnap:true},null,2));
