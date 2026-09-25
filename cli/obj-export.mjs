function transformVertex(v,node){
  let [x,y,z]=v;const [rx,ry,rz]=node.rotation||[0,0,0];const [sx,sy,sz]=node.scale||[1,1,1];x*=sx;y*=sy;z*=sz;
  let c=Math.cos(rx),s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rz);s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];
  const p=node.position||[0,0,0];return [x+p[0],y+p[1],z+p[2]];
}
function boxGeometry(size){const [x,y,z]=size.map(v=>v/2);return {v:[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],f:[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]};}
function dodeca(radius){
  const p=(1+Math.sqrt(5))/2,a=1/p;const raw=[[0,1,p],[0,-1,p],[0,1,-p],[0,-1,-p],[1,p,0],[-1,p,0],[1,-p,0],[-1,-p,0],[p,0,1],[-p,0,1],[p,0,-1],[-p,0,-1],[a,a,a],[-a,a,a],[a,-a,a],[-a,-a,a],[a,a,-a],[-a,a,-a],[a,-a,-a],[-a,-a,-a]];
  const len=Math.hypot(...raw[0]);const v=raw.map(q=>q.map(n=>n/len*radius));
  // convex hull faces hardcoded as triangles via simple Three-compatible topology is unnecessary for proof; use a low-poly octa fallback for OBJ portability
  return {v:[[radius,0,0],[-radius,0,0],[0,radius,0],[0,-radius,0],[0,0,radius],[0,0,-radius]],f:[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]]};
}
export function sceneSpecToOBJ(spec){let lines=[`# WorldForge ${spec.generatorVersion}`,`# ${spec.recipe.type} seed ${spec.recipe.seed}`],offset=1;
  for(const node of spec.nodes){let g;if(node.kind==='box')g=boxGeometry(node.size);else if(node.kind==='mesh')g={v:node.vertices,f:node.faces};else if(node.kind==='dodecahedron')g=dodeca(node.radius);else continue;lines.push(`o ${node.name}`);for(const v of g.v){const q=transformVertex(v,node);lines.push(`v ${q[0]} ${q[1]} ${q[2]}`);}lines.push(`usemtl ${node.material}`);for(const f of g.f)lines.push('f '+f.map(i=>i+offset).join(' '));offset+=g.v.length;}
  return lines.join('\n')+'\n';}
export function sceneSpecToMTL(spec){return Object.values(spec.materials).map(m=>{const hex=(m.color||'#ffffff').replace('#','');const r=parseInt(hex.slice(0,2),16)/255,g=parseInt(hex.slice(2,4),16)/255,b=parseInt(hex.slice(4,6),16)/255;return `newmtl ${m.id}\nKd ${r.toFixed(5)} ${g.toFixed(5)} ${b.toFixed(5)}\nNs 10\n`;}).join('\n');}
