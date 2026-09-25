import { createSceneSpec, defineMaterial, addBox, addMesh, addDodecahedron, validateSceneSpec } from '../core/scene-spec.js';
import { normalizeRecipe, validateRecipe } from '../core/recipe.js';
import { rngFromSeed, range, chance } from '../core/rng.js';

function materials(spec, style){
  const palettes={
    stone:{body:'#777b78',bodyDark:'#5f6462',top:'#93958d',trim:'#aaa99e',rail:'#5d554a'},
    wood:{body:'#6d4b32',bodyDark:'#4f3728',top:'#876143',trim:'#a07b56',rail:'#4b3427'},
    earth:{body:'#766147',bodyDark:'#584835',top:'#74845d',trim:'#8e795b',rail:'#574636'},
    rope:{body:'#76533a',bodyDark:'#4d372a',top:'#856044',trim:'#a0875f',rail:'#9b7a4f'},
  };
  const p=palettes[style]||palettes.stone;
  defineMaterial(spec,'travBody',{color:p.body});
  defineMaterial(spec,'travDark',{color:p.bodyDark});
  defineMaterial(spec,'travTop',{color:p.top});
  defineMaterial(spec,'travTrim',{color:p.trim});
  defineMaterial(spec,'travRail',{color:p.rail});
  defineMaterial(spec,'travWater',{color:'#547d86',roughness:.35,metalness:.02});
  defineMaterial(spec,'travGreen',{color:'#667c52'});
}

function wedge(spec,name,w,l,rise,mat='travTop'){
  const x=w/2,y=l/2,b=.12;
  const v=[[-x,-y,0],[x,-y,0],[-x,y,0],[x,y,0],[-x,-y,b],[x,-y,b],[-x,y,b+rise],[x,y,b+rise]];
  const f=[[0,2,3],[0,3,1],[0,1,5],[0,5,4],[2,6,7],[2,7,3],[0,4,6],[0,6,2],[1,3,7],[1,7,5],[4,5,7],[4,7,6]];
  addMesh(spec,name,v,f,mat,[0,0,0],[0,0,0],['walkable','traversal']);
}
function addRails(spec,w,l,z,wood=false){
  const mat=wood?'travRail':'travTrim',x=w/2+.06;
  for(const sx of [-1,1]){
    addBox(spec,`rail_${sx}_low`,[.10,l,.10],[sx*x,0,z+.55],mat,[0,0,0],['railing']);
    for(let y=-l/2+.35;y<=l/2-.2;y+=1.15)addBox(spec,`rail_${sx}_${y.toFixed(2)}`,[.10,.10,1.10],[sx*x,y,z+.55],mat,[0,0,0],['railing']);
  }
}
function bridge(spec,r){
  const w=r.width,l=r.length,h=r.height,deck=.24;
  addBox(spec,'bridgeDeck',[w,l,deck],[0,0,h],r.style==='stone'?'travTop':'travBody',[0,0,0],['walkable','bridgeDeck']);
  if(r.style==='stone'){
    for(const y of [-l*.34,l*.34])addBox(spec,`pier_${y}`,[w*.72,.58,h],[0,y,h/2],'travDark');
    addBox(spec,'bridgeCopingL',[.18,l,.18],[-w/2+.06,0,h+.18],'travTrim');
    addBox(spec,'bridgeCopingR',[.18,l,.18],[w/2-.06,0,h+.18],'travTrim');
  }else{
    for(const y of [-l/2+.45,l/2-.45])for(const x of [-w/2+.2,w/2-.2])addBox(spec,`post_${x}_${y}`,[.16,.16,h],[x,y,h/2],'travDark');
    addRails(spec,w,l,h+deck/2,true);
    if(r.style==='rope'){
      for(let i=-2;i<=2;i++)addBox(spec,`ropeCross_${i}`,[w-.25,.07,.06],[0,i*l/5,h+.18],'travRail');
    }
  }
  if(r.variant==='broken'){
    addBox(spec,'brokenBoard',[w*.38,.45,.10],[w*.12,l*.10,h+.22],'travDark',[0,.18,.22],['damage']);
  }
  return {walkSurfaces:[{id:'deck',kind:'flat',z:h,width:w,length:l}],connections:[{edge:'south',position:[0,-l/2,h]},{edge:'north',position:[0,l/2,h]}],passUnder:h>1.2,clearance:h-.12};
}
function stairs(spec,r){
  const w=r.width,l=r.length,rise=r.height,n=Math.max(3,Math.min(24,Math.round(rise/.28))),stepL=l/n;
  for(let i=0;i<n;i++){
    const z=(i+1)*rise/n, y=-l/2+stepL*(i+.5);
    addBox(spec,`step_${i}`,[w,stepL+.02,z],[0,y,z/2],'travTop',[0,0,0],['walkable','step']);
  }
  if(r.rails)addRails(spec,w,l,rise*.52,r.style==='wood');
  return {walkSurfaces:[{id:'stairs',kind:'stairs',z0:0,z1:rise,width:w,length:l,steps:n}],connections:[{edge:'south',position:[0,-l/2,0]},{edge:'north',position:[0,l/2,rise]}],passUnder:false};
}
function slope(spec,r){
  wedge(spec,'slope',r.width,r.length,r.height,'travTop');
  if(r.style==='earth'){
    for(let i=0;i<5;i++)addDodecahedron(spec,`slopeRock_${i}`,range(r._rng,.12,.28),[range(r._rng,-r.width*.45,r.width*.45),range(r._rng,-r.length*.45,r.length*.45),.08],[1,1,.65],[0,0,range(r._rng,0,3)],'travDark',['detail']);
  }
  return {walkSurfaces:[{id:'ramp',kind:'slope',z0:0,z1:r.height,width:r.width,length:r.length}],connections:[{edge:'south',position:[0,-r.length/2,0]},{edge:'north',position:[0,r.length/2,r.height]}],passUnder:false};
}
function terrace(spec,r,cliff=false){
  const h=r.height,w=r.width,l=r.length;
  addBox(spec,cliff?'cliffMass':'terraceMass',[w,l,h],[0,0,h/2],cliff?'travDark':'travBody',[0,0,0],['terrainMass','collision']);
  addBox(spec,cliff?'cliffTop':'terraceTop',[w+.02,l+.02,.12],[0,0,h+.06],'travTop',[0,0,0],['walkable','upperLevel']);
  if(cliff){
    for(let i=0;i<Math.max(4,Math.round(w/1.5));i++){
      const x=-w/2+(i+.5)*w/Math.max(4,Math.round(w/1.5));
      addDodecahedron(spec,`cliffRock_${i}`,range(r._rng,.22,.55),[x,-l/2-.08,range(r._rng,.25,h-.15)],[1,.65,range(r._rng,.7,1.45)],[0,0,range(r._rng,0,3)],'travBody',['cliffDetail']);
    }
  }else{
    for(let x=-w/2+.6;x<w/2-.3;x+=1.6)addBox(spec,`terraceButtress_${x.toFixed(1)}`,[.34,.38,h*.72],[x,-l/2-.18,h*.36],'travDark');
  }
  return {walkSurfaces:[{id:'top',kind:'flat',z:h,width:w,length:l}],connections:[],passUnder:false,levelHeight:h};
}
function retainingWall(spec,r){
  const w=r.width,l=Math.max(.35,r.length*.12),h=r.height;
  addBox(spec,'wall',[w,l,h],[0,0,h/2],'travBody',[0,0,0],['wall','collision']);
  addBox(spec,'coping',[w+.14,l+.12,.16],[0,0,h+.08],'travTrim');
  for(let x=-w/2+.65;x<w/2;x+=1.6)addBox(spec,`buttress_${x.toFixed(1)}`,[.34,l+.34,h*.72],[x,-l*.28,h*.36],'travDark');
  return {walkSurfaces:[],connections:[],passUnder:false,retainsHeight:h};
}

export function generateTraversal(input){
  const recipe=normalizeRecipe({...input,type:'traversal'}),{warnings:recipeWarnings}=validateRecipe(recipe);
  const spec=createSceneSpec(recipe);materials(spec,recipe.style);recipe._rng=rngFromSeed(recipe.seed);
  let traversal;
  if(recipe.family==='bridge')traversal=bridge(spec,recipe);
  else if(recipe.family==='stairs')traversal=stairs(spec,recipe);
  else if(recipe.family==='slope')traversal=slope(spec,recipe);
  else if(recipe.family==='cliff')traversal=terrace(spec,recipe,true);
  else if(recipe.family==='terrace')traversal=terrace(spec,recipe,false);
  else traversal=retainingWall(spec,recipe);
  delete recipe._rng;
  spec.metadata={engine:'traversal',engineVersion:recipe.engineVersion,traversal,recipeWarnings};
  const validation=validateSceneSpec(spec);validation.warnings.push(...recipeWarnings);
  return spec;
}
