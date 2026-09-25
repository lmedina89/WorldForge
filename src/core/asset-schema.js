import { ASSET_SCHEMA, ENGINE_VERSIONS, WORLDFORGE_VERSION } from './schema.js';

function nodeBounds(node){
  if(node.kind==='box'){
    const p=node.position||[0,0,0], s=node.size||[0,0,0];
    return {min:[p[0]-s[0]/2,p[1]-s[1]/2,p[2]-s[2]/2],max:[p[0]+s[0]/2,p[1]+s[1]/2,p[2]+s[2]/2]};
  }
  if(node.kind==='mesh'){
    const p=node.position||[0,0,0];
    const xs=node.vertices.map(v=>v[0]+p[0]), ys=node.vertices.map(v=>v[1]+p[1]), zs=node.vertices.map(v=>v[2]+p[2]);
    return {min:[Math.min(...xs),Math.min(...ys),Math.min(...zs)],max:[Math.max(...xs),Math.max(...ys),Math.max(...zs)]};
  }
  if(node.kind==='dodecahedron'){
    const p=node.position||[0,0,0], sc=node.scale||[1,1,1], r=node.radius||1;
    return {min:[p[0]-r*sc[0],p[1]-r*sc[1],p[2]-r*sc[2]],max:[p[0]+r*sc[0],p[1]+r*sc[1],p[2]+r*sc[2]]};
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
  if(r.type==='building') return {shape:'box',width:r.width,depth:r.depth};
  if(r.type==='terrain'||r.type==='landscape') return {shape:'box',width:r.size,depth:r.size};
  return {shape:'box',width:Math.max(.1,bounds.size[0]),depth:Math.max(.1,bounds.size[1])};
}

export function attachAssetMetadata(spec){
  const r=spec.recipe, bounds=computeBounds(spec), footprint=footprintFor(spec,bounds);
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
    collision:{enabled:r.type!=='terrain',shape:r.type==='building'?'footprint':'bounds'},
    occlusion:{enabled:r.type==='building'||r.type==='prop'},
    tags:[r.type,r.family||r.feature||r.patch||'asset'].filter(Boolean)
  };
  return spec;
}
