import { generateBuildingV11 } from './building-v1.1.js';
import { createSceneSpec, addBox, addMesh, defineMaterial, validateSceneSpec } from '../core/scene-spec.js';
import { installBuildingMaterials } from '../core/materials.js';
import { rngFromSeed, range, choose, chance } from '../core/rng.js';

const BASE_MAP = {
  peasantHouse: 'cottage',
  farmhouse: 'house',
  smithy: 'shop',
  stable: 'barn',
  guildHall: 'inn',
  merchantHouse: 'house',
  barracks: 'warehouse'
};

const FORTRESS = new Set(['watchtower','gatehouse','keep','castleWall']);
const CUSTOM = new Set(['chapel', ...FORTRESS]);

function addCylinder(spec,name,radius,height,position,material,segments=12,tags=[]){
  const v=[]; const f=[]; const z0=-height/2,z1=height/2;
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments; v.push([Math.cos(a)*radius,Math.sin(a)*radius,z0]);
  }
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments; v.push([Math.cos(a)*radius,Math.sin(a)*radius,z1]);
  }
  const bot=v.length; v.push([0,0,z0]); const top=v.length; v.push([0,0,z1]);
  for(let i=0;i<segments;i++){
    const j=(i+1)%segments;
    f.push([i,j,segments+j],[i,segments+j,segments+i]);
    f.push([bot,j,i]); f.push([top,segments+i,segments+j]);
  }
  addMesh(spec,name,v,f,material,position,[0,0,0],tags);
}

function addConeRoof(spec,name,radius,eave,height,position,material,segments=12){
  const v=[]; const f=[];
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments; v.push([Math.cos(a)*radius,Math.sin(a)*radius,eave]);
  }
  const apex=v.length; v.push([0,0,eave+height]);
  const center=v.length; v.push([0,0,eave]);
  for(let i=0;i<segments;i++){
    const j=(i+1)%segments; f.push([i,j,apex]); f.push([center,j,i]);
  }
  addMesh(spec,name,v,f,material,position);
}

function gableRoof(spec,name,w,d,eave,pitch,material,pos=[0,0,0]){
  const rise=(d/2)*Math.tan(pitch*Math.PI/180),x=w/2,y=d/2,z=eave;
  addMesh(spec,name,[[-x,-y,z],[x,-y,z],[-x,y,z],[x,y,z],[-x,0,z+rise],[x,0,z+rise]],[[0,1,5],[0,5,4],[2,4,5],[2,5,3],[0,4,2],[1,3,5]],material,pos);
}

function pyramidRoof(spec,name,w,d,eave,height,material,pos=[0,0,0]){
  const x=w/2,y=d/2; const v=[[-x,-y,eave],[x,-y,eave],[x,y,eave],[-x,y,eave],[0,0,eave+height]];
  addMesh(spec,name,v,[[0,1,4],[1,2,4],[2,3,4],[3,0,4],[0,3,2],[0,2,1]],material,pos);
}

function installRpgMaterials(spec,recipe){
  if(!spec.materials.wallSecondary) defineMaterial(spec,'wallSecondary',{color:spec.materials.wallDark?.color||'#686c70'});
  if(!spec.materials.accentWood) defineMaterial(spec,'accentWood',{color:spec.materials.trim?.color||'#8a5d3d'});
  defineMaterial(spec,'rpgStoneDark',{color:'#55575a'});
  defineMaterial(spec,'rpgStoneLight',{color:'#9a9b96'});
  defineMaterial(spec,'rpgWoodDark',{color:'#4a3326'});
  defineMaterial(spec,'rpgWoodLight',{color:'#8d6849'});
  defineMaterial(spec,'rpgThatch',{color:'#8c7346'});
  defineMaterial(spec,'rpgTileOld',{color:'#7b4035'});
  defineMaterial(spec,'rpgBanner',{color: recipe.style==='castleKeep' ? '#7b2731' : '#314f76'});
  defineMaterial(spec,'rpgMetalDark',{color:'#373b3d',metalness:.25,roughness:.75});
  defineMaterial(spec,'rpgForge',{color:'#2e2925'});
  defineMaterial(spec,'rpgMoss',{color:'#53664a'});
  defineMaterial(spec,'rpgHay',{color:'#a58b4f'});
}

function retoneRpg(spec,recipe){
  installRpgMaterials(spec,recipe);
  if(recipe.style==='oldRpgVillage'||recipe.style==='rusticVillage'){
    if(spec.materials.roof) spec.materials.roof.color=recipe.wealth==='poor'?'#7a6440':'#88483b';
    if(spec.materials.roofDark) spec.materials.roofDark.color=recipe.wealth==='poor'?'#5f4b31':'#62352f';
  }
  if(recipe.style==='frontierTown'){
    if(spec.materials.wall) spec.materials.wall.color='#8b6a49';
    if(spec.materials.wallDark) spec.materials.wallDark.color='#664a35';
  }
}

function crossWindow(spec,name,x,y,z,side='front',scale=1,slit=false){
  if(slit){
    if(side==='front') addBox(spec,name,[.16,.045,.62*scale],[x,y,z],'dark');
    else addBox(spec,name,[.045,.16,.62*scale],[x,y,z],'dark');
    return;
  }
  const ww=.72*scale,wh=.92*scale;
  if(side==='front'){
    addBox(spec,`${name}_g`,[ww,.04,wh],[x,y,z],'glass');
    addBox(spec,`${name}_v`,[.06,.025,wh-.06],[x,y-.02,z],'trim');
    addBox(spec,`${name}_h`,[ww-.04,.025,.06],[x,y-.02,z],'trim');
    addBox(spec,`${name}_s`,[ww+.16,.10,.08],[x,y-.03,z-wh/2-.03],'stoneLight');
  }else{
    addBox(spec,`${name}_g`,[.04,ww,wh],[x,y,z],'glass');
    addBox(spec,`${name}_v`,[.025,.06,wh-.06],[x+.02,y,z],'trim');
    addBox(spec,`${name}_h`,[.025,ww-.04,.06],[x+.02,y,z],'trim');
    addBox(spec,`${name}_s`,[.10,ww+.16,.08],[x+.03,y,z-wh/2-.03],'stoneLight');
  }
}

function addCrenellationsRect(spec,name,w,d,z,material='rpgStoneLight',merlon=.42,gap=.30,depth=.34){
  const step=merlon+gap;
  let idx=0;
  for(let x=-w/2+merlon/2;x<=w/2-merlon/2+.01;x+=step){
    addBox(spec,`${name}_front_${idx}`,[merlon,depth,.48],[x,-d/2-depth/2,z],'rpgStoneLight');
    addBox(spec,`${name}_back_${idx}`,[merlon,depth,.48],[x,d/2+depth/2,z],'rpgStoneLight'); idx++;
  }
  idx=0;
  for(let y=-d/2+merlon/2;y<=d/2-merlon/2+.01;y+=step){
    addBox(spec,`${name}_left_${idx}`,[depth,merlon,.48],[-w/2-depth/2,y,z],'rpgStoneLight');
    addBox(spec,`${name}_right_${idx}`,[depth,merlon,.48],[w/2+depth/2,y,z],'rpgStoneLight'); idx++;
  }
}

function addCrenellationsRound(spec,name,radius,z,count=12){
  for(let i=0;i<count;i++){
    const a=i*Math.PI*2/count; const x=Math.cos(a)*(radius+.04),y=Math.sin(a)*(radius+.04);
    addBox(spec,`${name}_${i}`,[.42,.42,.48],[x,y,z],'rpgStoneLight',[0,0,a]);
  }
}

function addBanner(spec,name,x,y,z,side='front',scale=1){
  if(side==='front'){
    addBox(spec,`${name}_bar`,[.55*scale,.07,.07],[x,y,z+.42*scale],'rpgWoodDark');
    addBox(spec,`${name}_cloth`,[.38*scale,.035,.74*scale],[x,y-.025,z],'rpgBanner');
  }else{
    addBox(spec,`${name}_bar`,[.07,.55*scale,.07],[x,y,z+.42*scale],'rpgWoodDark');
    addBox(spec,`${name}_cloth`,[.035,.38*scale,.74*scale],[x+.025,y,z],'rpgBanner');
  }
}

function addFirewood(spec,r,x,y){
  for(let i=0;i<6;i++){
    const z=.10+(i%2)*.13; addBox(spec,`firewood_${i}`,[.56,.12,.12],[x+range(r,-.18,.18),y+Math.floor(i/2)*.12,z],'rpgWoodDark',[0,range(r,-.15,.15),range(r,-.12,.12)]);
  }
}

function addRpgVillageIdentity(spec,recipe,r){
  const w=recipe.width,d=recipe.depth,base=.28,frontY=-d/2-.09;
  retoneRpg(spec,recipe);
  if(recipe.family==='peasantHouse'){
    addBox(spec,'hearthStone',[1.05,.14,.56],[-w*.25,frontY,base+.30],'stone');
    addBox(spec,'woodRack',[1.20,.42,.62],[w/2+.28,-d/2+.60,.31],'rpgWoodDark');
    addFirewood(spec,r,w/2+.30,-d/2+.58);
    if(recipe.age==='old') addBox(spec,'patchedWall',[1.0,.03,.68],[w*.24,frontY-.02,base+1.55],'board',[0,0,.09]);
  }
  if(recipe.family==='farmhouse'){
    const x=w/2+.85; addBox(spec,'farmLeanTo',[1.55,2.2,1.35],[x,.35,.68],'wallSecondary');
    gableRoof(spec,'farmLeanRoof',1.85,2.45,1.34,27,'roofDark',[x,.35,0]);
    addBox(spec,'hayStack',[.90,.70,.72],[x,-.65,.36],'rpgHay');
    addFirewood(spec,r,-w/2-.42,-d/2+.62);
  }
  if(recipe.family==='smithy'){
    addBox(spec,'forgeChimney',[.78,.82,2.55],[w*.30,d*.08,3.35],'rpgStoneDark');
    addBox(spec,'forgeCap',[.94,.98,.18],[w*.30,d*.08,4.64],'rpgStoneLight');
    addBox(spec,'forgeWorkPad',[2.7,1.35,.16],[w*.15,-d/2-.78,.08],'stoneLight');
    addBox(spec,'anvilBase',[.34,.34,.48],[w*.28,-d/2-1.00,.24],'rpgWoodDark');
    addBox(spec,'anvil',[.72,.26,.22],[w*.28,-d/2-1.00,.57],'rpgMetalDark');
    addBox(spec,'coalBin',[.75,.58,.45],[-w*.30,-d/2-.94,.225],'rpgForge');
  }
  if(recipe.family==='stable'){
    const doorW=Math.min(1.5,w*.20); for(const sx of [-.28,.28]){
      addBox(spec,`stableDoor_${sx}`,[doorW,.09,2.10],[sx*w,frontY,base+1.05],'rpgWoodDark');
      addBox(spec,`stableCross_${sx}`,[doorW*.90,.03,.11],[sx*w,frontY-.05,base+1.05],'rpgWoodLight',[0,0,sx>0?.45:-.45]);
    }
    addBox(spec,'hayLoftDoor',[1.25,.06,1.25],[0,frontY,base+3.35],'rpgWoodDark');
    addBox(spec,'hayBale',[1.0,.72,.62],[w/2+.55,-d/2+.55,.31],'rpgHay');
  }
  if(recipe.family==='guildHall'){
    addBanner(spec,'guildBannerL',-w*.29,frontY-.04,base+2.35,'front',1.0);
    addBanner(spec,'guildBannerR',w*.29,frontY-.04,base+2.35,'front',1.0);
    addBox(spec,'guildSign',[1.60,.10,.54],[0,frontY-.11,base+2.70],'trim');
  }
  if(recipe.family==='merchantHouse'){
    addBox(spec,'merchantCanopy',[3.0,1.0,.14],[0,frontY-.52,base+2.08],'roofDark',[.12,0,0]);
    addBanner(spec,'merchantBanner',-w*.36,frontY-.04,base+2.55,'front',.8);
    if(recipe.floors>=2) addBox(spec,'merchantBalcony',[2.7,.84,.14],[w*.16,frontY-.42,base+2.78],'rpgWoodLight');
  }
  if(recipe.family==='barracks'){
    addBox(spec,'weaponRack',[1.8,.30,.95],[w/2+.20,-d/2+.75,.48],'rpgWoodDark');
    for(let i=0;i<3;i++) addBox(spec,`rackSpear_${i}`,[.06,.06,1.45],[w/2+.12,-d/2+.48+i*.16,1.10],'rpgMetalDark',[0,.12,0]);
  }
}

function rpgBaseRecipe(recipe){
  const baseFamily=BASE_MAP[recipe.family]||recipe.family;
  let template=recipe.template;
  const rpgTemplateMap={hearthHouse:'compact',longhouse:'wideFront',smithyYard:'workshop',guildHall:'wideFront',barracksHall:'wideFront'};
  if(rpgTemplateMap[template]) template=rpgTemplateMap[template];
  let facade=recipe.facade;
  let roof=recipe.roof;
  const mapped={...recipe,engineVersion:'1.1.0',family:baseFamily};
  if(recipe.family==='peasantHouse'){
    mapped.floors=Math.min(recipe.floors,2); mapped.width=Math.min(recipe.width,6.7); mapped.depth=Math.min(recipe.depth,5.8);
    if(template==='auto') template=choose(rngFromSeed(recipe.seed^0x901),['compact','sideWing','stepped']);
    if(facade==='auto') facade='rural'; if(recipe.roof==='flat') roof='gable';
  }else if(recipe.family==='farmhouse'){
    mapped.floors=Math.min(recipe.floors,2); mapped.width=Math.max(recipe.width,7.0); mapped.depth=Math.max(recipe.depth,5.2);
    if(template==='auto') template=choose(rngFromSeed(recipe.seed^0x902),['lWing','sideWing','wideFront']); if(facade==='auto') facade='rural';
  }else if(recipe.family==='smithy'){
    mapped.floors=Math.min(recipe.floors,2); mapped.width=Math.max(recipe.width,6.2); if(template==='auto') template='workshop'; if(facade==='auto') facade='workshop'; mapped.features={...recipe.features,chimney:true,sign:true};
  }else if(recipe.family==='stable'){
    mapped.floors=Math.min(recipe.floors,2); mapped.width=Math.max(recipe.width,7.5); mapped.depth=Math.max(recipe.depth,5.7); if(template==='auto') template='wideFront'; if(facade==='auto') facade='workshop'; mapped.features={...recipe.features,porch:false,sign:false};
  }else if(recipe.family==='guildHall'){
    mapped.floors=Math.max(2,recipe.floors); mapped.width=Math.max(recipe.width,8.0); if(template==='auto') template=choose(rngFromSeed(recipe.seed^0x903),['wideFront','twinWing','courtyardFront']); if(facade==='auto') facade='symmetric'; mapped.wealth=recipe.wealth==='poor'?'modest':recipe.wealth; mapped.features={...recipe.features,sign:true};
  }else if(recipe.family==='merchantHouse'){
    mapped.floors=Math.max(2,recipe.floors); if(template==='auto') template=choose(rngFromSeed(recipe.seed^0x904),['tallNarrow','lWing','stepped']); if(facade==='auto') facade=choose(rngFromSeed(recipe.seed^0x905),['storefront','symmetric']); mapped.wealth=recipe.wealth==='poor'?'modest':recipe.wealth;
  }else if(recipe.family==='barracks'){
    mapped.floors=Math.min(2,recipe.floors); mapped.width=Math.max(recipe.width,9.0); mapped.depth=Math.max(recipe.depth,5.5); if(template==='auto') template='wideFront'; if(facade==='auto') facade='workshop'; mapped.material='stone'; mapped.features={...recipe.features,porch:false,sign:false};
  }
  mapped.template=template; mapped.facade=facade; mapped.roof=roof;
  return mapped;
}


function applyCustomCondition(spec,recipe,r,w,d,h){
  if(recipe.condition==='clean'&&recipe.age!=='old') return;
  const frontY=-d/2-.055;
  addBox(spec,'weatherCourse',[Math.max(1,w*.58),.035,.18],[0,frontY,h*.24],'rpgMoss');
  if(recipe.condition==='abandoned'){
    const count=Math.max(4,Math.min(10,Math.round(w*.65)));
    for(let i=0;i<count;i++){
      const sx=range(r,-w*.52,w*.52),sy=range(r,-d*.60,-d*.38),sz=range(r,.06,.18);
      addBox(spec,`rubble_${i}`,[range(r,.22,.62),range(r,.18,.48),sz],[sx,sy,sz/2],'stone',[range(r,-.25,.25),range(r,0,3.1),range(r,-.25,.25)]);
    }
  }
}

function customBase(recipe){
  const spec=createSceneSpec(recipe); installBuildingMaterials(spec,recipe); installRpgMaterials(spec,recipe); return spec;
}

function generateChapel(recipe){
  const spec=customBase({...recipe,material:recipe.material==='auto'?'stone':recipe.material}); const r=rngFromSeed(recipe.seed^0xc401);
  const w=Math.max(5.2,recipe.width),d=Math.max(7.2,recipe.depth),base=.30,naveH=3.5,frontY=-d/2-.05;
  addBox(spec,'chapelFoundation',[w+.16,d+.16,base],[0,0,base/2],'stone');
  addBox(spec,'nave',[w,d,naveH],[0,0,base+naveH/2],'wall',[0,0,0],['structural','rpg-chapel']);
  gableRoof(spec,'naveRoof',w+.42,d+.48,base+naveH-.02,Math.max(46,recipe.pitch),'roof');
  const tw=Math.min(2.2,w*.34),td=2.1,th=5.4;
  addBox(spec,'bellTower',[tw,td,th],[0,-d/2+td*.38,base+th/2],'wallSecondary');
  pyramidRoof(spec,'bellTowerRoof',tw+.24,td+.24,base+th-.02,1.45,'roofDark',[0,-d/2+td*.38,0]);
  addBox(spec,'chapelDoor',[1.15,.09,2.2],[0,frontY,base+1.10],'rpgWoodDark');
  addBox(spec,'doorArchLintel',[1.42,.12,.22],[0,frontY-.02,base+2.22],'stoneLight');
  for(const x of [-w*.28,w*.28]) crossWindow(spec,`frontTall_${x}`,x,frontY,base+2.05,'front',.58);
  for(const y of [-d*.18,d*.10,d*.34]){
    crossWindow(spec,`sideR_${y}`,w/2+.055,y,base+2.0,'side',.55);
    crossWindow(spec,`sideL_${y}`,-w/2-.055,y,base+2.0,'side',.55);
  }
  // simple rear apse / shrine volume
  const apseD=1.4; addBox(spec,'apse',[w*.52,apseD,2.55],[0,d/2+apseD/2-.12,base+1.28],'wallSecondary');
  gableRoof(spec,'apseRoof',w*.56,apseD+.24,base+2.52,38,'roofDark',[0,d/2+apseD/2-.12,0]);
  addBanner(spec,'chapelBanner',0,frontY-.08,base+3.45,'front',.72);
  if(recipe.age==='old'&&chance(r,.7)) addBox(spec,'mossCourse',[w*.72,.05,.24],[0,frontY-.07,base+.18],'rpgMoss');
  applyCustomCondition(spec,recipe,r,w,d,base+naveH);
  spec.metadata={buildingEngine:'1.2.0',rpgPack:'RPG Architecture I',archetype:'chapel',templateResolved:'chapelNave'};
  validateSceneSpec(spec); return spec;
}

function generateWatchtower(recipe){
  const spec=customBase({...recipe,material:'stone'}); const r=rngFromSeed(recipe.seed^0xa771);
  const round=recipe.template==='roundTower'||(recipe.template==='auto'&&chance(r,.48)); const floors=Math.max(2,recipe.floors),height=3.2+floors*1.45;
  if(round){
    const rad=Math.max(1.65,Math.min(3.0,recipe.width*.30)); addCylinder(spec,'roundTower',rad,height,[0,0,height/2],'wall',12,['structural','rpg-tower']);
    addCrenellationsRound(spec,'roundCrenel',rad,height+.24,12);
    for(let i=0;i<4;i++){const a=i*Math.PI/2; const x=Math.cos(a)*(rad+.03),y=Math.sin(a)*(rad+.03); if(Math.abs(y)>Math.abs(x)) crossWindow(spec,`slit_${i}`,x,y,height*.58,'front',1,true); else crossWindow(spec,`slit_${i}`,x,y,height*.58,'side',1,true);}
    addBox(spec,'towerDoor',[.95,.10,1.95],[0,-rad-.04,.98],'rpgWoodDark');
    if(recipe.roof==='conical') addConeRoof(spec,'towerCone',rad+.28,height,1.75,[0,0,0],'roof',12);
  }else{
    const w=Math.max(3.2,Math.min(5.0,recipe.width*.55)),d=Math.max(3.2,Math.min(5.0,recipe.depth*.65));
    addBox(spec,'squareTower',[w,d,height],[0,0,height/2],'wall',[0,0,0],['structural','rpg-tower']); addCrenellationsRect(spec,'towerCrenel',w,d,height+.24);
    addBox(spec,'towerDoor',[1.0,.10,2.0],[0,-d/2-.04,1.0],'rpgWoodDark');
    for(const z of [height*.42,height*.68]) for(const x of [-w*.22,w*.22]) crossWindow(spec,`slit_${z}_${x}`,x,-d/2-.055,z,'front',1,true);
    if(recipe.roof==='conical') pyramidRoof(spec,'towerPyramid',w+.28,d+.28,height,1.65,'roof');
  }
  applyCustomCondition(spec,recipe,r,round?6:5,round?6:5,height);
  spec.metadata={buildingEngine:'1.2.0',rpgPack:'RPG Architecture I',archetype:'watchtower',templateResolved:round?'roundTower':'squareTower'}; validateSceneSpec(spec); return spec;
}

function addGateTower(spec,name,x,towerW,towerD,towerH,round=false){
  if(round){ addCylinder(spec,name,towerW/2,towerH,[x,0,towerH/2],'wall',12,['structural','rpg-gate-tower']); addCrenellationsRound(spec,`${name}_crenel`,towerW/2,towerH+.24,10); }
  else { addBox(spec,name,[towerW,towerD,towerH],[x,0,towerH/2],'wall',[0,0,0],['structural','rpg-gate-tower']); addCrenellationsRect(spec,`${name}_crenel`,towerW,towerD,towerH+.24); }
}

function generateGatehouse(recipe){
  const spec=customBase({...recipe,material:'stone'}); const r=rngFromSeed(recipe.seed^0x6a7e);
  const span=Math.max(8.0,recipe.width),depth=Math.max(4.3,recipe.depth),towerW=Math.min(3.4,span*.30),towerH=6.2+Math.max(0,recipe.floors-2)*.8,round=recipe.template==='twinRoundGate'||recipe.template==='roundTower'||(recipe.template==='auto'&&chance(r,.35));
  const towerX=span/2-towerW/2; addGateTower(spec,'gateTowerL',-towerX,towerW,depth,towerH,round); addGateTower(spec,'gateTowerR',towerX,towerW,depth,towerH,round);
  const gap=span-2*towerW+.12,bridgeH=2.35; addBox(spec,'gateUpper',[gap,depth,bridgeH],[0,0,towerH-bridgeH/2-.35],'wallSecondary',[0,0,0],['structural']);
  addCrenellationsRect(spec,'gateUpperCrenel',gap,depth,towerH+.22);
  // gate opening is intentionally open; dark recessed portcullis sits behind it
  addBox(spec,'portcullis',[gap*.56,.09,3.2],[0,depth*.22,1.60],'rpgMetalDark');
  for(let x=-gap*.25;x<=gap*.25;x+=.34) addBox(spec,`portBar_${x.toFixed(2)}`,[.07,.045,3.08],[x,depth*.17,1.58],'rpgMetalDark');
  addBox(spec,'gateLintel',[gap*.68,.34,.44],[0,-depth/2-.04,3.38],'stoneLight');
  addBanner(spec,'gateBannerL',-gap*.28,-depth/2-.09,4.65,'front',.9); addBanner(spec,'gateBannerR',gap*.28,-depth/2-.09,4.65,'front',.9);
  applyCustomCondition(spec,recipe,r,span,depth,towerH);
  spec.metadata={buildingEngine:'1.2.0',rpgPack:'RPG Architecture I',archetype:'gatehouse',templateResolved:round?'twinRoundGate':'twinSquareGate'}; validateSceneSpec(spec); return spec;
}

function generateKeep(recipe){
  const spec=customBase({...recipe,material:'stone'}); const r=rngFromSeed(recipe.seed^0x4ee9);
  const w=Math.max(9,recipe.width),d=Math.max(7,recipe.depth),h=6.4+Math.max(0,recipe.floors-2)*1.15;
  addBox(spec,'keepCore',[w,d,h],[0,0,h/2],'wall',[0,0,0],['structural','rpg-keep']); addCrenellationsRect(spec,'keepCoreCrenel',w,d,h+.24);
  const tw=Math.min(2.3,w*.22),td=Math.min(2.3,d*.28),th=h+1.15;
  for(const sx of [-1,1]) for(const sy of [-1,1]){
    const x=sx*(w/2-tw*.38),y=sy*(d/2-td*.38); addBox(spec,`cornerTower_${sx}_${sy}`,[tw,td,th],[x,y,th/2],'wallSecondary'); addCrenellationsRect(spec,`cornerCrenel_${sx}_${sy}`,tw,td,th+.24,'rpgStoneLight',.30,.20,.26);
  }
  addBox(spec,'keepDoor',[1.55,.12,2.65],[0,-d/2-.055,1.33],'rpgWoodDark'); addBox(spec,'keepDoorLintel',[2.0,.22,.38],[0,-d/2-.08,2.72],'stoneLight');
  for(const z of [2.0,4.15]) for(const x of [-w*.28,0,w*.28]) crossWindow(spec,`keepSlit_${z}_${x}`,x,-d/2-.07,z,'front',1,true);
  if(recipe.wealth==='prosperous'||chance(r,.65)){addBanner(spec,'keepBannerL',-w*.18,-d/2-.10,4.9,'front',1.05); addBanner(spec,'keepBannerR',w*.18,-d/2-.10,4.9,'front',1.05);}
  applyCustomCondition(spec,recipe,r,w,d,h);
  spec.metadata={buildingEngine:'1.2.0',rpgPack:'RPG Architecture I',archetype:'keep',templateResolved:'keepBlock'}; validateSceneSpec(spec); return spec;
}

function generateCastleWall(recipe){
  const spec=customBase({...recipe,material:'stone'}); const r=rngFromSeed(recipe.seed^0xca571e);
  const w=Math.max(8,recipe.width),d=Math.max(2.0,Math.min(3.5,recipe.depth*.42)),h=3.5+Math.max(0,recipe.floors-1)*.55;
  addBox(spec,'wallBody',[w,d,h],[0,0,h/2],'wall',[0,0,0],['structural','rpg-wall']); addCrenellationsRect(spec,'wallCrenel',w,d,h+.24);
  addBox(spec,'walkway',[w-.45,d-.30,.14],[0,0,h+.07],'stoneLight');
  // buttresses create old fortress rhythm
  for(let x=-w/2+.65;x<=w/2-.55;x+=2.0){addBox(spec,`buttressF_${x.toFixed(1)}`,[.42,.62,h*.72],[x,-d/2-.25,h*.36],'wallSecondary'); addBox(spec,`buttressB_${x.toFixed(1)}`,[.42,.62,h*.72],[x,d/2+.25,h*.36],'wallSecondary');}
  applyCustomCondition(spec,recipe,r,w,d,h);
  spec.metadata={buildingEngine:'1.2.0',rpgPack:'RPG Architecture I',archetype:'castleWall',templateResolved:'wallSegment'}; validateSceneSpec(spec); return spec;
}

export function generateBuildingV12(recipe){
  if(recipe.family==='chapel') return generateChapel(recipe);
  if(recipe.family==='watchtower') return generateWatchtower(recipe);
  if(recipe.family==='gatehouse') return generateGatehouse(recipe);
  if(recipe.family==='keep') return generateKeep(recipe);
  if(recipe.family==='castleWall') return generateCastleWall(recipe);

  const mapped=rpgBaseRecipe(recipe);
  const spec=generateBuildingV11(mapped);
  spec.recipe=recipe;
  const r=rngFromSeed(recipe.seed^0x12f00d);
  addRpgVillageIdentity(spec,recipe,r);
  spec.metadata={...(spec.metadata||{}),buildingEngine:'1.2.0',rpgPack:'RPG Architecture I',archetype:recipe.family,baseFamily:BASE_MAP[recipe.family]||recipe.family};
  validateSceneSpec(spec);
  return spec;
}
