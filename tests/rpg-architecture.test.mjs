import assert from 'node:assert/strict';
import { generateScene as generateNew } from '../src/generators/index.js';
import { generateScene as generateOld } from '../../worldforge-v0.4.0/src/generators/index.js';

const legacyRecipes=[
 {type:'building',engineVersion:'1.0.0',seed:48127,family:'shop',style:'smallWoodTown',material:'wood',condition:'clean',width:6.5,depth:4.75,floors:2,roof:'gable',pitch:42,features:{chimney:true,porch:true,sign:true,extension:true}},
 {type:'building',engineVersion:'1.1.0',seed:73519,family:'inn',style:'mountain',material:'timberPlaster',condition:'worn',width:8.25,depth:5.5,floors:2,roof:'hip',pitch:40,template:'twinWing',facade:'symmetric',wealth:'prosperous',age:'old',construction:'stoneBase',features:{chimney:true,porch:true,sign:true,extension:true}},
 {type:'building',engineVersion:'1.1.0',seed:91222,family:'warehouse',style:'industrial',material:'metal',condition:'clean',width:10.5,depth:7,floors:2,roof:'flat',pitch:15,template:'workshop',facade:'workshop',wealth:'modest',age:'mature',construction:'uniform',features:{chimney:false,porch:false,sign:false,extension:true}}
];

const v04NoEngine={...legacyRecipes[1]}; delete v04NoEngine.engineVersion; v04NoEngine.generatorVersion='0.4.0';
const v04Resolved=generateNew(v04NoEngine);
assert.equal(v04Resolved.recipe.engineVersion,'1.1.0','v0.4 recipe without engine must stay on 1.1');

for(const r of legacyRecipes){
  const a=generateOld(r),b=generateNew(r);
  assert.deepEqual(b.nodes,a.nodes,'legacy node regression');
  assert.deepEqual(b.materials,a.materials,'legacy material regression');
}

const families=['peasantHouse','farmhouse','smithy','chapel','stable','guildHall','merchantHouse','watchtower','gatehouse','keep','castleWall','barracks'];
const styles=['oldRpgVillage','rusticVillage','fortifiedStone','castleKeep'];
const conditions=['clean','worn','abandoned'];
let count=0;
for(let fi=0;fi<families.length;fi++){
  const family=families[fi];
  for(const condition of conditions){
    const style=['watchtower','gatehouse','keep','castleWall','barracks'].includes(family)?styles[2+(fi%2)]:styles[fi%2];
    for(const seed of [12001+fi*101,22003+fi*137]){
      const r={type:'building',engineVersion:'1.2.0',seed,family,style,material:'auto',condition,width:family==='castleWall'?15:family==='keep'||family==='gatehouse'?12:7.25,depth:family==='chapel'?8:family==='keep'?9:family==='gatehouse'?6:family==='castleWall'?4:5.5,floors:['watchtower','keep'].includes(family)?4:family==='gatehouse'?3:2,roof:family==='watchtower'?'conical':family==='castleWall'?'parapet':'gable',pitch:44,template:'auto',facade:'auto',wealth:['guildHall','merchantHouse','keep'].includes(family)?'prosperous':'modest',age:condition==='clean'?'mature':'old',construction:'auto',features:{chimney:true,porch:true,sign:true,extension:true}};
      const a=generateNew(r),b=generateNew(r);
      assert.equal(a.validation.errors.length,0,`${family} validation`);
      assert.deepEqual(a.nodes,b.nodes,`${family} determinism`);
      assert.deepEqual(a.materials,b.materials,`${family} material determinism`);
      count++;
    }
  }
}
for(const [family,template] of [['watchtower','roundTower'],['watchtower','squareTower'],['gatehouse','twinRoundGate'],['gatehouse','twinSquareGate']]){
  const r={type:'building',engineVersion:'1.2.0',seed:777,family,style:'castleKeep',material:'stone',condition:'clean',width:11,depth:6,floors:3,roof:family==='watchtower'?'conical':'parapet',pitch:45,template,facade:'auto',wealth:'modest',age:'mature',construction:'uniform',features:{chimney:false,porch:false,sign:false,extension:false}};
  const s=generateNew(r); assert.equal(s.validation.errors.length,0,`${family}/${template}`); count++;
}
console.log(JSON.stringify({ok:true,legacyRegressions:legacyRecipes.length,rpgCases:count},null,2));
