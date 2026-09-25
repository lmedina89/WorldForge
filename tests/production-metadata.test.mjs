import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { generateScene } from '../src/generators/index.js';
import { enrichExistingScene, productionSummary } from '../src/core/production-metadata.js';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const V091='/mnt/data/worldforge-v0.9.1';
const fail=[];
const assert=(cond,msg)=>{if(!cond)fail.push(msg);};
const stable=v=>JSON.stringify(v);

// Protected generator files must remain byte-identical.
const protectedFiles=[
  'src/generators/building.js','src/generators/building-v1.1.js','src/generators/building-v1.2.js','src/generators/building-v1.3.js',
  'src/generators/prop.js','src/generators/surface.js','src/generators/foliage.js','src/generators/traversal.js',
  'src/generators/field.js','src/generators/field-v0.2.js','src/generators/field-v0.3.js','src/generators/terrain.js','src/generators/landscape.js'
];
for(const rel of protectedFiles){
  const a=fs.readFileSync(path.join(V091,rel)); const b=fs.readFileSync(path.join(ROOT,rel));
  assert(crypto.createHash('sha256').update(a).digest('hex')===crypto.createHash('sha256').update(b).digest('hex'),`protected file changed: ${rel}`);
}

// Same recipe must preserve visible geometry/materials from v0.9.1.
const oldMod=await import(pathToFileURL(path.join(V091,'src/generators/index.js')).href+'?v=091');
const recipes=['building.recipe.json','building-v11-variety.recipe.json','field-v0.3-elevated.recipe.json','deep-village-test.recipe.json'];
for(const file of recipes){
  const recipe=JSON.parse(fs.readFileSync(path.join(ROOT,'examples',file),'utf8'));
  const a=oldMod.generateScene(recipe); const b=generateScene(recipe);
  assert(stable(a.nodes)===stable(b.nodes),`geometry regression: ${file}`);
  assert(stable(a.materials)===stable(b.materials),`material regression: ${file}`);
}

// Retroactive upgrade must preserve protected scene content exactly.
const oldScenePath=path.join(ROOT,'examples/deep-village-test-out/worldforge_field_731904.scene.json');
const oldScene=JSON.parse(fs.readFileSync(oldScenePath,'utf8'));
const upgraded=enrichExistingScene(oldScene);
for(const key of ['nodes','materials','recipe'])assert(stable(oldScene[key])===stable(upgraded[key]),`retroactive upgrade changed ${key}`);
assert(upgraded.production?.schema==='worldforge.production.v1','missing production schema on old scene');
assert(upgraded.production?.placements?.length===64,'old deep village should enrich 64 placements');
assert((upgraded.production?.sockets?.length||0)>30,'old deep village should gain many sockets');

// Building archetype production coverage.
const families=['cottage','house','shop','inn','shack','barn','warehouse','peasantHouse','farmhouse','smithy','chapel','stable','guildHall','merchantHouse','watchtower','gatehouse','keep','castleWall','barracks','watermill','windmill','dock','dockWarehouse','temple','mageTower','ruinedFort','desertHouse','desertMarket','mineEntrance','cityGate','sewerEntrance','townHall'];
let buildingCases=0;
for(let i=0;i<families.length;i++){
  const family=families[i];
  const spec=generateScene({type:'building',engineVersion: i<7?'1.1.0': i<19?'1.2.0':'1.3.0',seed:50000+i,family,style:i<7?'oldRpgVillage':i<19?'rusticVillage':'grandCity',material:'auto',condition:'clean',width:7,depth:5.2,floors:2,roof:'gable',pitch:42,template:'auto',facade:'auto',wealth:'modest',age:'mature',construction:'auto',features:{chimney:true,porch:true,sign:true,extension:true}});
  assert(spec.production?.schema==='worldforge.production.v1',`${family}: missing production metadata`);
  assert(spec.production?.collision,`${family}: missing collision profile`);
  assert(spec.production?.placement,`${family}: missing placement rules`);
  if(!['ruinedFort'].includes(family))assert((spec.production?.sockets?.length||0)>=1,`${family}: expected at least one socket`);
  buildingCases++;
}

// Traversal sockets/walk surfaces.
for(const family of ['bridge','stairs','slope','cliff','terrace','retainingWall']){
  const spec=generateScene({type:'traversal',seed:88000+family.length,family,style:'stone',variant:'straight',width:3.2,length:8,height:2.4,rails:true});
  if(['bridge','stairs','slope'].includes(family)){
    assert(spec.production.sockets.length>=2,`${family}: missing endpoint sockets`);
    assert(spec.production.walkSurfaces.length>=1,`${family}: missing walk surface`);
    assert(spec.production.collision.mode==='walk-surface',`${family}: wrong collision mode`);
  }
}

// Determinism includes production metadata.
const detRecipe=JSON.parse(fs.readFileSync(path.join(ROOT,'examples/building.recipe.json'),'utf8'));
const d1=generateScene(detRecipe),d2=generateScene(detRecipe);
assert(stable(d1.production)===stable(d2.production),'production metadata is not deterministic');

if(fail.length){console.error(JSON.stringify({ok:false,fail},null,2));process.exit(1);}
console.log(JSON.stringify({ok:true,protectedFiles:protectedFiles.length,geometryRegressionRecipes:recipes.length,buildingProductionCases:buildingCases,retroactiveVillage:productionSummary(upgraded),determinism:'PASS'},null,2));
