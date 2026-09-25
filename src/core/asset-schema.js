import { ASSET_SCHEMA, ENGINE_VERSIONS, WORLDFORGE_VERSION } from './schema.js';

function rotatePoint([x,y,z],[rx=0,ry=0,rz=0]){
  let c=Math.cos(rx),s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];
  c=Math.cos(rz);s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];
  return [x,y,z];
}
function transformPoint(v,node){
  const sc=node.scale||[1,1,1],p=node.position||[0,0,0],r=node.rotation||[0,0,0];
  const q=rotatePoint([v[0]*sc[0],v[1]*sc[1],v[2]*sc[2]],r);
  return [q[0]+p[0],q[1]+p[1],q[2]+p[2]];
}
function boundsFromPoints(points){
  if(!points.length)return null;
  const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
  return {min,max};
}
function nodeBounds(node){
  if(node.kind==='box'){
    const [x,y,z]=(node.size||[0,0,0]).map(v=>v/2),pts=[];
    for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])pts.push(transformPoint([sx*x,sy*y,sz*z],node));
    return boundsFromPoints(pts);
  }
  if(node.kind==='mesh') return boundsFromPoints((node.vertices||[]).map(v=>transformPoint(v,node)));
  if(node.kind==='dodecahedron'){
    const r=node.radius||1,pts=[];
    for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])pts.push(transformPoint([sx*r,sy*r,sz*r],node));
    return boundsFromPoints(pts);
  }
  return null;
}

export function computeBounds(spec){
  const bounds=spec.nodes.map(nodeBounds).filter(Boolean);
  if(!bounds.length)return {min:[0,0,0],max:[0,0,0],size:[0,0,0]};
  const min=[0,1,2].map(i=>Math.min(...bounds.map(b=>b.min[i])));
  const max=[0,1,2].map(i=>Math.max(...bounds.map(b=>b.max[i])));
  return {min,max,size:max.map((v,i)=>v-min[i])};
}

function footprintFor(spec,bounds){
  const r=spec.recipe;
  if(r.type==='building') {
    if(r.engineVersion!=='1.0.0') return {shape:'box',width:Math.max(r.width,bounds.size[0]),depth:Math.max(r.depth,bounds.size[1])};
    return {shape:'box',width:r.width,depth:r.depth};
  }
  if(['terrain','landscape','surface'].includes(r.type)) return {shape:'box',width:r.size||bounds.size[0],depth:r.size||bounds.size[1]};
  if(r.type==='traversal') return {shape:'box',width:Math.max(.1,r.width||bounds.size[0]),depth:Math.max(.1,r.length||bounds.size[1])};
  if(r.type==='field') return {shape:'box',width:Math.max(r.size||0,bounds.size[0]),depth:Math.max(r.size||0,bounds.size[1])};
  return {shape:'box',width:Math.max(.1,bounds.size[0]),depth:Math.max(.1,bounds.size[1])};
}

export function attachAssetMetadata(spec){
  const r=spec.recipe,bounds=computeBounds(spec),footprint=footprintFor(spec,bounds);
  const foliageBlocking=r.type==='foliage'&&['tree','fallenLog','stump','rockCluster'].includes(r.family);
  const blocking=r.type==='foliage'?foliageBlocking:r.type==='traversal'?['cliff','terrace','retainingWall'].includes(r.family):!['terrain','landscape','surface','field'].includes(r.type);
  spec.asset={
    schema:ASSET_SCHEMA,
    worldforgeVersion:WORLDFORGE_VERSION,
    engine:{name:r.type,version:r.engineVersion||ENGINE_VERSIONS[r.type]||'0.0.0'},
    id:`${r.type}-${r.seed}`,
    assetType:r.type,
    seed:r.seed,
    anchor:{position:[0,0,0],pivot:'ground-center'},
    facing:r.type==='building'?'south':null,
    footprint,
    bounds,
    collision:{enabled:blocking,shape:r.type==='building'?'footprint':r.type==='traversal'?'traversal':'bounds'},
    occlusion:{enabled:r.type==='building'||r.type==='prop'||(r.type==='foliage'&&['tree','shrub','vines','fallenLog'].includes(r.family))},
    tags:[r.type,r.family||r.feature||r.patch||r.surface||r.preset||'asset'].filter(Boolean),
    ...(r.type==='traversal'?{traversal:spec.metadata?.traversal||null}:{})
  };
  return spec;
}
