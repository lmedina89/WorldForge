import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { generateScene } from '../src/generators/index.js';
import { generateScene as generateV07 } from '../../worldforge-v0.7.0/src/generators/index.js';

function hashFile(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
for(const f of ['building.js','building-v1.1.js','building-v1.2.js','building-v1.3.js','prop.js','surface.js','field.js']){
  assert.equal(hashFile(`src/generators/${f}`),hashFile(`../worldforge-v0.7.0/src/generators/${f}`),`${f} must stay byte-identical to v0.7.0`);
}

const legacyField={type:'field',engineVersion:'0.1.0',seed:424242,preset:'villageWellSquare',size:34,density:.55,surface:'auto',buildingEngine:'1.3.0',dressing:.55,placements:null};
const lfOld=generateV07(legacyField),lfNew=generateScene(legacyField);
assert.deepEqual(lfNew.nodes,lfOld.nodes,'Field Engine 0.1 nodes changed');
assert.deepEqual(lfNew.materials,lfOld.materials,'Field Engine 0.1 materials changed');
const compact=p=>p.map(x=>({id:x.id,label:x.label,position:x.position,rotation:x.rotation,scale:x.scale,locked:x.locked,selectable:x.selectable,allowOverlap:x.allowOverlap,type:x.recipe.type,seed:x.recipe.seed,family:x.recipe.family||null}));
assert.deepEqual(compact(lfNew.recipe.placements),compact(lfOld.recipe.placements),'Field Engine 0.1 placement layout changed');

const families=['tree','shrub','flowers','crops','stump','fallenLog','vines','rockCluster','reeds'];
const biomes=['temperate','forest','mountain','farmland','swamp','desert','ruins'];
let foliageCases=0;
for(const family of families)for(const biome of biomes)for(const seed of [19,61803]){
  const recipe={type:'foliage',seed,family,biome,variant:family==='tree'?'auto':'auto',condition:'healthy',scale:1,density:.58,spread:1};
  const a=generateScene(recipe),b=generateScene(recipe);
  assert.equal(a.validation.errors.length,0,`${family}/${biome} validation: ${a.validation.errors.join('; ')}`);
  assert.deepEqual(a.nodes,b.nodes,`${family}/${biome} nodes not deterministic`);
  assert.deepEqual(a.materials,b.materials,`${family}/${biome} materials not deterministic`);
  assert.equal(a.asset.assetType,'foliage');
  foliageCases++;
}
for(const variant of ['oak','pine','birch','fruit','palm','mixed']){
  const s=generateScene({type:'foliage',seed:9401,family:'tree',biome:variant==='palm'?'desert':'temperate',variant,condition:'healthy',scale:1,density:.55,spread:1});
  assert.equal(s.validation.errors.length,0,`tree ${variant} validation`);
}
for(const condition of ['healthy','dry','dead']){
  const s=generateScene({type:'foliage',seed:93,family:'tree',biome:'forest',variant:'oak',condition,scale:1,density:.55,spread:1});
  assert.equal(s.validation.errors.length,0,`tree ${condition} validation`);
}

const presets=['villageWellSquare','ruralHouseLane','marketCorner','castleCourtyard','castleGateApproach','mountainPath','mineEntranceClearing','desertMarket','docksideLane'];
let dressedFields=0;
for(const preset of presets){
  const a=generateScene({type:'field',seed:20260925,preset,size:34,density:.55,surface:'auto',buildingEngine:'1.3.0',dressing:.72});
  assert.equal(a.validation.errors.length,0,`${preset} dressed validation`);
  assert.equal(a.validation.warnings.length,0,`${preset} dressed warnings: ${a.validation.warnings.join('; ')}`);
  assert.ok(a.recipe.placements.some(p=>p.recipe.type==='foliage'),`${preset} missing foliage placement`);
  dressedFields++;
}
console.log(JSON.stringify({ok:true,foliageCases,dressedFields,protectedModules:7,legacyField:true},null,2));
