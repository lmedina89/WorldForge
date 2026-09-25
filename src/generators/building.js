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

function addCrossbarWindow(spec, name, x,y,z, side='front', scale=1, boarded=false, shutters=false) {
  const ww=.78*scale, wh=.96*scale, frame=.08*scale;
  if (side==='front') {
    addBox(spec,`${name}_glass`,[ww,.05,wh],[x,y,z],'glass');
    addBox(spec,`${name}_frameTop`, [ww+.14,.07,frame],[x,y-.012,z+wh/2], 'trim');
    addBox(spec,`${name}_frameBottom`, [ww+.18,.09,frame],[x,y-.015,z-wh/2], 'stoneLight');
    addBox(spec,`${name}_frameL`, [frame,.07,wh+.12],[x-ww/2,y-.012,z],'trim');
    addBox(spec,`${name}_frameR`, [frame,.07,wh+.12],[x+ww/2,y-.012,z],'trim');
    addBox(spec,`${name}_mullionV`, [frame*.78,.03,wh-.12],[x,y-.028,z],'trim');
    addBox(spec,`${name}_mullionH`, [ww-.12,.03,frame*.78],[x,y-.028,z],'trim');
    if (shutters) {
      addBox(spec,`${name}_shutterL`, [.14,.045,wh+.04],[x-ww/2-.12,y-.02,z],'timber');
      addBox(spec,`${name}_shutterR`, [.14,.045,wh+.04],[x+ww/2+.12,y-.02,z],'timber');
    }
    if (boarded) {
      addBox(spec,`${name}_boardA`, [ww+.14,.08,.16],[x,y-.05,z+.16],'board',[0,0,.16]);
      addBox(spec,`${name}_boardB`, [ww+.10,.08,.14],[x,y-.05,z-.18],'board',[0,0,-.11]);
    }
  } else {
    addBox(spec,`${name}_glass`,[.05,ww,wh],[x,y,z],'glass');
    addBox(spec,`${name}_frameTop`, [.07,ww+.14,frame],[x+.012,y,z+wh/2], 'trim');
    addBox(spec,`${name}_frameBottom`, [.09,ww+.18,frame],[x+.015,y,z-wh/2], 'stoneLight');
    addBox(spec,`${name}_frameL`, [.07,frame,wh+.12],[x+.012,y-ww/2,z],'trim');
    addBox(spec,`${name}_frameR`, [.07,frame,wh+.12],[x+.012,y+ww/2,z],'trim');
    addBox(spec,`${name}_mullionV`, [.03,frame*.78,wh-.12],[x+.028,y,z],'trim');
    addBox(spec,`${name}_mullionH`, [.03,ww-.12,frame*.78],[x+.028,y,z],'trim');
    if (shutters) {
      addBox(spec,`${name}_shutterL`, [.045,.14,wh+.04],[x+.02,y-ww/2-.12,z],'timber');
      addBox(spec,`${name}_shutterR`, [.045,.14,wh+.04],[x+.02,y+ww/2+.12,z],'timber');
    }
    if (boarded) {
      addBox(spec,`${name}_boardA`, [.08,ww+.14,.16],[x+.05,y,z+.16],'board',[.16,0,0]);
      addBox(spec,`${name}_boardB`, [.08,ww+.10,.14],[x+.05,y,z-.18],'board',[-.11,0,0]);
    }
  }
}

function addTimberFrame(spec, w, d, wallH, base, floors, includeSides=true) {
  const frontY=-d/2-.048, backY=d/2+.048;
  const sideX=w/2+.048, sideXN=-w/2-.048;
  const spacing=Math.max(1.2,Math.min(1.8,w/4));
  for(let x=-w/2+.34;x<=w/2-.2;x+=spacing){
    addBox(spec,`frontPost_${x.toFixed(2)}`,[.14,.085,wallH-.06],[x,frontY,base+wallH/2],'timber');
    addBox(spec,`backPost_${x.toFixed(2)}`,[.14,.085,wallH-.06],[x,backY,base+wallH/2],'timber');
  }
  for(let f=1;f<=floors;f++){
    addBox(spec,`frontBeam_${f}`,[w-.12,.085,.14],[0,frontY,base+f*2.45-.18],'timber');
    addBox(spec,`backBeam_${f}`,[w-.12,.085,.14],[0,backY,base+f*2.45-.18],'timber');
  }
  if (!includeSides) return;
  const sideSpacing=Math.max(1.2,Math.min(1.6,d/3.2));
  for(let y=-d/2+.5;y<=d/2-.45;y+=sideSpacing){
    addBox(spec,`rightPost_${y.toFixed(2)}`,[.085,.14,wallH-.06],[sideX,y,base+wallH/2],'timber');
    addBox(spec,`leftPost_${y.toFixed(2)}`,[.085,.14,wallH-.06],[sideXN,y,base+wallH/2],'timber');
  }
  for(let f=1;f<=floors;f++){
    addBox(spec,`rightBeam_${f}`,[.085,d-.18,.14],[sideX,0,base+f*2.45-.18],'timber');
    addBox(spec,`leftBeam_${f}`,[.085,d-.18,.14],[sideXN,0,base+f*2.45-.18],'timber');
  }
}

function addFrontDoor(spec, x, frontY, base, wallMat='trim', worn=false) {
  addBox(spec,'door',[1.02,.085,2.02],[x,frontY,base+1.03],wallMat);
  addBox(spec,'doorLintel',[1.16,.08,.14],[x,frontY-.004,base+2.02],'timber');
  addBox(spec,'doorJambL',[.10,.07,2.04],[x-.53,frontY-.004,base+1.03],'timber');
  addBox(spec,'doorJambR',[.10,.07,2.04],[x+.53,frontY-.004,base+1.03],'timber');
  addBox(spec,'doorKnob',[.08,.02,.08],[x+.26,frontY-.05,base+1.00],'trim');
  if (worn) addBox(spec,'doorBrace',[1.1,.09,.14],[x,frontY-.055,base+1.08],'board',[0,0,-.10]);
}

function addPorch(spec, x, d, base, roofPitch=28, worn=false) {
  const deckY=-d/2-.58;
  addBox(spec,'porchDeck',[2.55,1.15,.16],[x,deckY,base+.08],'stoneLight');
  addBox(spec,'step1',[1.78,.42,.10],[x,deckY-.62,.05],'stoneLight');
  addBox(spec,'step2',[1.25,.28,.08],[x,deckY-.88,.04],'stoneLight');
  for(const px of [x-.92,x+.92]) addBox(spec,`porchPost_${px.toFixed(2)}`,[.12,.12,1.82],[px,deckY-.18,base+1.0],'timber',worn?[0,0,range(rngFromSeed(Math.abs((px*1000)|0)),-.02,.02)]:[0,0,0]);
  addBox(spec,'porchRail',[2.26,.06,.10],[x,deckY-.20,base+1.72],'timber');
  gableRoof(spec,'porchRoof',2.6,1.45,base+2.28,roofPitch,'roofDark',[x,deckY-.04,0]);
}

function addRoofDetail(spec, w, d, eave, pitch, roofType='gable') {
  const capZ = eave + (d/2)*Math.tan(pitch*Math.PI/180) + .03;
  if (roofType==='gable') addBox(spec,'ridgeCap',[w+.08,.10,.08],[0,0,capZ],'roofDark');
  addBox(spec,'eaveTrimFront',[w+.18,.10,.08],[0,-d/2-.30,eave-.01],'timber');
  addBox(spec,'eaveTrimBack',[w+.18,.10,.08],[0,d/2+.30,eave-.01],'timber');
}

function addBarrel(spec, name, x, y, z=.18) {
  addBox(spec,`${name}_body`,[.34,.34,.44],[x,y,z+.22],'timber');
  addBox(spec,`${name}_bandTop`,[.36,.36,.04],[x,y,z+.38],'dark');
  addBox(spec,`${name}_bandMid`,[.36,.36,.04],[x,y,z+.22],'dark');
  addBox(spec,`${name}_bandBot`,[.36,.36,.04],[x,y,z+.06],'dark');
}

function addPlanter(spec, name, x, y) {
  addBox(spec,`${name}_box`,[.52,.34,.22],[x,y,.11],'timber');
  addBox(spec,`${name}_plant`,[.42,.26,.24],[x,y,.30],'deadGreen');
}

function familyRules(recipe) {
  const r = { ...recipe, features:{...recipe.features} };
  switch (r.family) {
    case 'cottage': r.floors=Math.min(r.floors,2); r.width=Math.min(r.width,7.5); r.depth=Math.min(r.depth,6); break;
    case 'shack': r.floors=Math.min(r.floors,1); r.width=Math.min(r.width,6); r.depth=Math.min(r.depth,5); r.features.chimney=false; break;
    case 'barn': r.floors=Math.min(r.floors,2); r.width=Math.max(r.width,7); r.depth=Math.max(r.depth,6); r.features.sign=false; r.features.porch=false; break;
    case 'warehouse': r.width=Math.max(r.width,8); r.depth=Math.max(r.depth,6); r.features.porch=false; break;
    case 'inn': r.floors=Math.max(r.floors,2); r.width=Math.max(r.width,7.5); r.features.sign=true; r.features.extension=true; break;
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
  const floorH=2.45, base=.28, wallH=floors*floorH, eave=base+wallH-.02;
  const frontY=-d/2-.048;
  const abandoned=recipe.condition==='abandoned', worn=recipe.condition!=='clean';

  // cleaner foundation / plinth
  addBox(spec,'foundation',[w+.10,d+.10,base],[0,0,base/2],'stone',[0,0,0],['structural']);
  addBox(spec,'plinth',[w+.02,d+.02,.10],[0,0,base+.05],'stoneLight');
  addBox(spec,'walls',[w,d,wallH],[0,0,base+wallH/2],'wall',[0,0,0],['structural']);
  addBox(spec,'rightWallTone',[.03,d-.12,wallH-.10],[w/2+.016,0,base+wallH/2],'wallDark');
  addBox(spec,'leftWallTone',[.03,d-.12,wallH-.10],[-w/2-.016,0,base+wallH/2],'wallDark');

  const useTimber = materialResolved==='wood' || materialResolved==='timberPlaster' || recipe.style==='mountain' || recipe.family==='inn' || recipe.family==='shop';
  if (useTimber) addTimberFrame(spec,w,d,wallH,base,floors,true);

  if(recipe.roof==='gable') gableRoof(spec,'mainRoof',w+.62,d+.76,eave,pitch,'roof');
  else if(recipe.roof==='hip') hipRoof(spec,'mainRoof',w+.62,d+.76,eave,pitch,'roof');
  else addBox(spec,'flatRoof',[w+.54,d+.54,.24],[0,0,eave+.12],'roofDark');
  addRoofDetail(spec,w+.62,d+.76,eave,pitch,recipe.roof);

  const doorX=range(r,-w*.10,w*.10);
  addFrontDoor(spec,doorX,frontY,base,'trim',abandoned);

  let wi=0;
  const frontCount=Math.max(2,Math.floor(w/2.1));
  for(let f=0;f<floors;f++){
    const z=base+1.55+f*floorH;
    for(let i=0;i<frontCount;i++){
      const x=frontCount===1?0:-w/2+.72+i*(w-1.44)/(frontCount-1);
      if(Math.abs(x-doorX)>.9 || f>0) addCrossbarWindow(spec,`fwin_${wi++}`,x,frontY,z,'front',.82+range(r,-.04,.07),abandoned && chance(r,.72),!abandoned && chance(r,.4));
    }
  }
  for(let f=0;f<floors;f++){
    const z=base+1.52+f*floorH;
    for(let yy=-d/2+.90;yy<d/2-.55;yy+=1.65) addCrossbarWindow(spec,`swin_r_${wi++}`,w/2+.055,yy,z,'side',.79,abandoned && chance(r,.55),!abandoned && chance(r,.35));
    if (w > 6.2) for(let yy=-d/2+1.15;yy<d/2-.85;yy+=2.1) addCrossbarWindow(spec,`swin_l_${wi++}`,-w/2-.055,yy,z,'side',.72,abandoned && chance(r,.45),false);
  }

  if(recipe.features.chimney){
    const tilt=worn?range(r,-.02,.02):0;
    addBox(spec,'chimney',[.54,.58,1.72],[w*.22,d*.14,eave+1.08],'stone',[tilt,0,0]);
    addBox(spec,'chimneyCap',[.70,.74,.15],[w*.22,d*.14,eave+1.94],'stoneLight',[tilt,0,0]);
  }
  if(recipe.features.porch) addPorch(spec,doorX,d,base,30,worn);

  if(recipe.features.extension){
    const right = chance(r,.65);
    const ex=(right?1:-1)*(w/2+.90), ey=range(r,.15,.55), ew=range(r,1.85,2.45), ed=Math.min(2.7,Math.max(1.9,d*.58));
    addBox(spec,'extension',[ew,ed,1.72],[ex,ey,base+.86],'wall');
    addBox(spec,'extensionTrim',[ew+.06,.10,.14],[ex,ey-ed/2-.02,base+1.48],'timber');
    gableRoof(spec,'extensionRoof',ew+.28,ed+.28,base+1.69,33,'roofDark',[ex,ey,0]);
    if (!abandoned && chance(r,.6)) addPlanter(spec,'extensionPlanter',ex+(right?-.25:.25), ey-ed/2-.40);
  }
  if(recipe.features.sign){
    addBox(spec,'signArm',[.85,.08,.08],[-w/2-.38,-d/2-.10,base+1.88],'timber');
    addBox(spec,'sign',[.78,.10,.60],[-w/2-.78,-d/2-.12,base+1.52],worn?'board':'trim',[0,0,worn?range(r,-.14,.14):0]);
  }

  // richer props / clutter
  const propSide = w/2 + .48;
  const clutterCount=recipe.condition==='clean'?2:recipe.condition==='worn'?4:6;
  for(let i=0;i<clutterCount;i++){
    const x=propSide+range(r,-.15,.65), y=-d/2+range(r,.15,Math.min(2.1,d*.62));
    if ((i%3)===0) addBarrel(spec,`barrel_${i}`,x,y,.02);
    else {
      const s=range(r,.24,.48);
      addBox(spec,`crate_${i}`,[s,s,s],[x,y,s/2],'timber',[0,range(r,0,.8),0]);
    }
  }
  if (!abandoned) {
    if (chance(r,.72)) addPlanter(spec,'planter_front',doorX+1.30,-d/2-.92);
    if (chance(r,.45)) addPlanter(spec,'planter_side',-w/2-.20,-d/2+.75);
  }
  if(abandoned){
    for(let i=0;i<6;i++){
      const sx=range(r,-w/2-.25,w/2+.25), sy=range(r,-d/2-1.0,d/2), sz=range(r,.05,.12);
      addBox(spec,`debris_${i}`,[range(r,.22,.68),range(r,.10,.24),sz],[sx,sy,sz/2],'board',[range(r,-.2,.2),range(r,0,2.8),range(r,-.2,.2)]);
    }
    addBox(spec,'deadGrowth',[.60,.60,.18],[w/2+.46,-d/2-.38,.09],'deadGreen',[0,range(r,0,2),0]);
    addBox(spec,'brokenStep',[.65,.26,.08],[doorX+.75,-d/2-.92,.04],'stone',[0,0,range(r,-.22,.22)]);
  }

  spec.metadata={ resolvedMaterial:materialResolved, effectiveRecipe:recipe, recipeWarnings };
  const validation=validateSceneSpec(spec);
  validation.warnings.push(...recipeWarnings);
  return spec;
}
