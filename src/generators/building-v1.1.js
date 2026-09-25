import { generateBuilding as generateBuildingV10 } from './building.js';
import { addBox, addMesh, defineMaterial, validateSceneSpec } from '../core/scene-spec.js';
import { MATERIAL_PALETTES, resolveBuildingMaterial } from '../core/materials.js';
import { rngFromSeed, range, choose, chance } from '../core/rng.js';

const FAMILY_TEMPLATES = {
  cottage: ['compact','lWing','sideWing','stepped'],
  house: ['compact','lWing','sideWing','twinWing','stepped','tallNarrow'],
  shop: ['shopfront','wideFront','lWing','sideWing','workshop'],
  inn: ['wideFront','twinWing','lWing','stepped','courtyardFront'],
  shack: ['compact','sideWing','workshop'],
  barn: ['wideFront','workshop','lWing'],
  warehouse: ['wideFront','workshop','stepped','sideWing']
};

const FAMILY_FACADES = {
  cottage: ['symmetric','asymmetric','rural'],
  house: ['symmetric','asymmetric','rural'],
  shop: ['storefront','asymmetric','symmetric','rural'],
  inn: ['symmetric','asymmetric','storefront','rural'],
  shack: ['rural','asymmetric','workshop'],
  barn: ['workshop','rural','asymmetric'],
  warehouse: ['workshop','asymmetric']
};

function gableRoof(spec,name,w,d,eave,pitch,material,pos=[0,0,0],rotation=[0,0,0]){
  const rise=(d/2)*Math.tan(pitch*Math.PI/180),x=w/2,y=d/2,z=eave;
  addMesh(spec,name,[[-x,-y,z],[x,-y,z],[-x,y,z],[x,y,z],[-x,0,z+rise],[x,0,z+rise]],[[0,1,5],[0,5,4],[2,4,5],[2,5,3],[0,4,2],[1,3,5]],material,pos,rotation);
}
function shedRoof(spec,name,w,d,eave,rise,material,pos=[0,0,0]){
  const x=w/2,y=d/2,z=eave;
  addMesh(spec,name,[[-x,-y,z],[x,-y,z],[-x,y,z+rise],[x,y,z+rise]],[[0,1,3],[0,3,2]],material,pos);
}
function gambrelRoof(spec,name,w,d,eave,pitch,material,pos=[0,0,0]){
  const x=w/2,y=d/2;
  const shoulderY=y*.58;
  const shoulderZ=eave+Math.max(.45,y*.42*Math.tan(Math.min(55,pitch)*Math.PI/180));
  const ridgeZ=shoulderZ+Math.max(.45,shoulderY*.55);
  const v=[[-x,-y,eave],[x,-y,eave],[-x,-shoulderY,shoulderZ],[x,-shoulderY,shoulderZ],[-x,0,ridgeZ],[x,0,ridgeZ],[-x,shoulderY,shoulderZ],[x,shoulderY,shoulderZ],[-x,y,eave],[x,y,eave]];
  const f=[[0,1,3],[0,3,2],[2,3,5],[2,5,4],[4,5,7],[4,7,6],[6,7,9],[6,9,8],[0,2,4],[0,4,6],[0,6,8],[1,9,7],[1,7,5],[1,5,3]];
  addMesh(spec,name,v,f,material,pos);
}
function crossbarWindow(spec,name,x,y,z,side='front',scale=1){
  const ww=.76*scale,wh=.94*scale,frame=.075*scale;
  if(side==='front'){
    addBox(spec,`${name}_glass`,[ww,.045,wh],[x,y,z],'glass');
    addBox(spec,`${name}_v`,[frame,.028,wh-.05],[x,y-.025,z],'trim');
    addBox(spec,`${name}_h`,[ww-.05,.028,frame],[x,y-.025,z],'trim');
    addBox(spec,`${name}_sill`,[ww+.16,.10,.09],[x,y-.035,z-wh/2-.03],'stoneLight');
  }else{
    addBox(spec,`${name}_glass`,[.045,ww,wh],[x,y,z],'glass');
    addBox(spec,`${name}_v`,[.028,frame,wh-.05],[x+.025,y,z],'trim');
    addBox(spec,`${name}_h`,[.028,ww-.05,frame],[x+.025,y,z],'trim');
    addBox(spec,`${name}_sill`,[.10,ww+.16,.09],[x+.035,y,z-wh/2-.03],'stoneLight');
  }
}
function addDormer(spec,name,x,y,eave,roofZ,material='roofDark'){
  const z=eave+.66;
  addBox(spec,`${name}_body`,[1.15,.62,1.0],[x,y,z],'wall');
  gableRoof(spec,`${name}_roof`,1.36,.88,z+.46,38,material,[x,y,0]);
  crossbarWindow(spec,`${name}_window`,x,y-.335,z+.03,'front',.62);
}
function addBalcony(spec,x,frontY,z,w=2.1){
  addBox(spec,'balconyDeck',[w,.75,.12],[x,frontY-.36,z],'timber');
  addBox(spec,'balconyRail',[w,.08,.10],[x,frontY-.72,z+.72],'timber');
  for(const px of [x-w/2+.08,x+w/2-.08]) addBox(spec,`balconyPost_${px.toFixed(2)}`,[.10,.10,.78],[px,frontY-.70,z+.36],'timber');
}
function addAwning(spec,x,frontY,z,w=2.5){
  shedRoof(spec,'storeAwning',w,1.05,z,.36,'roofDark',[x,frontY-.48,0]);
  for(const px of [x-w/2+.1,x+w/2-.1]) addBox(spec,`awningPost_${px.toFixed(2)}`,[.09,.09,1.65],[px,frontY-.82,z-.83],'timber');
}
function addWing(spec,{name,x,y,w,d,h,eave,pitch,wallMat='wall',roofMat='roofDark',roof='gable'}){
  addBox(spec,`${name}_walls`,[w,d,h],[x,y,h/2+.28],wallMat,[0,0,0],['structural','v11-wing']);
  if(roof==='shed') shedRoof(spec,`${name}_roof`,w+.24,d+.24,eave,.55,roofMat,[x,y,0]);
  else gableRoof(spec,`${name}_roof`,w+.28,d+.28,eave,pitch,roofMat,[x,y,0]);
}
function installV11Materials(spec,recipe){
  const primary=resolveBuildingMaterial(recipe);
  const p=MATERIAL_PALETTES[primary]||MATERIAL_PALETTES.timberPlaster;
  const stone=MATERIAL_PALETTES.stone;
  const brick=MATERIAL_PALETTES.brick;
  const construction=recipe.construction||'auto';
  let lower=p.wallDark;
  if(construction==='stoneBase'||(construction==='auto'&&(recipe.style==='mountain'||recipe.wealth==='prosperous'))) lower=stone.wall;
  if(construction==='brickBase'||(construction==='auto'&&recipe.style==='stoneTown'&&recipe.wealth!=='poor')) lower=brick.wall;
  defineMaterial(spec,'wallSecondary',{color:lower});
  defineMaterial(spec,'accentWood',{color:p.trim});
  defineMaterial(spec,'roofAccent',{color:p.roofDark});
}
function applyMixedConstruction(spec,recipe,w,d,base,floorH){
  if((recipe.construction||'auto')==='uniform') return;
  const shouldMix=recipe.construction==='stoneBase'||recipe.construction==='brickBase'||recipe.wealth==='prosperous'||recipe.style==='mountain'||recipe.style==='stoneTown';
  if(!shouldMix)return;
  const h=Math.min(floorH*.48,1.15);
  addBox(spec,'lowerCourseFront',[w+.04,.035,h],[0,-d/2-.065,base+h/2],'wallSecondary');
  addBox(spec,'lowerCourseBack',[w+.04,.035,h],[0,d/2+.065,base+h/2],'wallSecondary');
  addBox(spec,'lowerCourseRight',[.035,d+.04,h],[w/2+.065,0,base+h/2],'wallSecondary');
  addBox(spec,'lowerCourseLeft',[.035,d+.04,h],[-w/2-.065,0,base+h/2],'wallSecondary');
}
function facadeDecor(spec,recipe,r,w,d,base,floorH,wallH){
  const frontY=-d/2-.07;
  const allowedFacades=FAMILY_FACADES[recipe.family]||['symmetric','asymmetric','rural'];
  const facade=recipe.facade==='auto' ? choose(r,allowedFacades) : (allowedFacades.includes(recipe.facade)?recipe.facade:choose(r,allowedFacades));
  if(facade==='storefront'){
    const z=base+1.25;
    for(const x of [-w*.28,w*.28]){
      addBox(spec,`storeGlass_${x}`,[Math.min(1.45,w*.22),.04,1.28],[x,frontY,z],'glass');
      addBox(spec,`storeSill_${x}`,[Math.min(1.58,w*.24),.09,.10],[x,frontY-.02,z-.70],'stoneLight');
    }
    if(recipe.family!=='barn') addAwning(spec,0,frontY,base+2.08,Math.min(w*.62,3.8));
  }else if(facade==='rural'){
    addBox(spec,'ruralBraceL',[.13,.07,1.45],[-w*.36,frontY,base+1.28],'accentWood',[0,0,.32]);
    addBox(spec,'ruralBraceR',[.13,.07,1.45],[w*.36,frontY,base+1.28],'accentWood',[0,0,-.32]);
  }else if(facade==='workshop'){
    addBox(spec,'workshopDoor',[Math.min(2.3,w*.34),.08,2.25],[w*.16,frontY,base+1.13],'timber');
    addBox(spec,'workshopLintel',[Math.min(2.5,w*.37),.10,.16],[w*.16,frontY,base+2.26],'accentWood');
  }else if(facade==='asymmetric'){
    addBox(spec,'facadeBand',[w*.38,.07,.12],[-w*.18,frontY,base+floorH+.10],'accentWood');
  }
  if(recipe.wealth==='prosperous'&&recipe.floors>=2&&recipe.family!=='barn'&&recipe.family!=='warehouse'&&chance(r,.72)) addBalcony(spec,range(r,-w*.10,w*.10),frontY,base+floorH+.14,Math.min(2.7,w*.42));
  return facade;
}
function applyRoofVariety(spec,recipe,r,w,d,eave,pitch){
  const roof=recipe.roof;
  if(roof==='shed'){
    spec.nodes=spec.nodes.filter(n=>!['mainRoof','ridgeCap','eaveTrimFront','eaveTrimBack'].includes(n.name));
    shedRoof(spec,'mainRoof',w+.62,d+.76,eave,.9,'roof');
  }else if(roof==='gambrel'){
    spec.nodes=spec.nodes.filter(n=>!['mainRoof','ridgeCap'].includes(n.name));
    gambrelRoof(spec,'mainRoof',w+.62,d+.76,eave,pitch,'roof');
  }else if(roof==='crossGable'){
    const cw=Math.min(2.4,w*.36),cd=Math.min(2.0,d*.44),cy=-d/2-.35;
    addBox(spec,'crossGableBody',[cw,cd,1.35],[range(r,-w*.12,w*.12),cy,eave-.48],'wall');
    const body=spec.nodes[spec.nodes.length-1];
    gableRoof(spec,'crossGableRoof',cw+.24,cd+.24,eave+.18,42,'roofDark',[body.position[0],cy,0],[0,0,Math.PI/2]);
  }
  if(recipe.floors>=2&&recipe.wealth!=='poor'&&recipe.family!=='warehouse'&&recipe.family!=='barn'){
    const count=recipe.wealth==='prosperous'?2:chance(r,.55)?1:0;
    for(let i=0;i<count;i++) addDormer(spec,`dormer_${i}`,(i-(count-1)/2)*Math.min(1.9,w*.25),-d*.17,eave,eave+1,'roofDark');
  }
}
function applyFamilyIdentity(spec,recipe,r,w,d,base,floorH,wallH){
  const frontY=-d/2-.082;
  if(recipe.family==='barn'){
    const bw=Math.min(3.0,w*.38);
    addBox(spec,'barnDoor',[bw,.10,2.55],[0,frontY,base+1.28],'timber');
    addBox(spec,'barnDoorSplit',[.10,.025,2.45],[0,frontY-.055,base+1.28],'accentWood');
    addBox(spec,'barnBraceA',[bw*.88,.035,.13],[0,frontY-.06,base+1.30],'accentWood',[0,0,.55]);
    addBox(spec,'barnBraceB',[bw*.88,.035,.13],[0,frontY-.061,base+1.30],'accentWood',[0,0,-.55]);
    if(recipe.floors>=2) crossbarWindow(spec,'barnLoft',0,frontY,base+floorH+1.25,'front',.72);
  } else if(recipe.family==='warehouse'){
    const dw=Math.min(3.2,w*.34);
    addBox(spec,'loadingDoor',[dw,.10,2.75],[w*.12,frontY,base+1.38],'dark');
    for(let i=-1;i<=1;i++) addBox(spec,`loadingSlat_${i}`,[dw*.9,.025,.08],[w*.12,frontY-.06,base+1.38+i*.64],'trim');
    addBox(spec,'loadingApron',[dw+1.0,1.2,.16],[w*.12,-d/2-.62,.08],'stoneLight');
  } else if(recipe.family==='shack'){
    addBox(spec,'shackPatch',[Math.min(1.3,w*.28),.035,.62],[-w*.18,frontY,base+1.68],'board',[0,0,.08]);
  } else if(recipe.family==='inn'){
    if(recipe.features.sign) addBox(spec,'innSignHeader',[1.45,.08,.28],[-w*.34,frontY-.02,base+2.28],'accentWood');
  } else if(recipe.family==='cottage'){
    if(chance(r,.6)) addBox(spec,'cottageFlowerBox',[1.10,.24,.20],[w*.24,frontY-.16,base+1.00],'accentWood');
  }
}

function applyTemplate(spec,recipe,r,w,d,base,floorH,wallH,eave,pitch,template){
  const side=recipe.features.extension ? -1 : (chance(r,.5)?1:-1);
  const lowFloors=Math.max(1,Math.min(recipe.floors-1,2));
  const lowH=lowFloors*floorH;
  if(template==='lWing'){
    const ww=Math.min(w*.48,3.4),dd=Math.min(d*.62,3.4),x=side*(w/2+ww/2-.28),y=d*.15;
    addWing(spec,{name:'lWing',x,y,w:ww,d:dd,h:lowH,eave:base+lowH-.02,pitch:35,wallMat:'wallSecondary'});
    crossbarWindow(spec,'lWingWindow',x,-dd/2+y-.06,base+1.45,'front',.78);
  }else if(template==='sideWing'){
    const ww=Math.min(w*.42,3.1),dd=Math.min(d*.78,4.1),x=side*(w/2+ww/2-.20),y=.22;
    addWing(spec,{name:'sideWing',x,y,w:ww,d:dd,h:floorH,eave:base+floorH-.02,pitch:32,wallMat:'wallSecondary',roof:chance(r,.3)?'shed':'gable'});
  }else if(template==='twinWing'){
    const ww=Math.min(w*.31,2.5),dd=Math.min(d*.64,3.3);
    for(const sx of [-1,1]) addWing(spec,{name:`twinWing_${sx}`,x:sx*(w/2+ww/2-.25),y:.28,w:ww,d:dd,h:floorH,eave:base+floorH-.02,pitch:34,wallMat:'wallSecondary'});
  }else if(template==='stepped'){
    const ww=Math.min(w*.42,3.2),dd=Math.min(d*.72,3.8),x=side*(w/2+ww/2-.24),y=.12;
    addWing(spec,{name:'steppedWing',x,y,w:ww,d:dd,h:lowH,eave:base+lowH-.02,pitch:36,wallMat:'wall'});
    if(lowFloors>=1) crossbarWindow(spec,'steppedWindow',x,y-dd/2-.06,base+1.48,'front',.82);
  }else if(template==='wideFront'){
    const ww=Math.min(w*.52,4.2),dd=1.5,y=-d/2-dd/2+.22;
    addWing(spec,{name:'frontPavilion',x:range(r,-w*.08,w*.08),y,w:ww,d:dd,h:floorH,eave:base+floorH-.02,pitch:31,wallMat:'wallSecondary'});
  }else if(template==='tallNarrow'){
    const tw=Math.min(1.8,w*.28),td=Math.min(2.1,d*.42),x=side*(w/2-tw*.45),y=d*.12;
    addWing(spec,{name:'towerBay',x,y,w:tw,d:td,h:wallH+.85,eave:base+wallH+.80,pitch:46,wallMat:'wallSecondary'});
  }else if(template==='workshop'){
    const ww=Math.min(w*.48,3.8),dd=Math.min(d*.70,4.2),x=side*(w/2+ww/2-.15),y=.35;
    addWing(spec,{name:'workshopBay',x,y,w:ww,d:dd,h:floorH*.92,eave:base+floorH*.92-.02,pitch:20,wallMat:'wallSecondary',roof:'shed'});
  }else if(template==='courtyardFront'){
    const ww=Math.min(w*.26,2.25),dd=2.1;
    for(const sx of [-1,1]) addWing(spec,{name:`courtWing_${sx}`,x:sx*(w/2-ww/2+.28),y:-d/2-dd/2+.28,w:ww,d:dd,h:floorH,eave:base+floorH-.02,pitch:32,wallMat:'wallSecondary'});
  }else if(template==='shopfront'){
    // silhouette remains compact; storefront facade makes this template visibly commercial
    addBox(spec,'shopCornice',[w*.72,.10,.18],[0,-d/2-.09,base+2.32],'accentWood');
  }
  return template;
}

export function generateBuildingV11(recipe){
  const r=rngFromSeed(recipe.seed ^ 0x11b1d);
  const tr=rngFromSeed(recipe.seed ^ 0x55aa77);
  const choices=FAMILY_TEMPLATES[recipe.family]||['compact'];
  const resolvedTemplate=recipe.template==='auto'?choose(tr,choices):(choices.includes(recipe.template)?recipe.template:choose(tr,choices));
  const baseRoof=['gable','hip','flat'].includes(recipe.roof)?recipe.roof:'gable';
  const baseInput={...recipe,engineVersion:'1.0.0',roof:baseRoof,features:{...recipe.features}};
  const spec=generateBuildingV10(baseInput);
  spec.recipe=recipe;
  installV11Materials(spec,recipe);

  const w=recipe.width,d=recipe.depth,floors=recipe.floors,pitch=recipe.pitch;
  const floorH=2.45,base=.28,wallH=floors*floorH,eave=base+wallH-.02;
  applyMixedConstruction(spec,recipe,w,d,base,floorH);
  const template=applyTemplate(spec,recipe,r,w,d,base,floorH,wallH,eave,pitch,resolvedTemplate);
  const facade=facadeDecor(spec,recipe,r,w,d,base,floorH,wallH);
  applyRoofVariety(spec,recipe,r,w,d,eave,pitch);
  applyFamilyIdentity(spec,recipe,r,w,d,base,floorH,wallH);

  // age/wealth detail language without destabilizing massing
  if(recipe.age==='old'){
    addBox(spec,'agePatchA',[Math.min(1.2,w*.18),.025,.48],[-w*.23,-d/2-.071,base+1.6],'wallDark',[0,0,.04]);
    if(chance(r,.55)) addBox(spec,'agePatchB',[.025,Math.min(1.1,d*.22),.55],[w/2+.071,d*.12,base+2.05],'wallDark',[0,0,0]);
  }
  if(recipe.wealth==='poor'){
    addBox(spec,'repairBoard',[1.15,.055,.13],[w*.18,-d/2-.09,base+1.72],'board',[0,0,-.12]);
  }else if(recipe.wealth==='prosperous'){
    addBox(spec,'decorBand',[w*.72,.07,.11],[0,-d/2-.075,base+wallH-.35],'trim');
  }

  spec.metadata={...(spec.metadata||{}),buildingEngine:'1.1.0',templateResolved:template,facadeResolved:facade,wealth:recipe.wealth,age:recipe.age,construction:recipe.construction};
  validateSceneSpec(spec);
  return spec;
}
