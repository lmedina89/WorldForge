import { generateBuildingV12 } from './building-v1.2.js';
import { createSceneSpec, addBox, addMesh, defineMaterial, validateSceneSpec } from '../core/scene-spec.js';
import { installBuildingMaterials } from '../core/materials.js';
import { rngFromSeed, range, choose, chance } from '../core/rng.js';

const PACK2 = new Set(['watermill','windmill','dock','dockWarehouse','temple','mageTower','ruinedFort','desertHouse','desertMarket','mineEntrance','cityGate','sewerEntrance','townHall']);

function gableRoof(spec,name,w,d,eave,pitch,material,pos=[0,0,0]){
  const rise=(d/2)*Math.tan(pitch*Math.PI/180),x=w/2,y=d/2,z=eave;
  addMesh(spec,name,[[-x,-y,z],[x,-y,z],[-x,y,z],[x,y,z],[-x,0,z+rise],[x,0,z+rise]],[[0,1,5],[0,5,4],[2,4,5],[2,5,3],[0,4,2],[1,3,5]],material,pos);
}
function pyramidRoof(spec,name,w,d,eave,height,material,pos=[0,0,0]){
  const x=w/2,y=d/2;addMesh(spec,name,[[-x,-y,eave],[x,-y,eave],[x,y,eave],[-x,y,eave],[0,0,eave+height]],[[0,1,4],[1,2,4],[2,3,4],[3,0,4],[0,3,2],[0,2,1]],material,pos);
}
function addCylinder(spec,name,radius,height,position,material,segments=12,tags=[]){
  const v=[],f=[],z0=-height/2,z1=height/2;
  for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;v.push([Math.cos(a)*radius,Math.sin(a)*radius,z0]);}
  for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;v.push([Math.cos(a)*radius,Math.sin(a)*radius,z1]);}
  const bot=v.length;v.push([0,0,z0]);const top=v.length;v.push([0,0,z1]);
  for(let i=0;i<segments;i++){const j=(i+1)%segments;f.push([i,j,segments+j],[i,segments+j,segments+i],[bot,j,i],[top,segments+i,segments+j]);}
  addMesh(spec,name,v,f,material,position,[0,0,0],tags);
}
function addCylinderAxis(spec,name,radius,length,position,material,axis='y',segments=12){
  // cylinder built on Z then rotate into requested axis
  const v=[],f=[],z0=-length/2,z1=length/2;
  for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;v.push([Math.cos(a)*radius,Math.sin(a)*radius,z0]);}
  for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;v.push([Math.cos(a)*radius,Math.sin(a)*radius,z1]);}
  const b=v.length;v.push([0,0,z0]);const t=v.length;v.push([0,0,z1]);
  for(let i=0;i<segments;i++){const j=(i+1)%segments;f.push([i,j,segments+j],[i,segments+j,segments+i],[b,j,i],[t,segments+i,segments+j]);}
  const rot=axis==='y'?[Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0];
  addMesh(spec,name,v,f,material,position,rot);
}
function addCone(spec,name,radius,eave,height,position,material,segments=12){
  const v=[],f=[];for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;v.push([Math.cos(a)*radius,Math.sin(a)*radius,eave]);}
  const apex=v.length;v.push([0,0,eave+height]);const center=v.length;v.push([0,0,eave]);
  for(let i=0;i<segments;i++){const j=(i+1)%segments;f.push([i,j,apex],[center,j,i]);}
  addMesh(spec,name,v,f,material,position);
}
function addBoxArch(spec,name,w,h,d,position,material){
  // portal frame made from three boxes; center remains open
  const [x,y,z]=position,post=.34;
  addBox(spec,`${name}_left`,[post,d,h],[x-w/2+post/2,y,z+h/2],material);
  addBox(spec,`${name}_right`,[post,d,h],[x+w/2-post/2,y,z+h/2],material);
  addBox(spec,`${name}_lintel`,[w,d,.36],[x,y,z+h-.18],material);
}
function installPack2Materials(spec,recipe){
  defineMaterial(spec,'waterWood',{color:'#5e412f'});
  defineMaterial(spec,'wetWood',{color:'#44352d'});
  defineMaterial(spec,'waterBlue',{color:'#4e7580',roughness:.25});
  defineMaterial(spec,'sailCloth',{color:'#d8d0b8'});
  defineMaterial(spec,'dockRope',{color:'#8a7353'});
  defineMaterial(spec,'templeStone',{color:'#c5bfae'});
  defineMaterial(spec,'templeDark',{color:'#817d75'});
  defineMaterial(spec,'arcaneStone',{color:'#5f5b78'});
  defineMaterial(spec,'arcaneGlow',{color:'#70a8c8',roughness:.15});
  defineMaterial(spec,'ruinStone',{color:'#77766e'});
  defineMaterial(spec,'ruinDark',{color:'#51524e'});
  defineMaterial(spec,'desertWall',{color:'#c49a6c'});
  defineMaterial(spec,'desertDark',{color:'#8f684c'});
  defineMaterial(spec,'desertCloth',{color:'#a74c3b'});
  defineMaterial(spec,'mineTimber',{color:'#50372b'});
  defineMaterial(spec,'mineRock',{color:'#57534f'});
  defineMaterial(spec,'civicStone',{color:'#a7a9a4'});
  defineMaterial(spec,'civicRoof',{color:'#4e5960'});
  defineMaterial(spec,'sewerStone',{color:'#626764'});
  defineMaterial(spec,'sewerDark',{color:'#252b29'});
  defineMaterial(spec,'metalGate',{color:'#34393c',metalness:.25});
  defineMaterial(spec,'bannerGold',{color:'#b08b3e'});
  defineMaterial(spec,'bannerRed',{color:recipe.style==='grandCity'?'#7c2731':'#6b3e35'});
}
function customBase(recipe,material='stone'){
  const spec=createSceneSpec(recipe);installBuildingMaterials(spec,{...recipe,material});installPack2Materials(spec,recipe);return spec;
}
function finalize(spec,recipe,archetype,template){
  spec.recipe=recipe;spec.metadata={...(spec.metadata||{}),buildingEngine:'1.3.0',rpgPack:'RPG Architecture II',archetype,templateResolved:template};validateSceneSpec(spec);return spec;
}
function addWeather(spec,recipe,r,w,d){
  if(recipe.age==='old'||recipe.condition!=='clean'){
    addBox(spec,'weatherBand',[Math.max(1,w*.58),.04,.15],[0,-d/2-.07,.24],'ruinDark');
  }
  if(recipe.condition==='abandoned'){
    for(let i=0;i<5;i++){const s=range(r,.18,.48);addBox(spec,`debris_${i}`,[s,range(r,.12,.34),range(r,.06,.14)],[range(r,-w*.45,w*.45),-d/2-range(r,.20,.95),s*.12],'ruinStone',[range(r,-.2,.2),range(r,0,3),range(r,-.2,.2)]);}
  }
}
function addWaterWheel(spec,name,x,y,z,radius=1.55){
  addCylinderAxis(spec,`${name}_rim`,radius,.28,[x,y,z],'wetWood','x',16);
  addCylinderAxis(spec,`${name}_hub`,.24,.52,[x,y,z],'waterWood','x',12);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;addBox(spec,`${name}_spoke_${i}`,[.16,.18,radius*1.7],[x,y,z],'waterWood',[a,0,0]);}
  for(let i=0;i<12;i++){const a=i*Math.PI*2/12;const yy=y+Math.cos(a)*radius*.86,zz=z+Math.sin(a)*radius*.86;addBox(spec,`${name}_paddle_${i}`,[.38,.20,.55],[x,yy,zz],'waterWood',[a,0,0]);}
}
function addWindBlades(spec,x,y,z,radius=2.6){
  addCylinderAxis(spec,'windAxle',.18,.70,[x,y,z],'mineTimber','y',12);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;addBox(spec,`windBladeArm_${i}`,[.18,.16,radius*1.75],[x,y-.40,z],'mineTimber',[0,a,0]);
    const bx=x+Math.sin(a)*radius*.62,bz=z+Math.cos(a)*radius*.62;
    addBox(spec,`windSail_${i}`,[.72,.10,1.55],[bx,y-.48,bz],'sailCloth',[0,a,0]);
  }
  addCylinderAxis(spec,'windHub',.28,.48,[x,y-.48,z],'wetWood','y',12);
}
function addDockSegment(spec,name,w,d,x=0,y=0,z=.14){
  addBox(spec,`${name}_deck`,[w,d,.22],[x,y,z],'waterWood');
  const sx=w/2-.28,sy=d/2-.20;
  for(const px of [-sx,sx]) for(const py of [-sy,sy]) addBox(spec,`${name}_post_${px}_${py}`,[.18,.18,1.45],[x+px,y+py,-.45],'wetWood');
  for(const py of [-sy,sy]) addBox(spec,`${name}_rail_${py}`,[w-.45,.10,.12],[x,y+py,z+.72],'waterWood');
}
function addColumns(spec,prefix,count,x0,x1,y,z,h,material='templeStone'){
  for(let i=0;i<count;i++){const x=count===1?0:x0+i*(x1-x0)/(count-1);addCylinder(spec,`${prefix}_${i}`,.22,h,[x,y,z+h/2],material,10);addBox(spec,`${prefix}_cap_${i}`,[.55,.55,.14],[x,y,z+h+.05],material);}
}
function addCrenels(spec,name,w,d,z){
  const mer=.44,gap=.28,step=mer+gap;let k=0;
  for(let x=-w/2+mer/2;x<=w/2-mer/2+.01;x+=step){addBox(spec,`${name}_f${k}`,[mer,.34,.46],[x,-d/2-.17,z],'civicStone');addBox(spec,`${name}_b${k++}`,[mer,.34,.46],[x,d/2+.17,z],'civicStone');}
  k=0;for(let y=-d/2+mer/2;y<=d/2-mer/2+.01;y+=step){addBox(spec,`${name}_l${k}`,[.34,mer,.46],[-w/2-.17,y,z],'civicStone');addBox(spec,`${name}_r${k++}`,[.34,mer,.46],[w/2+.17,y,z],'civicStone');}
}

function generateWatermill(recipe){
  const baseRecipe={...recipe,engineVersion:'1.2.0',family:'farmhouse',style:'oldRpgVillage',material:recipe.material==='auto'?'timberPlaster':recipe.material,roof:recipe.roof==='flat'?'gable':recipe.roof,width:Math.max(7.2,recipe.width),depth:Math.max(5.5,recipe.depth),floors:Math.min(2,recipe.floors),features:{...recipe.features,extension:true,porch:false}};
  const spec=generateBuildingV12(baseRecipe);installPack2Materials(spec,recipe);spec.recipe=recipe;const r=rngFromSeed(recipe.seed^0x7711);
  const w=baseRecipe.width,d=baseRecipe.depth;addWaterWheel(spec,'millWheel',w/2+.42,-.10,1.72,1.72);
  addBox(spec,'millRace',[1.15,d+2.4,.16],[w/2+1.05,.20,.05],'waterBlue');
  addBox(spec,'millFlume',[.85,2.6,.32],[w/2+.95,d/2+.9,1.0],'waterWood',[.06,0,0]);
  addBox(spec,'grainDoor',[1.05,.08,1.35],[-w*.22,-d/2-.07,3.15],'waterWood');
  addWeather(spec,recipe,r,w,d);return finalize(spec,recipe,'watermill','waterMillHouse');
}
function generateWindmill(recipe){
  const spec=customBase(recipe,recipe.material==='auto'?'stone':recipe.material);const r=rngFromSeed(recipe.seed^0x7712);
  const h=5.0+Math.max(0,recipe.floors-2)*.55,baseR=Math.max(1.75,Math.min(2.7,recipe.width*.28));
  addCylinder(spec,'millTower',baseR,h,[0,0,h/2],'wall',12,['structural','windmill']);
  addCone(spec,'millCap',baseR+.20,h,1.55,[0,0,0],'roof',12);
  addBox(spec,'millDoor',[.95,.10,1.92],[0,-baseR-.03,.96],'trim');
  addWindBlades(spec,0,-baseR-.05,h*.66,Math.max(2.35,baseR*1.45));
  for(const x of [-.65,.65]) addBox(spec,`millWindow_${x}`,[.46,.05,.68],[x,-baseR-.05,h*.40],'glass');
  addWeather(spec,recipe,r,baseR*2,baseR*2);return finalize(spec,recipe,'windmill','windmillTower');
}
function generateDock(recipe){
  const spec=customBase(recipe,'wood');const r=rngFromSeed(recipe.seed^0x7713);const w=Math.max(7,recipe.width),d=Math.max(3.2,recipe.depth*.55);
  addDockSegment(spec,'mainPier',w,d,0,0,.14);
  addDockSegment(spec,'fingerPier',Math.max(3,w*.42),1.55,w*.18,d*.55+.72,.12);
  addBox(spec,'mooringPostL',[.22,.22,1.05],[-w*.38,-d*.34,.52],'wetWood');addBox(spec,'mooringPostR',[.22,.22,1.05],[w*.38,-d*.34,.52],'wetWood');
  if(chance(r,.7)){addBox(spec,'dockCranePost',[.22,.22,2.5],[w*.30,d*.18,1.25],'wetWood');addBox(spec,'dockCraneArm',[2.0,.16,.16],[w*.12,d*.18,2.36],'wetWood',[0,-.10,0]);addBox(spec,'dockCraneRope',[.05,.05,1.30],[-w*.03,d*.18,1.68],'dockRope');}
  return finalize(spec,recipe,'dock','dockPier');
}
function generateDockWarehouse(recipe){
  const baseRecipe={...recipe,engineVersion:'1.2.0',family:'barracks',style:'frontierTown',material:recipe.material==='auto'?'wood':recipe.material,width:Math.max(9,recipe.width),depth:Math.max(6,recipe.depth),floors:Math.min(2,recipe.floors),roof:recipe.roof==='flat'?'gable':recipe.roof,features:{...recipe.features,porch:false,sign:true,extension:true}};
  const spec=generateBuildingV12(baseRecipe);installPack2Materials(spec,recipe);spec.recipe=recipe;const w=baseRecipe.width,d=baseRecipe.depth;
  addDockSegment(spec,'loadingDock',Math.min(w*.72,7.5),1.65,0,-d/2-.92,.18);
  addBox(spec,'cargoDoor',[2.2,.09,2.45],[w*.20,-d/2-.08,1.25],'wetWood');
  for(let i=0;i<4;i++){const s=.42;addBox(spec,`cargo_${i}`,[s,s,s],[-w*.28+i*.55,-d/2-1.20,.22],'waterWood',[0,0,(i%2)*.2]);}
  return finalize(spec,recipe,'dockWarehouse','dockWarehouse');
}
function generateTemple(recipe){
  const spec=customBase(recipe,recipe.material==='auto'?'stone':recipe.material);const r=rngFromSeed(recipe.seed^0x7714);const w=Math.max(8,recipe.width),d=Math.max(9,recipe.depth),h=4.0+Math.max(0,recipe.floors-2)*.45,front=-d/2;
  addBox(spec,'templeBase',[w+.8,d+.8,.34],[0,0,.17],'templeDark');addBox(spec,'templeHall',[w,d,h],[0,0,.34+h/2],'templeStone',[0,0,0],['structural','temple']);
  gableRoof(spec,'templeRoof',w+.48,d+.48,.34+h-.02,Math.max(38,recipe.pitch),'roof');
  addBox(spec,'templeStair1',[w*.50,1.0,.14],[0,front-.58,.07],'templeStone');addBox(spec,'templeStair2',[w*.42,.72,.14],[0,front-1.08,.14],'templeStone');addBox(spec,'templeStair3',[w*.34,.48,.14],[0,front-1.45,.21],'templeStone');
  addColumns(spec,'templeColumn',6,-w*.36,w*.36,front-.62,.34,2.85,'templeStone');
  addBox(spec,'templePorticoBeam',[w*.86,.52,.38],[0,front-.62,3.28],'templeStone');
  pyramidRoof(spec,'templePediment',w*.92,1.25,3.42,.78,'civicRoof',[0,front-.48,0]);
  addBox(spec,'templeDoor',[1.55,.08,2.55],[0,front-.05,1.62],'trim');
  if(recipe.roof==='dome'){addCylinder(spec,'templeDrum',1.65,1.05,[0,.35,h+.48],'templeStone',16);addCone(spec,'templeDome',1.78,h+1.0,1.65,[0,.35,0],'civicRoof',16);addCylinder(spec,'templeFinial',.16,.58,[0,.35,h+2.83],'bannerGold',8);}
  if(recipe.wealth==='prosperous'){addBox(spec,'templeBanner',[.70,.04,1.6],[0,front-.42,4.0],'bannerRed');}
  addWeather(spec,recipe,r,w,d);return finalize(spec,recipe,'temple','templeHall');
}
function generateMageTower(recipe){
  const spec=customBase(recipe,recipe.material==='auto'?'stone':recipe.material);const r=rngFromSeed(recipe.seed^0x7715);const round=recipe.template==='mageSpire'||chance(r,.62),h=7.5+Math.max(0,recipe.floors-3)*.75,rad=Math.max(1.75,Math.min(2.8,recipe.width*.26));
  if(round)addCylinder(spec,'mageTowerCore',rad,h,[0,0,h/2],'arcaneStone',14,['structural','mage-tower']);else addBox(spec,'mageTowerCore',[rad*2,rad*2,h],[0,0,h/2],'arcaneStone',[0,0,0],['structural','mage-tower']);
  const balconyR=rad+.48;addCylinder(spec,'mageBalcony',balconyR,.16,[0,0,h*.62],'templeDark',14);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;addBox(spec,`baluster_${i}`,[.12,.12,.74],[Math.cos(a)*balconyR,Math.sin(a)*balconyR,h*.62+.36],'templeDark');}
  addCone(spec,'mageSpire',rad+.34,h,Math.max(2.1,rad*1.0),[0,0,0],'civicRoof',14);
  addBox(spec,'mageDoor',[.96,.08,2.0],[0,-rad-.03,1.0],'trim');
  for(const z of [2.5,4.3,6.0]){addBox(spec,`arcaneWindow_${z}`,[.58,.04,.82],[0,-rad-.045,z],'arcaneGlow');addBox(spec,`arcaneFrame_${z}`,[.72,.07,.10],[0,-rad-.055,z-.46],'templeStone');}
  addCylinder(spec,'crystalBase',.38,.45,[0,0,h+2.15],'templeStone',8);addCone(spec,'crystal',.34,h+2.36,.82,[0,0,0],'arcaneGlow',8);
  addWeather(spec,recipe,r,rad*2,rad*2);return finalize(spec,recipe,'mageTower','mageSpire');
}
function generateRuinedFort(recipe){
  const spec=customBase(recipe,'stone');const r=rngFromSeed(recipe.seed^0x7716);const w=Math.max(10,recipe.width),d=Math.max(7,recipe.depth),h=3.6+Math.max(0,recipe.floors-1)*.35;
  // intentionally incomplete perimeter
  addBox(spec,'ruinBackWall',[w,.68,h],[0,d/2-.34,h/2],'ruinStone');addBox(spec,'ruinLeftWall',[.68,d*.78,h*.86],[-w/2+.34,d*.10,h*.43],'ruinStone');addBox(spec,'ruinRightWall',[.68,d*.55,h*.70],[w/2-.34,d*.20,h*.35],'ruinStone');
  addBox(spec,'ruinFrontL',[w*.32,.68,h*.58],[-w*.34,-d/2+.34,h*.29],'ruinStone');addBox(spec,'ruinFrontR',[w*.23,.68,h*.45],[w*.39,-d/2+.34,h*.225],'ruinStone');
  addBox(spec,'ruinTower',[2.45,2.45,h+1.4],[-w/2+1.4,d/2-1.3,(h+1.4)/2],'ruinDark');
  for(let i=0;i<10;i++){const s=range(r,.22,.68);addBox(spec,`ruinRubble_${i}`,[s,range(r,.18,.55),range(r,.12,.34)],[range(r,-w*.48,w*.48),range(r,-d*.48,d*.48),.12],'ruinStone',[range(r,-.25,.25),range(r,0,3),range(r,-.2,.2)]);}
  if(chance(r,.6))addBox(spec,'ruinBeam',[4.0,.20,.20],[.4,-.2,1.25],'mineTimber',[0,.25,.35]);
  return finalize(spec,recipe,'ruinedFort','ruinedFort');
}
function generateDesertHouse(recipe){
  const spec=customBase(recipe,'timberPlaster');const r=rngFromSeed(recipe.seed^0x7717);const w=Math.max(5.0,recipe.width),d=Math.max(4.2,recipe.depth),floors=Math.min(3,recipe.floors),h=floors*2.25;
  spec.materials.wall.color='#c49a6c';spec.materials.wallDark.color='#9e7759';spec.materials.roof.color='#a67d59';
  addBox(spec,'adobeCore',[w,d,h],[0,0,h/2],'wall',[0,0,0],['structural','desert']);
  addBox(spec,'flatRoof',[w+.28,d+.28,.22],[0,0,h+.11],'desertDark');
  // parapet
  addBox(spec,'parapetFront',[w+.25,.22,.55],[0,-d/2-.03,h+.38],'desertWall');addBox(spec,'parapetBack',[w+.25,.22,.55],[0,d/2+.03,h+.38],'desertWall');
  addBox(spec,'parapetL',[.22,d,.55],[-w/2-.03,0,h+.38],'desertWall');addBox(spec,'parapetR',[.22,d,.55],[w/2+.03,0,h+.38],'desertWall');
  addBox(spec,'desertDoor',[.95,.08,1.9],[0,-d/2-.05,.95],'wetWood');
  for(const x of [-w*.28,w*.28])addBox(spec,`desertWindow_${x}`,[.58,.05,.72],[x,-d/2-.05,1.50],'glass');
  if(recipe.features.porch){addBox(spec,'shadeAwning',[2.7,1.25,.10],[0,-d/2-.65,2.05],'desertCloth',[.10,0,0]);for(const x of [-1.15,1.15])addBox(spec,`awningPost_${x}`,[.10,.10,1.95],[x,-d/2-1.10,.98],'wetWood');}
  if(chance(r,.55))addBox(spec,'roofWaterJar',[.45,.45,.55],[w*.25,d*.15,h+.52],'desertDark');
  addWeather(spec,recipe,r,w,d);return finalize(spec,recipe,'desertHouse','adobeCourtyard');
}
function generateDesertMarket(recipe){
  const spec=generateDesertHouse({...recipe,features:{...recipe.features,porch:false}});spec.recipe=recipe;const w=Math.max(7.5,recipe.width),d=Math.max(5.2,recipe.depth);
  addBox(spec,'bazaarCanopy',[w*.68,2.15,.10],[0,-d/2-1.05,2.25],'desertCloth',[.10,0,0]);
  for(const x of [-w*.28,0,w*.28])addBox(spec,`bazaarPost_${x}`,[.10,.10,2.15],[x,-d/2-1.72,1.08],'wetWood');
  addBox(spec,'marketCounter',[w*.54,.62,.82],[0,-d/2-.62,.41],'waterWood');
  for(let i=0;i<4;i++)addBox(spec,`marketCrate_${i}`,[.42,.42,.34],[-w*.24+i*w*.16,-d/2-1.32,.17],'waterWood');
  spec.metadata={...(spec.metadata||{}),buildingEngine:'1.3.0',rpgPack:'RPG Architecture II',archetype:'desertMarket',templateResolved:'desertBazaar'};validateSceneSpec(spec);return spec;
}
function generateMineEntrance(recipe){
  const spec=customBase(recipe,'stone');const r=rngFromSeed(recipe.seed^0x7718);const w=Math.max(6.5,recipe.width),d=Math.max(3.5,recipe.depth*.55),h=4.0;
  addBox(spec,'mineRockFace',[w,d,h],[0,d*.10,h/2],'mineRock',[0,0,0],['structural','mine']);
  for(const [i,x,z,sx,sz] of [[0,-w*.42,h*.88,1.3,1.1],[1,-w*.18,h*1.02,1.8,.75],[2,w*.20,h*.98,1.55,.92],[3,w*.43,h*.80,1.25,1.35]]) addBox(spec,`mineRockCap_${i}`,[sx,d*.55,sz],[x,d*.22,z],'ruinDark',[0,range(r,-.12,.12),range(r,-.08,.08)]);
  // dark portal recessed at front
  addBox(spec,'mineVoid',[2.35,.10,2.55],[0,-d/2-.05,1.28],'sewerDark');
  addBoxArch(spec,'minePortal',3.15,3.0,.26,[0,-d/2-.12,0],'mineTimber');
  addBox(spec,'mineCrossbeam',[3.55,.30,.24],[0,-d/2-.18,2.76],'mineTimber');
  for(const x of [-1.35,1.35])addBox(spec,`mineBrace_${x}`,[.18,.28,2.7],[x,-d/2-.18,1.35],'mineTimber',[0,x<0?.12:-.12,0]);
  // tracks
  for(const x of [-.38,.38])addBox(spec,`rail_${x}`,[.08,4.2,.06],[x,-d/2-1.85,.05],'metalGate');
  for(let y=-d/2-3.4;y<-d/2+.2;y+=.48)addBox(spec,`tie_${y.toFixed(1)}`,[1.05,.12,.07],[0,y,.04],'mineTimber');
  addBox(spec,'oreCart',[1.15,.90,.68],[w*.30,-d/2-.85,.40],'metalGate');
  if(recipe.condition==='abandoned')addBox(spec,'collapseBeam',[2.6,.20,.20],[.15,-d/2-.35,1.55],'mineTimber',[0,.25,.35]);
  addWeather(spec,recipe,r,w,d);return finalize(spec,recipe,'mineEntrance','minePortal');
}
function generateCityGate(recipe){
  const spec=customBase(recipe,'stone');const r=rngFromSeed(recipe.seed^0x7719);const span=Math.max(13,recipe.width),d=Math.max(6.2,recipe.depth),towerW=Math.min(4.0,span*.26),towerH=7.0+Math.max(0,recipe.floors-3)*.55,gap=span-2*towerW;
  for(const sx of [-1,1]){const x=sx*(span/2-towerW/2);addBox(spec,`cityTower_${sx}`,[towerW,d,towerH],[x,0,towerH/2],'civicStone',[0,0,0],['structural','city-gate']);addBox(spec,`cityTowerBand_${sx}`,[towerW+.12,d+.12,.30],[x,0,towerH*.67],'templeStone');addCrenels(spec,`cityTowerCrenel_${sx}`,towerW,d,towerH+.24);addBox(spec,`cityTowerSlit_${sx}_a`,[.18,.05,.72],[x,-d/2-.04,towerH*.43],'sewerDark');addBox(spec,`cityTowerSlit_${sx}_b`,[.18,.05,.72],[x,-d/2-.04,towerH*.62],'sewerDark');}
  addBox(spec,'cityGateBridge',[gap,d,2.35],[0,0,towerH-1.38],'templeStone');addCrenels(spec,'cityGateTop',gap,d,towerH+.24);addBox(spec,'cityGateCrest',[2.1,.42,.90],[0,-d/2-.20,towerH-.32],'civicStone');
  addBox(spec,'cityGateDark',[gap*.62,.10,3.8],[0,-d/2-.03,1.9],'sewerDark');
  for(let x=-gap*.26;x<=gap*.26;x+=.42)addBox(spec,`cityPort_${x.toFixed(2)}`,[.08,.10,3.55],[x,-d/2-.08,1.78],'metalGate');
  addBox(spec,'cityLintel',[gap*.78,.44,.50],[0,-d/2-.12,4.05],'templeStone');
  for(const x of [-gap*.27,gap*.27]){addBox(spec,`cityBanner_${x}`,[.52,.04,1.55],[x,-d/2-.15,5.15],'bannerRed');addBox(spec,`cityBannerGold_${x}`,[.38,.045,.18],[x,-d/2-.17,5.36],'bannerGold');}
  addWeather(spec,recipe,r,span,d);return finalize(spec,recipe,'cityGate','grandCityGate');
}
function generateSewerEntrance(recipe){
  const spec=customBase(recipe,'stone');const r=rngFromSeed(recipe.seed^0x7720);const w=Math.max(6.5,recipe.width),d=Math.max(3.6,recipe.depth*.50),h=3.3;
  addBox(spec,'sewerRetainingWall',[w,d,h],[0,d*.08,h/2],'sewerStone',[0,0,0],['structural','sewer']);
  addBox(spec,'sewerOpening',[2.5,.12,2.15],[0,-d/2-.04,1.08],'sewerDark');addBoxArch(spec,'sewerArch',3.20,2.72,.28,[0,-d/2-.14,0],'civicStone');
  // grate behind opening
  for(let x=-.86;x<=.86;x+=.28)addBox(spec,`sewerBar_${x.toFixed(2)}`,[.06,.06,1.82],[x,-d/2-.20,.91],'metalGate');
  addBox(spec,'sewerChannel',[2.2,4.3,.10],[0,-d/2-1.85,.04],'waterBlue');
  addBox(spec,'sewerWalkL',[1.25,4.3,.18],[-1.72,-d/2-1.85,.09],'sewerStone');addBox(spec,'sewerWalkR',[1.25,4.3,.18],[1.72,-d/2-1.85,.09],'sewerStone');
  if(chance(r,.6))addCylinderAxis(spec,'drainPipe',.30,1.35,[w*.33,-d/2-.07,1.12],'metalGate','y',12);
  addWeather(spec,recipe,r,w,d);return finalize(spec,recipe,'sewerEntrance','sewerPortal');
}
function generateTownHall(recipe){
  const baseRecipe={...recipe,engineVersion:'1.2.0',family:'guildHall',style:'fortifiedStone',material:recipe.material==='auto'?'stone':recipe.material,width:Math.max(10,recipe.width),depth:Math.max(7.2,recipe.depth),floors:Math.max(2,Math.min(3,recipe.floors)),roof:recipe.roof==='flat'?'hip':recipe.roof,wealth:'prosperous',features:{...recipe.features,sign:false,porch:true,extension:true}};
  const spec=generateBuildingV12(baseRecipe);installPack2Materials(spec,recipe);spec.recipe=recipe;const w=baseRecipe.width,d=baseRecipe.depth,h=baseRecipe.floors*2.45+.28;
  addBox(spec,'civicStair1',[w*.38,1.10,.14],[0,-d/2-.82,.07],'civicStone');addBox(spec,'civicStair2',[w*.30,.75,.14],[0,-d/2-1.34,.14],'civicStone');
  addColumns(spec,'civicColumn',6,-w*.24,w*.24,-d/2-.64,.28,2.70,'civicStone');
  addBox(spec,'civicPortico',[w*.58,1.55,.28],[0,-d/2-.50,3.06],'civicStone');pyramidRoof(spec,'civicPediment',w*.62,1.50,3.20,.80,'civicRoof',[0,-d/2-.48,0]);
  const towerY=-d*.12;addBox(spec,'clockTower',[2.85,2.55,4.4],[0,towerY,h+1.85],'civicStone');pyramidRoof(spec,'clockRoof',3.15,2.85,h+4.02,1.30,'civicRoof',[0,towerY,0]);
  addBox(spec,'clockFace',[.90,.05,.90],[0,towerY-1.30,h+2.55],'templeStone');addBox(spec,'clockHandV',[.05,.03,.56],[0,towerY-1.34,h+2.55],'sewerDark');addBox(spec,'clockHandH',[.46,.03,.05],[.16,towerY-1.34,h+2.55],'sewerDark');
  for(const x of [-w*.28,w*.28])addBox(spec,`civicBanner_${x}`,[.50,.04,1.40],[x,-d/2-.08,3.75],'bannerRed');
  return finalize(spec,recipe,'townHall','civicHall');
}

export function generateBuildingV13(recipe){
  if(!PACK2.has(recipe.family)){
    const spec=generateBuildingV12({...recipe,engineVersion:'1.2.0'});spec.recipe=recipe;spec.metadata={...(spec.metadata||{}),buildingEngine:'1.3.0',compatibilityBase:'1.2.0'};validateSceneSpec(spec);return spec;
  }
  switch(recipe.family){
    case 'watermill': return generateWatermill(recipe);
    case 'windmill': return generateWindmill(recipe);
    case 'dock': return generateDock(recipe);
    case 'dockWarehouse': return generateDockWarehouse(recipe);
    case 'temple': return generateTemple(recipe);
    case 'mageTower': return generateMageTower(recipe);
    case 'ruinedFort': return generateRuinedFort(recipe);
    case 'desertHouse': return generateDesertHouse(recipe);
    case 'desertMarket': return generateDesertMarket(recipe);
    case 'mineEntrance': return generateMineEntrance(recipe);
    case 'cityGate': return generateCityGate(recipe);
    case 'sewerEntrance': return generateSewerEntrance(recipe);
    case 'townHall': return generateTownHall(recipe);
    default: return generateBuildingV12({...recipe,engineVersion:'1.2.0'});
  }
}
