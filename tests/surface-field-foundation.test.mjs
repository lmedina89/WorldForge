import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { generateScene as generateNew } from '../src/generators/index.js';
import { generateScene as generateOld } from '../../worldforge-v0.6.0/src/generators/index.js';

function hashFile(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
for(const f of ['building.js','building-v1.1.js','building-v1.2.js','building-v1.3.js']){
  const a=hashFile(`../worldforge-v0.6.0/src/generators/${f}`);
  const b=hashFile(`src/generators/${f}`);
  assert.equal(b,a,`${f} must remain byte-identical to v0.6.0`);
}

const legacyRecipes=[
 {type:'building',engineVersion:'1.0.0',seed:48127,family:'shop',style:'smallWoodTown',material:'wood',condition:'clean',width:6.5,depth:4.75,floors:2,roof:'gable',pitch:42,features:{chimney:true,porch:true,sign:true,extension:true}},
 {type:'building',engineVersion:'1.1.0',seed:73519,family:'inn',style:'mountain',material:'timberPlaster',condition:'worn',width:8.25,depth:5.5,floors:2,roof:'hip',pitch:40,template:'twinWing',facade:'symmetric',wealth:'prosperous',age:'old',construction:'stoneBase',features:{chimney:true,porch:true,sign:true,extension:true}},
 {type:'building',engineVersion:'1.2.0',seed:20023,family:'gatehouse',style:'castleKeep',material:'stone',condition:'clean',width:12,depth:6,floors:3,roof:'parapet',pitch:45,template:'twinRoundGate',facade:'auto',wealth:'prosperous',age:'mature',construction:'uniform',features:{chimney:false,porch:false,sign:false,extension:false}},
 {type:'building',engineVersion:'1.3.0',seed:31001,family:'watermill',style:'riverVillage',material:'auto',condition:'clean',width:8,depth:6,floors:2,roof:'gable',pitch:44,template:'waterMillHouse',facade:'auto',wealth:'modest',age:'mature',construction:'auto',features:{chimney:true,porch:true,sign:true,extension:true}}
];
for(const r of legacyRecipes){
  const a=generateOld(r),b=generateNew(r);
  assert.deepEqual(b.nodes,a.nodes,'legacy nodes changed');
  assert.deepEqual(b.materials,a.materials,'legacy materials changed');
}

const surfaces=['grass','dirt','wornVillage','stone','cobblestone','mud','sand','rocky'];
const patterns=['none','straight','curve','tee','cross','plaza'];
let surfaceCases=0;
for(const surface of surfaces)for(const pathPattern of patterns)for(const seed of [11,991]){
  const recipe={type:'surface',seed,surface,size:24,variation:.55,wear:.30,pathPattern,pathWidth:2.5,pathMaterial:'dirt',detailDensity:.50,edgeBlend:true,gridResolution:32};
  const a=generateNew(recipe),b=generateNew(recipe);
  assert.equal(a.validation.errors.length,0,`${surface}/${pathPattern} validation`);
  assert.deepEqual(a.nodes,b.nodes,`${surface}/${pathPattern} nodes not deterministic`);
  assert.deepEqual(a.materials,b.materials,`${surface}/${pathPattern} materials not deterministic`);
  surfaceCases++;
}

const presets=['villageWellSquare','ruralHouseLane','marketCorner','castleCourtyard','castleGateApproach','mountainPath','mineEntranceClearing','desertMarket','docksideLane'];
let fieldCases=0;
for(const preset of presets)for(const seed of [101,424242,777777]){
  const recipe={type:'field',seed,preset,size:34,density:.55,surface:'auto',buildingEngine:'1.3.0',dressing:.55};
  const a=generateNew(recipe),b=generateNew(recipe);
  assert.equal(a.validation.errors.length,0,`${preset} validation`);
  assert.equal(a.validation.warnings.length,0,`${preset} placement warnings: ${a.validation.warnings.join('; ')}`);
  assert.deepEqual(a.nodes,b.nodes,`${preset} nodes not deterministic`);
  assert.deepEqual(a.recipe.placements,b.recipe.placements,`${preset} placements not deterministic`);
  assert.ok(a.recipe.placements.length>=5,`${preset} should create multiple placements`);
  fieldCases++;
}

// Edited field recipes must round-trip exactly rather than re-layout the preset.
const base=generateNew({type:'field',seed:12345,preset:'villageWellSquare',size:34});
const edited=JSON.parse(JSON.stringify(base.recipe));
const movable=edited.placements.find(p=>!p.locked&&p.selectable!==false);
assert.ok(movable,'editable placement missing');
movable.position[0]+=1.25;movable.rotation+=Math.PI/12;
const roundtrip=generateNew(edited);
const movedAgain=roundtrip.recipe.placements.find(p=>p.id===movable.id);
assert.deepEqual(movedAgain.position,movable.position,'edited placement position did not round-trip');
assert.equal(movedAgain.rotation,movable.rotation,'edited placement rotation did not round-trip');

console.log(JSON.stringify({ok:true,legacyRegressions:legacyRecipes.length,surfaceCases,fieldCases,fieldRoundtrip:true},null,2));
