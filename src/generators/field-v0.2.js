import { rngFromSeed, range, choose, chance } from '../core/rng.js';
import { createSceneSpec, validateSceneSpec } from '../core/scene-spec.js';
import { normalizeRecipe, validateRecipe } from '../core/recipe.js';
import { attachAssetMetadata } from '../core/asset-schema.js';
import { generateBuilding } from './building.js';
import { generateBuildingV11 } from './building-v1.1.js';
import { generateBuildingV12 } from './building-v1.2.js';
import { generateBuildingV13 } from './building-v1.3.js';
import { generateProp } from './prop.js';
import { generateSurface } from './surface.js';
import { generateFoliage } from './foliage.js';

function childScene(raw){
  const recipe=normalizeRecipe(raw);
  let spec;
  if(recipe.type==='prop') spec=generateProp(recipe);
  else if(recipe.type==='surface') spec=generateSurface(recipe);
  else if(recipe.type==='foliage') spec=generateFoliage(recipe);
  else if(recipe.engineVersion==='1.3.0') spec=generateBuildingV13(recipe);
  else if(recipe.engineVersion==='1.2.0') spec=generateBuildingV12(recipe);
  else if(recipe.engineVersion==='1.1.0') spec=generateBuildingV11(recipe);
  else spec=generateBuilding(recipe);
  return attachAssetMetadata(spec);
}

function seedFrom(r){ return Math.floor(range(r,10000,999999)); }

function building(seed,engine,family,style,opts={}){
  return {
    type:'building',engineVersion:engine,seed,family,style,material:opts.material||'auto',condition:opts.condition||'clean',
    width:opts.width||6.5,depth:opts.depth||4.8,floors:opts.floors||2,roof:opts.roof||'gable',pitch:opts.pitch||42,
    template:opts.template||'auto',facade:opts.facade||'auto',wealth:opts.wealth||'modest',age:opts.age||'mature',construction:opts.construction||'auto',
    features:{chimney:opts.chimney??true,porch:opts.porch??true,sign:opts.sign??false,extension:opts.extension??true}
  };
}
function prop(seed,family,opts={}){
  return {type:'prop',seed,family,style:opts.style||'village',condition:opts.condition||'clean',scale:opts.scale||1,variant:opts.variant||'auto'};
}
function surface(seed,type,size,pattern,pathMaterial='dirt',opts={}){
  return {type:'surface',seed,surface:type,size,variation:opts.variation??.58,wear:opts.wear??.28,pathPattern:pattern,pathWidth:opts.pathWidth??2.5,pathMaterial,detailDensity:opts.detailDensity??.42,edgeBlend:opts.edgeBlend??true,gridResolution:opts.gridResolution??40};
}
function foliage(seed,family,opts={}){
  return {type:'foliage',seed,family,biome:opts.biome||'temperate',variant:opts.variant||'auto',condition:opts.condition||'healthy',scale:opts.scale||1,density:opts.density??.55,spread:opts.spread??1};
}
function place(id,label,recipe,position=[0,0,0],rotation=0,scale=1,locked=false,selectable=true,allowOverlap=false){
  return {id,label,recipe,position,rotation,scale,locked,selectable,allowOverlap};
}

const presetSurface={
  villageWellSquare:['grass','plaza','dirt'], ruralHouseLane:['grass','curve','dirt'], marketCorner:['wornVillage','tee','cobblestone'],
  castleCourtyard:['stone','plaza','stone'], castleGateApproach:['grass','straight','dirt'], mountainPath:['rocky','curve','dirt'],
  mineEntranceClearing:['rocky','straight','dirt'], desertMarket:['sand','plaza','sand'], docksideLane:['cobblestone','straight','cobblestone']
};

function resolveSurface(recipe,preset){
  const [base,pattern,pathMat]=presetSurface[preset]||presetSurface.villageWellSquare;
  return [recipe.surface==='auto'?base:recipe.surface,pattern,pathMat];
}

function generatedPlacements(recipe){
  const r=rngFromSeed(recipe.seed),E=recipe.buildingEngine||'1.3.0',S=recipe.size,p=recipe.preset;
  const [surfaceType,pathPattern,pathMat]=resolveSurface(recipe,p);
  const out=[place('surface','Field Surface',surface(seedFrom(r),surfaceType,S,pathPattern,pathMat,{variation:.52+recipe.dressing*.18,wear:.18+recipe.dressing*.25,detailDensity:Math.min(1,.14+recipe.dressing*.44+recipe.density*.16),pathWidth:Math.max(2.2,S*.085)}),[0,0,0],0,1,true,false)];
  const add=(...args)=>out.push(place(...args));

  if(p==='villageWellSquare'){
    add('inn','Village Inn',building(seedFrom(r),E,'inn','oldRpgVillage',{width:8.2,depth:5.7,floors:2,roof:'hip',wealth:'modest',age:'old',sign:true}),[0,9.5,0],0);
    add('houseW','West House',building(seedFrom(r),E,'peasantHouse','rusticVillage',{width:6.1,depth:4.8,floors:2,age:'old'}),[-11.2,0.0,0],-Math.PI/2);
    add('shopE','East Shop',building(seedFrom(r),E,'shop','oldRpgVillage',{width:6.3,depth:4.7,floors:2,sign:true}),[11.2,0.0,0],Math.PI/2);
    add('well','Village Well',prop(seedFrom(r),'well',{variant:'roofed',scale:1.0}),[0,0,0]);
    add('fenceA','Fence',prop(seedFrom(r),'fence',{variant:'straight',scale:1}),[-8,-6.8,0],0);
    add('fenceB','Fence',prop(seedFrom(r),'fence',{variant:'corner',scale:.9}),[7,-6.6,0],Math.PI);
    add('sign','Village Sign',prop(seedFrom(r),'signpost',{scale:.9}),[-3.0,-5.7,0]);
    add('supplies','Supplies',prop(seedFrom(r),'supplies',{variant:'cluster',scale:.8}),[4.8,-3.2,0]);
  } else if(p==='ruralHouseLane'){
    add('farm','Farmhouse',building(seedFrom(r),E,'farmhouse','rusticVillage',{width:7.8,depth:5.5,floors:2,age:'old',wealth:'modest'}),[-6.8,7.2,0],-.12);
    add('cottage','Cottage',building(seedFrom(r),E,'cottage','oldRpgVillage',{width:5.5,depth:4.3,floors:1,age:'old',wealth:'poor'}),[6.6,3.2,0],.24);
    add('barn','Barn',building(seedFrom(r),E,'barn','rusticVillage',{width:8.2,depth:6.0,floors:2,roof:'gambrel',porch:false,sign:false}),[-7.2,-5.8,0],-.08);
    add('fence1','Lane Fence',prop(seedFrom(r),'fence',{variant:'straight',scale:1.2}),[7.2,-6.2,0],.12);
    add('fence2','Lane Fence',prop(seedFrom(r),'fence',{variant:'corner',scale:1.1}),[12.0,-4.0,0],Math.PI/2);
    add('sign','Road Sign',prop(seedFrom(r),'signpost',{condition:'worn',scale:.85}),[0.0,-7.2,0]);
  } else if(p==='marketCorner'){
    add('merchant','Merchant House',building(seedFrom(r),E,'merchantHouse','oldRpgVillage',{width:8.0,depth:5.8,floors:3,wealth:'prosperous',sign:true}),[-7.5,6.8,0],0);
    add('shop','Market Shop',building(seedFrom(r),E,'shop','oldRpgVillage',{width:6.8,depth:5.0,floors:2,sign:true,wealth:'modest'}),[7.0,5.8,0],0);
    add('guild','Guild Hall',building(seedFrom(r),E,'guildHall','oldRpgVillage',{width:9.4,depth:6.5,floors:2,wealth:'prosperous'}),[7.6,-6.2,0],Math.PI);
    add('suppliesA','Market Goods',prop(seedFrom(r),'supplies',{variant:'cluster',scale:1}),[-2.6,-1.0,0]);
    add('suppliesB','Market Goods',prop(seedFrom(r),'supplies',{variant:'cluster',scale:.8}),[1.5,0.0,0]);
    add('sign','Market Sign',prop(seedFrom(r),'signpost',{scale:.9}),[-3.6,-2.8,0]);
  } else if(p==='castleCourtyard'){
    add('keep','Castle Keep',building(seedFrom(r),E,'keep','castleKeep',{width:11.5,depth:8.2,floors:4,roof:'parapet',material:'stone',wealth:'prosperous',porch:false,sign:false,extension:false}),[0,9.0,0],0);
    add('barracks','Barracks',building(seedFrom(r),E,'barracks','fortifiedStone',{width:9.5,depth:5.4,floors:2,roof:'gable',material:'stone',porch:false}),[-9.0,-1.8,0],-Math.PI/2);
    add('chapel','Castle Chapel',building(seedFrom(r),E,'chapel','monastery',{width:7.0,depth:8.0,floors:2,material:'stone',porch:false}),[9.0,-.5,0],Math.PI/2);
    add('well','Courtyard Well',prop(seedFrom(r),'well',{variant:'stone',style:'stone',scale:.95}),[0,-1.0,0]);
    add('supplies','Barracks Supplies',prop(seedFrom(r),'supplies',{style:'rough',scale:.85}),[3.5,-7.0,0]);
  } else if(p==='castleGateApproach'){
    add('gate','Grand Gate',building(seedFrom(r),E,'cityGate','grandCity',{width:15,depth:7,floors:4,roof:'parapet',material:'stone',porch:false,sign:false,extension:false}),[0,8.6,0],0,1,false,true,true);
    add('wallL','West Wall',building(seedFrom(r),E,'castleWall','fortifiedStone',{width:12,depth:4,floors:2,roof:'parapet',material:'stone',porch:false,sign:false,extension:false}),[-12.5,8.6,0],0,1,false,true,true);
    add('wallR','East Wall',building(seedFrom(r),E,'castleWall','fortifiedStone',{width:12,depth:4,floors:2,roof:'parapet',material:'stone',porch:false,sign:false,extension:false}),[12.5,8.6,0],0,1,false,true,true);
    add('sign','Approach Sign',prop(seedFrom(r),'signpost',{style:'stone',scale:1}),[-4.3,-6.8,0]);
    add('supplies','Guard Supplies',prop(seedFrom(r),'supplies',{style:'rough',scale:.85}),[4.8,-4.5,0]);
  } else if(p==='mountainPath'){
    add('cottage','Mountain Cottage',building(seedFrom(r),E,'cottage','mountain',{width:5.7,depth:4.5,floors:1,roof:'gable',age:'old'}),[-6.6,5.8,0],-.14);
    add('tower','Watchtower',building(seedFrom(r),E,'watchtower','fortifiedStone',{width:5.3,depth:5.3,floors:4,roof:'conical',material:'stone',porch:false,sign:false,extension:false}),[7.5,7.2,0],.08);
    add('fence','Cliff Fence',prop(seedFrom(r),'fence',{variant:'broken',style:'mountain',scale:1.1}),[6.0,-3.6,0],.30);
    add('sign','Trail Sign',prop(seedFrom(r),'signpost',{condition:'worn',style:'mountain',scale:.85}),[-2.8,-5.5,0]);
  } else if(p==='mineEntranceClearing'){
    add('mine','Mine Entrance',building(seedFrom(r),E,'mineEntrance','miningTown',{width:8.5,depth:5.0,floors:1,roof:'flat',material:'stone',porch:false,sign:false,extension:false}),[0,9.5,0],0);
    add('shed','Mining Shed',building(seedFrom(r),E,'shack','frontierTown',{width:5.4,depth:4.0,floors:1,roof:'shed',material:'wood',wealth:'poor'}),[-10.0,1.0,0],-.3);
    add('supplies','Ore Supplies',prop(seedFrom(r),'supplies',{variant:'cluster',style:'rough',scale:1}),[5.7,2.4,0]);
    add('fence','Mine Fence',prop(seedFrom(r),'fence',{variant:'gate',style:'rough',scale:1}),[-4.0,-5.5,0]);
    add('sign','Mine Sign',prop(seedFrom(r),'signpost',{condition:'worn',style:'rough',scale:.9}),[2.5,-6.0,0]);
  } else if(p==='desertMarket'){
    add('market','Desert Market',building(seedFrom(r),E,'desertMarket','desertTown',{width:9.0,depth:6.0,floors:2,roof:'flat',wealth:'modest',porch:false,sign:true}),[0,7.3,0],0);
    add('houseL','Adobe House',building(seedFrom(r),E,'desertHouse','desertTown',{width:6.8,depth:5.0,floors:2,roof:'flat',porch:false}),[-8.0,-.5,0],-Math.PI/2);
    add('houseR','Adobe House',building(seedFrom(r),E,'desertHouse','desertTown',{width:6.3,depth:4.8,floors:1,roof:'flat',porch:false}),[8.0,1.0,0],Math.PI/2);
    add('suppliesA','Market Goods',prop(seedFrom(r),'supplies',{style:'rough',scale:.9}),[-2.8,-1.4,0]);
    add('suppliesB','Market Goods',prop(seedFrom(r),'supplies',{style:'rough',scale:.75}),[3.0,-.6,0]);
    add('sign','Bazaar Sign',prop(seedFrom(r),'signpost',{style:'rough',scale:.85}),[-4.2,-6.0,0]);
  } else if(p==='docksideLane'){
    add('warehouse','Dock Warehouse',building(seedFrom(r),E,'dockWarehouse','harborTown',{width:9.5,depth:6.5,floors:2,roof:'gable',porch:false}),[-6.2,6.8,0],0);
    add('inn','Harbor Inn',building(seedFrom(r),E,'inn','frontierTown',{width:7.8,depth:5.5,floors:2,roof:'hip',sign:true}),[6.8,6.2,0],0);
    add('dock','Pier',building(seedFrom(r),E,'dock','harborTown',{width:10,depth:5,floors:1,roof:'flat',porch:false,sign:false,extension:false}),[7.4,-6.0,0],Math.PI/2);
    add('supplies','Dock Cargo',prop(seedFrom(r),'supplies',{variant:'cluster',style:'rough',scale:1}),[-1.3,-1.2,0]);
    add('sign','Harbor Sign',prop(seedFrom(r),'signpost',{style:'rough',scale:.9}),[-4.6,-5.5,0]);
  }
  addNaturalDressing(out,recipe,r);
  if(recipe.density<.45){
    const densityRng=rngFromSeed(recipe.seed^0x7f31),keep=Math.max(.08,recipe.density/.45);
    return out.filter(p=>p.recipe.type!=='prop'||p.recipe.family==='well'||range(densityRng,0,1)<=keep);
  }
  return out;
}


function addNaturalDressing(out,recipe,r){
  const add=(...args)=>out.push(place(...args)),p=recipe.preset,S=recipe.size,d=recipe.dressing;
  if(d<=.08)return;
  const edge=S*.38, inner=S*.29, jitter=()=>range(r,-.65,.65);
  const tree=(id,label,x,y,biome='temperate',variant='auto',scale=1,condition='healthy')=>add(id,label,foliage(seedFrom(r),'tree',{biome,variant,scale,condition,density:d,spread:1}),[x+jitter(),y+jitter(),0],range(r,-.18,.18),1,false,true,false);
  const deco=(id,label,family,x,y,biome='temperate',opts={})=>add(id,label,foliage(seedFrom(r),family,{biome,density:Math.min(1,.35+d*.7),spread:opts.spread??1,scale:opts.scale??1,variant:opts.variant||'auto',condition:opts.condition||'healthy'}),[x+jitter(),y+jitter(),0],range(r,-.35,.35),1,false,true,true);

  if(p==='villageWellSquare'){
    tree('treeSW','Old Oak',-edge,-edge,'temperate','oak',1.08);
    if(d>.42) tree('treeSE','Village Tree',edge,-edge*.9,'temperate',chance(r,.35)?'fruit':'oak',.94);
    deco('flowersN','Flowers','flowers',-inner*.28,inner*.80,'temperate',{spread:.9});
    deco('shrubW','Shrubs','shrub',-inner,-inner*.18,'temperate',{scale:.85});
    if(d>.68) deco('stump','Old Stump','stump',inner*.62,-inner*.68,'forest',{scale:.75});
  } else if(p==='ruralHouseLane'){
    tree('treeNE','Lane Tree',edge*.92,edge*.78,'farmland','fruit',1.0);
    tree('treeW','Old Oak',-edge*1.18,0,'farmland','oak',.95);
    deco('cropsE','Crop Patch','crops',inner*.72,-inner*.10,'farmland',{spread:1.1,scale:.9});
    if(d>.4) deco('flowers','Wildflowers','flowers',inner*.05,inner*.72,'farmland',{spread:1.15});
  } else if(p==='marketCorner'){
    tree('treeSW','Market Tree',-edge,-edge,'temperate','oak',.92);
    deco('planterShrub','Shrubs','shrub',-inner*.15,inner*.42,'temperate',{scale:.7,spread:.75});
    if(d>.58) deco('flowers','Market Flowers','flowers',inner*.48,-inner*.62,'temperate',{scale:.8,spread:.75});
  } else if(p==='castleCourtyard'){
    deco('shrubL','Courtyard Shrub','shrub',-inner*.62,-inner*.66,'ruins',{scale:.72,spread:.7});
    deco('shrubR','Courtyard Shrub','shrub',inner*.62,-inner*.66,'ruins',{scale:.72,spread:.7});
    if(d>.62) deco('flowers','Courtyard Herbs','flowers',0,-inner*.80,'ruins',{scale:.65,spread:.65});
  } else if(p==='castleGateApproach'){
    tree('treeL','Approach Oak',-edge,-edge*.78,'forest','oak',1.0);
    tree('treeR','Approach Oak',edge,-edge*.78,'forest','oak',.95);
    deco('rocks','Roadside Rocks','rockCluster',inner*.25,-inner*.52,'mountain',{scale:.75,spread:.8});
  } else if(p==='mountainPath'){
    tree('pineNW','Mountain Pine',-edge*1.18,edge*.90,'mountain','pine',.92);
    tree('pineSW','Mountain Pine',-edge*.90,-edge*.86,'mountain','pine',.94);
    if(d>.45) tree('pineSE','Mountain Pine',edge*.72,-edge*.82,'mountain','pine',.82);
    deco('rocks','Rock Cluster','rockCluster',inner*.18,-inner*.26,'mountain',{scale:.95,spread:1.2});
    deco('shrubs','Alpine Shrubs','shrub',-inner*.15,inner*.38,'mountain',{scale:.7,spread:.9});
  } else if(p==='mineEntranceClearing'){
    tree('deadTree','Dead Tree',-edge,-edge*.72,'mountain','oak',.9,'dead');
    deco('log','Fallen Log','fallenLog',inner*.55,-inner*.72,'forest',{scale:.85});
    deco('rocks','Mine Rocks','rockCluster',inner*.58,inner*.18,'mountain',{scale:1.05,spread:1.15});
    if(d>.6) deco('stump','Stump','stump',-inner*.22,-inner*.62,'forest',{scale:.8});
  } else if(p==='desertMarket'){
    tree('palm','Market Palm',-edge,-edge*.76,'desert','palm',.94);
    if(d>.55) tree('palm2','Market Palm',edge*.86,-edge*.82,'desert','palm',.76);
    deco('dryShrub','Dry Shrubs','shrub',inner*.66,inner*.16,'desert',{scale:.66,condition:'dry',spread:.75});
    deco('rocks','Desert Rocks','rockCluster',-inner*.45,-inner*.50,'desert',{scale:.8,spread:.9});
  } else if(p==='docksideLane'){
    deco('reedsA','Dock Reeds','reeds',edge*.82,-edge*.82,'swamp',{scale:.85,spread:1.15});
    deco('reedsB','Dock Reeds','reeds',edge*.46,-edge*.92,'swamp',{scale:.72,spread:.9});
    tree('treeW','Harbor Tree',-edge,-edge*.74,'temperate','oak',.85);
    if(d>.55) deco('shrubs','Harbor Shrubs','shrub',-inner*.55,inner*.15,'temperate',{scale:.72,spread:.8});
  }
}

function copyMaterialMap(target,child,materialCache){
  const map={};
  for(const [id,m] of Object.entries(child.materials)){
    const payload={...m};delete payload.id;
    const signature=JSON.stringify(payload,Object.keys(payload).sort());
    let next=materialCache.get(signature);
    if(!next){next=`fieldMat_${materialCache.size}`;materialCache.set(signature,next);target.materials[next]={...m,id:next};}
    map[id]=next;
  }
  return map;
}
function rotatedPosition(pos, angle, scale, translate){
  const x=(pos?.[0]||0)*scale,y=(pos?.[1]||0)*scale,z=(pos?.[2]||0)*scale;
  const c=Math.cos(angle),s=Math.sin(angle);
  return [x*c-y*s+translate[0],x*s+y*c+translate[1],z+translate[2]];
}
function mergePlacement(target,placement,child,materialCache){
  const angle=placement.rotation||0,scale=placement.scale||1,translate=placement.position||[0,0,0];
  const materialMap=copyMaterialMap(target,child,materialCache);
  for(const node of child.nodes){
    const n={...node,name:`${placement.id}::${node.name}`,material:materialMap[node.material],placementId:placement.id,sourceType:child.recipe.type,tags:[...(node.tags||[]),`placement:${placement.id}`]};
    n.position=rotatedPosition(node.position||[0,0,0],angle,scale,translate);
    const rot=node.rotation||[0,0,0];n.rotation=[rot[0],rot[1],rot[2]+angle];
    if(node.kind==='box') n.size=node.size.map(v=>v*scale);
    else if(node.kind==='mesh') n.scale=(node.scale||[1,1,1]).map(v=>v*scale);
    else if(node.kind==='dodecahedron') n.scale=(node.scale||[1,1,1]).map(v=>v*scale);
    target.nodes.push(n);
  }
}
function placementAabb(p,asset){
  const fp=asset.footprint||{width:1,depth:1},a=p.rotation||0,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),sc=p.scale||1;
  const w=(fp.width*c+fp.depth*s)*sc,d=(fp.width*s+fp.depth*c)*sc;
  return {minX:p.position[0]-w/2,maxX:p.position[0]+w/2,minY:p.position[1]-d/2,maxY:p.position[1]+d/2};
}
function overlap(a,b,pad=.20){return a.minX+pad<b.maxX&&a.maxX-pad>b.minX&&a.minY+pad<b.maxY&&a.maxY-pad>b.minY;}

export function generateField(input){
  const recipe=normalizeRecipe({...input,type:'field'}),{warnings:recipeWarnings}=validateRecipe(recipe);
  const placements=(recipe.placements&&recipe.placements.length?recipe.placements:generatedPlacements(recipe)).map((p,i)=>({...p,id:p.id||`asset-${i}`}));
  const spec=createSceneSpec({...recipe,placements});
  const records=[],materialCache=new Map();
  for(const placement of placements){
    const child=childScene(placement.recipe);
    mergePlacement(spec,placement,child,materialCache);
    records.push({...placement,recipe:child.recipe,asset:child.asset});
  }
  spec.recipe={...recipe,placements:records.map(({asset,...p})=>p)};
  spec.metadata={engine:'field',engineVersion:recipe.engineVersion,preset:recipe.preset,placements:records,recipeWarnings,materialDeduplication:{uniqueMaterials:materialCache.size}};
  const validation=validateSceneSpec(spec);validation.warnings.push(...recipeWarnings);
  const collidable=records.filter(p=>p.selectable!==false&&p.asset?.collision?.enabled&&p.recipe.type!=='surface');
  for(let i=0;i<collidable.length;i++) for(let j=i+1;j<collidable.length;j++){
    const a=collidable[i],b=collidable[j];
    if((a.allowOverlap||b.allowOverlap)) continue;
    if(overlap(placementAabb(a,a.asset),placementAabb(b,b.asset),.35)) validation.warnings.push(`Placement overlap: ${a.label} / ${b.label}`);
  }
  validation.stats.placementCount=records.length;
  return spec;
}
