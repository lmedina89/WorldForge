import { rngFromSeed, range } from '../core/rng.js';
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
import { generateTraversal } from './traversal.js';
import { generateField as generateFieldV02 } from './field-v0.2.js';

function childScene(raw){
  const recipe=normalizeRecipe(raw);let spec;
  if(recipe.type==='prop') spec=generateProp(recipe);
  else if(recipe.type==='surface') spec=generateSurface(recipe);
  else if(recipe.type==='foliage') spec=generateFoliage(recipe);
  else if(recipe.type==='traversal') spec=generateTraversal(recipe);
  else if(recipe.engineVersion==='1.3.0') spec=generateBuildingV13(recipe);
  else if(recipe.engineVersion==='1.2.0') spec=generateBuildingV12(recipe);
  else if(recipe.engineVersion==='1.1.0') spec=generateBuildingV11(recipe);
  else spec=generateBuilding(recipe);
  return attachAssetMetadata(spec);
}
function seedFrom(r){return Math.floor(range(r,10000,999999));}
function clone(v){return JSON.parse(JSON.stringify(v));}
function traversal(seed,family,opts={}){return {type:'traversal',seed,family,style:opts.style||'stone',variant:opts.variant||'straight',width:opts.width||3.2,length:opts.length||8,height:opts.height||2.2,rails:opts.rails??true};}
function building(seed,engine,family,style,opts={}){return {type:'building',engineVersion:engine,seed,family,style,material:opts.material||'auto',condition:opts.condition||'clean',width:opts.width||6.5,depth:opts.depth||4.8,floors:opts.floors||2,roof:opts.roof||'gable',pitch:opts.pitch||42,template:opts.template||'auto',facade:opts.facade||'auto',wealth:opts.wealth||'modest',age:opts.age||'mature',construction:opts.construction||'auto',features:{chimney:opts.chimney??true,porch:opts.porch??true,sign:opts.sign??false,extension:opts.extension??true}};}
function prop(seed,family,opts={}){return {type:'prop',seed,family,style:opts.style||'village',condition:opts.condition||'clean',scale:opts.scale||1,variant:opts.variant||'auto'};}
function foliage(seed,family,opts={}){return {type:'foliage',seed,family,biome:opts.biome||'temperate',variant:opts.variant||'auto',condition:opts.condition||'healthy',scale:opts.scale||1,density:opts.density??.55,spread:opts.spread??1};}
function surface(seed,type,size,pattern,pathMaterial='dirt',opts={}){return {type:'surface',seed,surface:type,size,variation:opts.variation??.58,wear:opts.wear??.28,pathPattern:pattern,pathWidth:opts.pathWidth??2.5,pathMaterial,detailDensity:opts.detailDensity??.42,edgeBlend:opts.edgeBlend??true,gridResolution:opts.gridResolution??40};}
function place(id,label,recipe,position=[0,0,0],rotation=0,scale=1,locked=false,selectable=true,allowOverlap=false){return {id,label,recipe,position,rotation,scale,locked,selectable,allowOverlap};}

const basePresetMap={mountainVillagePath:'mountainPath',stoneBridgeCrossing:'mountainPath',cliffsideTownLane:'ruralHouseLane'};
function baselinePlacements(recipe){
  const mapped=basePresetMap[recipe.preset]||recipe.preset;
  const base=generateFieldV02({...recipe,engineVersion:'0.2.0',preset:mapped,placements:null});
  return clone(base.recipe.placements);
}
function find(ps,id){return ps.find(p=>p.id===id);}
function removeTypes(ps,ids){return ps.filter(p=>!ids.includes(p.id));}
function addElevatedLayout(placements,recipe){
  const r=rngFromSeed(recipe.seed^0x90e1),E=recipe.buildingEngine||'1.3.0',p=recipe.preset,e=recipe.elevation;
  if(e<=.04)return placements;
  const h=+(1.15+e*2.35).toFixed(2),h2=+(h*.68).toFixed(2),out=clone(placements);
  const add=(...args)=>out.push(place(...args));
  const raise=(id,z=h)=>{const x=find(out,id);if(x)x.position[2]=z;};

  if(p==='castleCourtyard'){
    add('upperTerrace','Keep Terrace',traversal(seedFrom(r),'terrace',{style:'stone',width:15,length:10,height:h,rails:false}),[0,8.2,0],0,1,false,true,true);
    raise('keep',h);
    add('keepStairs','Keep Stairs',traversal(seedFrom(r),'stairs',{style:'stone',width:3.2,length:5.8,height:h,rails:true}),[0,2.8,0],0,1,false,true,true);
    add('retainingL','Retaining Wall',traversal(seedFrom(r),'retainingWall',{style:'stone',width:8,length:3,height:h}),[-7.3,3.8,0],Math.PI/2,1,false,true,true);
    add('retainingR','Retaining Wall',traversal(seedFrom(r),'retainingWall',{style:'stone',width:8,length:3,height:h}),[7.3,3.8,0],Math.PI/2,1,false,true,true);
  } else if(p==='castleGateApproach'){
    add('gateTerrace','Gate Terrace',traversal(seedFrom(r),'terrace',{style:'stone',width:32,length:8,height:h2}),[0,8.8,0],0,1,false,true,true);
    for(const id of ['gate','wallL','wallR'])raise(id,h2);
    add('gateStairs','Gate Approach Stairs',traversal(seedFrom(r),'stairs',{style:'stone',width:4.2,length:7,height:h2,rails:false}),[0,1.4,0],0,1,false,true,true);
    add('gateWallL','Approach Retaining Wall',traversal(seedFrom(r),'retainingWall',{style:'stone',width:11,length:3,height:h2}),[-8.2,4.7,0],0,1,false,true,true);
    add('gateWallR','Approach Retaining Wall',traversal(seedFrom(r),'retainingWall',{style:'stone',width:11,length:3,height:h2}),[8.2,4.7,0],0,1,false,true,true);
  } else if(p==='mountainPath'){
    add('upperCliff','Mountain Ledge',traversal(seedFrom(r),'cliff',{style:'earth',width:17,length:12,height:h}),[2.0,7.2,0],0,1,false,true,true);
    raise('cottage',h);raise('tower',h);
    add('mountainSlope','Mountain Ramp',traversal(seedFrom(r),'slope',{style:'earth',width:3.4,length:10,height:h,rails:false}),[-4.5,-.2,0],-.22,1,false,true,true);
    add('retaining','Trail Retaining Wall',traversal(seedFrom(r),'retainingWall',{style:'stone',width:9,length:3,height:h}),[8.0,1.4,0],Math.PI/2,1,false,true,true);
  } else if(p==='mineEntranceClearing'){
    add('mineTerrace','Mine Ledge',traversal(seedFrom(r),'cliff',{style:'stone',width:15,length:8,height:h2}),[0,8.8,0],0,1,false,true,true);
    raise('mine',h2);
    add('mineStairs','Mine Steps',traversal(seedFrom(r),'stairs',{style:'wood',width:2.7,length:5.2,height:h2,rails:true}),[0,3.6,0],0,1,false,true,true);
  } else if(p==='ruralHouseLane'){
    add('farmTerrace','Farm Terrace',traversal(seedFrom(r),'terrace',{style:'earth',width:11,length:8,height:h2}),[-6.8,7.2,0],0,1,false,true,true);
    raise('farm',h2);
    add('farmSlope','Farm Ramp',traversal(seedFrom(r),'slope',{style:'earth',width:2.8,length:6.5,height:h2,rails:false}),[-.8,5.6,0],Math.PI/2,1,false,true,true);
  }
  return out;
}

function customNewPreset(recipe){
  const r=rngFromSeed(recipe.seed),E=recipe.buildingEngine||'1.3.0',S=recipe.size,e=recipe.elevation,h=+(1.3+e*2.5).toFixed(2),out=[];
  const add=(...args)=>out.push(place(...args));
  if(recipe.preset==='mountainVillagePath'){
    add('surface','Mountain Surface',surface(seedFrom(r),'rocky',S,'curve','dirt',{pathWidth:3.0,variation:.7,wear:.45,detailDensity:.45}),[0,0,0],0,1,true,false);
    add('upperLedge','Upper Village Ledge',traversal(seedFrom(r),'cliff',{style:'earth',width:19,length:12,height:h}),[4,8,0],0,1,false,true,true);
    add('slope','Village Slope',traversal(seedFrom(r),'slope',{style:'earth',width:3.3,length:11,height:h,rails:false}),[-4.2,0,0],-.22,1,false,true,true);
    add('upperHouse','Upper Cottage',building(seedFrom(r),E,'cottage','mountain',{width:5.8,depth:4.4,floors:1,age:'old'}),[2.0,9.0,h],-.08,1,false,true,true);
    add('upperInn','Mountain Inn',building(seedFrom(r),E,'inn','mountain',{width:7.6,depth:5.2,floors:2,age:'old',sign:true}),[9.2,7.4,h],.12,1,false,true,true);
    add('lowerHouse','Lower House',building(seedFrom(r),E,'peasantHouse','rusticVillage',{width:5.8,depth:4.5,floors:2,age:'old'}),[-8.6,-4.0,0],-.12);
    add('stairs','Stone Steps',traversal(seedFrom(r),'stairs',{style:'stone',width:2.6,length:6.8,height:h}),[5.8,0.3,0],.18,1,false,true,true);
    add('fence','Cliff Fence',prop(seedFrom(r),'fence',{variant:'broken',style:'mountain',scale:1.1}),[10.2,1.7,h],.12,1,false,true,true);
    add('pineA','Pine',foliage(seedFrom(r),'tree',{biome:'mountain',variant:'pine',scale:.9}),[-12,8,0]);
    add('pineB','Pine',foliage(seedFrom(r),'tree',{biome:'mountain',variant:'pine',scale:.82}),[13,-7,0]);
  } else if(recipe.preset==='stoneBridgeCrossing'){
    add('surface','Rocky Crossing',surface(seedFrom(r),'rocky',S,'straight','dirt',{pathWidth:3.0,variation:.62,wear:.38,detailDensity:.35}),[0,0,0],0,1,true,false);
    add('ledgeS','South Ledge',traversal(seedFrom(r),'terrace',{style:'stone',width:18,length:10,height:h}),[0,-10,0],0,1,false,true,true);
    add('ledgeN','North Ledge',traversal(seedFrom(r),'terrace',{style:'stone',width:18,length:10,height:h}),[0,10,0],0,1,false,true,true);
    add('bridge','Stone Bridge',traversal(seedFrom(r),'bridge',{style:'stone',variant:'arched',width:3.8,length:10,height:h,rails:true}),[0,0,0],0,1,false,true,true);
    add('southCottage','Bridge Cottage',building(seedFrom(r),E,'cottage','stoneTown',{width:5.6,depth:4.4,floors:1,material:'stone'}),[-6,-10,h],.08,1,false,true,true);
    add('northTower','Bridge Watch',building(seedFrom(r),E,'watchtower','fortifiedStone',{width:4.6,depth:4.6,floors:3,roof:'conical',material:'stone',porch:false,extension:false}),[6,10,h],-.08,1,false,true,true);
    add('stairsS','South Steps',traversal(seedFrom(r),'stairs',{style:'stone',width:2.8,length:5.5,height:h}),[-6,-3.7,0],Math.PI,1,false,true,true);
    add('stairsN','North Steps',traversal(seedFrom(r),'stairs',{style:'stone',width:2.8,length:5.5,height:h}),[6,3.7,0],0,1,false,true,true);
    add('rocks','Crossing Rocks',foliage(seedFrom(r),'rockCluster',{biome:'mountain',scale:1.1,spread:1.2}),[-9,0,0]);
  } else if(recipe.preset==='cliffsideTownLane'){
    add('surface','Cliffside Surface',surface(seedFrom(r),'grass',S,'curve','dirt',{pathWidth:2.8,variation:.6,wear:.32,detailDensity:.45}),[0,0,0],0,1,true,false);
    add('upperTerrace','Upper Lane Terrace',traversal(seedFrom(r),'terrace',{style:'earth',width:20,length:11,height:h}),[5,8,0],0,1,false,true,true);
    add('retaining','Stone Retaining Wall',traversal(seedFrom(r),'retainingWall',{style:'stone',width:18,length:3,height:h}),[5,2.6,0],0,1,false,true,true);
    add('laneStairs','Lane Stairs',traversal(seedFrom(r),'stairs',{style:'stone',width:2.5,length:6.5,height:h}),[-1.6,2.8,0],0,1,false,true,true);
    add('upperShop','Upper Shop',building(seedFrom(r),E,'shop','oldRpgVillage',{width:6.2,depth:4.7,floors:2,sign:true}),[0.5,8,h],0,1,false,true,true);
    add('upperHouse','Upper House',building(seedFrom(r),E,'peasantHouse','rusticVillage',{width:5.8,depth:4.5,floors:2,age:'old'}),[10,8,h],0,1,false,true,true);
    add('lowerInn','Lower Inn',building(seedFrom(r),E,'inn','oldRpgVillage',{width:7.2,depth:5.2,floors:2,sign:true}),[-8,-7,0],.08);
    add('fence','Cliff Fence',prop(seedFrom(r),'fence',{variant:'straight',style:'mountain',scale:1.2}),[12,1.6,h],0,1,false,true,true);
    add('tree','Lane Oak',foliage(seedFrom(r),'tree',{biome:'temperate',variant:'oak',scale:.9}),[-13,6,0]);
  }
  return out;
}

function generatedPlacements(recipe){
  if(['mountainVillagePath','stoneBridgeCrossing','cliffsideTownLane'].includes(recipe.preset))return customNewPreset(recipe);
  return addElevatedLayout(baselinePlacements(recipe),recipe);
}
function copyMaterialMap(target,child,materialCache){const map={};for(const [id,m] of Object.entries(child.materials)){const payload={...m};delete payload.id;const signature=JSON.stringify(payload,Object.keys(payload).sort());let next=materialCache.get(signature);if(!next){next=`fieldMat_${materialCache.size}`;materialCache.set(signature,next);target.materials[next]={...m,id:next};}map[id]=next;}return map;}
function rotatedPosition(pos,angle,scale,translate){const x=(pos?.[0]||0)*scale,y=(pos?.[1]||0)*scale,z=(pos?.[2]||0)*scale,c=Math.cos(angle),s=Math.sin(angle);return [x*c-y*s+translate[0],x*s+y*c+translate[1],z+translate[2]];}
function mergePlacement(target,placement,child,materialCache){const angle=placement.rotation||0,scale=placement.scale||1,translate=placement.position||[0,0,0],materialMap=copyMaterialMap(target,child,materialCache);for(const node of child.nodes){const n={...node,name:`${placement.id}::${node.name}`,material:materialMap[node.material],placementId:placement.id,sourceType:child.recipe.type,tags:[...(node.tags||[]),`placement:${placement.id}`]};n.position=rotatedPosition(node.position||[0,0,0],angle,scale,translate);const rot=node.rotation||[0,0,0];n.rotation=[rot[0],rot[1],rot[2]+angle];if(node.kind==='box')n.size=node.size.map(v=>v*scale);else if(node.kind==='mesh'||node.kind==='dodecahedron')n.scale=(node.scale||[1,1,1]).map(v=>v*scale);target.nodes.push(n);}}
function placementAabb(p,asset){const fp=asset.footprint||{width:1,depth:1},a=p.rotation||0,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),sc=p.scale||1,w=(fp.width*c+fp.depth*s)*sc,d=(fp.width*s+fp.depth*c)*sc;return {minX:p.position[0]-w/2,maxX:p.position[0]+w/2,minY:p.position[1]-d/2,maxY:p.position[1]+d/2};}
function overlap(a,b,pad=.20){return a.minX+pad<b.maxX&&a.maxX-pad>b.minX&&a.minY+pad<b.maxY&&a.maxY-pad>b.minY;}
function levelFor(record){const surfaces=record.asset?.traversal?.walkSurfaces||[];const z=record.position[2]+(surfaces[0]?.z??surfaces[0]?.z1??0);if(z<.65)return 0;if(z<3.5)return 1;return 2;}
function walkGraph(records){
  const levels=new Set([0]),segments=[];
  for(const p of records){
    if(p.recipe.type==='building'||p.recipe.type==='prop'||p.recipe.type==='foliage')levels.add(Math.round((p.position[2]||0)*100)/100);
    if(p.recipe.type!=='traversal'||!p.asset?.traversal)continue;
    const t=p.asset.traversal,ang=p.rotation||0,sc=p.scale||1,c=Math.cos(ang),s=Math.sin(ang);
    const xf=q=>{const x=(q[0]||0)*sc,y=(q[1]||0)*sc,z=(q[2]||0)*sc;return [x*c-y*s+p.position[0],x*s+y*c+p.position[1],z+p.position[2]];};
    const connections=(t.connections||[]).map(cn=>({...cn,position:xf(cn.position||[0,0,0])}));
    const surfaces=(t.walkSurfaces||[]).map(ws=>({...ws,worldBase:[p.position[0],p.position[1],p.position[2]],rotation:ang,scale:sc}));
    for(const cn of connections)levels.add(Math.round(cn.position[2]*100)/100);
    segments.push({placementId:p.id,family:p.recipe.family,connections,walkSurfaces:surfaces,passUnder:!!t.passUnder,clearance:t.clearance??null});
  }
  return {levels:[...levels].sort((a,b)=>a-b),segments};
}

export function generateField(input){
  const recipe=normalizeRecipe({...input,type:'field'}),{warnings:recipeWarnings}=validateRecipe(recipe);
  const placements=(recipe.placements&&recipe.placements.length?recipe.placements:generatedPlacements(recipe)).map((p,i)=>({...p,id:p.id||`asset-${i}`}));
  const spec=createSceneSpec({...recipe,placements}),records=[],materialCache=new Map();
  for(const placement of placements){const child=childScene(placement.recipe);mergePlacement(spec,placement,child,materialCache);records.push({...placement,recipe:child.recipe,asset:child.asset});}
  spec.recipe={...recipe,placements:records.map(({asset,...p})=>p)};
  const graph=walkGraph(records);
  spec.metadata={engine:'field',engineVersion:recipe.engineVersion,preset:recipe.preset,placements:records,recipeWarnings,materialDeduplication:{uniqueMaterials:materialCache.size},walkGraph:graph,elevation:{enabled:recipe.elevation>.04,amount:recipe.elevation,levels:graph.levels}};
  const validation=validateSceneSpec(spec);validation.warnings.push(...recipeWarnings);
  const collidable=records.filter(p=>p.selectable!==false&&p.asset?.collision?.enabled&&p.recipe.type!=='surface'&&p.recipe.type!=='traversal');
  for(let i=0;i<collidable.length;i++)for(let j=i+1;j<collidable.length;j++){const a=collidable[i],b=collidable[j];if(a.allowOverlap||b.allowOverlap)continue;if(Math.abs((a.position[2]||0)-(b.position[2]||0))>.9)continue;if(overlap(placementAabb(a,a.asset),placementAabb(b,b.asset),.35))validation.warnings.push(`Placement overlap: ${a.label} / ${b.label}`);}
  validation.stats.placementCount=records.length;validation.stats.walkLevels=graph.levels.length;validation.stats.traversalSegments=graph.segments.length;
  return spec;
}
