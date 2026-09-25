import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { generateScene as generateNew } from '../src/generators/index.js';
import { generateScene as generateOld } from '../../worldforge-v0.5.0/src/generators/index.js';

function hashFile(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
for(const f of ['building.js','building-v1.1.js','building-v1.2.js']){
  const a=hashFile(`../worldforge-v0.5.0/src/generators/${f}`);
  const b=hashFile(`src/generators/${f}`);
  assert.equal(b,a,`${f} must remain byte-identical`);
}

const legacyRecipes=[
 {type:'building',engineVersion:'1.0.0',seed:48127,family:'shop',style:'smallWoodTown',material:'wood',condition:'clean',width:6.5,depth:4.75,floors:2,roof:'gable',pitch:42,features:{chimney:true,porch:true,sign:true,extension:true}},
 {type:'building',engineVersion:'1.1.0',seed:73519,family:'inn',style:'mountain',material:'timberPlaster',condition:'worn',width:8.25,depth:5.5,floors:2,roof:'hip',pitch:40,template:'twinWing',facade:'symmetric',wealth:'prosperous',age:'old',construction:'stoneBase',features:{chimney:true,porch:true,sign:true,extension:true}},
 {type:'building',engineVersion:'1.2.0',seed:20023,family:'gatehouse',style:'castleKeep',material:'stone',condition:'clean',width:12,depth:6,floors:3,roof:'parapet',pitch:45,template:'twinRoundGate',facade:'auto',wealth:'prosperous',age:'mature',construction:'uniform',features:{chimney:false,porch:false,sign:false,extension:false}},
 {type:'building',engineVersion:'1.2.0',seed:20124,family:'peasantHouse',style:'oldRpgVillage',material:'auto',condition:'worn',width:6.2,depth:5.0,floors:2,roof:'gable',pitch:44,template:'hearthHouse',facade:'rural',wealth:'poor',age:'old',construction:'auto',features:{chimney:true,porch:true,sign:false,extension:true}}
];
for(const r of legacyRecipes){
  const a=generateOld(r),b=generateNew(r);
  assert.deepEqual(b.nodes,a.nodes,'legacy nodes changed');
  assert.deepEqual(b.materials,a.materials,'legacy materials changed');
}
const v05NoEngine={...legacyRecipes[2]}; delete v05NoEngine.engineVersion; v05NoEngine.generatorVersion='0.5.0';
assert.equal(generateNew(v05NoEngine).recipe.engineVersion,'1.2.0','v0.5 recipe without engine must stay on 1.2');

const configs={
  watermill:{style:'riverVillage',width:8,depth:6,floors:2,roof:'gable',template:'waterMillHouse'},
  windmill:{style:'riverVillage',width:7,depth:6,floors:3,roof:'spire',template:'windmillTower'},
  dock:{style:'harborTown',width:10,depth:5,floors:1,roof:'flat',template:'dockPier'},
  dockWarehouse:{style:'harborTown',width:10,depth:7,floors:2,roof:'gable',template:'dockWarehouse'},
  temple:{style:'highTemple',width:10,depth:11,floors:2,roof:'dome',template:'templeHall'},
  mageTower:{style:'arcane',width:7,depth:7,floors:5,roof:'spire',template:'mageSpire'},
  ruinedFort:{style:'ancientRuins',width:13,depth:9,floors:2,roof:'parapet',template:'ruinedFort'},
  desertHouse:{style:'desertTown',width:7,depth:5,floors:2,roof:'flat',template:'adobeCourtyard'},
  desertMarket:{style:'desertTown',width:9,depth:6,floors:2,roof:'flat',template:'desertBazaar'},
  mineEntrance:{style:'miningTown',width:8,depth:5,floors:1,roof:'flat',template:'minePortal'},
  cityGate:{style:'grandCity',width:15,depth:7,floors:4,roof:'parapet',template:'grandCityGate'},
  sewerEntrance:{style:'sewerworks',width:8,depth:5,floors:1,roof:'flat',template:'sewerPortal'},
  townHall:{style:'grandCity',width:12,depth:8,floors:3,roof:'hip',template:'civicHall'}
};
let cases=0;
for(const [family,c] of Object.entries(configs)){
  for(const condition of ['clean','worn','abandoned']){
    for(const seed of [31001+cases*13,47003+cases*17]){
      const recipe={type:'building',engineVersion:'1.3.0',seed,family,style:c.style,material:'auto',condition,width:c.width,depth:c.depth,floors:c.floors,roof:c.roof,pitch:44,template:c.template,facade:'auto',wealth:['temple','townHall','cityGate'].includes(family)?'prosperous':'modest',age:condition==='clean'?'mature':'old',construction:'auto',features:{chimney:true,porch:true,sign:true,extension:true}};
      const a=generateNew(recipe),b=generateNew(recipe);
      assert.equal(a.validation.errors.length,0,`${family}/${condition} validation: ${a.validation.errors.join('; ')}`);
      assert.deepEqual(a.nodes,b.nodes,`${family}/${condition} nodes not deterministic`);
      assert.deepEqual(a.materials,b.materials,`${family}/${condition} materials not deterministic`);
      assert.equal(a.recipe.engineVersion,'1.3.0');
      cases++;
    }
  }
}
// Engine 1.3 must preserve Pack I geometry when using an old family.
const pack1={type:'building',engineVersion:'1.2.0',seed:8811,family:'smithy',style:'oldRpgVillage',material:'auto',condition:'clean',width:7,depth:5.5,floors:2,roof:'gable',pitch:44,template:'smithyYard',facade:'workshop',wealth:'modest',age:'mature',construction:'auto',features:{chimney:true,porch:true,sign:true,extension:true}};
const p12=generateNew(pack1),p13=generateNew({...pack1,engineVersion:'1.3.0'});
assert.deepEqual(p13.nodes,p12.nodes,'1.3 compatibility wrapper changed Pack I geometry');
assert.deepEqual(p13.materials,p12.materials,'1.3 compatibility wrapper changed Pack I materials');
console.log(JSON.stringify({ok:true,legacyRegressions:legacyRecipes.length,pack2Cases:cases,compatibilityWrapper:true},null,2));
