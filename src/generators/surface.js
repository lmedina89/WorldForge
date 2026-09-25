import { rngFromSeed, range, chance } from '../core/rng.js';
import { createSceneSpec, addBox, addMesh, validateSceneSpec } from '../core/scene-spec.js';
import { installSurfaceMaterials } from '../core/materials.js';
import { normalizeRecipe, validateRecipe } from '../core/recipe.js';

function hashNoise(seed,x,y){
  let n=(seed ^ (x*374761393) ^ (y*668265263))>>>0;
  n=(n^(n>>>13))*1274126177>>>0;n^=n>>>16;
  return (n/4294967295)*2-1;
}

function baseMesh(spec, recipe){
  const n=recipe.gridResolution,size=recipe.size,step=size/(n-1),half=size/2;
  const verts=[],faces=[];
  const amp=(recipe.surface==='mud'?0.10:recipe.surface==='rocky'?0.16:0.055)*(0.35+recipe.variation*.65);
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    const x=-half+i*step,y=-half+j*step;
    const broad=hashNoise(recipe.seed+101,Math.floor(i/3),Math.floor(j/3));
    const fine=hashNoise(recipe.seed+303,i,j);
    const edge=Math.min(1,Math.min(i,j,n-1-i,n-1-j)/3);
    const z=(broad*.65+fine*.35)*amp*edge;
    verts.push([x,y,z]);
  }
  for(let j=0;j<n-1;j++) for(let i=0;i<n-1;i++){
    const a=j*n+i,b=a+1,c=a+n,d=c+1;faces.push([a,c,b],[b,c,d]);
  }
  addMesh(spec,'surfaceGround',verts,faces,'surfaceBase',[0,0,0],[0,0,0],['ground','walkable','surface']);
}

function blob(spec,name,cx,cy,rx,ry,z,material,r,points=8,tags=['surface','variation']){
  const verts=[[cx,cy,z]];
  for(let i=0;i<points;i++){
    const a=i/points*Math.PI*2;
    const k=range(r,.78,1.18);
    verts.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k,z+range(r,-.004,.004)]);
  }
  const faces=[];
  for(let i=1;i<=points;i++) faces.push([0,i,i===points?1:i+1]);
  addMesh(spec,name,verts,faces,material,[0,0,0],[0,0,0],tags);
}

function ribbonFromCenters(spec,name,centers,width,z,material,r,tags=['ground','walkable','path']){
  if(centers.length<2)return;
  const verts=[];
  for(let i=0;i<centers.length;i++){
    const prev=centers[Math.max(0,i-1)],next=centers[Math.min(centers.length-1,i+1)],c=centers[i];
    const dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;
    const nx=-dy/len,ny=dx/len;
    const w=width*(1+range(r,-.065,.065))/2;
    verts.push([c[0]+nx*w,c[1]+ny*w,z],[c[0]-nx*w,c[1]-ny*w,z]);
  }
  const faces=[];
  for(let i=0;i<centers.length-1;i++){
    const a=i*2,b=a+1,c=a+2,d=a+3;faces.push([a,c,b],[b,c,d]);
  }
  addMesh(spec,name,verts,faces,material,[0,0,0],[0,0,0],tags);
}

function straightCenters(size,axis='y',offset=0,count=12){
  const half=size/2, arr=[];
  for(let i=0;i<count;i++){
    const t=i/(count-1),v=-half+t*size;
    arr.push(axis==='y'?[offset,v]:[v,offset]);
  }
  return arr;
}
function curveCenters(recipe,r){
  const count=Math.max(10,Math.round(recipe.size/1.6)),half=recipe.size/2,arr=[];
  for(let i=0;i<count;i++){
    const t=i/(count-1),y=-half+t*recipe.size;
    const x=Math.sin((t-.12)*Math.PI*1.25)*recipe.size*.15 + hashNoise(recipe.seed+7,i,9)*recipe.size*.018;
    arr.push([x,y]);
  }
  return arr;
}

function addPath(spec,recipe,r){
  const p=recipe.pathPattern,w=recipe.pathWidth,z=.055;
  if(p==='none')return;
  if(p==='straight') ribbonFromCenters(spec,'pathMain',straightCenters(recipe.size,'y'),w,z,'surfacePath',r);
  else if(p==='curve') ribbonFromCenters(spec,'pathCurve',curveCenters(recipe,r),w,z,'surfacePath',r);
  else if(p==='tee'){
    ribbonFromCenters(spec,'pathStem',straightCenters(recipe.size,'y',0,12),w,z,'surfacePath',r);
    const half=recipe.size/2, y=recipe.size*.08;
    ribbonFromCenters(spec,'pathTop',[[-half,y],[-half*.45,y],[0,y],[half*.45,y],[half,y]],w,z+.003,'surfacePath',r);
  } else if(p==='cross'){
    ribbonFromCenters(spec,'pathNS',straightCenters(recipe.size,'y',0,12),w,z,'surfacePath',r);
    ribbonFromCenters(spec,'pathEW',straightCenters(recipe.size,'x',0,12),w,z+.003,'surfacePath',r);
  } else if(p==='plaza'){
    blob(spec,'plaza',0,0,recipe.size*.22,recipe.size*.18,z,'surfacePath',r,12,['ground','walkable','path','plaza']);
    ribbonFromCenters(spec,'plazaSouth',[[0,-recipe.size/2],[0,-recipe.size*.18]],w,z,'surfacePath',r);
    ribbonFromCenters(spec,'plazaNorth',[[0,recipe.size*.18],[0,recipe.size/2]],w,z,'surfacePath',r);
    ribbonFromCenters(spec,'plazaEast',[[recipe.size*.18,0],[recipe.size/2,0]],w,z,'surfacePath',r);
  }
  // darker irregular wear along the path to avoid a sterile strip
  const wearCount=Math.round((5+recipe.wear*15)*(recipe.size/24));
  for(let i=0;i<wearCount;i++){
    const x=range(r,-recipe.size*.32,recipe.size*.32),y=range(r,-recipe.size*.42,recipe.size*.42);
    blob(spec,`pathWear_${i}`,x,y,range(r,.25,.75),range(r,.18,.52),z+.008,'surfacePathDark',r,6,['surface','pathWear']);
  }
}

function addVariation(spec,recipe,r){
  const area=recipe.size*recipe.size;
  const count=Math.round((8+recipe.variation*22)*(area/(24*24)));
  for(let i=0;i<count;i++){
    const cx=range(r,-recipe.size*.46,recipe.size*.46),cy=range(r,-recipe.size*.46,recipe.size*.46);
    const rx=range(r,.45,2.1)*(recipe.size/24),ry=range(r,.35,1.65)*(recipe.size/24);
    const material=chance(r,.52)?'surfaceLight':'surfaceDark';
    blob(spec,`variation_${i}`,cx,cy,rx,ry,.024,material,r,7,['surface','variation']);
  }
  if(recipe.edgeBlend){
    const edgeCount=Math.round(8+recipe.variation*10);
    for(let i=0;i<edgeCount;i++){
      const side=i%4, along=range(r,-recipe.size*.42,recipe.size*.42),inset=range(r,.1,1.0);
      let x=0,y=0;
      if(side===0){x=-recipe.size/2+inset;y=along;}
      if(side===1){x= recipe.size/2-inset;y=along;}
      if(side===2){x=along;y=-recipe.size/2+inset;}
      if(side===3){x=along;y= recipe.size/2-inset;}
      blob(spec,`edgeBlend_${i}`,x,y,range(r,.35,1.1),range(r,.35,1.2),.026,'surfaceDark',r,6,['surface','edgeBlend']);
    }
  }
}

function addStoneSurface(spec,recipe,r){
  if(!['stone','cobblestone','rocky'].includes(recipe.surface))return;
  const count=Math.round((recipe.surface==='rocky'?36:24)*(recipe.size/24)*(0.45+recipe.detailDensity));
  for(let i=0;i<count;i++){
    const x=range(r,-recipe.size*.45,recipe.size*.45),y=range(r,-recipe.size*.45,recipe.size*.45);
    const w=range(r,.24,.72),d=range(r,.18,.54),h=recipe.surface==='rocky'?range(r,.06,.22):range(r,.025,.07);
    addBox(spec,`stoneDetail_${i}`,[w,d,h],[x,y,h/2+.04],chance(r,.25)?'surfaceStoneLight':'surfaceStone',[range(r,-.08,.08),range(r,-.08,.08),range(r,0,Math.PI)],['surface','stoneDetail']);
  }
}

function addNaturalDetails(spec,recipe,r){
  const density=recipe.detailDensity;
  if(density<=.01)return;
  const count=Math.round((12+density*44)*(recipe.size/24));
  for(let i=0;i<count;i++){
    const x=range(r,-recipe.size*.45,recipe.size*.45),y=range(r,-recipe.size*.45,recipe.size*.45);
    if(['grass','wornVillage'].includes(recipe.surface)){
      if(chance(r,.72)){
        const h=range(r,.08,.22),w=range(r,.035,.075);
        addBox(spec,`tuft_${i}`,[w,w,h],[x,y,h/2+.045],'surfaceGreen',[range(r,-.12,.12),range(r,-.12,.12),range(r,0,Math.PI)],['surface','detail']);
      } else {
        const mat=chance(r,.55)?'surfaceFlower':'surfaceFlower2';
        addBox(spec,`flower_${i}`,[.055,.055,.08],[x,y,.085],mat,[0,0,range(r,0,Math.PI)],['surface','detail']);
      }
    } else if(recipe.surface==='sand'){
      if(chance(r,.45)) addBox(spec,`sandStone_${i}`,[range(r,.12,.4),range(r,.1,.32),range(r,.03,.1)],[x,y,.055],'surfaceStone',[0,0,range(r,0,Math.PI)],['surface','detail']);
    } else if(recipe.surface==='dirt'||recipe.surface==='mud'){
      if(chance(r,.48)) blob(spec,`groundMark_${i}`,x,y,range(r,.12,.4),range(r,.08,.3),.045,'surfaceDark',r,5,['surface','detail']);
    }
  }
}

export function generateSurface(input){
  const recipe=normalizeRecipe({...input,type:'surface'});
  const {warnings}=validateRecipe(recipe);
  const spec=createSceneSpec(recipe);installSurfaceMaterials(spec,recipe.surface,recipe.pathMaterial);
  const r=rngFromSeed(recipe.seed);
  baseMesh(spec,recipe);addVariation(spec,recipe,r);addPath(spec,recipe,r);addStoneSurface(spec,recipe,r);addNaturalDetails(spec,recipe,r);
  spec.metadata={engine:'surface',engineVersion:recipe.engineVersion,recipeWarnings:warnings};
  const validation=validateSceneSpec(spec);validation.warnings.push(...warnings);return spec;
}
