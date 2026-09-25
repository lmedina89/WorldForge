import fs from 'node:fs';
import assert from 'node:assert/strict';
import { generateScene } from '../src/generators/index.js';

const grammars=['ringVillage','crossroadsVillage','hillsideVillage'];
let cases=0;
for(const grammar of grammars){
  for(const seed of [731904,42017,99103]){
    const recipe={type:'settlement',seed,grammar,size:52,buildingCount:18,density:.62,buildingEngine:'1.3.0',biome:grammar==='hillsideVillage'?'mountain':'temperate',wealth:'modest',age:'old',dressing:.65,elevation:.55,characterPreview:true};
    const a=generateScene(recipe),b=generateScene(recipe);
    assert.equal(a.validation.errors.length,0,`${grammar} validation`);
    assert.equal(a.validation.stats.buildingCount,18,`${grammar} building count`);
    assert.ok(a.metadata.characterSpawn?.length===3,'character spawn');
    assert.ok(a.metadata.walkZones?.length>=1,'walk zones');
    assert.deepEqual(a.nodes,b.nodes,`${grammar} deterministic nodes`);
    assert.deepEqual(a.materials,b.materials,`${grammar} deterministic materials`);
    assert.equal(a.production.source.type,'settlement');
    cases++;
  }
}
const src=generateScene({type:'settlement',seed:731904,grammar:'ringVillage',size:52,buildingCount:18,density:.62,buildingEngine:'1.3.0',biome:'temperate',wealth:'modest',age:'old',dressing:.65,elevation:.45,characterPreview:true});
const reopened=generateScene(src.recipe);
assert.deepEqual(src.nodes,reopened.nodes,'settlement recipe roundtrip nodes');
assert.deepEqual(src.materials,reopened.materials,'settlement recipe roundtrip materials');
console.log(JSON.stringify({ok:true,cases,roundtrip:true},null,2));
