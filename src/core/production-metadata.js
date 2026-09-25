import { computeBounds, attachAssetMetadata } from './asset-schema.js';
import { PRODUCTION_SCHEMA, PRODUCTION_VERSION, WORLDFORGE_VERSION } from './schema.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const lname=n=>String(n?.name||'').toLowerCase();
const hasTag=(n,t)=>(n?.tags||[]).includes(t);

function round(v,n=4){const p=10**n;return Math.round((Number(v)||0)*p)/p;}
function vec(v=[0,0,0]){return [round(v[0]),round(v[1]),round(v[2])];}
function sizeOf(node){return node.kind==='box'?(node.size||[0,0,0]):null;}
function baseZ(node){const s=sizeOf(node);return (node.position?.[2]||0)-(s?s[2]/2:0);}
function topZ(node){const s=sizeOf(node);return (node.position?.[2]||0)+(s?s[2]/2:0);}

function faceFromBounds(bounds,p=[0,0,0]){
  const d=[
    {name:'west',normal:[-1,0,0],v:Math.abs(p[0]-bounds.min[0])},
    {name:'east',normal:[1,0,0],v:Math.abs(p[0]-bounds.max[0])},
    {name:'south',normal:[0,-1,0],v:Math.abs(p[1]-bounds.min[1])},
    {name:'north',normal:[0,1,0],v:Math.abs(p[1]-bounds.max[1])},
  ].sort((a,b)=>a.v-b.v)[0];
  return d;
}

function socketFromNode(node,bounds,id,type='entry',offset=.18){
  const p=[...(node.position||[0,0,0])];
  p[2]=Math.max(0,baseZ(node));
  const face=faceFromBounds(bounds,p);
  return {
    id,type,
    position:vec([p[0]+face.normal[0]*offset,p[1]+face.normal[1]*offset,p[2]]),
    normal:face.normal,
    facing:face.name,
    sourceNode:node.name,
    width:round(sizeOf(node)?.[0]||1),
    height:round(sizeOf(node)?.[2]||2),
    tags:['connection',type]
  };
}

function candidateDoorNodes(spec){
  const include=/(^|::|_)(door|entrance|opening|void|gatedark|seweropening|minevoid|cargodoor)/i;
  const exclude=/(lintel|jamb|knob|brace|cross|loft|frame|arch|weather|banner|cap)/i;
  return spec.nodes.filter(n=>include.test(n.name||'')&&!exclude.test(n.name||'')&&(n.kind==='box'||n.kind==='mesh'));
}

function buildingSockets(spec,bounds){
  const r=spec.recipe||{},family=r.family||'',sockets=[];
  const doors=candidateDoorNodes(spec);
  doors.forEach((n,i)=>sockets.push(socketFromNode(n,bounds,i===0?'entry.main':`entry.${i+1}`,'entry')));

  const isPortal=['gatehouse','cityGate','mineEntrance','sewerEntrance'].includes(family);
  if(isPortal){
    const z=0;
    sockets.push({id:'portal.south',type:'portal',position:vec([0,bounds.min[1]-.2,z]),normal:[0,-1,0],facing:'south',tags:['connection','portal','through']});
    sockets.push({id:'portal.north',type:'portal',position:vec([0,bounds.max[1]+.2,z]),normal:[0,1,0],facing:'north',tags:['connection','portal','through']});
  }
  if(family==='castleWall'){
    sockets.push({id:'wall.west',type:'structure-link',position:vec([bounds.min[0],0,0]),normal:[-1,0,0],facing:'west',tags:['connection','wall']});
    sockets.push({id:'wall.east',type:'structure-link',position:vec([bounds.max[0],0,0]),normal:[1,0,0],facing:'east',tags:['connection','wall']});
  }
  if(family==='dock'){
    sockets.push({id:'dock.land',type:'path',position:vec([0,bounds.min[1]-.15,topZ(spec.nodes.find(n=>/mainpier_deck/i.test(n.name||''))||{position:[0,0,0],size:[0,0,.2]})]),normal:[0,-1,0],facing:'south',tags:['connection','dock','land']});
    sockets.push({id:'dock.water',type:'water',position:vec([0,bounds.max[1]+.15,0]),normal:[0,1,0],facing:'north',tags:['connection','dock','water']});
  }
  if(!sockets.length && family!=='castleWall' && family!=='ruinedFort'){
    sockets.push({id:'entry.main',type:'entry',position:vec([0,bounds.min[1]-.18,0]),normal:[0,-1,0],facing:'south',derived:true,tags:['connection','entry','derived']});
  }
  const main=sockets.find(s=>s.type==='entry');
  if(main){
    sockets.push({id:'road.main',type:'road',position:vec([main.position[0]+main.normal[0]*1.15,main.position[1]+main.normal[1]*1.15,main.position[2]]),normal:main.normal,facing:main.facing,derived:true,tags:['connection','road']});
  }
  return sockets;
}

function traversalSockets(spec){
  const t=spec.metadata?.traversal||{};
  return (t.connections||[]).map((c,i)=>({id:`traversal.${c.edge||i}`,type:'traversal',position:vec(c.position||[0,0,0]),normal:c.edge==='south'?[0,-1,0]:c.edge==='north'?[0,1,0]:c.edge==='west'?[-1,0,0]:c.edge==='east'?[1,0,0]:[0,0,0],facing:c.edge||null,tags:['connection','traversal']}));
}

function propSockets(spec,bounds){
  const f=spec.recipe?.family,s=[];
  if(f==='well')s.push({id:'interact.main',type:'interaction',position:vec([0,bounds.min[1]-.65,0]),normal:[0,-1,0],facing:'south',tags:['interaction','well']});
  else if(f==='signpost')s.push({id:'interact.main',type:'interaction',position:vec([0,bounds.min[1]-.45,0]),normal:[0,-1,0],facing:'south',tags:['interaction','sign']});
  else if(f==='fence'){
    s.push({id:'fence.west',type:'structure-link',position:vec([bounds.min[0],0,0]),normal:[-1,0,0],facing:'west',tags:['connection','fence']});
    s.push({id:'fence.east',type:'structure-link',position:vec([bounds.max[0],0,0]),normal:[1,0,0],facing:'east',tags:['connection','fence']});
  }
  return s;
}

function boxWalkSurface(node){
  const s=sizeOf(node);if(!s)return null;
  return {id:`walk.${node.name}`,kind:'box-top',position:vec([node.position?.[0]||0,node.position?.[1]||0,topZ(node)]),size:[round(s[0]),round(s[1])],rotation:vec(node.rotation||[0,0,0]),sourceNode:node.name};
}
function walkSurfaces(spec,bounds){
  const r=spec.recipe||{};
  if(r.type==='traversal') return clone(spec.metadata?.traversal?.walkSurfaces||[]);
  if(['surface','terrain','landscape'].includes(r.type)) return [{id:'ground',kind:'ground',z:round(bounds.max[2]||0),bounds:{min:vec(bounds.min),max:vec(bounds.max)}}];
  const list=[];
  for(const n of spec.nodes){
    const nm=lname(n);
    if(hasTag(n,'walkable')||/(porchdeck|loadingdock|mainpier_deck|fingerpier_deck|sewerwalk|workpad|civicstair|templestair)/i.test(nm)){
      const ws=boxWalkSurface(n);if(ws)list.push(ws);
    }
  }
  return list.slice(0,24);
}

function primitiveForNode(n){
  if(n.kind==='box') return {kind:'box',name:n.name,position:vec(n.position||[0,0,0]),size:(n.size||[1,1,1]).map(x=>round(x)),rotation:vec(n.rotation||[0,0,0])};
  if(n.kind==='dodecahedron') return {kind:'sphere',name:n.name,position:vec(n.position||[0,0,0]),radius:round(n.radius||1),scale:vec(n.scale||[1,1,1])};
  return null;
}
function collisionPrimitives(spec,bounds){
  const r=spec.recipe||{};
  if(['surface','terrain','landscape','field'].includes(r.type))return [];
  if(r.type==='traversal'){
    const t=spec.metadata?.traversal||{};
    if(['bridge','stairs','slope'].includes(r.family))return [];
  }
  const chosen=[];
  for(const n of spec.nodes){
    const nm=lname(n);
    const obvious=hasTag(n,'structural')||hasTag(n,'collision')||/(^|::)(walls|foundation|extension|nave|squaretower|roundtower|mageTowerCore|templeHall|adobeCore|mineRockFace|sewerRetainingWall|cityTower_|gateTower|keep|wallSegment)/i.test(n.name||'');
    const exclude=/(roof|trim|tone|window|door|lintel|jamb|knob|beam|post|rail|banner|awning|crate|barrel|chimney|cap|planter|debris|rubble|rock|stair|step|sign|sill|frame|mullion|shutter|weather|moss)/i.test(nm);
    if(obvious&&!exclude){const p=primitiveForNode(n);if(p)chosen.push(p);}
    if(chosen.length>=24)break;
  }
  if(!chosen.length && spec.asset?.collision?.enabled){
    chosen.push({kind:'box',name:'derived-footprint',position:vec([(bounds.min[0]+bounds.max[0])/2,(bounds.min[1]+bounds.max[1])/2,(bounds.min[2]+bounds.max[2])/2]),size:[round(bounds.size[0]),round(bounds.size[1]),round(Math.max(.25,bounds.size[2]))],rotation:[0,0,0],derived:true});
  }
  return chosen;
}

function collisionProfile(spec,bounds,sockets){
  const r=spec.recipe||{};
  const enabled=(r.type==='traversal'||spec.asset?.collision?.enabled!==false)&&!['surface','terrain','landscape','field'].includes(r.type);
  let mode='none';
  if(enabled){
    if(r.type==='building'&&['gatehouse','cityGate','mineEntrance','sewerEntrance'].includes(r.family))mode='compound-with-portal';
    else if(r.type==='building')mode='footprint-obstacle-with-entry';
    else if(r.type==='traversal')mode=['bridge','stairs','slope'].includes(r.family)?'walk-surface':'solid';
    else mode='solid';
  }
  return {enabled,mode,primitives:enabled?collisionPrimitives(spec,bounds):[],openings:sockets.filter(s=>['entry','portal'].includes(s.type)).map(s=>({socketId:s.id,position:s.position,normal:s.normal,width:s.width||1.2,height:s.height||2.1}))};
}

function occlusionProfile(spec,bounds){
  const r=spec.recipe||{};
  const enabled=!!spec.asset?.occlusion?.enabled;
  if(!enabled)return {enabled:false,volumes:[]};
  const h=bounds.size[2],z0=bounds.min[2];
  const volumes=[{id:'body',kind:'box',min:vec(bounds.min),max:vec(bounds.max),behavior:r.type==='building'?'fade-when-player-behind':'soft-fade'}];
  if(r.type==='building'&&h>3.0)volumes.push({id:'upper',kind:'box',min:vec([bounds.min[0],bounds.min[1],z0+h*.52]),max:vec(bounds.max),behavior:'fade-upper'});
  return {enabled:true,volumes};
}

function placementRules(spec,sockets){
  const r=spec.recipe||{};
  return {
    requiresGround:!['surface','terrain','landscape'].includes(r.type),
    avoidOverlap:!['surface','terrain','landscape','field'].includes(r.type),
    canRotate:true,
    preferredFacing:r.type==='building'?'south':null,
    roadSocket:sockets.find(s=>s.type==='road')?.id||null,
    entrySocket:sockets.find(s=>s.type==='entry')?.id||null,
    supportsElevation:['building','prop','foliage','traversal'].includes(r.type)
  };
}

function buildSingleProduction(spec,{space='local'}={}){
  const bounds=computeBounds(spec),r=spec.recipe||{};
  let sockets=[];
  if(r.type==='building')sockets=buildingSockets(spec,bounds);
  else if(r.type==='traversal')sockets=traversalSockets(spec);
  else if(r.type==='prop')sockets=propSockets(spec,bounds);
  const walks=walkSurfaces(spec,bounds);
  const collision=collisionProfile(spec,bounds,sockets);
  return {
    schema:PRODUCTION_SCHEMA,
    version:PRODUCTION_VERSION,
    enrichedWith:WORLDFORGE_VERSION,
    source:{type:r.type||'unknown',engineVersion:r.engineVersion||null,seed:r.seed??null,generatorVersion:r.generatorVersion||spec.generatorVersion||null},
    coordinateSystem:{up:'Z',forward:'-Y',units:'worldforge-unit',space},
    bounds:clone(bounds),
    sockets,
    walkSurfaces:walks,
    collision,
    navigation:{mode:r.type==='building'?(collision.mode==='compound-with-portal'?'portal-through':'obstacle-with-entry'):r.type==='traversal'?'traversal-link':walks.length?'walk-surface':'obstacle',entrySockets:sockets.filter(s=>['entry','portal','traversal'].includes(s.type)).map(s=>s.id)},
    occlusion:occlusionProfile(spec,bounds),
    placement:placementRules(spec,sockets),
    exportHints:{sharedMaterials:true,generateLODLater:true,generateUVAtlasLater:true,collisionReady:collision.enabled,gameMetadataReady:true}
  };
}

function productionForField(spec){
  const records=spec.metadata?.placements||[];
  const placements=[];
  for(const rec of records){
    const nodes=spec.nodes.filter(n=>n.placementId===rec.id);
    const pseudo={recipe:rec.recipe,nodes,materials:spec.materials,metadata:{},asset:rec.asset};
    // Traversal's world-space connection graph is already computed by Field 0.3.
    if(rec.recipe?.type==='traversal'){
      const seg=(spec.metadata?.walkGraph?.segments||[]).find(s=>s.placementId===rec.id);
      if(seg)pseudo.metadata.traversal={...(rec.asset?.traversal||{}),connections:seg.connections||[],walkSurfaces:seg.walkSurfaces||[]};
    }
    const p=buildSingleProduction(pseudo,{space:'world'});
    placements.push({id:rec.id,label:rec.label,recipe:clone(rec.recipe),position:vec(rec.position||[0,0,0]),rotation:round(rec.rotation||0),scale:round(rec.scale||1),production:p});
  }
  const bounds=computeBounds(spec);
  return {
    schema:PRODUCTION_SCHEMA,
    version:PRODUCTION_VERSION,
    enrichedWith:WORLDFORGE_VERSION,
    source:{type:'field',engineVersion:spec.recipe?.engineVersion||null,seed:spec.recipe?.seed??null,generatorVersion:spec.recipe?.generatorVersion||spec.generatorVersion||null},
    coordinateSystem:{up:'Z',forward:'-Y',units:'worldforge-unit',space:'world'},
    bounds:clone(bounds),
    placements,
    navigation:{walkGraph:clone(spec.metadata?.walkGraph||{levels:[0],segments:[]}),placementCount:placements.length},
    collision:{mode:'per-placement',placementIds:placements.filter(p=>p.production.collision.enabled).map(p=>p.id)},
    sockets:placements.flatMap(p=>p.production.sockets.map(s=>({...s,id:`${p.id}:${s.id}`,placementId:p.id}))),
    exportHints:{sharedMaterials:true,generateLODLater:true,generateUVAtlasLater:true,gameMetadataReady:true}
  };
}

export function attachProductionMetadata(spec){
  if(!spec.asset)attachAssetMetadata(spec);
  spec.production=spec.recipe?.type==='field'?productionForField(spec):buildSingleProduction(spec,{space:'local'});
  return spec;
}

export function enrichExistingScene(inputSpec){
  const spec=clone(inputSpec);
  if(!spec||!spec.recipe||!Array.isArray(spec.nodes)||!spec.materials)throw new Error('Not a valid WorldForge scene spec.');
  // Intentionally do not change nodes/materials/recipe/generatorVersion.
  if(!spec.asset)attachAssetMetadata(spec);
  attachProductionMetadata(spec);
  spec.production.upgrade={retroactive:true,originalGeneratorVersion:inputSpec.generatorVersion||inputSpec.recipe?.generatorVersion||null,nodesPreserved:spec.nodes.length,materialsPreserved:Object.keys(spec.materials||{}).length};
  return spec;
}

export function productionSummary(spec){
  const p=spec.production||attachProductionMetadata(spec).production;
  if(spec.recipe?.type==='field')return {schema:p.schema,version:p.version,type:'field',placements:p.placements.length,sockets:p.sockets.length,walkLevels:p.navigation.walkGraph?.levels?.length||0,collisionPlacements:p.collision.placementIds.length};
  return {schema:p.schema,version:p.version,type:spec.recipe?.type,sockets:p.sockets.length,walkSurfaces:p.walkSurfaces.length,collisionPrimitives:p.collision.primitives.length,collisionMode:p.collision.mode};
}
