import { rngFromSeed, range } from '../core/rng.js';
import { createSceneSpec, addBox, addMesh, validateSceneSpec } from '../core/scene-spec.js';
import { installTerrainPatchMaterials } from '../core/materials.js';
import { normalizeRecipe } from '../core/recipe.js';

function hashNoise(seed,x,y){
  let n=(seed ^ (x*374761393) ^ (y*668265263))>>>0;n=(n^(n>>>13))*1274126177>>>0;n^=n>>>16;return (n/4294967295)*2-1;
}

function groundMesh(spec,recipe){
  const n=recipe.gridResolution, size=recipe.size, step=size/(n-1), half=size/2;
  const verts=[],faces=[];
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    const x=-half+i*step,y=-half+j*step;
    let z=hashNoise(recipe.seed,i,j)*recipe.roughness*.12;
    if(recipe.patch==='dirt') z*=.55;
    if(recipe.patch==='wornVillage') z*=.35;
    verts.push([x,y,z]);
  }
  for(let j=0;j<n-1;j++) for(let i=0;i<n-1;i++){
    const a=j*n+i,b=a+1,c=a+n,d=c+1;faces.push([a,c,b],[b,c,d]);
  }
  const mat=recipe.patch==='dirt'?'groundDirt':'groundGrass';
  addMesh(spec,'ground',verts,faces,mat,[0,0,0],[0,0,0],['ground','walkable']);
}

function pathSegments(spec,recipe){
  const count=Math.max(7,Math.round(recipe.size/1.6)), half=recipe.size/2, r=rngFromSeed(recipe.seed+991);
  const centers=[];
  for(let i=0;i<count;i++){
    const t=i/(count-1), y=-half+t*recipe.size;
    const x=Math.sin(t*Math.PI*1.45)*recipe.size*.16 + hashNoise(recipe.seed+3,i,7)*recipe.size*.025;
    centers.push([x,y]);
  }
  const verts=[];
  for(let i=0;i<count;i++){
    const prev=centers[Math.max(0,i-1)], next=centers[Math.min(count-1,i+1)], c=centers[i];
    const dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;
    const nx=-dy/len,ny=dx/len,width=recipe.pathWidth*(1+range(r,-.06,.06))/2;
    verts.push([c[0]+nx*width,c[1]+ny*width,.038],[c[0]-nx*width,c[1]-ny*width,.038]);
  }
  const faces=[];
  for(let i=0;i<count-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;faces.push([a,c,b],[b,c,d]);}
  addMesh(spec,'pathRibbon',verts,faces,'groundDirt',[0,0,0],[0,0,0],['ground','walkable','path']);
}

function villageWear(spec,recipe){
  const r=rngFromSeed(recipe.seed+774);
  const count=Math.round(8+recipe.wear*18);
  for(let i=0;i<count;i++){
    const w=range(r,.5,1.8),d=range(r,.35,1.2),x=range(r,-recipe.size*.42,recipe.size*.42),y=range(r,-recipe.size*.42,recipe.size*.42);
    addBox(spec,`wear_${i}`,[w,d,.026],[x,y,.028],'groundWear',[0,0,range(r,0,Math.PI)],['ground','wear']);
  }
}

export function generateTerrain(input){
  const recipe=normalizeRecipe({...input,type:'terrain'});const spec=createSceneSpec(recipe);installTerrainPatchMaterials(spec,recipe.patch);
  groundMesh(spec,recipe);
  if(recipe.patch==='path') pathSegments(spec,recipe);
  if(recipe.patch==='wornVillage'){pathSegments(spec,recipe);villageWear(spec,recipe);}
  if(recipe.patch==='grass'&&recipe.wear>.55)villageWear(spec,{...recipe,wear:recipe.wear*.35});
  spec.metadata={engine:'terrain',engineVersion:recipe.engineVersion};validateSceneSpec(spec);return spec;
}
