import * as THREE from 'three';

function colorValue(v){return typeof v==='string'?new THREE.Color(v):new THREE.Color(v ?? '#ffffff');}

export function createThreeMaterials(spec){
  const out={};
  for(const [id,m] of Object.entries(spec.materials)){
    out[id]=new THREE.MeshStandardMaterial({color:colorValue(m.color),roughness:m.roughness??.85,metalness:m.metalness??0,flatShading:m.flatShading!==false});
  }
  return out;
}

export function sceneSpecToThree(spec){
  const group=new THREE.Group();group.name=`WorldForge_${spec.recipe.type}_${spec.recipe.seed}`;group.userData.worldforge=spec.recipe;
  const mats=createThreeMaterials(spec),placementGroups=new Map();
  const parentFor=n=>{
    if(!n.placementId)return group;
    if(!placementGroups.has(n.placementId)){
      const g=new THREE.Group();g.name=`Placement_${n.placementId}`;g.userData.placementId=n.placementId;g.userData.sourceType=n.sourceType||null;group.add(g);placementGroups.set(n.placementId,g);
    }
    return placementGroups.get(n.placementId);
  };
  for(const n of spec.nodes){
    let geom;
    if(n.kind==='box') geom=new THREE.BoxGeometry(...n.size);
    else if(n.kind==='mesh'){
      geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(n.vertices.flat(),3));geom.setIndex(n.faces.flat());geom.computeVertexNormals();
    } else if(n.kind==='dodecahedron') geom=new THREE.DodecahedronGeometry(n.radius,0);
    else continue;
    const mesh=new THREE.Mesh(geom,mats[n.material]);mesh.name=n.name;
    mesh.position.set(...(n.position||[0,0,0]));mesh.rotation.set(...(n.rotation||[0,0,0]));if(n.scale)mesh.scale.set(...n.scale);
    mesh.castShadow=mesh.receiveShadow=true;mesh.userData.tags=n.tags||[];mesh.userData.placementId=n.placementId||null;mesh.userData.sourceType=n.sourceType||null;
    parentFor(n).add(mesh);
  }
  group.userData.placementGroups=placementGroups;
  return group;
}

export function disposeThreeGroup(group){
  const materials=new Set();
  group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)materials.add(o.material);});
  materials.forEach(m=>m.dispose());
}
