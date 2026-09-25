import { rngFromSeed, range, chance, choose } from '../core/rng.js';
import { createSceneSpec, addBox, addMesh, addDodecahedron, validateSceneSpec } from '../core/scene-spec.js';
import { installFoliageMaterials } from '../core/materials.js';
import { normalizeRecipe, validateRecipe } from '../core/recipe.js';

function prism(spec,name,r0,r1,h,sides,position,material,rotation=[0,0,0],tags=[]){
  const v=[];
  for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2;v.push([Math.cos(a)*r0,Math.sin(a)*r0,0]);}
  for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2;v.push([Math.cos(a)*r1,Math.sin(a)*r1,h]);}
  const f=[];
  for(let i=0;i<sides;i++){const n=(i+1)%sides;f.push([i,n,sides+n],[i,sides+n,sides+i]);}
  for(let i=1;i<sides-1;i++){f.push([0,i+1,i]);f.push([sides,sides+i,sides+i+1]);}
  addMesh(spec,name,v,f,material,position,rotation,tags);
}
function cone(spec,name,r,h,sides,position,material,rotation=[0,0,0],tags=[]){
  const v=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2;v.push([Math.cos(a)*r,Math.sin(a)*r,0]);}v.push([0,0,h]);
  const apex=sides,f=[];for(let i=0;i<sides;i++){const n=(i+1)%sides;f.push([i,n,apex]);}for(let i=1;i<sides-1;i++)f.push([0,i+1,i]);
  addMesh(spec,name,v,f,material,position,rotation,tags);
}
function branch(spec,name,len,thick,position,rot,material='folTrunk'){
  addBox(spec,name,[thick,thick,len],position,material,rot,['foliage','branch']);
}
function canopy(spec,name,radius,position,scale=[1,1,1],material='folLeaf'){
  addDodecahedron(spec,name,radius,position,scale,[0,0,0],material,['foliage','canopy']);
}

function tree(spec,recipe,r){
  const s=recipe.scale; let v=recipe.variant==='auto'?choose(r,recipe.biome==='mountain'?['pine','pine','oak']:recipe.biome==='desert'?['palm']:['oak','oak','birch','pine','fruit']):recipe.variant; if(v==='mixed')v=choose(r,['oak','birch','pine','fruit']);
  const dead=recipe.condition==='dead'||recipe.condition==='dry';
  if(v==='palm'){
    const h=4.8*s; prism(spec,'palmTrunk',.24*s,.16*s,h,7,[0,0,0],'folTrunk',[0,0,range(r,-.05,.05)],['foliage','trunk']);
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2+range(r,-.15,.15);const len=2.25*s;
      addBox(spec,`palmFrond_${i}`,[len,.14*s,.08*s],[Math.cos(a)*len*.48,Math.sin(a)*len*.48,h+.05*s],'folLeaf',[0,range(r,-.22,.12),a],['foliage','leaf']);
      canopy(spec,`palmLeaf_${i}`,.34*s,[Math.cos(a)*len*.92,Math.sin(a)*len*.92,h+.02*s],[1.5,.62,.22],i%2?'folLeaf2':'folLeaf');
    }
    canopy(spec,'palmCrown',.42*s,[0,0,h+.08*s],[1,1,.55],'folLeafDark');
    return;
  }
  if(v==='pine'){
    const h=range(r,4.6,6.6)*s;prism(spec,'pineTrunk',.25*s,.15*s,h*.72,7,[0,0,0],'folTrunk',[0,0,range(r,-.03,.03)],['foliage','trunk']);
    if(!dead){
      cone(spec,'pineCrownLower',1.65*s,2.75*s,8,[0,0,h*.34],'folLeafDark');
      cone(spec,'pineCrownMid',1.35*s,2.45*s,8,[0,0,h*.52],'folLeaf');
      cone(spec,'pineCrownTop',.95*s,2.05*s,8,[0,0,h*.68],'folLeaf2');
    } else {
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;branch(spec,`deadBranch_${i}`,1.7*s,.11*s,[0,0,h*.52+i*.15*s],[Math.PI/2+range(r,-.2,.2),0,a],'folTrunk');}
    }
    return;
  }
  const h=range(r,4.0,5.7)*s,tr=.30*s*(v==='birch'?.72:1);prism(spec,'treeTrunk',tr,tr*.64,h*.68,7,[0,0,0],'folTrunk',[0,0,range(r,-.04,.04)],['foliage','trunk']);
  const branchCount=dead?5:4;
  for(let i=0;i<branchCount;i++){
    const a=(i/branchCount)*Math.PI*2+range(r,-.35,.35);const z=h*range(r,.38,.62);
    branch(spec,`branch_${i}`,range(r,1.2,1.75)*s,.12*s,[0,0,z],[Math.PI/2+range(r,-.22,.15),0,a],'folTrunk');
  }
  if(dead)return;
  const baseZ=h*.70;
  const lobes=v==='birch'?4:v==='fruit'?6:5;
  for(let i=0;i<lobes;i++){
    const a=i/lobes*Math.PI*2+range(r,-.25,.25),rr=range(r,.35,.85)*s,rad=range(r,.85,1.25)*s;
    canopy(spec,`crown_${i}`,rad,[Math.cos(a)*rr,Math.sin(a)*rr,baseZ+range(r,-.20,.48)*s],[1,1,range(r,.78,1.05)],i%3===0?'folLeaf2':i%2?'folLeaf':'folLeafDark');
  }
  canopy(spec,'crownTop',1.05*s,[0,0,h*.86],[1.05,1.05,.9],'folLeaf2');
  if(v==='fruit') for(let i=0;i<6;i++){const a=i/6*Math.PI*2;addDodecahedron(spec,`fruit_${i}`,.10*s,[Math.cos(a)*.75*s,Math.sin(a)*.75*s,baseZ+range(r,-.1,.5)*s],[1,1,1],[0,0,0],i%2?'folFlower':'folFlower2',['foliage','fruit']);}
}

function shrub(spec,recipe,r){
  const s=recipe.scale,count=Math.max(2,Math.round(3+recipe.density*5));
  for(let i=0;i<count;i++){
    const a=range(r,0,Math.PI*2),rr=range(r,0,.85)*recipe.spread*s,rad=range(r,.32,.62)*s;
    canopy(spec,`shrub_${i}`,rad,[Math.cos(a)*rr,Math.sin(a)*rr,rad*.62],[1,1,range(r,.55,.9)],i%2?'folLeaf':'folLeafDark');
  }
}
function flowers(spec,recipe,r){
  const s=recipe.scale,count=Math.max(4,Math.round(6+recipe.density*12));
  for(let i=0;i<count;i++){
    const a=range(r,0,Math.PI*2),rr=Math.sqrt(range(r,0,1))*recipe.spread*1.35*s,x=Math.cos(a)*rr,y=Math.sin(a)*rr,h=range(r,.18,.42)*s;
    addBox(spec,`stem_${i}`,[.025*s,.025*s,h],[x,y,h/2],'folVine',[0,0,range(r,0,Math.PI)],['foliage','flower']);
    addDodecahedron(spec,`flower_${i}`,.07*s,[x,y,h+.035*s],[1,1,.55],[0,0,0],i%3?'folFlower':'folFlower2',['foliage','flower']);
  }
}
function crops(spec,recipe,r){
  const s=recipe.scale,rows=Math.max(2,Math.round(2+recipe.density*3)),cols=Math.max(4,Math.round(4+recipe.density*5)),gap=.46*s,rowGap=.62*s;
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++){
    const x=(col-(cols-1)/2)*gap+(row%2)*.08*s,y=(row-(rows-1)/2)*rowGap,h=range(r,.45,.78)*s;
    addBox(spec,`cropStem_${row}_${col}`,[.035*s,.035*s,h],[x,y,h/2],'folCropDark',[0,0,range(r,-.08,.08)],['foliage','crop']);
    addBox(spec,`cropHead_${row}_${col}`,[.10*s,.10*s,.22*s],[x,y,h+.05*s],'folCrop',[0,0,range(r,-.15,.15)],['foliage','crop']);
  }
}
function stump(spec,recipe,r){
  const s=recipe.scale,h=range(r,.45,.8)*s;prism(spec,'stump',.45*s,.39*s,h,8,[0,0,0],'folTrunk',[0,0,range(r,0,Math.PI)],['foliage','stump']);
  addDodecahedron(spec,'stumpMoss',.22*s,[.18*s,-.22*s,h*.72],[1.2,.65,.35],[0,0,0],'folLeafDark',['foliage','moss']);
  for(let i=0;i<2;i++)branch(spec,`root_${i}`,.8*s,.12*s,[0,0,.10*s],[Math.PI/2,0,range(r,0,Math.PI*2)],'folTrunk');
}
function fallenLog(spec,recipe,r){
  const s=recipe.scale,len=range(r,2.6,4.2)*s;
  prism(spec,'fallenLog',.38*s,.34*s,len,8,[-len/2,0,.40*s],'folTrunk',[0,Math.PI/2,0],['foliage','log']);
  for(let i=0;i<2;i++)branch(spec,`logBranch_${i}`,range(r,.7,1.1)*s,.10*s,[(-.5+i)*len*.28,0,.48*s],[Math.PI/2,0,range(r,-1.1,1.1)],'folTrunk');
  if(recipe.condition!=='dry') for(let i=0;i<3;i++) canopy(spec,`logMoss_${i}`,.22*s,[range(r,-len*.35,len*.35),range(r,-.28,.28)*s,.72*s],[1.4,.7,.28],'folLeafDark');
}
function vines(spec,recipe,r){
  const s=recipe.scale,stems=Math.max(2,Math.round(2+recipe.density*3));
  for(let k=0;k<stems;k++){
    const x=(k-(stems-1)/2)*.28*s,h=range(r,1.5,2.7)*s;
    addBox(spec,`vineStem_${k}`,[.035*s,.035*s,h],[x,0,h/2],'folVine',[0,0,range(r,-.08,.08)],['foliage','vine']);
    for(let j=0;j<5;j++){
      const z=(j+1)/6*h,side=(j%2?1:-1)*.15*s;
      canopy(spec,`vineLeaf_${k}_${j}`,.10*s,[x+side,0,z],[1.2,.55,.45],'folLeaf');
    }
  }
}
function rockCluster(spec,recipe,r){
  const s=recipe.scale,count=Math.max(2,Math.round(3+recipe.density*5));
  for(let i=0;i<count;i++){
    const a=range(r,0,Math.PI*2),rr=range(r,0,recipe.spread*1.2)*s,rad=range(r,.28,.62)*s;
    addDodecahedron(spec,`rock_${i}`,rad,[Math.cos(a)*rr,Math.sin(a)*rr,rad*.32],[range(r,.9,1.5),range(r,.75,1.2),range(r,.42,.8)],[range(r,-.2,.2),range(r,-.2,.2),range(r,0,Math.PI)],i%3===0?'folRockLight':'folRock',['foliage','rock']);
  }
}
function reeds(spec,recipe,r){
  const s=recipe.scale,count=Math.max(5,Math.round(7+recipe.density*12));
  for(let i=0;i<count;i++){
    const a=range(r,0,Math.PI*2),rr=Math.sqrt(range(r,0,1))*recipe.spread*s,x=Math.cos(a)*rr,y=Math.sin(a)*rr,h=range(r,.8,1.5)*s;
    addBox(spec,`reed_${i}`,[.025*s,.025*s,h],[x,y,h/2],'folVine',[range(r,-.05,.05),range(r,-.05,.05),0],['foliage','reed']);
    if(i%2===0)addBox(spec,`reedHead_${i}`,[.05*s,.05*s,.20*s],[x,y,h+.08*s],'folDry',[0,0,0],['foliage','reed']);
  }
}

export function generateFoliage(input){
  const recipe=normalizeRecipe({...input,type:'foliage'}),{warnings}=validateRecipe(recipe);
  const spec=createSceneSpec(recipe);installFoliageMaterials(spec,recipe.biome,recipe.condition);const r=rngFromSeed(recipe.seed);
  if(recipe.family==='tree')tree(spec,recipe,r);
  else if(recipe.family==='shrub')shrub(spec,recipe,r);
  else if(recipe.family==='flowers')flowers(spec,recipe,r);
  else if(recipe.family==='crops')crops(spec,recipe,r);
  else if(recipe.family==='stump')stump(spec,recipe,r);
  else if(recipe.family==='fallenLog')fallenLog(spec,recipe,r);
  else if(recipe.family==='vines')vines(spec,recipe,r);
  else if(recipe.family==='reeds')reeds(spec,recipe,r);
  else rockCluster(spec,recipe,r);
  spec.metadata={engine:'foliage',engineVersion:recipe.engineVersion,biome:recipe.biome,recipeWarnings:warnings};
  const validation=validateSceneSpec(spec);validation.warnings.push(...warnings);return spec;
}
