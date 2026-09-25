import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { generateScene as generateNew } from '../src/generators/index.js';
import { generateScene as generateV08 } from '../../worldforge-v0.8.0/src/generators/index.js';

function hashFile(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
const protectedFiles=['building.js','building-v1.1.js','building-v1.2.js','building-v1.3.js','prop.js','surface.js','foliage.js','field.js','field-v0.2.js'];
for(const f of protectedFiles){
  assert.equal(hashFile(`src/generators/${f}`),hashFile(`../worldforge-v0.8.0/src/generators/${f}`),`${f} must remain byte-identical to v0.8.0`);
}

// v0.8 fields must remain exact through protected Field Engine 0.2.
for(const preset of ['villageWellSquare','mountainPath','castleCourtyard','docksideLane']){
  const recipe={type:'field',engineVersion:'0.2.0',seed:20260925,preset,size:34,density:.55,surface:'auto',buildingEngine:'1.3.0',dressing:.72};
  const a=generateV08(recipe),b=generateNew(recipe);
  assert.deepEqual(b.nodes,a.nodes,`${preset} Field 0.2 nodes changed`);
  assert.deepEqual(b.materials,a.materials,`${preset} Field 0.2 materials changed`);
  const strip=v=>JSON.parse(JSON.stringify(v),(k,val)=>k==='generatorVersion'?undefined:val);
  assert.deepEqual(strip(b.recipe.placements),strip(a.recipe.placements),`${preset} Field 0.2 placement structure changed`);
}

// Generator-version migration: a v0.8 recipe without explicit field engine must stay on 0.2.
const migrated=generateNew({type:'field',generatorVersion:'0.8.0',seed:77,preset:'villageWellSquare',size:34,dressing:.5});
assert.equal(migrated.recipe.engineVersion,'0.2.0');

const families=['bridge','stairs','slope','cliff','terrace','retainingWall'];
const styles=['stone','wood','earth','rope'];
let traversalCases=0;
for(const family of families)for(const style of styles)for(const seed of [31,84512]){
  const recipe={type:'traversal',seed,family,style,variant:'straight',width:3.4,length:8.5,height:2.6,rails:true};
  const a=generateNew(recipe),b=generateNew(recipe);
  assert.equal(a.validation.errors.length,0,`${family}/${style}: ${a.validation.errors.join('; ')}`);
  assert.deepEqual(a.nodes,b.nodes,`${family}/${style} not deterministic`);
  assert.deepEqual(a.materials,b.materials,`${family}/${style} materials not deterministic`);
  assert.ok(a.asset.traversal,`${family}/${style} missing traversal metadata`);
  traversalCases++;
}

const elevatedPresets=['castleCourtyard','castleGateApproach','mountainPath','mineEntranceClearing','ruralHouseLane','mountainVillagePath','stoneBridgeCrossing','cliffsideTownLane'];
let fieldCases=0;
for(const preset of elevatedPresets)for(const seed of [101,424242]){
  const recipe={type:'field',engineVersion:'0.3.0',seed,preset,size:38,density:.55,surface:'auto',buildingEngine:'1.3.0',dressing:.62,elevation:.72};
  const a=generateNew(recipe),b=generateNew(recipe);
  assert.equal(a.validation.errors.length,0,`${preset}: ${a.validation.errors.join('; ')}`);
  assert.equal(a.validation.warnings.length,0,`${preset} warnings: ${a.validation.warnings.join('; ')}`);
  assert.deepEqual(a.nodes,b.nodes,`${preset} nodes not deterministic`);
  assert.deepEqual(a.recipe.placements,b.recipe.placements,`${preset} placements not deterministic`);
  assert.ok(a.recipe.placements.some(p=>p.recipe.type==='traversal'),`${preset} missing traversal pieces`);
  assert.ok(a.metadata.walkGraph?.segments?.length>0,`${preset} missing walk graph segments`);
  assert.ok(a.metadata.walkGraph?.levels?.length>=2,`${preset} missing multiple walk levels`);
  fieldCases++;
}

// Editing elevation must round-trip exactly.
const base=generateNew({type:'field',engineVersion:'0.3.0',seed:555,preset:'mountainVillagePath',size:38,dressing:.65,elevation:.7});
const edited=JSON.parse(JSON.stringify(base.recipe));
const movable=edited.placements.find(p=>p.recipe.type==='building'&&!p.locked);
assert.ok(movable,'missing editable elevated building');
movable.position[2]+=0.5;
const roundtrip=generateNew(edited);
assert.deepEqual(roundtrip.recipe.placements.find(p=>p.id===movable.id).position,movable.position,'Z edit did not round-trip');

console.log(JSON.stringify({ok:true,protectedFiles:protectedFiles.length,legacyField02:true,traversalCases,fieldCases,zRoundtrip:true},null,2));
