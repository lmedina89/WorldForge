import { rngFromSeed, range, chance } from '../core/rng.js';
import { createSceneSpec, addBox, addMesh, validateSceneSpec } from '../core/scene-spec.js';
import { installBuildingMaterials } from '../core/materials.js';
import { normalizeRecipe, validateRecipe } from '../core/recipe.js';

function gableRoof(spec, name, w, d, eave, pitchDeg, material, position=[0,0,0]) {
  const rise=(d/2)*Math.tan(pitchDeg*Math.PI/180), x=w/2, y=d/2, z=eave;
  addMesh(spec,name,[[-x,-y,z],[x,-y,z],[-x,y,z],[x,y,z],[-x,0,z+rise],[x,0,z+rise]],
    [[0,1,5],[0,5,4],[2,4,5],[2,5,3],[0,4,2],[1,3,5]],material,position);
}

function hipRoof(spec, name, w, d, eave, pitchDeg, material, position=[0,0,0]) {
  const x=w/2,y=d/2,rise=Math.min(x,y)*Math.tan(pitchDeg*Math.PI/180),ridge=Math.max(0.15,x-y);
  addMesh(spec,name,[[-x,-y,eave],[x,-y,eave],[x,y,eave],[-x,y,eave],[-ridge,0,eave+rise],[ridge,0,eave+rise]],
    [[0,1,5],[0,5,4],[1,2,5],[2,3,4],[2,4,5],[3,0,4]],material,position);
}

function addWindow(spec, x,y,z, side='front', scale=1, boarded=false, index=0) {
  if (side==='front') {
    addBox(spec,`window_${index}`,[.72*scale,.06,.92*scale],[x,y,z],'glass');
    addBox(spec,`sill_${index}`,[.88*scale,.13,.10],[x,y-.035,z-.53*scale],'stoneLight');
    if (boarded) {
      addBox(spec,`board_${index}_a`,[.84*scale,.10,.13],[x,y-.07,z+.10],'board',[0,0,.18]);
      addBox(spec,`board_${index}_b`,[.84*scale,.10,.13],[x,y-.07,z-.18],'board',[0,0,-.13]);
    }
  } else {
    addBox(spec,`window_${index}`,[.06,.72*scale,.92*scale],[x,y,z],'glass');
    addBox(spec,`sill_${index}`,[.13,.88*scale,.10],[x+.035,y,z-.53*scale],'stoneLight');
    if (boarded) {
      addBox(spec,`board_${index}_a`,[.10,.84*scale,.13],[x+.07,y,z+.10],'board',[.18,0,0]);
      addBox(spec,`board_${index}_b`,[.10,.84*scale,.13],[x+.07,y,z-.18],'board',[-.13,0,0]);
    }
  }
}

function familyRules(recipe) {
  const r = { ...recipe, features:{...recipe.features} };
  switch (r.family) {
    case 'cottage': r.floors=Math.min(r.floors,2); r.width=Math.min(r.width,7.5); r.depth=Math.min(r.depth,6); break;
    case 'shack': r.floors=Math.min(r.floors,1); r.width=Math.min(r.width,6); r.depth=Math.min(r.depth,5); r.features.chimney=false; break;
    case 'barn': r.floors=Math.min(r.floors,2); r.width=Math.max(r.width,7); r.depth=Math.max(r.depth,6); r.features.sign=false; break;
    case 'warehouse': r.width=Math.max(r.width,8); r.depth=Math.max(r.depth,6); r.features.porch=false; break;
    case 'inn': r.floors=Math.max(r.floors,2); r.width=Math.max(r.width,7); r.features.sign=true; break;
    case 'shop': r.features.sign=true; break;
  }
  if (r.style==='smallWoodTown' && r.material==='auto') r.roof = r.roof==='flat' ? 'gable' : r.roof;
  if (r.style==='industrial' && r.family==='warehouse') r.roof='flat';
  return r;
}

export function generateBuilding(input) {
  const normalized=normalizeRecipe({...input,type:'building'});
  const { warnings: recipeWarnings }=validateRecipe(normalized);
  const recipe=familyRules(normalized);
  const spec=createSceneSpec(recipe);
  const materialResolved=installBuildingMaterials(spec,recipe);
  const r=rngFromSeed(recipe.seed);
  const w=recipe.width,d=recipe.depth,floors=recipe.floors,pitch=recipe.pitch;
  const floorH=2.45, base=.42, wallH=floors*floorH, eave=base+wallH-.02;
  const frontY=-d/2-.045;
  const abandoned=recipe.condition==='abandoned', worn=recipe.condition!=='clean';

  addBox(spec,'foundation',[w+.28,d+.28,base],[0,0,base/2],'stone',[0,0,0],['structural']);
  addBox(spec,'walls',[w,d,wallH],[0,0,base+wallH/2],'wall',[0,0,0],['structural']);
  addBox(spec,'rightWallTone',[.035,d-.08,wallH-.08],[w/2+.018,0,base+wallH/2],'wallDark');

  const useTimber = materialResolved==='wood' || materialResolved==='timberPlaster' || recipe.style==='mountain';
  if (useTimber) {
    const spacing=Math.max(1.25,w/4);
    for(let x=-w/2+.35;x<=w/2-.2;x+=spacing) addBox(spec,`frontPost_${x.toFixed(2)}`,[.15,.09,wallH-.08],[x,frontY,base+wallH/2],'timber');
    for(let f=1;f<=floors;f++) addBox(spec,`frontBeam_${f}`,[w-.12,.09,.15],[0,frontY,base+f*floorH-.18],'timber');
  }

  if(recipe.roof==='gable') gableRoof(spec,'mainRoof',w+.55,d+.65,eave,pitch,'roof');
  else if(recipe.roof==='hip') hipRoof(spec,'mainRoof',w+.55,d+.65,eave,pitch,'roof');
  else addBox(spec,'flatRoof',[w+.5,d+.5,.28],[0,0,eave+.13],'roofDark');

  const doorX=range(r,-w*.12,w*.12);
  addBox(spec,'door',[.95,.08,1.95],[doorX,-d/2-.055,base+.98],'trim');
  if (abandoned) addBox(spec,'doorBrace',[1.03,.11,.15],[doorX,-d/2-.10,base+1.05],'board',[0,0,-.12]);

  let wi=0;
  for(let f=0;f<floors;f++){
    const z=base+1.55+f*floorH, count=Math.max(2,Math.floor(w/2));
    for(let i=0;i<count;i++){
      const x=count===1?0:-w/2+.8+i*(w-1.6)/(count-1);
      if(Math.abs(x-doorX)>.65||f>0) addWindow(spec,x,-d/2-.06,z,'front',.82+range(r,-.05,.08),abandoned && chance(r,.78),wi++);
    }
  }
  for(let f=0;f<floors;f++){
    const z=base+1.5+f*floorH;
    for(let yy=-d/2+.75;yy<d/2-.4;yy+=1.55) addWindow(spec,w/2+.06,yy,z,'side',.8,abandoned && chance(r,.65),wi++);
  }

  if(recipe.features.chimney){
    const tilt=worn?range(r,-.025,.025):0;
    addBox(spec,'chimney',[.55,.62,1.8],[w*.22,d*.12,eave+1.15],'stone',[tilt,0,0]);
    addBox(spec,'chimneyCap',[.72,.78,.16],[w*.22,d*.12,eave+2.04],'stoneLight',[tilt,0,0]);
  }
  if(recipe.features.porch){
    addBox(spec,'porchDeck',[2.15,.95,.18],[doorX,-d/2-.58,base+.1],'stoneLight');
    for(const px of [doorX-.85,doorX+.85]) addBox(spec,`porchPost_${px.toFixed(2)}`,[.12,.12,1.65],[px,-d/2-.78,base+.9],'timber',worn?[0,0,range(r,-.03,.03)]:[0,0,0]);
    gableRoof(spec,'porchRoof',2.15,1.15,base+2.2,32,'roofDark',[doorX,-d/2-.58,0]);
  }
  if(recipe.features.extension){
    const ex=w/2+.72, ew=1.45,ed=Math.min(2.35,d*.65);
    addBox(spec,'extension',[ew,ed,1.6],[ex,.45,base+.8],'wall');
    gableRoof(spec,'extensionRoof',ew+.25,ed+.25,base+1.58,35,'roofDark',[ex,.45,0]);
  }
  if(recipe.features.sign){
    addBox(spec,'signArm',[.85,.08,.08],[-w/2-.35,-d/2-.08,base+1.75],'timber');
    addBox(spec,'sign',[.72,.09,.58],[-w/2-.73,-d/2-.1,base+1.42],worn?'board':'trim',[0,0,worn?range(r,-.16,.16):0]);
  }

  const clutterCount=recipe.condition==='clean'?2:recipe.condition==='worn'?4:7;
  for(let i=0;i<clutterCount;i++){
    const s=range(r,.22,.52);
    addBox(spec,`crate_${i}`,[s,s,s],[w/2+range(r,.35,1.15),-d/2+range(r,.1,Math.min(1.8,d*.55)),s/2],'timber',[0,range(r,0,.9),0]);
  }
  if(abandoned){
    for(let i=0;i<5;i++){
      const sx=range(r,-w/2,w/2), sy=range(r,-d/2-1.0,d/2), sz=range(r,.05,.12);
      addBox(spec,`debris_${i}`,[range(r,.25,.75),range(r,.10,.30),sz],[sx,sy,sz/2],'board',[range(r,-.2,.2),range(r,0,2.8),range(r,-.2,.2)]);
    }
    addBox(spec,'deadGrowth',[.65,.65,.18],[w/2+.48,-d/2-.32,.09],'deadGreen',[0,range(r,0,2),0]);
  }

  spec.metadata={ resolvedMaterial:materialResolved, effectiveRecipe:recipe, recipeWarnings };
  const validation=validateSceneSpec(spec);
  validation.warnings.push(...recipeWarnings);
  return spec;
}
