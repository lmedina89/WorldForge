import { rngFromSeed, range } from '../core/rng.js';
import { createSceneSpec, addMesh, validateSceneSpec } from '../core/scene-spec.js';
import { installLandscapeMaterials } from '../core/materials.js';
import { normalizeRecipe } from '../core/recipe.js';

function valueNoise(x,z,seed){const n=Math.sin(x*12.9898+z*78.233+seed*.12345)*43758.5453;return (n-Math.floor(n))*2-1;}

function terrainHeight(x,z,recipe){
  const {feature,size,relief,roughness,terracing,seed,path}=recipe;
  let h=0;
  if(feature==='ridge'){
    const ridge=Math.exp(-Math.pow((z-0.18*x)/5.5,2));
    h=relief*ridge*(.58+.42*Math.exp(-Math.pow(x/(size*.42),4)));
  } else if(feature==='mesa') {
    const rr=Math.sqrt((x*.92)**2+(z*1.08)**2)/(size*.43);
    h=relief*Math.max(0,1-rr*rr*rr);
  } else {
    const rav=Math.exp(-Math.pow((z+0.16*x)/3.1,2));
    h=relief*.52-relief*.82*rav;
    h+=relief*.32*Math.exp(-((x-6)**2+(z+3)**2)/85);
  }
  h+=valueNoise(x*.42,z*.42,seed)*roughness*.8+valueNoise(x*.95,z*.95,seed+17)*roughness*.28;
  if(terracing>0){const step=.65+terracing*1.25;const q=Math.round(h/step)*step;h=h+(q-h)*(terracing*.72);}
  if(path){const pathZ=Math.sin(x*.16+seed*.001)*1.8,dist=Math.abs(z-pathZ),blend=Math.max(0,1-dist/1.25),desired=feature==='ravine'?.55:Math.max(.3,h-.6);h=h+(desired-h)*(blend*.86);}
  return h;
}

export function generateLandscape(input){
  const recipe=normalizeRecipe({...input,type:'landscape'}),spec=createSceneSpec(recipe);installLandscapeMaterials(spec,recipe.feature);
  const r=rngFromSeed(recipe.seed),N=recipe.gridResolution,size=recipe.size,half=size/2,verts=[],faces=[];
  for(let iz=0;iz<=N;iz++)for(let ix=0;ix<=N;ix++){
    const x=-half+size*ix/N,z=-half+size*iz/N,h=terrainHeight(x,z,recipe);verts.push([x,h,z]);
  }
  const row=N+1;for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){const a=iz*row+ix,b=a+1,c=a+row,d=c+1;faces.push([a,c,b],[b,c,d]);}
  addMesh(spec,'terrain',verts,faces,'terrain',[0,0,0],[0,0,0],['terrain','structural']);
  if(recipe.rocks){
    const count=Math.max(10,Math.round(size*.75));
    for(let i=0;i<count;i++){
      const x=range(r,-half*.92,half*.92),z=range(r,-half*.92,half*.92),h=terrainHeight(x,z,recipe),s=range(r,.3,1.2);
      const sx=s*range(r,.7,1.4), sy=s*range(r,.5,1.25), sz=s*range(r,.7,1.5);
      const rv=[[sx,0,0],[-sx,0,0],[0,sy,0],[0,-sy,0],[0,0,sz],[0,0,-sz]];
      const rf=[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]];
      addMesh(spec,`rock_${i}`,rv,rf,'rock',[x,h+s*.35,z],[range(r,0,2),range(r,0,2),range(r,0,2)],['prop']);
    }
  }
  spec.metadata={terrain:{gridResolution:N,vertexCount:verts.length,triangleCount:faces.length}};
  validateSceneSpec(spec);return spec;
}
