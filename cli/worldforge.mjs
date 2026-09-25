#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { generateScene } from '../src/generators/index.js';
import { enrichExistingScene, productionSummary } from '../src/core/production-metadata.js';
import { sceneSpecToOBJ, sceneSpecToMTL } from './obj-export.mjs';

const args=process.argv.slice(2);
function val(flag,fallback=null){const i=args.indexOf(flag);return i>=0?args[i+1]:fallback;}
const recipeArg=val('--recipe');
const sceneArg=val('--scene');
if(args.includes('--help')||(!recipeArg&&!sceneArg)){
  console.log(`WorldForge headless CLI
  Generate from recipe:
    node cli/worldforge.mjs --recipe examples/building.recipe.json --out out
  Retroactively enrich an existing scene without changing geometry:
    node cli/worldforge.mjs --scene old.scene.json --out upgraded

Exports recipe/scene/OBJ/MTL plus production metadata for generated recipes.
Scene-upgrade mode exports the enriched scene and production metadata while preserving the original nodes/materials/recipe.`);
  process.exit((recipeArg||sceneArg)?0:1);
}

const outDir=path.resolve(val('--out','worldforge-output'));
fs.mkdirSync(outDir,{recursive:true});

if(sceneArg){
  const scenePath=path.resolve(sceneArg);
  const original=JSON.parse(fs.readFileSync(scenePath,'utf8'));
  const beforeNodes=JSON.stringify(original.nodes||[]);
  const beforeMaterials=JSON.stringify(original.materials||{});
  const beforeRecipe=JSON.stringify(original.recipe||{});
  const spec=enrichExistingScene(original);
  if(JSON.stringify(spec.nodes||[])!==beforeNodes||JSON.stringify(spec.materials||{})!==beforeMaterials||JSON.stringify(spec.recipe||{})!==beforeRecipe){
    throw new Error('Retroactive enrichment attempted to alter protected scene content.');
  }
  const stem=path.basename(scenePath).replace(/\.scene\.json$|\.json$/i,'');
  fs.writeFileSync(path.join(outDir,stem+'.upgraded.scene.json'),JSON.stringify(spec,null,2));
  fs.writeFileSync(path.join(outDir,stem+'.production.json'),JSON.stringify(spec.production,null,2));
  console.log(JSON.stringify({ok:true,mode:'retroactive-scene-upgrade',files:[stem+'.upgraded.scene.json',stem+'.production.json'],geometryPreserved:true,summary:productionSummary(spec)},null,2));
  process.exit(0);
}

const recipePath=path.resolve(recipeArg);
const recipe=JSON.parse(fs.readFileSync(recipePath,'utf8'));
const spec=generateScene(recipe);
const base=`worldforge_${spec.recipe.type}_${spec.recipe.seed}`;
fs.writeFileSync(path.join(outDir,base+'.recipe.json'),JSON.stringify(spec.recipe,null,2));
fs.writeFileSync(path.join(outDir,base+'.scene.json'),JSON.stringify(spec,null,2));
fs.writeFileSync(path.join(outDir,base+'.production.json'),JSON.stringify(spec.production,null,2));
fs.writeFileSync(path.join(outDir,base+'.obj'),`mtllib ${base}.mtl\n`+sceneSpecToOBJ(spec));
fs.writeFileSync(path.join(outDir,base+'.mtl'),sceneSpecToMTL(spec));
console.log(JSON.stringify({ok:spec.validation.errors.length===0,files:[base+'.recipe.json',base+'.scene.json',base+'.production.json',base+'.obj',base+'.mtl'],validation:spec.validation,production:productionSummary(spec)},null,2));
if(spec.validation.errors.length)process.exit(2);
