import { rngFromSeed, range, chance } from '../core/rng.js';
import { createSceneSpec, addBox, addMesh, validateSceneSpec } from '../core/scene-spec.js';
import { installPropMaterials } from '../core/materials.js';
import { normalizeRecipe, validateRecipe } from '../core/recipe.js';


function gableCanopy(spec,name,w,d,eave,rise,material){
  const x=w/2,y=d/2;
  addMesh(spec,name,[[-x,-y,eave],[x,-y,eave],[-x,y,eave],[x,y,eave],[-x,0,eave+rise],[x,0,eave+rise]],
    [[0,1,5],[0,5,4],[2,4,5],[2,5,3],[0,4,2],[1,3,5]],material,[0,0,0],[0,0,0],['roof']);
}

function addStoneRing(spec, radius, count, z, scale, condition, r){
  for(let i=0;i<count;i++){
    const a=(i/count)*Math.PI*2;
    const tilt=condition==='clean'?0:range(r,-.05,.05);
    addBox(spec,`stone_${i}`,[.62*scale,.38*scale,.34*scale],[Math.cos(a)*radius,Math.sin(a)*radius,z],'propStone',[tilt,0,a],['structural','well']);
  }
}

function generateWell(spec, recipe, r){
  const s=recipe.scale, worn=recipe.condition!=='clean';
  const variant=recipe.variant==='auto'?(chance(r,.48)?'roofed':'stone'):recipe.variant;
  addStoneRing(spec,1.05*s,10,.18*s,s,recipe.condition,r);
  addStoneRing(spec,1.05*s,10,.48*s,s,recipe.condition,r);
  addBox(spec,'wellLip',[2.35*s,2.35*s,.16*s],[0,0,.74*s],'propStoneLight',[0,0,0],['anchor']);
  addBox(spec,'wellVoid',[1.25*s,1.25*s,.03*s],[0,0,.79*s],'propDark');
  for(const x of [-1.15*s,1.15*s]) addBox(spec,`wellPost_${x}`,[.18*s,.18*s,2.45*s],[x,0,1.72*s],'propWood',worn?[0,0,range(r,-.035,.035)]:[0,0,0]);
  addBox(spec,'wellBeam',[2.65*s,.18*s,.18*s],[0,0,2.72*s],'propWoodDark');
  addBox(spec,'wellAxle',[.18*s,2.05*s,.18*s],[0,0,1.78*s],'propWoodDark',[0,0,Math.PI/2]);
  addBox(spec,'bucket',[.46*s,.40*s,.48*s],[0,-.18*s,.93*s],'propWood');
  addBox(spec,'rope',[.05*s,.05*s,.90*s],[0,-.15*s,1.35*s],'propRope');
  if(variant==='roofed'){
    gableCanopy(spec,'wellRoof',3.0*s,2.7*s,2.82*s,.78*s,'propCloth');
    addBox(spec,'wellRidge',[3.08*s,.08*s,.08*s],[0,0,3.60*s],'propWoodDark');
  }
  if(recipe.condition==='abandoned'){
    addBox(spec,'brokenBoard',[1.25*s,.16*s,.12*s],[.5*s,-1.1*s,.12*s],'propWoodDark',[.1,.2,.4]);
    addBox(spec,'weeds',[.8*s,.55*s,.15*s],[-1.1*s,.8*s,.08*s],'propGreen');
  }
}

function fenceSegment(spec,name,x,y,len,s,angle=0,broken=false){
  const postH=1.15*s;
  addBox(spec,`${name}_postA`,[.16*s,.16*s,postH],[x-Math.cos(angle)*len/2,y-Math.sin(angle)*len/2,postH/2],'propWoodDark');
  addBox(spec,`${name}_postB`,[.16*s,.16*s,postH],[x+Math.cos(angle)*len/2,y+Math.sin(angle)*len/2,postH/2],'propWoodDark',broken?[.06,0,.09]:[0,0,0]);
  for(const z of [.42*s,.82*s]) addBox(spec,`${name}_rail_${z}`,[len,.11*s,.12*s],[x,y,z],'propWood',[0,0,angle+(broken?range(rngFromSeed(Math.round((x+y+z)*999)), -.05,.05):0)]);
}

function generateFence(spec, recipe, r){
  const s=recipe.scale, len=3.4*s;
  let v=recipe.variant==='auto'?(chance(r,.18)?'corner':'straight'):recipe.variant;
  if(v==='gate'){
    fenceSegment(spec,'gateLeft',-2.15*s,0,1.7*s,s,0,false);
    fenceSegment(spec,'gateRight',2.15*s,0,1.7*s,s,0,false);
    addBox(spec,'gatePanel',[1.8*s,.10*s,.95*s],[0,0,.52*s],'propWood',[0,0,-.06]);
    return;
  }
  fenceSegment(spec,'fenceA',0,0,len,s,0,recipe.condition==='abandoned'||v==='broken');
  if(v==='corner') fenceSegment(spec,'fenceB',len/2, len/2, len,s,Math.PI/2,false);
}

function generateSignpost(spec, recipe, r){
  const s=recipe.scale, worn=recipe.condition!=='clean';
  addBox(spec,'post',[.18*s,.18*s,2.3*s],[0,0,1.15*s],'propWoodDark',worn?[0,0,range(r,-.04,.04)]:[0,0,0]);
  addBox(spec,'signBoard',[1.75*s,.14*s,.62*s],[.55*s,0,1.82*s],worn?'propWoodDark':'propWood',[0,0,worn?range(r,-.12,.12):0]);
  addBox(spec,'signCap',[.28*s,.28*s,.16*s],[0,0,2.38*s],'propStoneLight');
  if(recipe.condition==='abandoned') addBox(spec,'fallenPlank',[1.15*s,.14*s,.13*s],[-.45*s,.35*s,.10*s],'propWoodDark',[.1,.2,.6]);
}

function generateSupplies(spec, recipe, r){
  const s=recipe.scale, cluster=recipe.variant!=='single';
  const count=cluster?6:2;
  for(let i=0;i<count;i++){
    const x=range(r,-1.15,1.15)*s, y=range(r,-.75,.75)*s;
    if(i%3===0){
      addBox(spec,`barrel_${i}`,[.55*s,.55*s,.78*s],[x,y,.39*s],'propWood');
      addBox(spec,`barrelBand_${i}`,[.58*s,.58*s,.06*s],[x,y,.42*s],'propMetal');
    } else {
      const q=range(r,.55,.9)*s;
      addBox(spec,`crate_${i}`,[q,q,q],[x,y,q/2],'propWood',[0,0,range(r,-.35,.35)]);
      addBox(spec,`crateBrace_${i}`,[q*.12,q+.02,.06*s],[x,y,q*.55],'propWoodDark',[0,0,range(r,-.35,.35)]);
    }
  }
}

export function generateProp(input){
  const recipe=normalizeRecipe({...input,type:'prop'});
  const {warnings}=validateRecipe(recipe);
  const spec=createSceneSpec(recipe); installPropMaterials(spec,recipe.style); const r=rngFromSeed(recipe.seed);
  if(recipe.family==='well') generateWell(spec,recipe,r);
  else if(recipe.family==='fence') generateFence(spec,recipe,r);
  else if(recipe.family==='signpost') generateSignpost(spec,recipe,r);
  else generateSupplies(spec,recipe,r);
  spec.metadata={engine:'prop',engineVersion:recipe.engineVersion,recipeWarnings:warnings};
  const validation=validateSceneSpec(spec);validation.warnings.push(...warnings);return spec;
}
