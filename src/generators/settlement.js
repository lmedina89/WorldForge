import { rngFromSeed, range, chance } from '../core/rng.js';
import { createSceneSpec, defineMaterial, addBox, validateSceneSpec } from '../core/scene-spec.js';
import { normalizeRecipe, validateRecipe } from '../core/recipe.js';
import { attachAssetMetadata } from '../core/asset-schema.js';
import { generateBuilding } from './building.js';
import { generateBuildingV11 } from './building-v1.1.js';
import { generateBuildingV12 } from './building-v1.2.js';
import { generateBuildingV13 } from './building-v1.3.js';
import { generateProp } from './prop.js';
import { generateSurface } from './surface.js';
import { generateFoliage } from './foliage.js';
import { generateTraversal } from './traversal.js';

function clone(v){return JSON.parse(JSON.stringify(v));}
function seedFrom(r){return Math.floor(range(r,10000,999999));}
function place(id,label,recipe,position=[0,0,0],rotation=0,scale=1,locked=false,selectable=true,allowOverlap=false,meta={}){return {id,label,recipe,position,rotation,scale,locked,selectable,allowOverlap,meta};}
function angleToFace(from,target){const dx=target[0]-from[0],dy=target[1]-from[1];return Math.atan2(dx,-dy);}

function building(seed,engine,family,style,opts={}){
  const dimensions={
    peasantHouse:[5.5,4.3,2],cottage:[5.1,4.0,1],house:[6.2,4.8,2],farmhouse:[7.0,5.4,2],
    shop:[6.3,4.7,2],inn:[8.2,5.8,2],smithy:[7.2,5.2,2],merchantHouse:[7.0,5.0,2],guildHall:[8.8,6.0,2],
    chapel:[7.3,5.4,2],townHall:[9.4,6.8,3],stable:[8.0,5.6,1],barn:[8.5,6.4,2]
  };
  const [dw,dd,df]=dimensions[family]||[6.2,4.7,2];
  return {type:'building',engineVersion:engine,seed,family,style,material:opts.material||'auto',condition:opts.condition||'clean',width:opts.width||dw,depth:opts.depth||dd,floors:opts.floors||df,roof:opts.roof||'gable',pitch:opts.pitch||42,template:opts.template||'auto',facade:opts.facade||'auto',wealth:opts.wealth||'modest',age:opts.age||'old',construction:opts.construction||'auto',features:{chimney:opts.chimney??true,porch:opts.porch??true,sign:opts.sign??['shop','inn','smithy','merchantHouse','guildHall'].includes(family),extension:opts.extension??!['chapel','townHall'].includes(family)}};
}
function prop(seed,family,opts={}){return {type:'prop',seed,family,style:opts.style||'village',condition:opts.condition||'clean',scale:opts.scale||1,variant:opts.variant||'auto'};}
function foliage(seed,family,opts={}){return {type:'foliage',seed,family,biome:opts.biome||'temperate',variant:opts.variant||'auto',condition:opts.condition||'healthy',scale:opts.scale||1,density:opts.density??.55,spread:opts.spread??1};}
function surface(seed,type,size,pattern='none',opts={}){return {type:'surface',seed,surface:type,size,variation:opts.variation??.62,wear:opts.wear??.3,pathPattern:pattern,pathWidth:opts.pathWidth??2.6,pathMaterial:opts.pathMaterial||'dirt',detailDensity:opts.detailDensity??.48,edgeBlend:true,gridResolution:opts.gridResolution??48};}
function traversal(seed,family,opts={}){return {type:'traversal',seed,family,style:opts.style||'stone',variant:opts.variant||'straight',width:opts.width||3,length:opts.length||8,height:opts.height||2,rails:opts.rails??true};}

function childScene(raw){
  const recipe=normalizeRecipe(raw);let spec;
  if(recipe.type==='prop')spec=generateProp(recipe);
  else if(recipe.type==='surface')spec=generateSurface(recipe);
  else if(recipe.type==='foliage')spec=generateFoliage(recipe);
  else if(recipe.type==='traversal')spec=generateTraversal(recipe);
  else if(recipe.engineVersion==='1.3.0')spec=generateBuildingV13(recipe);
  else if(recipe.engineVersion==='1.2.0')spec=generateBuildingV12(recipe);
  else if(recipe.engineVersion==='1.1.0')spec=generateBuildingV11(recipe);
  else spec=generateBuilding(recipe);
  return attachAssetMetadata(spec);
}

function copyMaterialMap(target,child,cache){
  const map={};
  for(const [id,m] of Object.entries(child.materials)){
    const payload={...m};delete payload.id;
    const signature=JSON.stringify(payload,Object.keys(payload).sort());
    let next=cache.get(signature);
    if(!next){next=`settlementMat_${cache.size}`;cache.set(signature,next);target.materials[next]={...m,id:next};}
    map[id]=next;
  }
  return map;
}
function rotatedPosition(pos,angle,scale,translate){const x=(pos?.[0]||0)*scale,y=(pos?.[1]||0)*scale,z=(pos?.[2]||0)*scale,c=Math.cos(angle),s=Math.sin(angle);return [x*c-y*s+translate[0],x*s+y*c+translate[1],z+translate[2]];}
function mergePlacement(target,p,child,cache){
  const angle=p.rotation||0,scale=p.scale||1,translate=p.position||[0,0,0],mm=copyMaterialMap(target,child,cache);
  for(const node of child.nodes){
    const n={...node,name:`${p.id}::${node.name}`,material:mm[node.material],placementId:p.id,sourceType:child.recipe.type,tags:[...(node.tags||[]),`placement:${p.id}`,...(p.meta?.district?[`district:${p.meta.district}`]:[])]};
    n.position=rotatedPosition(node.position||[0,0,0],angle,scale,translate);
    const rot=node.rotation||[0,0,0];n.rotation=[rot[0],rot[1],rot[2]+angle];
    if(node.kind==='box')n.size=node.size.map(v=>v*scale);else if(node.scale)n.scale=node.scale.map(v=>v*scale);
    target.nodes.push(n);
  }
}

function addRoadMaterial(spec){
  defineMaterial(spec,'settlementRoad',{color:'#6f5b43',roughness:1});
  defineMaterial(spec,'settlementPlaza',{color:'#8b816f',roughness:1});
  defineMaterial(spec,'settlementRoadEdge',{color:'#7d6a4f',roughness:1});
}
function addRoadSegment(spec,id,a,b,width=2.8,z=.055){
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<.01)return;
  addBox(spec,`road_${id}`,[len,width,.10],[(a[0]+b[0])/2,(a[1]+b[1])/2,z],'settlementRoad',[0,0,Math.atan2(dy,dx)],['walkable','road']);
}
function addRingRoad(spec,radius,segments=24,width=2.8,z=.055){
  const pts=[];for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;pts.push([Math.cos(a)*radius,Math.sin(a)*radius]);}
  for(let i=0;i<segments;i++)addRoadSegment(spec,`ring_${i}`,pts[i],pts[(i+1)%segments],width,z);
  return pts;
}
function addPlaza(spec,size=9,z=.05){addBox(spec,'settlement_plaza',[size,size,.09],[0,0,z],'settlementPlaza',[0,0,0],['walkable','plaza']);}

function buildingStyleFor(grammar,zone){
  if(grammar==='hillsideVillage')return zone==='civic'?'monastery':'mountain';
  if(zone==='civic')return 'oldRpgVillage';
  if(zone==='farm')return 'rusticVillage';
  return 'oldRpgVillage';
}
function chooseFrom(r,list){return list[Math.floor(range(r,0,list.length))%list.length];}
function chooseFamily(r,zone){
  if(zone==='commercial')return chooseFrom(r,['shop','inn','smithy','merchantHouse']);
  if(zone==='civic')return chooseFrom(r,['chapel','guildHall','townHall']);
  if(zone==='farm')return chooseFrom(r,['farmhouse','stable','barn']);
  return chooseFrom(r,['peasantHouse','cottage','house','peasantHouse','farmhouse']);
}
function addBuilding(out,r,recipe,id,zone,pos,target,z=0){
  const family=chooseFamily(r,zone),style=buildingStyleFor(recipe.grammar,zone),ang=angleToFace(pos,target);
  const age=zone==='civic'?'mature':recipe.age;
  const br=building(seedFrom(r),recipe.buildingEngine,family,style,{wealth:recipe.wealth,age,condition:chance(r,.13)?'worn':'clean'});
  out.push(place(id,`${zone} ${family}`,br,[pos[0],pos[1],z],ang,1,false,true,false,{district:zone,roadTarget:target}));
}

function ringPlacements(recipe,r){
  const out=[],n=recipe.buildingCount,inner=Math.max(6,Math.round(n*.34)),outer=n-inner;
  const plazaR=6.4,innerR=13.5,outerR=Math.min(recipe.size*.43,23.5);
  out.push(place('surface','Village Ground',surface(seedFrom(r),recipe.biome==='mountain'?'rocky':'grass',recipe.size,'none',{detailDensity:.56,wear:.28}),[0,0,0],0,1,true,false,true,{district:'ground'}));
  out.push(place('well','Village Well',prop(seedFrom(r),'well',{variant:'roofed',scale:1.1}),[0,0,.08],0,1,false,true,true,{district:'common'}));
  for(let i=0;i<inner;i++){
    const a=i/inner*Math.PI*2+range(r,-.08,.08),rr=innerR+range(r,-.8,.8),pos=[Math.cos(a)*rr,Math.sin(a)*rr];
    const zone=i<Math.max(3,Math.floor(inner*.6))?'commercial':'civic';
    addBuilding(out,r,recipe,`inner_${i}`,zone,pos,[Math.cos(a)*9.5,Math.sin(a)*9.5],0);
  }
  for(let i=0;i<outer;i++){
    const a=i/outer*Math.PI*2+.18+range(r,-.06,.06),rr=outerR+range(r,-1.0,1.0),pos=[Math.cos(a)*rr,Math.sin(a)*rr];
    const zone=(i%5===0)?'farm':'residential';
    addBuilding(out,r,recipe,`outer_${i}`,zone,pos,[Math.cos(a)*17,Math.sin(a)*17],0);
  }
  return {placements:out,roads:{kind:'ring',ringRadius:10.3,plazaSize:9.2,radials:[[0,-recipe.size*.46],[0,recipe.size*.46],[-recipe.size*.46,0],[recipe.size*.46,0]]},walkZones:[{id:'ground',z:0,bounds:[-recipe.size/2,-recipe.size/2,recipe.size/2,recipe.size/2]}],characterSpawn:[0,-3,.12]};
}
function crossroadsPlacements(recipe,r){
  const out=[],half=recipe.size*.43;
  out.push(place('surface','Crossroads Ground',surface(seedFrom(r),'grass',recipe.size,'none',{detailDensity:.5,wear:.34}),[0,0,0],0,1,true,false,true,{district:'ground'}));
  out.push(place('well','Crossroads Well',prop(seedFrom(r),'well',{variant:'stone',scale:1.05}),[1.8,1.7,.08],0,1,false,true,true,{district:'common'}));
  const lots=[];
  const offsets=[-20,-12,-6,6,12,20];
  for(const y of offsets.filter(v=>Math.abs(v)>5)){
    lots.push({pos:[-6.5,y],target:[0,y],zone:y>0?'commercial':'farm'});
    lots.push({pos:[6.5,y],target:[0,y],zone:y>0?'residential':'residential'});
  }
  for(const x of offsets.filter(v=>Math.abs(v)>5)){
    lots.push({pos:[x,-6.5],target:[x,0],zone:x<0?'commercial':'residential'});
    lots.push({pos:[x,6.5],target:[x,0],zone:x>0?'civic':'residential'});
  }
  for(let i=0;i<Math.min(recipe.buildingCount,lots.length);i++)addBuilding(out,r,recipe,`lot_${i}`,lots[i].zone,lots[i].pos,lots[i].target,0);
  return {placements:out,roads:{kind:'crossroads',half,plazaSize:9.5},walkZones:[{id:'ground',z:0,bounds:[-recipe.size/2,-recipe.size/2,recipe.size/2,recipe.size/2]}],characterSpawn:[0,-3,.12]};
}
function hillsidePlacements(recipe,r){
  const out=[],h=+(1.6+recipe.elevation*2.1).toFixed(2),rows=[-14,0,14],zs=[0,h,h*2];
  out.push(place('surface','Hillside Ground',surface(seedFrom(r),'rocky',recipe.size,'none',{detailDensity:.52,wear:.34}),[0,0,0],0,1,true,false,true,{district:'ground'}));
  out.push(place('terrace_mid','Middle Terrace',traversal(seedFrom(r),'terrace',{style:'earth',width:recipe.size*.72,length:11,height:h,rails:false}),[0,4,0],0,1,false,true,true,{district:'structure'}));
  out.push(place('terrace_high','Upper Terrace',traversal(seedFrom(r),'terrace',{style:'stone',width:recipe.size*.62,length:10,height:h*2,rails:false}),[0,17,0],0,1,false,true,true,{district:'structure'}));
  out.push(place('stairs_mid','Lower Steps',traversal(seedFrom(r),'stairs',{style:'stone',width:2.8,length:6,height:h}),[-7,-5,0],0,1,false,true,true,{district:'structure'}));
  out.push(place('stairs_high','Upper Steps',traversal(seedFrom(r),'stairs',{style:'stone',width:2.8,length:6,height:h}),[7,9,h],0,1,false,true,true,{district:'structure'}));
  const per=Math.ceil(recipe.buildingCount/3);let idx=0;
  for(let row=0;row<3;row++){
    for(let i=0;i<per&&idx<recipe.buildingCount;i++,idx++){
      const x=(-recipe.size*.31)+i*((recipe.size*.62)/Math.max(1,per-1))+range(r,-.7,.7),y=rows[row]+range(r,-.8,.8),z=zs[row];
      const zone=row===2?(i<2?'civic':'residential'):row===0?(i<2?'commercial':'farm'):'residential';
      addBuilding(out,r,recipe,`hill_${idx}`,zone,[x,y],[x,y-(row===0?-3:3)],z);
    }
  }
  out.push(place('well','Terrace Well',prop(seedFrom(r),'well',{variant:'stone',scale:1.0}),[0,0,h+.08],0,1,false,true,true,{district:'common'}));
  return {placements:out,roads:{kind:'hillside',rows:rows.map((y,i)=>({y,z:zs[i]})),plazaSize:8.5},walkZones:[{id:'low',z:0,bounds:[-recipe.size/2,-recipe.size/2,recipe.size/2,-4]},{id:'mid',z:h,bounds:[-recipe.size*.36,-4,recipe.size*.36,10]},{id:'high',z:h*2,bounds:[-recipe.size*.31,10,recipe.size*.31,recipe.size/2]}],walkTransitions:[{id:'stairs.low-mid',bounds:[-8.6,-8.2,-5.4,-1.8],axis:'y',from:-8,to:-2,z0:0,z1:h},{id:'stairs.mid-high',bounds:[5.4,6.0,8.6,12.0],axis:'y',from:6,to:12,z0:h,z1:h*2}],characterSpawn:[0,-10,.12]};
}

function addDressing(out,recipe,r){
  const count=Math.round(6+recipe.dressing*15),half=recipe.size*.46;
  for(let i=0;i<count;i++){
    const a=range(r,0,Math.PI*2),rad=range(r,half*.68,half*.98),pos=[Math.cos(a)*rad,Math.sin(a)*rad,0];
    const fam=i%5===0?'flowers':i%4===0?'shrub':'tree',variant=recipe.biome==='mountain'?'pine':fam==='tree'?'oak':'auto';
    out.push(place(`dress_${i}`,fam,foliage(seedFrom(r),fam,{biome:recipe.biome,variant,scale:range(r,.72,1.05),density:.45}),pos,range(r,-.2,.2),1,false,true,false,{district:'edge'}));
  }
  const supplies=Math.round(3+recipe.density*5);
  for(let i=0;i<supplies;i++)out.push(place(`supplies_${i}`,'Supplies',prop(seedFrom(r),'supplies',{variant:'cluster',scale:range(r,.75,1.0)}),[range(r,-7,7),range(r,-6,6),.06],range(r,0,Math.PI*2),1,false,true,true,{district:'common'}));
}
function addSettlementRoads(spec,layout,recipe){
  addRoadMaterial(spec);
  if(layout.roads.kind==='ring'){
    addPlaza(spec,layout.roads.plazaSize);
    addRingRoad(spec,layout.roads.ringRadius,28,2.7);
    for(const end of layout.roads.radials)addRoadSegment(spec,`radial_${end[0]}_${end[1]}`,[0,0],end,2.7);
  } else if(layout.roads.kind==='crossroads'){
    addPlaza(spec,layout.roads.plazaSize);
    addRoadSegment(spec,'main_ns',[0,-layout.roads.half],[0,layout.roads.half],3.0);
    addRoadSegment(spec,'main_ew',[-layout.roads.half,0],[layout.roads.half,0],3.0);
    addRoadSegment(spec,'diag_sw',[-4,-4],[-layout.roads.half*.65,-layout.roads.half*.65],2.2);
  } else {
    addPlaza(spec,layout.roads.plazaSize,.05+(layout.walkZones[1]?.z||0));
    for(let i=0;i<layout.roads.rows.length;i++){
      const row=layout.roads.rows[i];addRoadSegment(spec,`hill_row_${i}`,[-recipe.size*.38,row.y],[recipe.size*.38,row.y],2.6,row.z+.06);
    }
  }
}
function makeWalkGraph(layout,placements){
  const levels=[...new Set(layout.walkZones.map(z=>z.z))].sort((a,b)=>a-b);
  return {levels,segments:placements.filter(p=>p.recipe.type==='traversal').map(p=>({placementId:p.id,family:p.recipe.family,connections:[],walkSurfaces:[]})),zones:layout.walkZones};
}

function skeletonFor(recipe){
  if(recipe.grammar==='crossroadsVillage')return {roads:{kind:'crossroads',half:recipe.size*.43,plazaSize:9.5},walkZones:[{id:'ground',z:0,bounds:[-recipe.size/2,-recipe.size/2,recipe.size/2,recipe.size/2]}],characterSpawn:[0,-3,.12]};
  if(recipe.grammar==='hillsideVillage'){
    const h=+(1.6+recipe.elevation*2.1).toFixed(2);return {roads:{kind:'hillside',rows:[{y:-14,z:0},{y:0,z:h},{y:14,z:h*2}],plazaSize:8.5},walkZones:[{id:'low',z:0,bounds:[-recipe.size/2,-recipe.size/2,recipe.size/2,-4]},{id:'mid',z:h,bounds:[-recipe.size*.36,-4,recipe.size*.36,10]},{id:'high',z:h*2,bounds:[-recipe.size*.31,10,recipe.size*.31,recipe.size/2]}],walkTransitions:[{id:'stairs.low-mid',bounds:[-8.6,-8.2,-5.4,-1.8],axis:'y',from:-8,to:-2,z0:0,z1:h},{id:'stairs.mid-high',bounds:[5.4,6.0,8.6,12.0],axis:'y',from:6,to:12,z0:h,z1:h*2}],characterSpawn:[0,-10,.12]};
  }
  return {roads:{kind:'ring',ringRadius:10.3,plazaSize:9.2,radials:[[0,-recipe.size*.46],[0,recipe.size*.46],[-recipe.size*.46,0],[recipe.size*.46,0]]},walkZones:[{id:'ground',z:0,bounds:[-recipe.size/2,-recipe.size/2,recipe.size/2,recipe.size/2]}],characterSpawn:[0,-3,.12]};
}

export function generateSettlement(input){
  const recipe=normalizeRecipe({...input,type:'settlement'}),{warnings:recipeWarnings}=validateRecipe(recipe),r=rngFromSeed(recipe.seed);
  const layout=recipe.placements?.length?{placements:clone(recipe.placements),...skeletonFor(recipe)}:
    recipe.grammar==='crossroadsVillage'?crossroadsPlacements(recipe,r):recipe.grammar==='hillsideVillage'?hillsidePlacements(recipe,r):ringPlacements(recipe,r);
  if(Array.isArray(recipe.characterSpawn)&&recipe.characterSpawn.length>=3)layout.characterSpawn=[recipe.characterSpawn[0],recipe.characterSpawn[1],recipe.characterSpawn[2]];
  if(!recipe.placements?.length)addDressing(layout.placements,recipe,r);
  const spec=createSceneSpec({...recipe,placements:layout.placements});
  addSettlementRoads(spec,layout,recipe);
  const records=[],cache=new Map();
  for(const p of layout.placements){const child=childScene(p.recipe);mergePlacement(spec,p,child,cache);records.push({...p,recipe:child.recipe,asset:child.asset});}
  spec.recipe={...recipe,placements:records.map(({asset,...p})=>p)};
  const walkGraph=makeWalkGraph(layout,records);
  spec.metadata={engine:'settlement',engineVersion:recipe.engineVersion,grammar:recipe.grammar,placements:records,roads:layout.roads,districts:[...new Set(records.map(p=>p.meta?.district).filter(Boolean))],walkGraph,walkZones:layout.walkZones,walkTransitions:layout.walkTransitions||[],characterSpawn:layout.characterSpawn,recipeWarnings,materialDeduplication:{uniqueMaterials:cache.size+3}};
  const validation=validateSceneSpec(spec);validation.warnings.push(...recipeWarnings);validation.stats.placementCount=records.length;validation.stats.buildingCount=records.filter(p=>p.recipe.type==='building').length;validation.stats.districtCount=spec.metadata.districts.length;
  return spec;
}
